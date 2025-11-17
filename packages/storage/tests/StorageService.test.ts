import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../src/StorageService';
import { StorageEventType } from '../src/events/StorageEvents';
import type { IStorageBackend, StorageMetadata } from '../src/interfaces/IStorageBackend';
import type { StoryData } from '@writewhisker/core-ts';

// Mock backend implementation
class MockBackend implements IStorageBackend {
  private stories: Map<string, StoryData> = new Map();
  private metadata: Map<string, StorageMetadata> = new Map();
  public initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async saveStory(id: string, data: StoryData): Promise<void> {
    const metadata: StorageMetadata = {
      id,
      title: data.metadata.title,
      createdAt: this.metadata.get(id)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: JSON.stringify(data).length,
    };

    this.stories.set(id, data);
    this.metadata.set(id, metadata);
  }

  async loadStory(id: string): Promise<StoryData> {
    const story = this.stories.get(id);
    if (!story) {
      throw new Error(`Story not found: ${id}`);
    }
    return story;
  }

  async deleteStory(id: string): Promise<void> {
    this.stories.delete(id);
    this.metadata.delete(id);
  }

  async listStories(): Promise<StorageMetadata[]> {
    return Array.from(this.metadata.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async hasStory(id: string): Promise<boolean> {
    return this.stories.has(id);
  }

  async getMetadata(id: string): Promise<StorageMetadata> {
    const metadata = this.metadata.get(id);
    if (!metadata) {
      throw new Error(`Story not found: ${id}`);
    }
    return metadata;
  }

  async updateMetadata(id: string, updates: Partial<StorageMetadata>): Promise<void> {
    const existing = await this.getMetadata(id);
    this.metadata.set(id, {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    });
  }

  async exportStory(id: string): Promise<Blob> {
    const data = await this.loadStory(id);
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  async importStory(file: Blob | File): Promise<string> {
    const text = await file.text();
    const data: StoryData = JSON.parse(text);
    const id = data.metadata.id || crypto.randomUUID();
    await this.saveStory(id, data);
    return id;
  }

  async getStorageUsage(): Promise<number> {
    let total = 0;
    for (const data of this.stories.values()) {
      total += JSON.stringify(data).length;
    }
    return total;
  }

  async clear(): Promise<void> {
    this.stories.clear();
    this.metadata.clear();
  }
}

describe('StorageService', () => {
  let service: StorageService;
  let backend: MockBackend;
  const mockStoryData: StoryData = {
    metadata: {
      id: 'test-story-1',
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: '2024-01-01T00:00:00.000Z',
      modified: '2024-01-01T00:00:00.000Z',
    },
    startPassage: 'start',
    passages: {
      start: {
        id: 'start',
        title: 'Start',
        content: 'This is the start passage',
        metadata: {},
      },
    },
    variables: {},
  };

  beforeEach(async () => {
    backend = new MockBackend();
    service = new StorageService(backend);
    await service.initialize();
  });

  describe('initialize', () => {
    it('should initialize the backend', async () => {
      const newBackend = new MockBackend();
      const newService = new StorageService(newBackend);

      expect(newBackend.initialized).toBe(false);
      await newService.initialize();
      expect(newBackend.initialized).toBe(true);
    });

    it('should set initialized flag', async () => {
      expect(service.isInitialized()).toBe(true);
    });

    it('should emit error on backend initialization failure', async () => {
      const failingBackend = new MockBackend();
      failingBackend.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      const failingService = new StorageService(failingBackend);
      const errorSpy = vi.fn();
      failingService.on(StorageEventType.ERROR, errorSpy);

      await expect(failingService.initialize()).rejects.toThrow('Init failed');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.ERROR,
          operation: 'initialize',
        })
      );
    });
  });

  describe('saveStory', () => {
    it('should save a new story', async () => {
      await service.saveStory('test-id', mockStoryData, true);

      const loaded = await backend.loadStory('test-id');
      expect(loaded).toEqual(mockStoryData);
    });

    it('should emit STORY_CREATED event for new story', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_CREATED, spy);

      await service.saveStory('test-id', mockStoryData, true);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_CREATED,
          storyId: 'test-id',
          title: 'Test Story',
        })
      );
    });

    it('should emit STORY_UPDATED event for existing story', async () => {
      // Save first
      await service.saveStory('test-id', mockStoryData, true);

      const spy = vi.fn();
      service.on(StorageEventType.STORY_UPDATED, spy);

      // Update
      const updated = { ...mockStoryData, metadata: { ...mockStoryData.metadata, title: 'Updated' } };
      await service.saveStory('test-id', updated, false);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_UPDATED,
          storyId: 'test-id',
          title: 'Updated',
        })
      );
    });

    it('should emit STORY_SAVED event', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_SAVED, spy);

      await service.saveStory('test-id', mockStoryData, true);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_SAVED,
          storyId: 'test-id',
        })
      );
    });

    it('should emit error event on failure', async () => {
      backend.saveStory = vi.fn().mockRejectedValue(new Error('Save failed'));

      const errorSpy = vi.fn();
      service.on(StorageEventType.ERROR, errorSpy);

      await expect(service.saveStory('test-id', mockStoryData)).rejects.toThrow('Save failed');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.ERROR,
          operation: 'saveStory',
          storyId: 'test-id',
        })
      );
    });

    it('should throw error if not initialized', async () => {
      const uninitService = new StorageService(new MockBackend());

      await expect(uninitService.saveStory('test-id', mockStoryData)).rejects.toThrow(
        'StorageService not initialized'
      );
    });
  });

  describe('loadStory', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should load a story', async () => {
      const loaded = await service.loadStory('test-id');
      expect(loaded).toEqual(mockStoryData);
    });

    it('should emit STORY_LOADED event', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_LOADED, spy);

      await service.loadStory('test-id');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_LOADED,
          storyId: 'test-id',
          story: mockStoryData,
        })
      );
    });

    it('should emit error event on failure', async () => {
      const errorSpy = vi.fn();
      service.on(StorageEventType.ERROR, errorSpy);

      await expect(service.loadStory('non-existent')).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.ERROR,
          operation: 'loadStory',
        })
      );
    });
  });

  describe('deleteStory', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should delete a story', async () => {
      await service.deleteStory('test-id');

      const exists = await backend.hasStory('test-id');
      expect(exists).toBe(false);
    });

    it('should emit STORY_DELETED event', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_DELETED, spy);

      await service.deleteStory('test-id');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_DELETED,
          storyId: 'test-id',
        })
      );
    });

    it('should emit error event on failure', async () => {
      backend.deleteStory = vi.fn().mockRejectedValue(new Error('Delete failed'));

      const errorSpy = vi.fn();
      service.on(StorageEventType.ERROR, errorSpy);

      await expect(service.deleteStory('test-id')).rejects.toThrow('Delete failed');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('listStories', () => {
    it('should return empty array when no stories', async () => {
      const list = await service.listStories();
      expect(list).toEqual([]);
    });

    it('should list all stories', async () => {
      await service.saveStory('test-1', mockStoryData);
      await service.saveStory('test-2', mockStoryData);

      const list = await service.listStories();
      expect(list).toHaveLength(2);
    });

    it('should emit error event on failure', async () => {
      backend.listStories = vi.fn().mockRejectedValue(new Error('List failed'));

      const errorSpy = vi.fn();
      service.on(StorageEventType.ERROR, errorSpy);

      await expect(service.listStories()).rejects.toThrow('List failed');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('hasStory', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should return true for existing story', async () => {
      const exists = await service.hasStory('test-id');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent story', async () => {
      const exists = await service.hasStory('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should return metadata', async () => {
      const metadata = await service.getMetadata('test-id');
      expect(metadata.id).toBe('test-id');
      expect(metadata.title).toBe('Test Story');
    });
  });

  describe('updateMetadata', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should update metadata', async () => {
      await service.updateMetadata('test-id', { title: 'Updated Title' });

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.title).toBe('Updated Title');
    });

    it('should emit METADATA_UPDATED event', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.METADATA_UPDATED, spy);

      await service.updateMetadata('test-id', { title: 'Updated' });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.METADATA_UPDATED,
          storyId: 'test-id',
          metadata: expect.objectContaining({
            title: 'Updated',
          }),
        })
      );
    });
  });

  describe('exportStory', () => {
    beforeEach(async () => {
      await service.saveStory('test-id', mockStoryData);
    });

    it('should export story as Blob', async () => {
      const blob = await service.exportStory('test-id');
      expect(blob).toBeInstanceOf(Blob);

      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed.metadata.title).toBe('Test Story');
    });
  });

  describe('importStory', () => {
    it('should import story from Blob', async () => {
      const blob = new Blob([JSON.stringify(mockStoryData)], { type: 'application/json' });

      const id = await service.importStory(blob);
      expect(id).toBeTruthy();

      const loaded = await backend.loadStory(id);
      expect(loaded.metadata.title).toBe('Test Story');
    });

    it('should emit STORY_CREATED event on import', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_CREATED, spy);

      const blob = new Blob([JSON.stringify(mockStoryData)], { type: 'application/json' });
      await service.importStory(blob);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORY_CREATED,
          title: 'Test Story',
        })
      );
    });
  });

  describe('getStorageUsage', () => {
    it('should return storage usage', async () => {
      const usage = await service.getStorageUsage();
      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await service.saveStory('test-1', mockStoryData);
      await service.saveStory('test-2', mockStoryData);
    });

    it('should clear all stories', async () => {
      await service.clear();

      const list = await service.listStories();
      expect(list).toEqual([]);
    });

    it('should emit STORAGE_CLEARED event', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORAGE_CLEARED, spy);

      await service.clear();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StorageEventType.STORAGE_CLEARED,
        })
      );
    });
  });

  describe('getBackend', () => {
    it('should return the underlying backend', () => {
      const returnedBackend = service.getBackend();
      expect(returnedBackend).toBe(backend);
    });
  });

  describe('isInitialized', () => {
    it('should return true after initialization', () => {
      expect(service.isInitialized()).toBe(true);
    });

    it('should return false before initialization', () => {
      const uninitService = new StorageService(new MockBackend());
      expect(uninitService.isInitialized()).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should allow multiple listeners for same event', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      service.on(StorageEventType.STORY_SAVED, spy1);
      service.on(StorageEventType.STORY_SAVED, spy2);

      await service.saveStory('test-id', mockStoryData);

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('should support unsubscribing from events', async () => {
      const spy = vi.fn();

      service.on(StorageEventType.STORY_SAVED, spy);
      service.off(StorageEventType.STORY_SAVED, spy);

      await service.saveStory('test-id', mockStoryData);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should include timestamps in events', async () => {
      const spy = vi.fn();
      service.on(StorageEventType.STORY_SAVED, spy);

      const before = Date.now();
      await service.saveStory('test-id', mockStoryData);
      const after = Date.now();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );

      const event = spy.mock.calls[0][0];
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
