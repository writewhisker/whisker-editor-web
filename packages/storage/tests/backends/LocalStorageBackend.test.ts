import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageBackend } from '../../src/backends/LocalStorageBackend';
import type { StoryData } from '@writewhisker/core-ts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Set up global window and localStorage mocks
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('LocalStorageBackend', () => {
  let backend: LocalStorageBackend;
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
    localStorageMock.clear();
    backend = new LocalStorageBackend();
    await backend.initialize();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('initialize', () => {
    it('should initialize and create an empty index', async () => {
      const newBackend = new LocalStorageBackend();
      await newBackend.initialize();

      const index = localStorage.getItem('whisker:index');
      expect(index).toBe('[]');
    });

    it('should not overwrite existing index', async () => {
      localStorage.setItem('whisker:index', '["story-1", "story-2"]');

      const newBackend = new LocalStorageBackend();
      await newBackend.initialize();

      const index = localStorage.getItem('whisker:index');
      expect(index).toBe('["story-1", "story-2"]');
    });
  });

  describe('saveStory', () => {
    it('should save a story and its metadata', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const savedData = localStorage.getItem('whisker:story:test-id');
      const savedMetadata = localStorage.getItem('whisker:metadata:test-id');

      expect(savedData).toBeTruthy();
      expect(savedMetadata).toBeTruthy();
      expect(JSON.parse(savedData!)).toEqual(mockStoryData);
    });

    it('should add story ID to index', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const index = JSON.parse(localStorage.getItem('whisker:index')!);
      expect(index).toContain('test-id');
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

    it('should update metadata size', async () => {
      await backend.saveStory('test-id', mockStoryData);

      const metadata = await backend.getMetadata('test-id');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.size).toBe(JSON.stringify(mockStoryData).length);
    });

    it('should throw error on quota exceeded', async () => {
      // Mock setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      await expect(backend.saveStory('test-id', mockStoryData)).rejects.toThrow(
        'localStorage quota exceeded'
      );

      localStorage.setItem = originalSetItem;
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

      const data = localStorage.getItem('whisker:story:test-id');
      const metadata = localStorage.getItem('whisker:metadata:test-id');

      expect(data).toBeNull();
      expect(metadata).toBeNull();
    });

    it('should remove story from index', async () => {
      await backend.deleteStory('test-id');

      const index = JSON.parse(localStorage.getItem('whisker:index')!);
      expect(index).not.toContain('test-id');
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
    it('should return 0 for empty storage', async () => {
      const usage = await backend.getStorageUsage();
      expect(usage).toBe(0);
    });

    it('should calculate total storage usage', async () => {
      await backend.saveStory('test-1', mockStoryData);
      await backend.saveStory('test-2', mockStoryData);

      const usage = await backend.getStorageUsage();
      expect(usage).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await backend.saveStory('test-1', mockStoryData);
      await backend.saveStory('test-2', mockStoryData);
    });

    it('should remove all stories and metadata', async () => {
      await backend.clear();

      const data1 = localStorage.getItem('whisker:story:test-1');
      const data2 = localStorage.getItem('whisker:story:test-2');
      const meta1 = localStorage.getItem('whisker:metadata:test-1');
      const meta2 = localStorage.getItem('whisker:metadata:test-2');

      expect(data1).toBeNull();
      expect(data2).toBeNull();
      expect(meta1).toBeNull();
      expect(meta2).toBeNull();
    });

    it('should clear the index', async () => {
      await backend.clear();

      const index = JSON.parse(localStorage.getItem('whisker:index')!);
      expect(index).toEqual([]);
    });
  });
});
