/**
 * LocalStorage storage backend implementation
 * Uses browser localStorage for persistent storage
 */

import { IStorageBackend } from '../interfaces/IStorageBackend.js';

export class LocalStorageBackend implements IStorageBackend {
  private prefix: string;

  constructor(prefix: string = 'whisker:') {
    this.prefix = prefix;
  }

  /**
   * Get the full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Remove prefix from a full key
   */
  private stripPrefix(fullKey: string): string {
    return fullKey.startsWith(this.prefix) ? fullKey.slice(this.prefix.length) : fullKey;
  }

  /**
   * Save data to localStorage
   */
  async save(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.getFullKey(key), serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(`LocalStorage quota exceeded when saving key "${key}"`);
      }
      throw new Error(`LocalStorage save error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load data from localStorage
   */
  async load(key: string): Promise<any | null> {
    try {
      const serialized = localStorage.getItem(this.getFullKey(key));

      if (serialized === null) {
        return null;
      }

      try {
        return JSON.parse(serialized);
      } catch (error) {
        throw new Error(`Failed to parse data for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      throw new Error(`LocalStorage load error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete data from localStorage
   */
  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getFullKey(key));
    } catch (error) {
      throw new Error(`LocalStorage delete error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all keys in localStorage (with this prefix)
   */
  async list(): Promise<string[]> {
    try {
      const keys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          keys.push(this.stripPrefix(fullKey));
        }
      }

      return keys;
    } catch (error) {
      throw new Error(`LocalStorage list error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a key exists in localStorage
   */
  async exists(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(this.getFullKey(key)) !== null;
    } catch (error) {
      throw new Error(`LocalStorage exists error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the size of stored data in bytes
   */
  async size(key: string): Promise<number> {
    try {
      const serialized = localStorage.getItem(this.getFullKey(key));

      if (serialized === null) {
        return 0;
      }

      return new Blob([serialized]).size;
    } catch (error) {
      throw new Error(`LocalStorage size error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save multiple entries at once (batch operation)
   */
  async saveMany(entries: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(entries)) {
        const serialized = JSON.stringify(value);
        localStorage.setItem(this.getFullKey(key), serialized);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded during batch save');
      }
      throw new Error(`LocalStorage saveMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load multiple entries at once (batch operation)
   */
  async loadMany(keys: string[]): Promise<Record<string, any>> {
    try {
      const results: Record<string, any> = {};

      for (const key of keys) {
        const serialized = localStorage.getItem(this.getFullKey(key));

        if (serialized !== null) {
          try {
            results[key] = JSON.parse(serialized);
          } catch (error) {
            throw new Error(`Failed to parse data for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`LocalStorage loadMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all data from localStorage (only items with this prefix)
   */
  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          keysToRemove.push(fullKey);
        }
      }

      for (const fullKey of keysToRemove) {
        localStorage.removeItem(fullKey);
      }
    } catch (error) {
      throw new Error(`LocalStorage clear error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default LocalStorageBackend;
