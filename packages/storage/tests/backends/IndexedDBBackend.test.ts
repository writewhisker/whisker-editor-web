import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBBackend } from '../../src/backends/IndexedDBBackend';
import type { StoryData } from '@writewhisker/core-ts';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

describe('IndexedDBBackend', () => {
  let backend: IndexedDBBackend;
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
    // Reset IndexedDB for each test
    global.indexedDB = new IDBFactory();
    backend = new IndexedDBBackend();
    await backend.initialize();
  });

  afterEach(async () => {
    // Clean up
    if (backend) {
      await backend.clear();
    }
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      const newBackend = new IndexedDBBackend();
      await expect(newBackend.initialize()).resolves.not.toThrow();
    });

    it('should create database with correct stores', async () => {
      const newBackend = new IndexedDBBackend();
      await newBackend.initialize();

      // Verify by trying to save - this will fail if stores don't exist
      await expect(newBackend.saveStory('test', mockStoryData)).resolves.not.toThrow();
    });

    it('should throw error if called before initialization', async () => {
      const newBackend = new IndexedDBBackend();
      await expect(newBackend.saveStory('test', mockStoryData)).rejects.toThrow(
        'IndexedDB backend not initialized'
      );
    });
  });

  describe('saveStory', () => {
    it('should save a story and its metadata', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const loaded = await backend.loadStory('test-id');
      expect(loaded).toEqual(mockStoryData);

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.id).toBe('test-id');
      expect(metadata.title).toBe('Test Story');
    });

    it('should create metadata with timestamps', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.createdAt).toBeTruthy();
      expect(metadata.updatedAt).toBeTruthy();
      expect(new Date(metadata.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve createdAt when updating existing story', async () => {
      // Save initial story
      await backend.saveStory('test-id', mockStoryData);
      const initialMetadata = await backend.getMetadata('test-id');
      const createdAt = initialMetadata.createdAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update the story
      const updatedData = { ...mockStoryData, metadata: { ...mockStoryData.metadata, title: 'Updated Title' } };
      await backend.saveStory('test-id', updatedData);

      const updatedMetadata = await backend.getMetadata('test-id');
      expect(updatedMetadata.createdAt).toBe(createdAt);
      expect(updatedMetadata.updatedAt).not.toBe(createdAt);
    });

    it('should calculate story size', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.size).toBe(JSON.stringify(mockStoryData).length);
    });
  });

  describe('loadStory', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should load a saved story', async () => {
      const loaded = await backend.loadStory('test-id');
      expect(loaded).toEqual(mockStoryData);
    });

    it('should throw error when story does not exist', async () => {
      await expect(backend.loadStory('non-existent')).rejects.toThrow(
        'Story not found: non-existent'
      );
    });
  });

  describe('deleteStory', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should delete a story and its metadata', async () => {
      await backend.deleteStory('test-id');

      await expect(backend.loadStory('test-id')).rejects.toThrow('Story not found');
      await expect(backend.getMetadata('test-id')).rejects.toThrow('Story not found');
    });

    it('should remove story from list', async () => {
      await backend.deleteStory('test-id');

      const list = await backend.listStories();
      expect(list).toHaveLength(0);
    });
  });

  describe('listStories', () => {
    it('should return empty array when no stories', async () => {
      const list = await backend.listStories();
      expect(list).toEqual([]);
    });

    it('should list all saved stories', async () => {
      const story2: StoryData = { ...mockStoryData, metadata: { ...mockStoryData.metadata, id: 'test-2', title: 'Story 2' } };

      await backend.saveStory('test-1', mockStoryData);
      await backend.saveStory('test-2', story2);

      const list = await backend.listStories();
      expect(list).toHaveLength(2);
      expect(list.map(m => m.id)).toContain('test-1');
      expect(list.map(m => m.id)).toContain('test-2');
    });

    it('should sort by updatedAt descending', async () => {
      const story1: StoryData = { ...mockStoryData, metadata: { ...mockStoryData.metadata, id: 'test-1' } };
      const story2: StoryData = { ...mockStoryData, metadata: { ...mockStoryData.metadata, id: 'test-2' } };

      await backend.saveStory('test-1', story1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await backend.saveStory('test-2', story2);

      const list = await backend.listStories();
      expect(list[0].id).toBe('test-2'); // Most recent first
      expect(list[1].id).toBe('test-1');
    });
  });

  describe('hasStory', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should return true for existing story', async () => {
      const exists = await backend.hasStory('test-id');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent story', async () => {
      const exists = await backend.hasStory('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should return story metadata', async () => {
      const metadata = await backend.getMetadata('test-id');

      expect(metadata.id).toBe('test-id');
      expect(metadata.title).toBe('Test Story');
      expect(metadata.createdAt).toBeTruthy();
      expect(metadata.updatedAt).toBeTruthy();
      expect(metadata.size).toBeGreaterThan(0);
    });

    it('should throw error when story does not exist', async () => {
      await expect(backend.getMetadata('non-existent')).rejects.toThrow(
        'Story not found: non-existent'
      );
    });
  });

  describe('updateMetadata', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should update metadata fields', async () => {
      await backend.updateMetadata('test-id', { title: 'Updated Title' });

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.title).toBe('Updated Title');
    });

    it('should update updatedAt timestamp', async () => {
      const originalMetadata = await backend.getMetadata('test-id');
      await new Promise((resolve) => setTimeout(resolve, 10));

      await backend.updateMetadata('test-id', { title: 'Updated' });

      const updatedMetadata = await backend.getMetadata('test-id');
      expect(updatedMetadata.updatedAt).not.toBe(originalMetadata.updatedAt);
    });

    it('should not allow changing the ID', async () => {
      await backend.updateMetadata('test-id', { id: 'different-id' } as any);

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.id).toBe('test-id');
    });
  });

  describe('exportStory', () => {
    beforeEach(async () => {
      await backend.saveStory('test-id', mockStoryData);
    });

    it('should export story as Blob', async () => {
      const blob = await backend.exportStory('test-id');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed).toEqual(mockStoryData);
    });
  });

  describe('importStory', () => {
    it('should import story from Blob', async () => {
      const blob = new Blob([JSON.stringify(mockStoryData)], { type: 'application/json' });

      const id = await backend.importStory(blob);

      expect(id).toBeTruthy();
      const loaded = await backend.loadStory(id);
      expect(loaded.metadata.title).toBe('Test Story');
    });

    it('should use existing ID if present', async () => {
      const blob = new Blob([JSON.stringify(mockStoryData)], { type: 'application/json' });

      const id = await backend.importStory(blob);

      expect(id).toBe('test-story-1');
    });

    it('should generate new ID if not present', async () => {
      const dataWithoutId = { ...mockStoryData, metadata: { ...mockStoryData.metadata, id: undefined } };
      const blob = new Blob([JSON.stringify(dataWithoutId)], { type: 'application/json' });

      // Mock crypto.randomUUID
      const mockUUID = 'mock-uuid-1234';
      const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);

      const id = await backend.importStory(blob);

      expect(id).toBe(mockUUID);
      spy.mockRestore();
    });
  });

  describe('getStorageUsage', () => {
    it('should return a number', async () => {
      const usage = await backend.getStorageUsage();
      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
    });

    it('should increase with more stories', async () => {
      const usage1 = await backend.getStorageUsage();

      await backend.saveStory('test-1', mockStoryData);
      await backend.saveStory('test-2', mockStoryData);

      const usage2 = await backend.getStorageUsage();
      expect(usage2).toBeGreaterThanOrEqual(usage1);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await backend.saveStory('test-1', mockStoryData);
      await backend.saveStory('test-2', mockStoryData);
    });

    it('should remove all stories and metadata', async () => {
      await backend.clear();

      await expect(backend.loadStory('test-1')).rejects.toThrow('Story not found');
      await expect(backend.loadStory('test-2')).rejects.toThrow('Story not found');
    });

    it('should result in empty list', async () => {
      await backend.clear();

      const list = await backend.listStories();
      expect(list).toEqual([]);
    });
  });
});
