/**
 * IndexedDB Storage Adapter
 *
 * Provides IndexedDB backend for the storage system.
 * Suitable for larger data sets like stories and project files.
 */

import type { IStorageAdapter, PreferenceScope } from './types';

export interface IndexedDBConfig {
  dbName: string;
  version: number;
}

export class IndexedDBAdapter implements IStorageAdapter {
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

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to load story: ${request.error}`));
    });
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
      const transaction = this.db!.transaction(['preferences', 'stories'], 'readwrite');

      const prefStore = transaction.objectStore('preferences');
      const storyStore = transaction.objectStore('stories');

      const prefRequest = prefStore.clear();
      const storyRequest = storyStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to clear IndexedDB: ${transaction.error}`));
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
