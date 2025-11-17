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

  // Extended storage tests

  describe('preferences', () => {
    it('should save and load a preference', async () => {
      const entry = {
        value: { theme: 'dark', fontSize: 14 },
        scope: 'user' as const,
        updatedAt: new Date().toISOString(),
      };

      await backend.savePreference!('editor.settings', entry);
      const loaded = await backend.loadPreference!('editor.settings');

      expect(loaded).toEqual(entry);
    });

    it('should return null for non-existent preference', async () => {
      const loaded = await backend.loadPreference!('non-existent');
      expect(loaded).toBeNull();
    });

    it('should delete a preference', async () => {
      const entry = {
        value: 'test',
        scope: 'global' as const,
        updatedAt: new Date().toISOString(),
      };

      await backend.savePreference!('test-key', entry);
      await backend.deletePreference!('test-key');

      const loaded = await backend.loadPreference!('test-key');
      expect(loaded).toBeNull();
    });

    it('should list all preference keys', async () => {
      await backend.savePreference!('key1', {
        value: 'value1',
        scope: 'global' as const,
        updatedAt: new Date().toISOString(),
      });
      await backend.savePreference!('key2', {
        value: 'value2',
        scope: 'user' as const,
        updatedAt: new Date().toISOString(),
      });

      const keys = await backend.listPreferences!();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should update existing preference', async () => {
      const entry1 = {
        value: 'original',
        scope: 'user' as const,
        updatedAt: new Date().toISOString(),
      };
      const entry2 = {
        value: 'updated',
        scope: 'user' as const,
        updatedAt: new Date().toISOString(),
      };

      await backend.savePreference!('test-key', entry1);
      await backend.savePreference!('test-key', entry2);

      const loaded = await backend.loadPreference!('test-key');
      expect(loaded?.value).toBe('updated');
    });
  });

  describe('sync queue', () => {
    it('should add entry to sync queue', async () => {
      const entry = {
        id: 'sync-1',
        storyId: 'story-1',
        operation: 'create' as const,
        timestamp: new Date().toISOString(),
        data: { test: 'data' },
        retryCount: 0,
      };

      await backend.addToSyncQueue!(entry);
      const queue = await backend.getSyncQueue!();

      expect(queue).toHaveLength(1);
      expect(queue[0]).toEqual(entry);
    });

    it('should get sync queue sorted by timestamp', async () => {
      const now = new Date();
      const entry1 = {
        id: 'sync-1',
        storyId: 'story-1',
        operation: 'create' as const,
        timestamp: new Date(now.getTime() + 1000).toISOString(),
        data: {},
        retryCount: 0,
      };
      const entry2 = {
        id: 'sync-2',
        storyId: 'story-2',
        operation: 'update' as const,
        timestamp: now.toISOString(),
        data: {},
        retryCount: 0,
      };

      await backend.addToSyncQueue!(entry1);
      await backend.addToSyncQueue!(entry2);

      const queue = await backend.getSyncQueue!();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe('sync-2'); // Older timestamp first
      expect(queue[1].id).toBe('sync-1');
    });

    it('should remove entry from sync queue', async () => {
      const entry = {
        id: 'sync-1',
        storyId: 'story-1',
        operation: 'delete' as const,
        timestamp: new Date().toISOString(),
        data: {},
        retryCount: 0,
      };

      await backend.addToSyncQueue!(entry);
      await backend.removeFromSyncQueue!('sync-1');

      const queue = await backend.getSyncQueue!();
      expect(queue).toHaveLength(0);
    });

    it('should clear entire sync queue', async () => {
      await backend.addToSyncQueue!({
        id: 'sync-1',
        storyId: 'story-1',
        operation: 'create' as const,
        timestamp: new Date().toISOString(),
        data: {},
        retryCount: 0,
      });
      await backend.addToSyncQueue!({
        id: 'sync-2',
        storyId: 'story-2',
        operation: 'update' as const,
        timestamp: new Date().toISOString(),
        data: {},
        retryCount: 1,
      });

      await backend.clearSyncQueue!();

      const queue = await backend.getSyncQueue!();
      expect(queue).toEqual([]);
    });

    it('should handle retry count and error', async () => {
      const entry = {
        id: 'sync-1',
        storyId: 'story-1',
        operation: 'update' as const,
        timestamp: new Date().toISOString(),
        data: {},
        retryCount: 3,
        lastError: 'Network timeout',
      };

      await backend.addToSyncQueue!(entry);
      const queue = await backend.getSyncQueue!();

      expect(queue[0].retryCount).toBe(3);
      expect(queue[0].lastError).toBe('Network timeout');
    });
  });

  describe('GitHub token', () => {
    it('should save and load GitHub token', async () => {
      const token = {
        accessToken: 'ghp_test123',
        tokenType: 'bearer',
        scope: 'repo,user',
        user: {
          login: 'testuser',
          id: 12345,
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.png',
        },
      };

      await backend.saveGitHubToken!(token);
      const loaded = await backend.loadGitHubToken!();

      expect(loaded).toEqual(token);
    });

    it('should return null when no token exists', async () => {
      const loaded = await backend.loadGitHubToken!();
      expect(loaded).toBeNull();
    });

    it('should delete GitHub token', async () => {
      const token = {
        accessToken: 'ghp_test456',
        tokenType: 'bearer',
        scope: 'repo',
      };

      await backend.saveGitHubToken!(token);
      await backend.deleteGitHubToken!();

      const loaded = await backend.loadGitHubToken!();
      expect(loaded).toBeNull();
    });

    it('should overwrite existing token', async () => {
      const token1 = {
        accessToken: 'ghp_old',
        tokenType: 'bearer',
        scope: 'repo',
      };
      const token2 = {
        accessToken: 'ghp_new',
        tokenType: 'bearer',
        scope: 'repo,user',
      };

      await backend.saveGitHubToken!(token1);
      await backend.saveGitHubToken!(token2);

      const loaded = await backend.loadGitHubToken!();
      expect(loaded?.accessToken).toBe('ghp_new');
    });
  });
});
