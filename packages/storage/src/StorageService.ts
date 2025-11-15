/**
 * Storage service with event-driven architecture
 * Framework-agnostic storage layer that emits events instead of directly updating state
 */

import { EventEmitter } from 'eventemitter3';
import type { IStorageBackend } from './interfaces/IStorageBackend.js';

export interface StorageServiceEvents {
  'data-saved': (key: string, data: any) => void;
  'data-loaded': (key: string, data: any) => void;
  'data-deleted': (key: string) => void;
  'error': (error: Error) => void;
}

/**
 * Storage service that wraps a backend and emits events
 * This decouples storage from UI state management
 */
export class StorageService extends EventEmitter<StorageServiceEvents> {
  constructor(private backend: IStorageBackend) {
    super();
  }

  /**
   * Save data to storage
   * Emits 'data-saved' event on success
   */
  async save(key: string, data: any): Promise<void> {
    try {
      await this.backend.save(key, data);
      this.emit('data-saved', key, data);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Load data from storage
   * Emits 'data-loaded' event if data exists
   */
  async load(key: string): Promise<any | null> {
    try {
      const data = await this.backend.load(key);
      if (data !== null) {
        this.emit('data-loaded', key, data);
      }
      return data;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Delete data from storage
   * Emits 'data-deleted' event on success
   */
  async delete(key: string): Promise<void> {
    try {
      await this.backend.delete(key);
      this.emit('data-deleted', key);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * List all keys in storage
   */
  async list(): Promise<string[]> {
    try {
      return await this.backend.list();
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.backend.exists(key);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Get size of stored data (if supported by backend)
   */
  async size(key: string): Promise<number | undefined> {
    try {
      return this.backend.size ? await this.backend.size(key) : undefined;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Save multiple entries (if supported by backend)
   * Emits 'data-saved' for each entry
   */
  async saveMany(entries: Record<string, any>): Promise<void> {
    try {
      if (this.backend.saveMany) {
        await this.backend.saveMany(entries);
      } else {
        // Fallback to individual saves
        await Promise.all(
          Object.entries(entries).map(([key, data]) => this.backend.save(key, data))
        );
      }
      // Emit event for each entry
      Object.entries(entries).forEach(([key, data]) => {
        this.emit('data-saved', key, data);
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Load multiple entries (if supported by backend)
   * Emits 'data-loaded' for each entry found
   */
  async loadMany(keys: string[]): Promise<Record<string, any>> {
    try {
      let result: Record<string, any>;

      if (this.backend.loadMany) {
        result = await this.backend.loadMany(keys);
      } else {
        // Fallback to individual loads
        const entries = await Promise.all(
          keys.map(async (key) => {
            const data = await this.backend.load(key);
            return [key, data] as const;
          })
        );
        result = Object.fromEntries(entries.filter(([, data]) => data !== null));
      }

      // Emit event for each loaded entry
      Object.entries(result).forEach(([key, data]) => {
        this.emit('data-loaded', key, data);
      });

      return result;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Clear all data (if supported by backend)
   */
  async clear(): Promise<void> {
    try {
      if (this.backend.clear) {
        await this.backend.clear();
      } else {
        // Fallback: list all keys and delete them
        const keys = await this.backend.list();
        await Promise.all(keys.map((key) => this.backend.delete(key)));
      }
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Get the underlying backend
   */
  getBackend(): IStorageBackend {
    return this.backend;
  }
}
