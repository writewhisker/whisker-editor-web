/**
 * In-memory storage backend implementation
 * Uses a Map for ephemeral storage (testing/development)
 */

import { IStorageBackend } from '../interfaces/IStorageBackend.js';

export class MemoryBackend implements IStorageBackend {
  private storage: Map<string, any>;

  constructor() {
    this.storage = new Map();
  }

  /**
   * Save data to memory
   */
  async save(key: string, data: any): Promise<void> {
    try {
      // Deep clone to prevent external mutations
      this.storage.set(key, this.deepClone(data));
    } catch (error) {
      throw new Error(`Memory save error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load data from memory
   */
  async load(key: string): Promise<any | null> {
    try {
      if (!this.storage.has(key)) {
        return null;
      }
      // Deep clone to prevent external mutations
      return this.deepClone(this.storage.get(key));
    } catch (error) {
      throw new Error(`Memory load error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete data from memory
   */
  async delete(key: string): Promise<void> {
    try {
      this.storage.delete(key);
    } catch (error) {
      throw new Error(`Memory delete error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all keys in memory
   */
  async list(): Promise<string[]> {
    try {
      return Array.from(this.storage.keys());
    } catch (error) {
      throw new Error(`Memory list error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a key exists in memory
   */
  async exists(key: string): Promise<boolean> {
    try {
      return this.storage.has(key);
    } catch (error) {
      throw new Error(`Memory exists error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the size of stored data in bytes (estimated via JSON serialization)
   */
  async size(key: string): Promise<number> {
    try {
      if (!this.storage.has(key)) {
        return 0;
      }
      const data = this.storage.get(key);
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch (error) {
      throw new Error(`Memory size error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save multiple entries at once (batch operation)
   */
  async saveMany(entries: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(entries)) {
        this.storage.set(key, this.deepClone(value));
      }
    } catch (error) {
      throw new Error(`Memory saveMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load multiple entries at once (batch operation)
   */
  async loadMany(keys: string[]): Promise<Record<string, any>> {
    try {
      const results: Record<string, any> = {};

      for (const key of keys) {
        if (this.storage.has(key)) {
          results[key] = this.deepClone(this.storage.get(key));
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Memory loadMany error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all data from memory
   */
  async clear(): Promise<void> {
    try {
      this.storage.clear();
    } catch (error) {
      throw new Error(`Memory clear error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deep clone an object using JSON serialization
   * This ensures data isolation between storage and external references
   */
  private deepClone(data: any): any {
    try {
      // Handle primitives and null
      if (data === null || typeof data !== 'object') {
        return data;
      }

      // Use JSON serialization for deep cloning
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      throw new Error(`Failed to clone data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default MemoryBackend;
