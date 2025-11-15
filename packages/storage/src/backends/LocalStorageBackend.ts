/**
 * localStorage storage backend for simple browser storage
 * Note: This has size limitations (~5-10MB) but is simpler than IndexedDB
 */

import type { StoryData } from '@writewhisker/core-ts';
import type { IStorageBackend, StorageMetadata } from '../interfaces/IStorageBackend.js';

const STORAGE_PREFIX = 'whisker:story:';
const METADATA_PREFIX = 'whisker:metadata:';
const INDEX_KEY = 'whisker:index';

export class LocalStorageBackend implements IStorageBackend {
  private ensureBrowser(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
  }

  async initialize(): Promise<void> {
    this.ensureBrowser();
    
    // Ensure index exists
    if (!localStorage.getItem(INDEX_KEY)) {
      localStorage.setItem(INDEX_KEY, JSON.stringify([]));
    }
  }

  private getIndex(): string[] {
    const indexJson = localStorage.getItem(INDEX_KEY);
    return indexJson ? JSON.parse(indexJson) : [];
  }

  private updateIndex(ids: string[]): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  }

  private addToIndex(id: string): void {
    const index = this.getIndex();
    if (!index.includes(id)) {
      index.push(id);
      this.updateIndex(index);
    }
  }

  private removeFromIndex(id: string): void {
    const index = this.getIndex();
    const filtered = index.filter(i => i !== id);
    this.updateIndex(filtered);
  }

  async saveStory(id: string, data: StoryData): Promise<void> {
    this.ensureBrowser();
    
    const metadata: StorageMetadata = {
      id,
      title: data.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: JSON.stringify(data).length,
    };

    // Preserve createdAt if story exists
    const existingMetadata = localStorage.getItem(METADATA_PREFIX + id);
    if (existingMetadata) {
      const existing: StorageMetadata = JSON.parse(existingMetadata);
      metadata.createdAt = existing.createdAt;
    }

    try {
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(data));
      localStorage.setItem(METADATA_PREFIX + id, JSON.stringify(metadata));
      this.addToIndex(id);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('localStorage quota exceeded. Consider using IndexedDB backend instead.');
      }
      throw error;
    }
  }

  async loadStory(id: string): Promise<StoryData> {
    this.ensureBrowser();
    
    const dataJson = localStorage.getItem(STORAGE_PREFIX + id);
    if (!dataJson) {
      throw new Error(`Story not found: ${id}`);
    }

    return JSON.parse(dataJson);
  }

  async deleteStory(id: string): Promise<void> {
    this.ensureBrowser();
    
    localStorage.removeItem(STORAGE_PREFIX + id);
    localStorage.removeItem(METADATA_PREFIX + id);
    this.removeFromIndex(id);
  }

  async listStories(): Promise<StorageMetadata[]> {
    this.ensureBrowser();
    
    const index = this.getIndex();
    const metadata: StorageMetadata[] = [];

    for (const id of index) {
      const metadataJson = localStorage.getItem(METADATA_PREFIX + id);
      if (metadataJson) {
        metadata.push(JSON.parse(metadataJson));
      }
    }

    return metadata.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async hasStory(id: string): Promise<boolean> {
    this.ensureBrowser();
    return localStorage.getItem(STORAGE_PREFIX + id) !== null;
  }

  async getMetadata(id: string): Promise<StorageMetadata> {
    this.ensureBrowser();
    
    const metadataJson = localStorage.getItem(METADATA_PREFIX + id);
    if (!metadataJson) {
      throw new Error(`Story not found: ${id}`);
    }

    return JSON.parse(metadataJson);
  }

  async updateMetadata(id: string, updates: Partial<StorageMetadata>): Promise<void> {
    this.ensureBrowser();
    
    const existing = await this.getMetadata(id);
    const updated = {
      ...existing,
      ...updates,
      id, // Ensure id doesn't change
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(METADATA_PREFIX + id, JSON.stringify(updated));
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
    this.ensureBrowser();
    
    let total = 0;
    const index = this.getIndex();

    for (const id of index) {
      const storyData = localStorage.getItem(STORAGE_PREFIX + id);
      const metadata = localStorage.getItem(METADATA_PREFIX + id);
      
      if (storyData) total += storyData.length;
      if (metadata) total += metadata.length;
    }

    return total;
  }

  async clear(): Promise<void> {
    this.ensureBrowser();
    
    const index = this.getIndex();
    for (const id of index) {
      localStorage.removeItem(STORAGE_PREFIX + id);
      localStorage.removeItem(METADATA_PREFIX + id);
    }
    
    this.updateIndex([]);
  }
}
