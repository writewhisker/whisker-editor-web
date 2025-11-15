/**
 * IndexedDB storage backend implementation
 * Uses IndexedDB for browser-based persistent storage
 */

import { IStorageBackend } from '../interfaces/IStorageBackend.js';

export class IndexedDBBackend implements IStorageBackend {
  private dbName: string;
  private storeName = 'storage';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  /**
   * Initialize the IndexedDB database
   */
  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get a transaction for the object store
   */
  private async getTransaction(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction([this.storeName], mode);
    return transaction.objectStore(this.storeName);
  }

  /**
   * Save data to IndexedDB
   */
  async save(key: string, data: any): Promise<void> {
    try {
      const store = await this.getTransaction('readwrite');
      const serialized = JSON.stringify(data);

      return new Promise((resolve, reject) => {
        const request = store.put(serialized, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to save key "${key}": ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB save error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load data from IndexedDB
   */
  async load(key: string): Promise<any | null> {
    try {
      const store = await this.getTransaction('readonly');

      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result === undefined) {
            resolve(null);
          } else {
            try {
              resolve(JSON.parse(request.result));
            } catch (error) {
              reject(new Error(`Failed to parse data for key "${key}": ${error instanceof Error ? error.message : String(error)}`));
            }
          }
        };

        request.onerror = () => reject(new Error(`Failed to load key "${key}": ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB load error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(key: string): Promise<void> {
    try {
      const store = await this.getTransaction('readwrite');

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete key "${key}": ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB delete error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all keys in IndexedDB
   */
  async list(): Promise<string[]> {
    try {
      const store = await this.getTransaction('readonly');

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result.map(key => String(key)));
        };

        request.onerror = () => reject(new Error(`Failed to list keys: ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB list error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a key exists in IndexedDB
   */
  async exists(key: string): Promise<boolean> {
    try {
      const store = await this.getTransaction('readonly');

      return new Promise((resolve, reject) => {
        const request = store.getKey(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined);
        };

        request.onerror = () => reject(new Error(`Failed to check existence of key "${key}": ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB exists error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the size of stored data in bytes
   */
  async size(key: string): Promise<number> {
    try {
      const store = await this.getTransaction('readonly');

      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result === undefined) {
            resolve(0);
          } else {
            const byteSize = new Blob([request.result]).size;
            resolve(byteSize);
          }
        };

        request.onerror = () => reject(new Error(`Failed to get size of key "${key}": ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB size error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save multiple entries at once (batch operation)
   */
  async saveMany(entries: Record<string, any>): Promise<void> {
    try {
      const store = await this.getTransaction('readwrite');
      const promises: Promise<void>[] = [];

      for (const [key, value] of Object.entries(entries)) {
        const serialized = JSON.stringify(value);
        promises.push(
          new Promise((resolve, reject) => {
            const request = store.put(serialized, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to save key "${key}": ${request.error?.message}`));
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      throw new Error(`IndexedDB saveMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load multiple entries at once (batch operation)
   */
  async loadMany(keys: string[]): Promise<Record<string, any>> {
    try {
      const store = await this.getTransaction('readonly');
      const results: Record<string, any> = {};
      const promises: Promise<void>[] = [];

      for (const key of keys) {
        promises.push(
          new Promise((resolve, reject) => {
            const request = store.get(key);

            request.onsuccess = () => {
              if (request.result !== undefined) {
                try {
                  results[key] = JSON.parse(request.result);
                } catch (error) {
                  reject(new Error(`Failed to parse data for key "${key}": ${error instanceof Error ? error.message : String(error)}`));
                  return;
                }
              }
              resolve();
            };

            request.onerror = () => reject(new Error(`Failed to load key "${key}": ${request.error?.message}`));
          })
        );
      }

      await Promise.all(promises);
      return results;
    } catch (error) {
      throw new Error(`IndexedDB loadMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  async clear(): Promise<void> {
    try {
      const store = await this.getTransaction('readwrite');

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear store: ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB clear error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default IndexedDBBackend;
