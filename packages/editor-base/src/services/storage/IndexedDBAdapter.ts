/**
 * IndexedDB Storage Adapter
 *
 * @deprecated This adapter is kept only for legacy data migration purposes.
 * New code should use @writewhisker/storage package instead.
 * See modernStoryMigration.ts for migration usage.
 *
 * Provides IndexedDB backend for the storage system.
 * Suitable for larger data sets like stories and project files.
 *
 * Note: This is a partial implementation focusing on preferences.
 * Full IStorageAdapter implementation is pending.
 */

import type { PreferenceScope } from './types';

export interface IndexedDBConfig {
  dbName: string;
  version: number;
}

export class IndexedDBAdapter {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private ready = false;

  constructor(config: IndexedDBConfig = { dbName: 'whisker-storage', version: 1 }) {
    this.dbName = config.dbName;
    this.dbVersion = config.version;
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('preferences')) {
          const prefStore = db.createObjectStore('preferences', { keyPath: 'key' });
          prefStore.createIndex('scope', 'scope', { unique: false });
          prefStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('stories')) {
          const storyStore = db.createObjectStore('stories', { keyPath: 'id' });
          storyStore.createIndex('title', 'title', { unique: false });
          storyStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          storyStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync queue for background sync
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('storyId', 'storyId', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // GitHub tokens
        if (!db.objectStoreNames.contains('githubTokens')) {
          db.createObjectStore('githubTokens', { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Check if the adapter is ready
   */
  isReady(): boolean {
    return this.ready && this.db !== null;
  }

  /**
   * Save a preference to IndexedDB
   */
  async savePreference<T>(
    key: string,
    value: T,
    scope: PreferenceScope = 'global'
  ): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');

      const data = {
        key,
        value,
        scope,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save preference: ${request.error}`));
    });
  }

  /**
   * Load a preference from IndexedDB
   */
  async loadPreference<T>(
    key: string,
    scope: PreferenceScope = 'global'
  ): Promise<T | null> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.scope === scope) {
          resolve(result.value as T);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error(`Failed to load preference: ${request.error}`));
    });
  }

  /**
   * Delete a preference from IndexedDB
   */
  async deletePreference(key: string): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete preference: ${request.error}`));
    });
  }

  /**
   * List all preference keys for a given scope
   */
  async listPreferences(prefix: string = ''): Promise<string[]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        if (prefix) {
          resolve(keys.filter(key => key.startsWith(prefix)));
        } else {
          resolve(keys);
        }
      };

      request.onerror = () => reject(new Error(`Failed to list preferences: ${request.error}`));
    });
  }

  /**
   * Save a story to IndexedDB
   */
  async saveStory(story: any): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stories'], 'readwrite');
      const store = transaction.objectStore('stories');

      // Ensure story has an id field for IndexedDB keyPath
      const id = story.id || story.metadata?.id;
      if (!id) {
        reject(new Error('Story must have an id or metadata.id'));
        return;
      }

      const data = {
        ...story,
        id, // Ensure id is at root level for keyPath
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save story: ${request.error}`));
    });
  }

  /**
   * Load a story from IndexedDB
   */
  async loadStory(id: string): Promise<any | null> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stories'], 'readonly');
      const store = transaction.objectStore('stories');
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          // Convert ISO string dates back to Date objects
          this.restoreDateFields(data);
        }
        resolve(data || null);
      };
      request.onerror = () => reject(new Error(`Failed to load story: ${request.error}`));
    });
  }

  /**
   * Recursively restore Date objects from ISO string fields
   */
  private restoreDateFields(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    // Common date field names to check
    // Note: 'updatedAt' is excluded because it's a storage-level timestamp that should remain as ISO string
    const dateFields = ['created', 'modified', 'createdAt', 'timestamp'];

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      // Check if this is a date field with a string value
      if (dateFields.includes(key) && typeof value === 'string') {
        try {
          obj[key] = new Date(value);
        } catch (e) {
          // If conversion fails, leave as-is
          console.warn(`Failed to convert ${key} to Date:`, value);
        }
      }

      // Recursively process nested objects and arrays
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => this.restoreDateFields(item));
        } else {
          this.restoreDateFields(value);
        }
      }
    }
  }

  /**
   * Delete a story from IndexedDB
   */
  async deleteStory(id: string): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stories'], 'readwrite');
      const store = transaction.objectStore('stories');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete story: ${request.error}`));
    });
  }

  /**
   * List all stories
   */
  async listStories(): Promise<any[]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['stories'], 'readonly');
      const store = transaction.objectStore('stories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to list stories: ${request.error}`));
    });
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{ used: number; total: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        return {
          used,
          total,
          available: total - used,
        };
      } catch (error) {
        console.error('Failed to get storage quota:', error);
      }
    }

    // Fallback values
    return { used: 0, total: 0, available: 0 };
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const storeNames = ['preferences', 'stories', 'syncQueue', 'githubTokens'];
      const transaction = this.db!.transaction(storeNames, 'readwrite');

      storeNames.forEach(storeName => {
        if (this.db!.objectStoreNames.contains(storeName)) {
          transaction.objectStore(storeName).clear();
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to clear IndexedDB: ${transaction.error}`));
    });
  }

  // ===== Sync Queue Methods =====

  /**
   * Add an entry to the sync queue
   */
  async addToSyncQueue(entry: any): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const data = {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add to sync queue: ${request.error}`));
    });
  }

  /**
   * Get all entries from sync queue
   */
  async getSyncQueue(): Promise<any[]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get sync queue: ${request.error}`));
    });
  }

  /**
   * Remove an entry from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to remove from sync queue: ${request.error}`));
    });
  }

  /**
   * Clear the entire sync queue
   */
  async clearSyncQueue(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear sync queue: ${request.error}`));
    });
  }

  // ===== GitHub Token Methods =====

  /**
   * Save GitHub token
   */
  async saveGitHubToken(token: any): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['githubTokens'], 'readwrite');
      const store = transaction.objectStore('githubTokens');

      const data = {
        ...token,
        id: 'current', // Always use 'current' as the key
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save GitHub token: ${request.error}`));
    });
  }

  /**
   * Load GitHub token
   */
  async loadGitHubToken(): Promise<any | null> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['githubTokens'], 'readonly');
      const store = transaction.objectStore('githubTokens');
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to load GitHub token: ${request.error}`));
    });
  }

  /**
   * Delete GitHub token
   */
  async deleteGitHubToken(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['githubTokens'], 'readwrite');
      const store = transaction.objectStore('githubTokens');
      const request = store.delete('current');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete GitHub token: ${request.error}`));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      this.initPromise = null;
    }
  }
}
