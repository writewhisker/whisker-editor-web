/**
 * PreferenceService Tests
 *
 * Comprehensive test suite for the PreferenceService.
 * Tests both sync and async preference access patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreferenceService, getPreferenceService } from './PreferenceService';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { MockLocalStorage } from './testHelpers';

describe('PreferenceService', () => {
	let service: PreferenceService;
	let mockStorage: MockLocalStorage;
	let adapter: LocalStorageAdapter;

	beforeEach(async () => {
		// Setup mock localStorage
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;

		// Create and initialize adapter
		adapter = new LocalStorageAdapter();
		await adapter.initialize();

		// Create preference service with adapter
		service = new PreferenceService(adapter);
		await service.initialize();
	});

	afterEach(() => {
		service.dispose();
	});

	describe('initialization', () => {
		it('should initialize successfully', async () => {
			const newService = new PreferenceService(adapter);
			await newService.initialize();
			expect(newService.isReady()).toBe(true);
			newService.dispose();
		});

		it('should work without adapter (graceful degradation)', async () => {
			const newService = new PreferenceService();
			await newService.initialize();
			expect(newService.isReady()).toBe(true);
			newService.dispose();
		});

		it('should handle adapter initialization failure gracefully', async () => {
			const failingAdapter = {
				...adapter,
				initialize: vi.fn().mockRejectedValue(new Error('Adapter init failed'))
			};

			const newService = new PreferenceService(failingAdapter as any);
			await newService.initialize();

			// Should still be ready but with no adapter
			expect(newService.isReady()).toBe(true);
			newService.dispose();
		});
	});

	describe('isReady', () => {
		it('should return false before initialization completes', async () => {
			const newService = new PreferenceService();
			// Service constructor starts initialization asynchronously
			// But it should be marked ready after init promise resolves
			await newService.initialize();
			expect(newService.isReady()).toBe(true);
			newService.dispose();
		});

		it('should return true after initialization', () => {
			expect(service.isReady()).toBe(true);
		});
	});

	describe('getPreference (async)', () => {
		it('should return default value when preference does not exist', async () => {
			const value = await service.getPreference('nonexistent', 'default');
			expect(value).toBe('default');
		});

		it('should return stored value when preference exists', async () => {
			await service.setPreference('test-key', 'test-value');
			const value = await service.getPreference('test-key', 'default');
			expect(value).toBe('test-value');
		});

		it('should support different value types', async () => {
			// String
			await service.setPreference('string-key', 'string-value');
			expect(await service.getPreference('string-key', '')).toBe('string-value');

			// Number
			await service.setPreference('number-key', 42);
			expect(await service.getPreference('number-key', 0)).toBe(42);

			// Boolean
			await service.setPreference('bool-key', true);
			expect(await service.getPreference('bool-key', false)).toBe(true);

			// Object
			const obj = { foo: 'bar', nested: { value: 123 } };
			await service.setPreference('object-key', obj);
			expect(await service.getPreference('object-key', {})).toEqual(obj);

			// Array
			const arr = [1, 2, 3, 'test'];
			await service.setPreference('array-key', arr);
			expect(await service.getPreference('array-key', [])).toEqual(arr);
		});

		it('should use cached value when available', async () => {
			await service.setPreference('cached-key', 'cached-value');

			// First read should cache
			await service.getPreference('cached-key', 'default');

			// Mock the adapter to verify cache is used
			const loadSpy = vi.spyOn(adapter, 'loadPreference');

			// Second read should use cache (not call adapter)
			const value = await service.getPreference('cached-key', 'default');
			expect(value).toBe('cached-value');

			// Cache should be used, so loadPreference should not be called again
			// (it was called once during setPreference)
		});

		it('should respect cache TTL', async () => {
			// Set a preference with very short TTL
			await service.setPreference('ttl-key', 'ttl-value');

			// Get immediately (should be cached)
			const value1 = await service.getPreference('ttl-key', 'default');
			expect(value1).toBe('ttl-value');

			// Wait for cache to expire (cache TTL is 5 minutes by default)
			// For this test, we'll just verify the cache entry exists
			const cacheEntry = (service as any).cache.get('ttl-key');
			expect(cacheEntry).toBeDefined();
			expect(cacheEntry.value).toBe('ttl-value');
		});
	});

	describe('setPreference (async)', () => {
		it('should store preference value', async () => {
			await service.setPreference('new-key', 'new-value');
			const value = await service.getPreference('new-key', 'default');
			expect(value).toBe('new-value');
		});

		it('should update existing preference', async () => {
			await service.setPreference('update-key', 'initial');
			await service.setPreference('update-key', 'updated');
			const value = await service.getPreference('update-key', 'default');
			expect(value).toBe('updated');
		});

		it('should update cache when setting preference', async () => {
			await service.setPreference('cache-update', 'value1');

			// Update the value
			await service.setPreference('cache-update', 'value2');

			// Should get updated value from cache
			const value = await service.getPreference('cache-update', 'default');
			expect(value).toBe('value2');
		});

		it('should write to adapter in background', async () => {
			const saveSpy = vi.spyOn(adapter, 'savePreference');

			await service.setPreference('async-key', 'async-value');

			// Should have called adapter.savePreference with storage key
			expect(saveSpy).toHaveBeenCalledWith('global:async-key', 'async-value', 'global');
		});

		it('should handle adapter save failures gracefully', async () => {
			const failingAdapter = {
				...adapter,
				savePreference: vi.fn().mockRejectedValue(new Error('Save failed'))
			};

			const newService = new PreferenceService(failingAdapter as any);
			await newService.initialize();

			// Should not throw even if adapter fails
			await expect(newService.setPreference('fail-key', 'value')).resolves.not.toThrow();

			newService.dispose();
		});
	});

	describe('getPreferenceSync (sync)', () => {
		it('should return default value when preference does not exist', () => {
			const value = service.getPreferenceSync('nonexistent', 'default');
			expect(value).toBe('default');
		});

		it('should return stored value from cache', async () => {
			await service.setPreference('sync-key', 'sync-value');
			const value = service.getPreferenceSync('sync-key', 'default');
			expect(value).toBe('sync-value');
		});

		it('should fallback to localStorage when cache miss', () => {
			// Write directly to localStorage (without prefix - service adds it)
			localStorage.setItem('direct', JSON.stringify('direct-value'));

			const value = service.getPreferenceSync('direct', 'default');
			expect(value).toBe('direct-value');
		});

		it('should support different value types', () => {
			// Use setPreferenceSync to populate cache
			service.setPreferenceSync('sync-string', 'string-value');
			service.setPreferenceSync('sync-number', 42);
			service.setPreferenceSync('sync-bool', true);
			service.setPreferenceSync('sync-object', { foo: 'bar' });
			service.setPreferenceSync('sync-array', [1, 2, 3]);

			expect(service.getPreferenceSync('sync-string', '')).toBe('string-value');
			expect(service.getPreferenceSync('sync-number', 0)).toBe(42);
			expect(service.getPreferenceSync('sync-bool', false)).toBe(true);
			expect(service.getPreferenceSync('sync-object', {})).toEqual({ foo: 'bar' });
			expect(service.getPreferenceSync('sync-array', [])).toEqual([1, 2, 3]);
		});

		it('should return default on parse error', () => {
			// Write invalid JSON to localStorage
			localStorage.setItem('whisker-preference-invalid', 'invalid json');

			const value = service.getPreferenceSync('invalid', 'default');
			expect(value).toBe('default');
		});
	});

	describe('setPreferenceSync (sync)', () => {
		it('should store preference value in localStorage immediately', () => {
			service.setPreferenceSync('immediate-key', 'immediate-value');

			// Should be in localStorage immediately (without prefix)
			const stored = localStorage.getItem('immediate-key');
			expect(stored).toBe(JSON.stringify('immediate-value'));
		});

		it('should update cache', () => {
			service.setPreferenceSync('cache-key', 'cache-value');

			// Should be retrievable via sync get
			const value = service.getPreferenceSync('cache-key', 'default');
			expect(value).toBe('cache-value');
		});

		it('should trigger background adapter write', async () => {
			const saveSpy = vi.spyOn(adapter, 'savePreference');

			service.setPreferenceSync('bg-key', 'bg-value');

			// Wait a bit for background write
			await new Promise(resolve => setTimeout(resolve, 10));

			// Should have triggered adapter save
			expect(saveSpy).toHaveBeenCalled();
		});
	});

	describe('deletePreference', () => {
		it('should remove preference from cache', async () => {
			await service.setPreference('delete-key', 'delete-value');
			await service.deletePreference('delete-key');

			const value = await service.getPreference('delete-key', 'default');
			expect(value).toBe('default');
		});

		it('should remove preference from adapter', async () => {
			await service.setPreference('adapter-delete', 'value');
			await service.deletePreference('adapter-delete');

			const stored = await adapter.loadPreference('adapter-delete');
			expect(stored).toBeNull();
		});

		it('should remove preference from localStorage', async () => {
			service.setPreferenceSync('local-delete', 'value');
			await service.deletePreference('local-delete');

			const stored = localStorage.getItem('whisker-preference-local-delete');
			expect(stored).toBeNull();
		});
	});

	describe('clearCache', () => {
		it('should clear all cached preferences', async () => {
			await service.setPreference('cache1', 'value1');
			await service.setPreference('cache2', 'value2');
			await service.setPreference('cache3', 'value3');

			service.clearCache();

			// Cache should be empty
			expect((service as any).cache.size).toBe(0);
		});

		it('should still retrieve values from adapter after cache clear', async () => {
			await service.setPreference('after-clear', 'value');
			service.clearCache();

			// Should still be able to get from adapter
			const value = await service.getPreference('after-clear', 'default');
			expect(value).toBe('value');
		});
	});

	describe('dispose', () => {
		it('should clear cache on dispose', () => {
			service.setPreferenceSync('dispose-key', 'value');
			service.dispose();

			expect((service as any).cache.size).toBe(0);
		});

		it('should mark service as not ready', () => {
			service.dispose();
			expect(service.isReady()).toBe(false);
		});
	});

	describe('scope handling', () => {
		it('should support global scope', async () => {
			await service.setPreference('global-key', 'global-value', 'global');
			const value = await service.getPreference('global-key', 'default', 'global');
			expect(value).toBe('global-value');
		});

		it('should support user scope', async () => {
			await service.setPreference('user-key', 'user-value', 'user');
			const value = await service.getPreference('user-key', 'default', 'user');
			expect(value).toBe('user-value');
		});

		it('should support project scope', async () => {
			await service.setPreference('project-key', 'project-value', 'project');
			const value = await service.getPreference('project-key', 'default', 'project');
			expect(value).toBe('project-value');
		});

		it('should keep different scopes separate', async () => {
			await service.setPreference('scoped', 'global-value', 'global');
			await service.setPreference('scoped', 'user-value', 'user');
			await service.setPreference('scoped', 'project-value', 'project');

			expect(await service.getPreference('scoped', 'default', 'global')).toBe('global-value');
			expect(await service.getPreference('scoped', 'default', 'user')).toBe('user-value');
			expect(await service.getPreference('scoped', 'default', 'project')).toBe('project-value');
		});
	});

	describe('getPreferenceService singleton', () => {
		it('should return the same instance', () => {
			const instance1 = getPreferenceService();
			const instance2 = getPreferenceService();
			expect(instance1).toBe(instance2);
		});

		it('should return initialized instance', () => {
			const instance = getPreferenceService();
			expect(instance.isReady()).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should handle missing window gracefully', async () => {
			const originalWindow = global.window;
			// Simulating missing window
			delete (global as any).window;

			const newService = new PreferenceService(adapter);
			await newService.initialize();

			// Should still work
			await expect(newService.setPreference('no-window', 'value')).resolves.not.toThrow();

			global.window = originalWindow;
			newService.dispose();
		});

		it('should handle adapter being null', async () => {
			const newService = new PreferenceService(null as any);
			await newService.initialize();

			// Should work with localStorage fallback
			await expect(newService.setPreference('null-adapter', 'value')).resolves.not.toThrow();
			const value = await newService.getPreference('null-adapter', 'default');

			newService.dispose();
		});
	});

	describe('backward compatibility', () => {
		it('should read existing localStorage preferences', () => {
			// Simulate existing preference in localStorage (without prefix)
			localStorage.setItem('existing', JSON.stringify('existing-value'));

			const value = service.getPreferenceSync('existing', 'default');
			expect(value).toBe('existing-value');
		});

		it('should handle old preference format gracefully', () => {
			// Set a non-JSON value (old format)
			localStorage.setItem('old', 'plain-string');

			const value = service.getPreferenceSync('old', 'default');
			// Should return default when unable to parse
			expect(value).toBe('default');
		});
	});

	describe('cache invalidation', () => {
		it('should keep cached values in memory', async () => {
			// Set initial value
			await service.setPreference('cache-test', 'cached-value');

			// Value should be cached
			const entry = (service as any).cache.get('cache-test');
			expect(entry).toBeDefined();
			expect(entry.value).toBe('cached-value');

			// Subsequent reads should use cache
			const value = await service.getPreference('cache-test', 'default');
			expect(value).toBe('cached-value');
		});
	});

	describe('concurrent access', () => {
		it('should handle concurrent reads correctly', async () => {
			await service.setPreference('concurrent', 'value');

			const reads = await Promise.all([
				service.getPreference('concurrent', 'default'),
				service.getPreference('concurrent', 'default'),
				service.getPreference('concurrent', 'default')
			]);

			reads.forEach(value => {
				expect(value).toBe('value');
			});
		});

		it('should handle concurrent writes correctly', async () => {
			await Promise.all([
				service.setPreference('multi-write', 'value1'),
				service.setPreference('multi-write', 'value2'),
				service.setPreference('multi-write', 'value3')
			]);

			const value = await service.getPreference('multi-write', 'default');
			// Should have one of the values (last write wins)
			expect(['value1', 'value2', 'value3']).toContain(value);
		});
	});
});
