/**
 * Main storage service with event-driven architecture
 * Framework-agnostic, can be used with any UI framework
 */

import EventEmitter from 'eventemitter3';
import type { StoryData } from '@writewhisker/core-ts';
import type { IStorageBackend, StorageMetadata } from './interfaces/IStorageBackend.js';
import { StorageEventType, type StorageEvent } from './events/StorageEvents.js';

export class StorageService extends EventEmitter<{
  [StorageEventType.STORY_SAVED]: (event: StorageEvent) => void;
  [StorageEventType.STORY_LOADED]: (event: StorageEvent) => void;
  [StorageEventType.STORY_DELETED]: (event: StorageEvent) => void;
  [StorageEventType.STORY_CREATED]: (event: StorageEvent) => void;
  [StorageEventType.STORY_UPDATED]: (event: StorageEvent) => void;
  [StorageEventType.METADATA_UPDATED]: (event: StorageEvent) => void;
  [StorageEventType.STORAGE_CLEARED]: (event: StorageEvent) => void;
  [StorageEventType.ERROR]: (event: StorageEvent) => void;
}> {
  private backend: IStorageBackend;
  private initialized = false;

  constructor(backend: IStorageBackend) {
    super();
    this.backend = backend;
  }

  /**
   * Initialize the storage backend
   */
  async initialize(): Promise<void> {
    try {
      await this.backend.initialize();
      this.initialized = true;
    } catch (error) {
      this.emitError(error as Error, 'initialize');
      throw error;
    }
  }

  /**
   * Save a story to storage
   */
  async saveStory(id: string, data: StoryData, isNew = false): Promise<void> {
    this.ensureInitialized();

    try {
      const exists = await this.backend.hasStory(id);
      await this.backend.saveStory(id, data);

      if (isNew || !exists) {
        this.emit(StorageEventType.STORY_CREATED, {
          type: StorageEventType.STORY_CREATED,
          storyId: id,
          title: data.metadata.title,
          timestamp: Date.now(),
        });
      } else {
        this.emit(StorageEventType.STORY_UPDATED, {
          type: StorageEventType.STORY_UPDATED,
          storyId: id,
          title: data.metadata.title,
          timestamp: Date.now(),
        });
      }

      this.emit(StorageEventType.STORY_SAVED, {
        type: StorageEventType.STORY_SAVED,
        storyId: id,
        title: data.metadata.title,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitError(error as Error, 'saveStory', id);
      throw error;
    }
  }

  /**
   * Load a story from storage
   */
  async loadStory(id: string): Promise<StoryData> {
    this.ensureInitialized();

    try {
      const story = await this.backend.loadStory(id);

      this.emit(StorageEventType.STORY_LOADED, {
        type: StorageEventType.STORY_LOADED,
        storyId: id,
        story,
        timestamp: Date.now(),
      });

      return story;
    } catch (error) {
      this.emitError(error as Error, 'loadStory', id);
      throw error;
    }
  }

  /**
   * Delete a story from storage
   */
  async deleteStory(id: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.backend.deleteStory(id);

      this.emit(StorageEventType.STORY_DELETED, {
        type: StorageEventType.STORY_DELETED,
        storyId: id,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitError(error as Error, 'deleteStory', id);
      throw error;
    }
  }

  /**
   * List all stories in storage
   */
  async listStories(): Promise<StorageMetadata[]> {
    this.ensureInitialized();

    try {
      return await this.backend.listStories();
    } catch (error) {
      this.emitError(error as Error, 'listStories');
      throw error;
    }
  }

  /**
   * Check if a story exists
   */
  async hasStory(id: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await this.backend.hasStory(id);
    } catch (error) {
      this.emitError(error as Error, 'hasStory', id);
      throw error;
    }
  }

  /**
   * Get storage metadata for a story
   */
  async getMetadata(id: string): Promise<StorageMetadata> {
    this.ensureInitialized();

    try {
      return await this.backend.getMetadata(id);
    } catch (error) {
      this.emitError(error as Error, 'getMetadata', id);
      throw error;
    }
  }

  /**
   * Update metadata for a story
   */
  async updateMetadata(id: string, metadata: Partial<StorageMetadata>): Promise<void> {
    this.ensureInitialized();

    try {
      await this.backend.updateMetadata(id, metadata);

      const updated = await this.backend.getMetadata(id);
      this.emit(StorageEventType.METADATA_UPDATED, {
        type: StorageEventType.METADATA_UPDATED,
        storyId: id,
        metadata: updated,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitError(error as Error, 'updateMetadata', id);
      throw error;
    }
  }

  /**
   * Export a story to a portable format (JSON)
   */
  async exportStory(id: string): Promise<Blob> {
    this.ensureInitialized();

    try {
      return await this.backend.exportStory(id);
    } catch (error) {
      this.emitError(error as Error, 'exportStory', id);
      throw error;
    }
  }

  /**
   * Import a story from a portable format
   */
  async importStory(data: Blob | File): Promise<string> {
    this.ensureInitialized();

    try {
      const id = await this.backend.importStory(data);

      const story = await this.backend.loadStory(id);
      this.emit(StorageEventType.STORY_CREATED, {
        type: StorageEventType.STORY_CREATED,
        storyId: id,
        title: story.metadata.title,
        timestamp: Date.now(),
      });

      return id;
    } catch (error) {
      this.emitError(error as Error, 'importStory');
      throw error;
    }
  }

  /**
   * Get total storage usage
   */
  async getStorageUsage(): Promise<number> {
    this.ensureInitialized();

    try {
      return await this.backend.getStorageUsage();
    } catch (error) {
      this.emitError(error as Error, 'getStorageUsage');
      throw error;
    }
  }

  /**
   * Clear all storage (careful!)
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      await this.backend.clear();

      this.emit(StorageEventType.STORAGE_CLEARED, {
        type: StorageEventType.STORAGE_CLEARED,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitError(error as Error, 'clear');
      throw error;
    }
  }

  /**
   * Get the underlying backend (for advanced use cases)
   */
  getBackend(): IStorageBackend {
    return this.backend;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('StorageService not initialized. Call initialize() first.');
    }
  }

  private emitError(error: Error, operation: string, storyId?: string): void {
    this.emit(StorageEventType.ERROR, {
      type: StorageEventType.ERROR,
      error,
      operation,
      storyId,
      timestamp: Date.now(),
    });
  }
}
