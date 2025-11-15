/**
 * IndexedDB storage backend for browser environments
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { StoryData } from '@writewhisker/core-ts';
import type { IStorageBackend, StorageMetadata } from '../interfaces/IStorageBackend.js';

const DB_NAME = 'whisker-stories';
const DB_VERSION = 1;
const STORE_NAME = 'stories';
const METADATA_STORE = 'metadata';

interface StoredStory {
  id: string;
  data: StoryData;
  metadata: StorageMetadata;
}

export class IndexedDBBackend implements IStorageBackend {
  private db: IDBPDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create stories store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('title', 'title', { unique: false });
          metadataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      },
    });
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('IndexedDB backend not initialized. Call initialize() first.');
    }
  }

  async saveStory(id: string, data: StoryData): Promise<void> {
    this.ensureInitialized();
    
    const metadata: StorageMetadata = {
      id,
      title: data.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: JSON.stringify(data).length,
    };

    // Check if story exists
    const existing = await this.db!.get(METADATA_STORE, id);
    if (existing) {
      metadata.createdAt = existing.createdAt;
    }

    const stored: StoredStory = {
      id,
      data,
      metadata,
    };

    const tx = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(STORE_NAME).put(stored),
      tx.objectStore(METADATA_STORE).put(metadata),
      tx.done,
    ]);
  }

  async loadStory(id: string): Promise<StoryData> {
    this.ensureInitialized();
    
    const stored = await this.db!.get(STORE_NAME, id);
    if (!stored) {
      throw new Error(`Story not found: ${id}`);
    }

    return stored.data;
  }

  async deleteStory(id: string): Promise<void> {
    this.ensureInitialized();
    
    const tx = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(STORE_NAME).delete(id),
      tx.objectStore(METADATA_STORE).delete(id),
      tx.done,
    ]);
  }

  async listStories(): Promise<StorageMetadata[]> {
    this.ensureInitialized();
    
    const metadata = await this.db!.getAll(METADATA_STORE);
    return metadata.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async hasStory(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    const metadata = await this.db!.get(METADATA_STORE, id);
    return !!metadata;
  }

  async getMetadata(id: string): Promise<StorageMetadata> {
    this.ensureInitialized();
    
    const metadata = await this.db!.get(METADATA_STORE, id);
    if (!metadata) {
      throw new Error(`Story not found: ${id}`);
    }

    return metadata;
  }

  async updateMetadata(id: string, updates: Partial<StorageMetadata>): Promise<void> {
    this.ensureInitialized();
    
    const existing = await this.getMetadata(id);
    const updated = {
      ...existing,
      ...updates,
      id, // Ensure id doesn't change
      updatedAt: new Date().toISOString(),
    };

    await this.db!.put(METADATA_STORE, updated);
  }

  async exportStory(id: string): Promise<Blob> {
    const data = await this.loadStory(id);
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importStory(file: Blob | File): Promise<string> {
    const text = await file.text();
    const data: StoryData = JSON.parse(text);
    
    // Generate new ID if not present
    const id = data.id || crypto.randomUUID();
    const storyWithId = { ...data, id };
    
    await this.saveStory(id, storyWithId);
    return id;
  }

  async getStorageUsage(): Promise<number> {
    this.ensureInitialized();
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }

    // Fallback: calculate approximate size
    const stories = await this.db!.getAll(STORE_NAME);
    return stories.reduce((total, story) => {
      return total + JSON.stringify(story).length;
    }, 0);
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    
    const tx = this.db!.transaction([STORE_NAME, METADATA_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(STORE_NAME).clear(),
      tx.objectStore(METADATA_STORE).clear(),
      tx.done,
    ]);
  }
}
