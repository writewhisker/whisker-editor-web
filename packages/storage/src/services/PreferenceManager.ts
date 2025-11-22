/**
 * Preference Manager
 *
 * Framework-agnostic service for managing application preferences.
 * Provides async preference operations with caching for performance.
 */

import type { IStorageBackend } from '../interfaces/IStorageBackend';
import type { PreferenceScope, PreferenceEntry } from '../types/ExtendedStorage';

/**
 * Preference Manager
 *
 * Features:
 * - Async preference operations
 * - In-memory caching for performance
 * - Scope-based organization (global, user, project)
 * - Works with any IStorageBackend implementation
 */
export class PreferenceManager {
  private backend: IStorageBackend;
  private cache: Map<string, { value: any; scope: PreferenceScope }> = new Map();
  private initialized = false;

  constructor(backend: IStorageBackend) {
    this.backend = backend;
  }

  /**
   * Initialize the backend
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.backend.initialize();
    this.initialized = true;
  }

  /**
   * Get a preference value
   */
  async get<T>(
    key: string,
    defaultValue: T,
    scope: PreferenceScope = 'global'
  ): Promise<T> {
    await this.ensureInitialized();

    // Check cache first
    const cacheKey = this.buildCacheKey(key, scope);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.scope === scope) {
      return cached.value as T;
    }

    // Try to load from storage
    if (this.backend.loadPreference) {
      try {
        const storageKey = this.buildStorageKey(key, scope);
        const entry = await this.backend.loadPreference<T>(storageKey);

        if (entry && entry.value !== null && entry.value !== undefined) {
          // Update cache
          this.cache.set(cacheKey, {
            value: entry.value,
            scope: entry.scope,
          });
          return entry.value;
        }
      } catch (err) {
        console.warn(`Failed to load preference ${key}:`, err);
      }
    }

    // Return default if not found or storage unavailable
    return defaultValue;
  }

  /**
   * Set a preference value
   */
  async set<T>(
    key: string,
    value: T,
    scope: PreferenceScope = 'global'
  ): Promise<void> {
    await this.ensureInitialized();

    // Update cache
    const cacheKey = this.buildCacheKey(key, scope);
    this.cache.set(cacheKey, {
      value,
      scope,
    });

    // Persist to storage
    if (this.backend.savePreference) {
      try {
        const storageKey = this.buildStorageKey(key, scope);
        const entry: PreferenceEntry<T> = {
          value,
          scope,
          updatedAt: new Date().toISOString(),
        };
        await this.backend.savePreference(storageKey, entry);
      } catch (err) {
        console.error(`Failed to save preference ${key}:`, err);
        // Don't throw - allow app to continue with in-memory value
      }
    }
  }

  /**
   * Get a preference value synchronously (cache only)
   * Returns the cached value or the default value if not cached.
   * Note: This only reads from cache and doesn't access storage.
   */
  getPreferenceSync<T>(
    key: string,
    defaultValue: T,
    scope: PreferenceScope = 'global'
  ): T {
    const cacheKey = this.buildCacheKey(key, scope);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.scope === scope) {
      return cached.value as T;
    }

    return defaultValue;
  }

  /**
   * Set a preference value synchronously (cache only)
   * Updates the cache immediately and schedules async persistence.
   * Note: This updates cache immediately but persists to storage asynchronously.
   */
  setPreferenceSync<T>(
    key: string,
    value: T,
    scope: PreferenceScope = 'global'
  ): void {
    // Update cache immediately
    const cacheKey = this.buildCacheKey(key, scope);
    this.cache.set(cacheKey, {
      value,
      scope,
    });

    // Persist asynchronously (fire and forget)
    if (this.initialized && this.backend.savePreference) {
      const storageKey = this.buildStorageKey(key, scope);
      const entry: PreferenceEntry<T> = {
        value,
        scope,
        updatedAt: new Date().toISOString(),
      };
      this.backend.savePreference(storageKey, entry).catch(err => {
        console.error(`Failed to save preference ${key}:`, err);
      });
    }
  }

  /**
   * Delete a preference
   */
  async delete(key: string, scope: PreferenceScope = 'global'): Promise<void> {
    await this.ensureInitialized();

    // Remove from cache
    const cacheKey = this.buildCacheKey(key, scope);
    this.cache.delete(cacheKey);

    // Remove from storage
    if (this.backend.deletePreference) {
      try {
        const storageKey = this.buildStorageKey(key, scope);
        await this.backend.deletePreference(storageKey);
      } catch (err) {
        console.error(`Failed to delete preference ${key}:`, err);
      }
    }
  }

  /**
   * List all preference keys for a given scope
   */
  async list(scope: PreferenceScope = 'global'): Promise<string[]> {
    await this.ensureInitialized();

    if (this.backend.listPreferences) {
      try {
        const allKeys = await this.backend.listPreferences();
        const prefix = this.buildStorageKey('', scope);

        // Filter keys by scope prefix and remove the prefix
        return allKeys
          .filter(key => key.startsWith(prefix))
          .map(key => key.substring(prefix.length));
      } catch (err) {
        console.error('Failed to list preferences:', err);
      }
    }

    // Fallback to cache
    const keys: string[] = [];
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.scope === scope) {
        // Extract original key from cache key
        const originalKey = cacheKey.substring(scope.length + 1); // +1 for ':'
        keys.push(originalKey);
      }
    }
    return keys;
  }

  /**
   * Clear all preferences for a given scope
   */
  async clear(scope: PreferenceScope = 'global'): Promise<void> {
    await this.ensureInitialized();

    // Clear cache for this scope
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.scope === scope) {
        this.cache.delete(cacheKey);
      }
    }

    // Clear from storage
    try {
      const keys = await this.list(scope);
      await Promise.all(keys.map(key => this.delete(key, scope)));
    } catch (err) {
      console.error('Failed to clear preferences:', err);
    }
  }

  /**
   * Load all preferences for a scope into cache
   */
  async loadAll(scope: PreferenceScope = 'global'): Promise<Record<string, any>> {
    await this.ensureInitialized();

    const result: Record<string, any> = {};

    if (this.backend.listPreferences && this.backend.loadPreference) {
      try {
        const keys = await this.list(scope);

        // Load each preference
        await Promise.all(
          keys.map(async key => {
            const value = await this.get(key, undefined, scope);
            if (value !== undefined) {
              result[key] = value;
            }
          })
        );
      } catch (err) {
        console.error('Failed to load all preferences:', err);
      }
    }

    return result;
  }

  /**
   * Backward compatibility aliases
   */
  async getPreference<T>(key: string, defaultValue: T, scope: PreferenceScope = 'global'): Promise<T> {
    return this.get(key, defaultValue, scope);
  }

  async setPreference<T>(key: string, value: T, scope: PreferenceScope = 'global'): Promise<void> {
    return this.set(key, value, scope);
  }

  async listPreferences(scope: PreferenceScope = 'global'): Promise<string[]> {
    return this.list(scope);
  }

  /**
   * Clear the preference cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if the manager is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Build storage key with scope prefix
   */
  private buildStorageKey(key: string, scope: PreferenceScope): string {
    if (scope === 'project') {
      return `project:${key}`;
    }
    if (scope === 'user') {
      return `user:${key}`;
    }
    return `global:${key}`;
  }

  /**
   * Build cache key with scope prefix
   */
  private buildCacheKey(key: string, scope: PreferenceScope): string {
    return `${scope}:${key}`;
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
