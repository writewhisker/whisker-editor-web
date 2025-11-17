/**
 * Storage Adapter for Svelte Stores
 *
 * Bridges the framework-agnostic @writewhisker/storage package
 * with Svelte stores in editor-base.
 *
 * This adapter:
 * - Initializes StorageService with IndexedDB backend
 * - Listens to storage events and updates Svelte stores reactively
 * - Provides save/load/delete API that works with current Story instances
 * - Handles serialization/deserialization of Story objects
 */

import {
  createIndexedDBStorage,
  StorageEventType,
  type StorageEvent,
  type StorageMetadata,
} from '@writewhisker/storage';
import { Story, type ProjectData } from '@writewhisker/core-ts';
import { currentStory } from '../stores/storyStateStore.js';
import { currentFilePath, unsavedChanges } from '../stores/projectMetadataStore.js';

/**
 * Storage adapter class that manages the connection between
 * @writewhisker/storage and Svelte stores
 */
export class SvelteStorageAdapter {
  private storage = createIndexedDBStorage();
  private initialized = false;
  private eventListeners: Array<() => void> = [];

  /**
   * Initialize the storage adapter
   * Sets up event listeners that update Svelte stores
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize the storage backend
    await this.storage.initialize();

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
  }

  /**
   * Set up event listeners that update Svelte stores
   */
  private setupEventListeners(): void {
    // Story saved - mark as saved and update file path
    const onStorySaved = (event: StorageEvent) => {
      unsavedChanges.set(false);
      if ('storyId' in event) {
        currentFilePath.set(event.storyId);
      }
    };
    this.storage.on(StorageEventType.STORY_SAVED, onStorySaved);
    this.eventListeners.push(() => this.storage.off(StorageEventType.STORY_SAVED, onStorySaved));

    // Story deleted - clear current story if it matches
    const onStoryDeleted = (event: StorageEvent) => {
      if ('storyId' in event) {
        const current = this.getCurrentStory();
        if (current && current.metadata.id === event.storyId) {
          currentStory.set(null);
          currentFilePath.set(null);
          unsavedChanges.set(false);
        }
      }
    };
    this.storage.on(StorageEventType.STORY_DELETED, onStoryDeleted);
    this.eventListeners.push(() =>
      this.storage.off(StorageEventType.STORY_DELETED, onStoryDeleted)
    );

    // Storage cleared - reset all stores
    const onStorageCleared = () => {
      currentStory.set(null);
      currentFilePath.set(null);
      unsavedChanges.set(false);
    };
    this.storage.on(StorageEventType.STORAGE_CLEARED, onStorageCleared);
    this.eventListeners.push(() =>
      this.storage.off(StorageEventType.STORAGE_CLEARED, onStorageCleared)
    );

    // Error handling - log errors for now
    const onError = (event: StorageEvent) => {
      if ('error' in event) {
        console.error('Storage error:', event.error, 'Operation:', event.operation);
      }
    };
    this.storage.on(StorageEventType.ERROR, onError);
    this.eventListeners.push(() => this.storage.off(StorageEventType.ERROR, onError));
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    this.initialized = false;
  }

  /**
   * Get the current story from the store
   */
  private getCurrentStory(): Story | null {
    let story: Story | null = null;
    currentStory.subscribe(s => (story = s))();
    return story;
  }

  /**
   * Save the current story to storage
   * @param id Optional story ID (defaults to story.metadata.id)
   * @param isNew Whether this is a new story
   */
  async saveCurrentStory(id?: string, isNew = false): Promise<void> {
    const story = this.getCurrentStory();
    if (!story) {
      throw new Error('No story to save');
    }

    // Update modified timestamp
    story.updateModified();

    // Serialize to ProjectData
    const data = story.serializeProject();

    // Use provided ID or story's ID
    const storyId = id || story.metadata.id || this.generateStoryId();

    // Ensure the data has the ID in metadata
    if (!data.metadata.id) {
      data.metadata.id = storyId;
    }

    // Save to storage
    await this.storage.saveStory(storyId, data, isNew);

    // Mark as saved and update file path
    unsavedChanges.set(false);
    currentFilePath.set(storyId);
  }

  /**
   * Save a specific story to storage (not necessarily the current one)
   */
  async saveStory(story: Story, id?: string, isNew = false): Promise<void> {
    // Update modified timestamp
    story.updateModified();

    // Serialize to ProjectData
    const data = story.serializeProject();

    // Use provided ID or story's ID
    const storyId = id || story.metadata.id || this.generateStoryId();

    // Ensure the data has the ID in metadata
    if (!data.metadata.id) {
      data.metadata.id = storyId;
    }

    // Save to storage
    await this.storage.saveStory(storyId, data, isNew);
  }

  /**
   * Load a story from storage and set as current story
   */
  async loadStory(id: string): Promise<Story> {
    const data = await this.storage.loadStory(id);

    // Deserialize to Story instance
    const story = Story.deserializeProject(data);

    // Update stores
    currentStory.set(story);
    currentFilePath.set(id);
    unsavedChanges.set(false);

    return story;
  }

  /**
   * Load a story from storage without setting it as current
   */
  async getStory(id: string): Promise<Story> {
    const data = await this.storage.loadStory(id);
    return Story.deserializeProject(data);
  }

  /**
   * Delete a story from storage
   */
  async deleteStory(id: string): Promise<void> {
    await this.storage.deleteStory(id);

    // If we deleted the current story, clear the stores
    const current = this.getCurrentStory();
    if (current && current.metadata.id === id) {
      currentStory.set(null);
      currentFilePath.set(null);
      unsavedChanges.set(false);
    }
  }

  /**
   * List all stories in storage
   */
  async listStories(): Promise<StorageMetadata[]> {
    return await this.storage.listStories();
  }

  /**
   * Check if a story exists in storage
   */
  async hasStory(id: string): Promise<boolean> {
    return await this.storage.hasStory(id);
  }

  /**
   * Get metadata for a story
   */
  async getMetadata(id: string): Promise<StorageMetadata> {
    return await this.storage.getMetadata(id);
  }

  /**
   * Update metadata for a story
   */
  async updateMetadata(id: string, metadata: Partial<StorageMetadata>): Promise<void> {
    await this.storage.updateMetadata(id, metadata);
  }

  /**
   * Export a story as a Blob
   */
  async exportStory(id: string): Promise<Blob> {
    return await this.storage.exportStory(id);
  }

  /**
   * Import a story from a file
   */
  async importStory(data: Blob | File): Promise<string> {
    return await this.storage.importStory(data);
  }

  /**
   * Get storage usage in bytes
   */
  async getStorageUsage(): Promise<number> {
    return await this.storage.getStorageUsage();
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.storage.clear();

    // Reset stores
    currentStory.set(null);
    currentFilePath.set(null);
    unsavedChanges.set(false);
  }

  /**
   * Generate a unique story ID
   */
  private generateStoryId(): string {
    return `story-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new story and optionally save it
   */
  async createNewStory(title?: string, save = true): Promise<Story> {
    const story = new Story({
      metadata: {
        id: this.generateStoryId(),
        title: title || 'Untitled Story',
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    currentStory.set(story);
    unsavedChanges.set(save);

    if (save) {
      await this.saveStory(story, story.metadata.id, true);
    }

    return story;
  }

  /**
   * Mark the current story as having unsaved changes
   */
  markChanged(): void {
    unsavedChanges.set(true);
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    let hasChanges = false;
    unsavedChanges.subscribe(v => (hasChanges = v))();
    return hasChanges;
  }
}

/**
 * Singleton instance of the storage adapter
 */
export const storageAdapter = new SvelteStorageAdapter();

/**
 * Initialize the storage adapter
 * Call this once at application startup
 */
export async function initializeStorage(): Promise<void> {
  await storageAdapter.initialize();
}
