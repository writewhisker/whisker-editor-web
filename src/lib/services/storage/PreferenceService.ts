/**
 * PreferenceService - Centralized preference management using storage adapter
 *
 * Provides both sync and async access to preferences, with caching for performance.
 * Integrates with the IStorageAdapter interface for pluggable storage backends.
 *
 * Phase 4 implementation - Store refactoring to use storage adapter
 */

import type { IStorageAdapter } from './types';
import { getDefaultStorageAdapter } from './StorageServiceFactory';

export type PreferenceScope = 'global' | 'project';

export interface PreferenceEntry<T = any> {
	value: T;
	scope: PreferenceScope;
	updatedAt: Date;
}

/**
 * Service for managing application preferences with storage adapter integration
 */
export class PreferenceService {
	private adapter: IStorageAdapter | null = null;
	private cache: Map<string, PreferenceEntry> = new Map();
	private ready = false;
	private initPromise: Promise<void> | null = null;

	constructor(adapter?: IStorageAdapter | null) {
		// If adapter is provided, use it directly
		if (adapter !== undefined) {
			this.adapter = adapter;
			this.initPromise = this.initializeWithAdapter(adapter);
		} else {
			// Otherwise, initialize with default adapter
			this.initPromise = this.initializeInternal();
		}
	}

	/**
	 * Initialize the storage adapter (internal method)
	 */
	private async initializeInternal(): Promise<void> {
		try {
			this.adapter = await getDefaultStorageAdapter();
			this.ready = true;
			console.log('PreferenceService initialized successfully');
		} catch (err) {
			console.error('PreferenceService initialization failed, running in-memory mode:', err);
			this.ready = false;
		}
	}

	/**
	 * Initialize with a specific adapter (for testing)
	 */
	private async initializeWithAdapter(adapter: IStorageAdapter | null): Promise<void> {
		try {
			this.adapter = adapter;
			if (adapter && adapter.isReady && !adapter.isReady()) {
				await adapter.initialize();
			}
			this.ready = true;
			console.log('PreferenceService initialized with provided adapter');
		} catch (err) {
			console.error('PreferenceService initialization with adapter failed:', err);
			this.ready = false;
		}
	}

	/**
	 * Ensure the service is initialized
	 */
	private async ensureReady(): Promise<void> {
		if (this.initPromise) {
			await this.initPromise;
		}
	}

	/**
	 * Get preference value asynchronously (preferred method)
	 */
	async getPreference<T>(
		key: string,
		defaultValue: T,
		scope: PreferenceScope = 'global'
	): Promise<T> {
		await this.ensureReady();

		// Check cache first
		const cached = this.cache.get(key);
		if (cached && cached.scope === scope) {
			return cached.value as T;
		}

		// Try to load from storage
		if (this.adapter && this.ready) {
			try {
				const storageKey = this.buildStorageKey(key, scope);
				const storedValue = await this.adapter.loadPreference(storageKey, scope);

				if (storedValue !== null && storedValue !== undefined) {
					// Update cache
					this.cache.set(key, {
						value: storedValue,
						scope,
						updatedAt: new Date(),
					});
					return storedValue as T;
				}
			} catch (err) {
				console.warn(`Failed to load preference ${key}:`, err);
			}
		}

		// Return default if not found or storage unavailable
		return defaultValue;
	}

	/**
	 * Set preference value asynchronously (preferred method)
	 */
	async setPreference<T>(
		key: string,
		value: T,
		scope: PreferenceScope = 'global'
	): Promise<void> {
		await this.ensureReady();

		// Update cache
		this.cache.set(key, {
			value,
			scope,
			updatedAt: new Date(),
		});

		// Persist to storage
		if (this.adapter && this.ready) {
			try {
				const storageKey = this.buildStorageKey(key, scope);
				await this.adapter.savePreference(storageKey, value, scope);
			} catch (err) {
				console.error(`Failed to save preference ${key}:`, err);
				// Don't throw - allow app to continue with in-memory value
			}
		} else {
			console.warn(`Storage not ready, preference ${key} saved to cache only`);
		}
	}

	/**
	 * Get preference value synchronously (for backward compatibility)
	 * Note: Falls back to cache or default if async load hasn't completed
	 */
	getPreferenceSync<T>(key: string, defaultValue: T): T {
		// Check cache first
		const cached = this.cache.get(key);
		if (cached) {
			return cached.value as T;
		}

		// Try localStorage directly as fallback (for backward compatibility)
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				const stored = localStorage.getItem(key);
				if (stored !== null) {
					const parsed = JSON.parse(stored);
					// Update cache for next time
					this.cache.set(key, {
						value: parsed,
						scope: 'global',
						updatedAt: new Date(),
					});
					return parsed as T;
				}
			} catch (err) {
				console.warn(`Failed to load preference ${key} from localStorage:`, err);
			}
		}

		return defaultValue;
	}

	/**
	 * Set preference value synchronously (for backward compatibility)
	 * Note: Async save happens in background
	 */
	setPreferenceSync<T>(key: string, value: T, scope: PreferenceScope = 'global'): void {
		// Update cache immediately
		this.cache.set(key, {
			value,
			scope,
			updatedAt: new Date(),
		});

		// Save to localStorage immediately for backward compatibility
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				localStorage.setItem(key, JSON.stringify(value));
			} catch (err) {
				console.warn(`Failed to save preference ${key} to localStorage:`, err);
			}
		}

		// Async save to adapter (non-blocking)
		if (this.adapter && this.ready) {
			const storageKey = this.buildStorageKey(key, scope);
			this.adapter.savePreference(storageKey, value, scope).catch(err => {
				console.error(`Background save failed for preference ${key}:`, err);
			});
		}
	}

	/**
	 * Delete a preference
	 */
	async deletePreference(key: string, scope: PreferenceScope = 'global'): Promise<void> {
		await this.ensureReady();

		// Remove from cache
		this.cache.delete(key);

		// Remove from storage
		if (this.adapter && this.ready) {
			try {
				const storageKey = this.buildStorageKey(key, scope);
				await this.adapter.deletePreference(storageKey);
			} catch (err) {
				console.error(`Failed to delete preference ${key}:`, err);
			}
		}

		// Remove from localStorage for backward compatibility
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				localStorage.removeItem(key);
			} catch (err) {
				console.warn(`Failed to delete preference ${key} from localStorage:`, err);
			}
		}
	}

	/**
	 * List all preferences for a given scope
	 */
	async listPreferences(scope: PreferenceScope = 'global'): Promise<string[]> {
		await this.ensureReady();

		if (this.adapter && this.ready) {
			try {
				const prefix = this.buildStorageKey('', scope);
				return await this.adapter.listPreferences(prefix);
			} catch (err) {
				console.error('Failed to list preferences:', err);
			}
		}

		// Fallback to cache
		const keys: string[] = [];
		for (const [key, entry] of this.cache.entries()) {
			if (entry.scope === scope) {
				keys.push(key);
			}
		}
		return keys;
	}

	/**
	 * Clear all preferences for a given scope
	 */
	async clearPreferences(scope: PreferenceScope = 'global'): Promise<void> {
		await this.ensureReady();

		// Clear cache for this scope
		for (const [key, entry] of this.cache.entries()) {
			if (entry.scope === scope) {
				this.cache.delete(key);
			}
		}

		// Clear from storage
		if (this.adapter && this.ready) {
			try {
				const keys = await this.listPreferences(scope);
				await Promise.all(keys.map(key => this.deletePreference(key, scope)));
			} catch (err) {
				console.error('Failed to clear preferences:', err);
			}
		}
	}

	/**
	 * Build storage key with scope prefix
	 */
	private buildStorageKey(key: string, scope: PreferenceScope): string {
		if (scope === 'project') {
			return `project:${key}`;
		}
		return `global:${key}`;
	}

	/**
	 * Check if service is ready
	 */
	isReady(): boolean {
		return this.ready;
	}

	/**
	 * Wait for service to be ready (public API for testing)
	 */
	async initialize(): Promise<void> {
		await this.ensureReady();
	}

	/**
	 * Wait for service to be ready
	 */
	async waitForReady(): Promise<void> {
		await this.ensureReady();
	}

	/**
	 * Clear the preference cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Dispose the service and clean up resources
	 */
	dispose(): void {
		this.cache.clear();
		this.ready = false;
		this.adapter = null;
		this.initPromise = null;
	}
}

// Singleton instance
let preferenceServiceInstance: PreferenceService | null = null;

/**
 * Get the singleton PreferenceService instance
 */
export function getPreferenceService(): PreferenceService {
	if (!preferenceServiceInstance) {
		preferenceServiceInstance = new PreferenceService();
	}
	return preferenceServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPreferenceService(): void {
	preferenceServiceInstance = null;
}
