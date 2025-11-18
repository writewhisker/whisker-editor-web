/**
 * PreferenceManager Tests
 *
 * Comprehensive unit tests for the PreferenceManager class.
 * Tests all methods, caching behavior, error handling, and scope management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PreferenceManager } from '../../src/services/PreferenceManager';
import type { IStorageBackend } from '../../src/interfaces/IStorageBackend';
import type { PreferenceScope, PreferenceEntry } from '../../src/types/ExtendedStorage';

/**
 * Mock IStorageBackend for testing
 */
class MockStorageBackend implements IStorageBackend {
	private storage = new Map<string, PreferenceEntry<any>>();
	public initializeCalled = false;
	public shouldThrowOnSave = false;
	public shouldThrowOnLoad = false;
	public shouldThrowOnDelete = false;

	async initialize(): Promise<void> {
		this.initializeCalled = true;
	}

	async savePreference<T>(key: string, entry: PreferenceEntry<T>): Promise<void> {
		if (this.shouldThrowOnSave) {
			throw new Error('Save failed');
		}
		this.storage.set(key, entry);
	}

	async loadPreference<T>(key: string): Promise<PreferenceEntry<T> | null> {
		if (this.shouldThrowOnLoad) {
			throw new Error('Load failed');
		}
		const entry = this.storage.get(key);
		return entry ? (entry as PreferenceEntry<T>) : null;
	}

	async deletePreference(key: string): Promise<void> {
		if (this.shouldThrowOnDelete) {
			throw new Error('Delete failed');
		}
		this.storage.delete(key);
	}

	async listPreferences(): Promise<string[]> {
		return Array.from(this.storage.keys());
	}

	// Helper methods for testing
	clear(): void {
		this.storage.clear();
	}

	has(key: string): boolean {
		return this.storage.has(key);
	}

	getStorageSize(): number {
		return this.storage.size;
	}
}

/**
 * Minimal backend with no optional methods
 */
class MinimalStorageBackend implements IStorageBackend {
	async initialize(): Promise<void> {
		// Minimal initialization
	}
}

describe('PreferenceManager', () => {
	let backend: MockStorageBackend;
	let manager: PreferenceManager;

	beforeEach(async () => {
		backend = new MockStorageBackend();
		manager = new PreferenceManager(backend);
		await manager.initialize();
	});

	describe('Initialization', () => {
		it('should initialize successfully', async () => {
			const newBackend = new MockStorageBackend();
			const newManager = new PreferenceManager(newBackend);

			expect(newManager.isReady()).toBe(false);
			await newManager.initialize();
			expect(newManager.isReady()).toBe(true);
			expect(newBackend.initializeCalled).toBe(true);
		});

		it('should not initialize twice', async () => {
			const newBackend = new MockStorageBackend();
			const newManager = new PreferenceManager(newBackend);

			await newManager.initialize();
			await newManager.initialize();

			// Should only call initialize once
			expect(newManager.isReady()).toBe(true);
		});

		it('should work with minimal backend', async () => {
			const minimalBackend = new MinimalStorageBackend();
			const newManager = new PreferenceManager(minimalBackend);

			await newManager.initialize();
			expect(newManager.isReady()).toBe(true);
		});

		it('should auto-initialize on first operation', async () => {
			const newBackend = new MockStorageBackend();
			const newManager = new PreferenceManager(newBackend);

			// Don't call initialize manually
			expect(newManager.isReady()).toBe(false);

			// First operation should trigger initialization
			const value = await newManager.get('test', 'default');

			expect(newManager.isReady()).toBe(true);
			expect(value).toBe('default');
		});
	});

	describe('get() method', () => {
		it('should return default value when preference does not exist', async () => {
			const value = await manager.get('nonexistent', 'default-value');
			expect(value).toBe('default-value');
		});

		it('should return stored value from backend', async () => {
			await manager.set('test-key', 'test-value');
			const value = await manager.get('test-key', 'default');
			expect(value).toBe('test-value');
		});

		it('should use cache on second read', async () => {
			await manager.set('cached-key', 'cached-value');

			// First read populates cache
			await manager.get('cached-key', 'default');

			// Spy on backend to verify cache is used
			const loadSpy = vi.spyOn(backend, 'loadPreference');

			// Second read should use cache
			const value = await manager.get('cached-key', 'default');

			expect(value).toBe('cached-value');
			// Should not call backend again
			expect(loadSpy).not.toHaveBeenCalled();
		});

		it('should support different value types', async () => {
			// String
			await manager.set('string', 'value');
			expect(await manager.get('string', '')).toBe('value');

			// Number
			await manager.set('number', 42);
			expect(await manager.get('number', 0)).toBe(42);

			// Boolean
			await manager.set('boolean', true);
			expect(await manager.get('boolean', false)).toBe(true);

			// Object
			const obj = { foo: 'bar', nested: { value: 123 } };
			await manager.set('object', obj);
			expect(await manager.get('object', {})).toEqual(obj);

			// Array
			const arr = [1, 2, 3, 'test'];
			await manager.set('array', arr);
			expect(await manager.get('array', [])).toEqual(arr);

			// Null (null is a valid value and can be stored/retrieved)
			await manager.set('null', null);
			expect(await manager.get('null', 'default')).toBe(null);

			// Undefined (undefined can be stored, but backend might filter it out)
			// When stored, it goes to cache immediately, so will return undefined
			await manager.set('undefined', undefined);
			const undefinedValue = await manager.get('undefined', 'default');
			// The manager caches undefined, so it returns undefined not default
			expect(undefinedValue).toBe(undefined);
		});

		it('should handle backend load errors gracefully', async () => {
			backend.shouldThrowOnLoad = true;

			const value = await manager.get('error-key', 'default');

			// Should return default value on error
			expect(value).toBe('default');
		});

		it('should work with backend missing loadPreference', async () => {
			const minimalBackend = new MinimalStorageBackend();
			const newManager = new PreferenceManager(minimalBackend);
			await newManager.initialize();

			const value = await newManager.get('test', 'default');
			expect(value).toBe('default');
		});

		it('should respect scope in cache', async () => {
			await manager.set('scoped', 'global-value', 'global');
			await manager.set('scoped', 'user-value', 'user');

			expect(await manager.get('scoped', 'default', 'global')).toBe('global-value');
			expect(await manager.get('scoped', 'default', 'user')).toBe('user-value');
		});
	});

	describe('set() method', () => {
		it('should store preference value', async () => {
			await manager.set('new-key', 'new-value');

			const value = await manager.get('new-key', 'default');
			expect(value).toBe('new-value');
		});

		it('should update existing preference', async () => {
			await manager.set('update', 'initial');
			await manager.set('update', 'updated');

			const value = await manager.get('update', 'default');
			expect(value).toBe('updated');
		});

		it('should write PreferenceEntry to backend', async () => {
			await manager.set('entry-key', 'entry-value', 'global');

			const stored = await backend.loadPreference('global:entry-key');

			expect(stored).toBeDefined();
			expect(stored?.value).toBe('entry-value');
			expect(stored?.scope).toBe('global');
			expect(stored?.updatedAt).toBeDefined();
		});

		it('should update cache immediately', async () => {
			await manager.set('cache-key', 'cache-value');

			// Should be in cache immediately (no backend call needed)
			const loadSpy = vi.spyOn(backend, 'loadPreference');
			const value = await manager.get('cache-key', 'default');

			expect(value).toBe('cache-value');
			expect(loadSpy).not.toHaveBeenCalled(); // Used cache
		});

		it('should handle backend save errors gracefully', async () => {
			backend.shouldThrowOnSave = true;

			// Should not throw even if backend fails
			await expect(manager.set('error-key', 'value')).resolves.not.toThrow();

			// Value should still be in cache
			const value = await manager.get('error-key', 'default');
			expect(value).toBe('value');
		});

		it('should work with backend missing savePreference', async () => {
			const minimalBackend = new MinimalStorageBackend();
			const newManager = new PreferenceManager(minimalBackend);
			await newManager.initialize();

			await expect(newManager.set('test', 'value')).resolves.not.toThrow();
		});

		it('should build correct storage key with scope', async () => {
			await manager.set('test', 'global', 'global');
			await manager.set('test', 'project', 'project');

			expect(backend.has('global:test')).toBe(true);
			expect(backend.has('project:test')).toBe(true);
		});

		it('should include timestamp in PreferenceEntry', async () => {
			const before = new Date();
			await manager.set('timestamp-key', 'value');
			const after = new Date();

			const stored = await backend.loadPreference('global:timestamp-key');

			expect(stored?.updatedAt).toBeDefined();
			const timestamp = new Date(stored!.updatedAt);
			expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe('delete() method', () => {
		it('should remove preference from cache', async () => {
			await manager.set('delete-key', 'value');
			await manager.delete('delete-key');

			const value = await manager.get('delete-key', 'default');
			expect(value).toBe('default');
		});

		it('should remove preference from backend', async () => {
			await manager.set('backend-delete', 'value');
			await manager.delete('backend-delete');

			expect(backend.has('global:backend-delete')).toBe(false);
		});

		it('should handle backend delete errors gracefully', async () => {
			await manager.set('error-delete', 'value');
			backend.shouldThrowOnDelete = true;

			await expect(manager.delete('error-delete')).resolves.not.toThrow();
		});

		it('should work with backend missing deletePreference', async () => {
			const minimalBackend = new MinimalStorageBackend();
			const newManager = new PreferenceManager(minimalBackend);
			await newManager.initialize();

			await expect(newManager.delete('test')).resolves.not.toThrow();
		});

		it('should respect scope when deleting', async () => {
			await manager.set('scoped', 'global', 'global');
			await manager.set('scoped', 'user', 'user');

			await manager.delete('scoped', 'global');

			expect(await manager.get('scoped', 'default', 'global')).toBe('default');
			expect(await manager.get('scoped', 'default', 'user')).toBe('user');
		});
	});

	describe('list() method', () => {
		it('should return empty array when no preferences', async () => {
			const keys = await manager.list();
			expect(keys).toEqual([]);
		});

		it('should list all preference keys for a scope', async () => {
			await manager.set('key1', 'value1', 'global');
			await manager.set('key2', 'value2', 'global');
			await manager.set('key3', 'value3', 'global');

			const keys = await manager.list('global');

			expect(keys).toHaveLength(3);
			expect(keys).toContain('key1');
			expect(keys).toContain('key2');
			expect(keys).toContain('key3');
		});

		it('should filter keys by scope', async () => {
			await manager.set('global-key', 'value', 'global');
			await manager.set('user-key', 'value', 'user');
			await manager.set('project-key', 'value', 'project');

			const globalKeys = await manager.list('global');
			const userKeys = await manager.list('user');
			const projectKeys = await manager.list('project');

			// The MockBackend stores keys with scope prefix, so list() should filter them
			expect(globalKeys).toContain('global-key');
			expect(globalKeys).not.toContain('user-key');
			expect(globalKeys).not.toContain('project-key');

			expect(userKeys).toContain('user-key');
			expect(userKeys).not.toContain('global-key');
			expect(userKeys).not.toContain('project-key');

			expect(projectKeys).toContain('project-key');
			expect(projectKeys).not.toContain('global-key');
			expect(projectKeys).not.toContain('user-key');
		});

		it('should strip scope prefix from returned keys', async () => {
			await manager.set('test', 'value', 'global');

			const keys = await manager.list('global');

			// Should return 'test', not 'global:test'
			expect(keys).toEqual(['test']);
		});

		it('should fallback to cache if backend missing listPreferences', async () => {
			const minimalBackend = new MinimalStorageBackend();
			const newManager = new PreferenceManager(minimalBackend);
			await newManager.initialize();

			await newManager.set('cached1', 'value', 'global');
			await newManager.set('cached2', 'value', 'global');

			const keys = await newManager.list('global');

			expect(keys).toContain('cached1');
			expect(keys).toContain('cached2');
		});

		it('should handle backend errors gracefully', async () => {
			// Add items to cache first
			await manager.set('key1', 'value');

			// Make backend fail
			vi.spyOn(backend, 'listPreferences').mockRejectedValue(new Error('List failed'));

			const keys = await manager.list();

			// Should fallback to cache
			expect(keys).toContain('key1');
		});
	});

	describe('clear() method', () => {
		it('should clear all preferences for a scope', async () => {
			await manager.set('key1', 'value1', 'global');
			await manager.set('key2', 'value2', 'global');
			await manager.set('key3', 'value3', 'global');

			await manager.clear('global');

			const keys = await manager.list('global');
			expect(keys).toHaveLength(0);
		});

		it('should only clear specified scope', async () => {
			await manager.set('global', 'value', 'global');
			await manager.set('user', 'value', 'user');

			await manager.clear('global');

			expect(await manager.get('global', 'default', 'global')).toBe('default');
			expect(await manager.get('user', 'default', 'user')).toBe('value');
		});

		it('should clear from both cache and backend', async () => {
			await manager.set('key1', 'value1');
			await manager.set('key2', 'value2');

			await manager.clear('global');

			// Check cache
			expect(await manager.get('key1', 'default')).toBe('default');

			// Check backend
			expect(backend.has('global:key1')).toBe(false);
			expect(backend.has('global:key2')).toBe(false);
		});

		it('should handle errors during clear', async () => {
			await manager.set('key1', 'value1');

			vi.spyOn(backend, 'deletePreference').mockRejectedValue(new Error('Delete failed'));

			await expect(manager.clear('global')).resolves.not.toThrow();
		});
	});

	describe('loadAll() method', () => {
		it('should load all preferences for a scope', async () => {
			await manager.set('key1', 'value1', 'global');
			await manager.set('key2', 'value2', 'global');
			await manager.set('key3', 'value3', 'global');

			const all = await manager.loadAll('global');

			expect(all).toEqual({
				key1: 'value1',
				key2: 'value2',
				key3: 'value3'
			});
		});

		it('should only load specified scope', async () => {
			await manager.set('global', 'global-value', 'global');
			await manager.set('user', 'user-value', 'user');

			const globalPrefs = await manager.loadAll('global');

			// Should only contain preferences from global scope
			expect(globalPrefs).toHaveProperty('global', 'global-value');
			expect(globalPrefs).not.toHaveProperty('user');
			// Verify the global scope doesn't leak user scope data
			expect(Object.keys(globalPrefs)).toEqual(['global']);
		});

		it('should skip undefined values', async () => {
			await manager.set('defined', 'value');
			await manager.set('undefined', undefined);

			const all = await manager.loadAll('global');

			expect(all).toHaveProperty('defined');
			expect(all).not.toHaveProperty('undefined');
		});

		it('should handle backend errors gracefully', async () => {
			vi.spyOn(backend, 'listPreferences').mockRejectedValue(new Error('List failed'));

			const all = await manager.loadAll('global');

			expect(all).toEqual({});
		});
	});

	describe('Scope-based key building', () => {
		it('should use global: prefix for global scope', async () => {
			await manager.set('test', 'value', 'global');
			expect(backend.has('global:test')).toBe(true);
		});

		it('should use project: prefix for project scope', async () => {
			await manager.set('test', 'value', 'project');
			expect(backend.has('project:test')).toBe(true);
		});

		it('should default to global scope', async () => {
			await manager.set('test', 'value');
			expect(backend.has('global:test')).toBe(true);
		});

		it('should build correct cache keys with scope', async () => {
			// Set values with different scopes
			await manager.set('test', 'global-val', 'global');
			await manager.set('test', 'user-val', 'user');

			// Verify both are cached and independent
			expect(await manager.get('test', 'default', 'global')).toBe('global-val');
			expect(await manager.get('test', 'default', 'user')).toBe('user-val');

			// Clear cache and verify they reload correctly from backend
			manager.clearCache();

			expect(await manager.get('test', 'default', 'global')).toBe('global-val');
			expect(await manager.get('test', 'default', 'user')).toBe('user-val');
		});
	});

	describe('Cache behavior', () => {
		it('should cache values after first read', async () => {
			await backend.savePreference('global:cached', {
				value: 'cached-value',
				scope: 'global',
				updatedAt: new Date().toISOString()
			});

			// First read
			await manager.get('cached', 'default');

			// Clear backend
			backend.clear();

			// Second read should use cache
			const value = await manager.get('cached', 'default');
			expect(value).toBe('cached-value');
		});

		it('should cache values immediately on set', async () => {
			await manager.set('immediate', 'value');

			// Clear backend
			backend.clear();

			// Should still get value from cache
			const value = await manager.get('immediate', 'default');
			expect(value).toBe('value');
		});

		it('should clear cache on clearCache()', async () => {
			await manager.set('cached', 'value');

			manager.clearCache();

			// Clear backend too
			backend.clear();

			// Should return default (cache cleared, backend empty)
			const value = await manager.get('cached', 'default');
			expect(value).toBe('default');
		});

		it('should maintain separate cache entries for different scopes', async () => {
			await manager.set('key', 'global', 'global');
			await manager.set('key', 'user', 'user');

			// Clear backend
			backend.clear();

			// Both should still be in cache
			expect(await manager.get('key', 'default', 'global')).toBe('global');
			expect(await manager.get('key', 'default', 'user')).toBe('user');
		});
	});

	describe('Error handling', () => {
		it('should continue working after backend save error', async () => {
			backend.shouldThrowOnSave = true;

			await manager.set('error-key', 'value');

			// Reset error
			backend.shouldThrowOnSave = false;

			// Should work normally now
			await manager.set('normal-key', 'value');
			expect(await manager.get('normal-key', 'default')).toBe('value');
		});

		it('should continue working after backend load error', async () => {
			backend.shouldThrowOnLoad = true;

			const value = await manager.get('error-key', 'default');
			expect(value).toBe('default');

			// Reset error
			backend.shouldThrowOnLoad = false;

			// Should work normally now
			await manager.set('normal-key', 'value');
			expect(await manager.get('normal-key', 'default')).toBe('value');
		});

		it('should continue working after backend delete error', async () => {
			backend.shouldThrowOnDelete = true;

			await manager.delete('error-key');

			// Reset error
			backend.shouldThrowOnDelete = false;

			// Should work normally now
			await manager.set('normal-key', 'value');
			await manager.delete('normal-key');
			expect(await manager.get('normal-key', 'default')).toBe('default');
		});

		it('should log errors to console', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			backend.shouldThrowOnSave = true;
			await manager.set('error-key', 'value');

			backend.shouldThrowOnLoad = true;
			await manager.get('error-key', 'default');

			backend.shouldThrowOnDelete = true;
			await manager.delete('error-key');

			expect(consoleErrorSpy.mock.calls.length + consoleWarnSpy.mock.calls.length).toBeGreaterThan(0);

			consoleErrorSpy.mockRestore();
			consoleWarnSpy.mockRestore();
		});
	});

	describe('Concurrent operations', () => {
		it('should handle concurrent reads', async () => {
			await manager.set('concurrent', 'value');

			const reads = await Promise.all([
				manager.get('concurrent', 'default'),
				manager.get('concurrent', 'default'),
				manager.get('concurrent', 'default')
			]);

			reads.forEach(value => {
				expect(value).toBe('value');
			});
		});

		it('should handle concurrent writes', async () => {
			await Promise.all([
				manager.set('multi', 'value1'),
				manager.set('multi', 'value2'),
				manager.set('multi', 'value3')
			]);

			const value = await manager.get('multi', 'default');

			// Should have one of the values (last write wins)
			expect(['value1', 'value2', 'value3']).toContain(value);
		});

		it('should handle mixed concurrent operations', async () => {
			await manager.set('mixed', 'initial');

			await Promise.all([
				manager.get('mixed', 'default'),
				manager.set('mixed', 'updated'),
				manager.get('mixed', 'default'),
				manager.delete('mixed')
			]);

			// Operations should complete without throwing
			expect(true).toBe(true);
		});
	});

	describe('Integration scenarios', () => {
		it('should work end-to-end with full workflow', async () => {
			// Create multiple preferences
			await manager.set('pref1', 'value1');
			await manager.set('pref2', 42);
			await manager.set('pref3', { nested: 'object' });

			// List all
			const keys = await manager.list('global');
			expect(keys).toHaveLength(3);

			// Load all
			const all = await manager.loadAll('global');
			expect(all.pref1).toBe('value1');
			expect(all.pref2).toBe(42);
			expect(all.pref3).toEqual({ nested: 'object' });

			// Update one
			await manager.set('pref1', 'updated');
			expect(await manager.get('pref1', 'default')).toBe('updated');

			// Delete one
			await manager.delete('pref2');
			expect(await manager.get('pref2', 'default')).toBe('default');

			// Clear all
			await manager.clear('global');
			const keysAfterClear = await manager.list('global');
			expect(keysAfterClear).toHaveLength(0);
		});

		it('should work with multiple scopes simultaneously', async () => {
			// Set preferences in different scopes
			await manager.set('theme', 'dark', 'global');
			await manager.set('theme', 'light', 'user');
			await manager.set('theme', 'auto', 'project');

			// Verify each scope is independent
			expect(await manager.get('theme', 'default', 'global')).toBe('dark');
			expect(await manager.get('theme', 'default', 'user')).toBe('light');
			expect(await manager.get('theme', 'default', 'project')).toBe('auto');

			// Clear one scope
			await manager.clear('user');

			// Other scopes should be unaffected
			expect(await manager.get('theme', 'default', 'global')).toBe('dark');
			expect(await manager.get('theme', 'default', 'user')).toBe('default');
			expect(await manager.get('theme', 'default', 'project')).toBe('auto');
		});

		it('should survive cache clear and reload from backend', async () => {
			// Set preferences
			await manager.set('persistent1', 'value1');
			await manager.set('persistent2', 'value2');

			// Clear cache
			manager.clearCache();

			// Should reload from backend
			expect(await manager.get('persistent1', 'default')).toBe('value1');
			expect(await manager.get('persistent2', 'default')).toBe('value2');
		});
	});
});
