/**
 * IndexedDB storage backend for browser environments
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { StoryData } from '@writewhisker/core-ts';
import type { IStorageBackend, StorageMetadata } from '../interfaces/IStorageBackend.js';
import type { PreferenceEntry, SyncQueueEntry, GitHubTokenData } from '../types/ExtendedStorage.js';

const DB_NAME = 'whisker-stories';
const DB_VERSION = 2;
const STORE_NAME = 'stories';
const METADATA_STORE = 'metadata';
const PREFERENCES_STORE = 'preferences';
const SYNC_QUEUE_STORE = 'syncQueue';
const GITHUB_TOKEN_STORE = 'githubToken';

interface StoredStory {
  id: string;
  data: StoryData;
  metadata: StorageMetadata;
}

export class IndexedDBBackend implements IStorageBackend {
  private db: IDBPDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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

        // Version 2: Add extended storage stores
        if (oldVersion < 2) {
          // Preferences store
          if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
            db.createObjectStore(PREFERENCES_STORE);
          }

          // Sync queue store
          if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
            syncStore.createIndex('storyId', 'storyId', { unique: false });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // GitHub token store (single value, no keyPath needed)
          if (!db.objectStoreNames.contains(GITHUB_TOKEN_STORE)) {
            db.createObjectStore(GITHUB_TOKEN_STORE);
          }
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
      title: data.metadata.title,
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
    const id = data.metadata.id || crypto.randomUUID();
    const storyWithId = { ...data, metadata: { ...data.metadata, id } };

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

  // Extended storage methods for preferences

  async savePreference(key: string, entry: PreferenceEntry): Promise<void> {
    this.ensureInitialized();
    await this.db!.put(PREFERENCES_STORE, entry, key);
  }

  async loadPreference<T = any>(key: string): Promise<PreferenceEntry<T> | null> {
    this.ensureInitialized();
    const entry = await this.db!.get(PREFERENCES_STORE, key);
    return entry || null;
  }

  async deletePreference(key: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete(PREFERENCES_STORE, key);
  }

  async listPreferences(): Promise<string[]> {
    this.ensureInitialized();
    return await this.db!.getAllKeys(PREFERENCES_STORE) as string[];
  }

  // Extended storage methods for sync queue

  async addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
    this.ensureInitialized();
    await this.db!.put(SYNC_QUEUE_STORE, entry);
  }

  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    this.ensureInitialized();
    const entries = await this.db!.getAll(SYNC_QUEUE_STORE);
    // Sort by timestamp (oldest first)
    return entries.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete(SYNC_QUEUE_STORE, id);
  }

  async clearSyncQueue(): Promise<void> {
    this.ensureInitialized();
    await this.db!.clear(SYNC_QUEUE_STORE);
  }

  // Extended storage methods for GitHub token

  async saveGitHubToken(token: GitHubTokenData): Promise<void> {
    this.ensureInitialized();
    await this.db!.put(GITHUB_TOKEN_STORE, token, 'token');
  }

  async loadGitHubToken(): Promise<GitHubTokenData | null> {
    this.ensureInitialized();
    const token = await this.db!.get(GITHUB_TOKEN_STORE, 'token');
    return token || null;
  }

  async deleteGitHubToken(): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete(GITHUB_TOKEN_STORE, 'token');
  }
}
