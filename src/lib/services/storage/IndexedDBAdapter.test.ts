/**
 * Tests for IndexedDBAdapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBAdapter } from './IndexedDBAdapter';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = new IndexedDBAdapter({ dbName: 'test-db', version: 1 });
  });

  afterEach(() => {
    adapter.close();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });

    it('should create preferences object store', async () => {
      await adapter.initialize();
      // Access private db property for testing
      const db = (adapter as any).db as IDBDatabase;
      expect(db.objectStoreNames.contains('preferences')).toBe(true);
    });

    it('should create stories object store', async () => {
      await adapter.initialize();
      const db = (adapter as any).db as IDBDatabase;
      expect(db.objectStoreNames.contains('stories')).toBe(true);
    });

    it('should handle multiple initialization calls', async () => {
      await adapter.initialize();
      await adapter.initialize(); // Should not throw
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('Preference Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should save a preference', async () => {
      await adapter.savePreference('test-key', { value: 'test' });
      // Should not throw
    });

    it('should load a saved preference', async () => {
      const testData = { theme: 'dark', fontSize: 14 };
      await adapter.savePreference('test-pref', testData);

      const loaded = await adapter.loadPreference<typeof testData>('test-pref');
      expect(loaded).toEqual(testData);
    });

    it('should return null for non-existent preference', async () => {
      const loaded = await adapter.loadPreference('non-existent');
      expect(loaded).toBeNull();
    });

    it('should save preference with scope', async () => {
      const testData = { value: 'global' };
      await adapter.savePreference('scoped-pref', testData, 'global');

      const loaded = await adapter.loadPreference<typeof testData>('scoped-pref', 'global');
      expect(loaded).toEqual(testData);
    });

    it('should not load preference with wrong scope', async () => {
      const testData = { value: 'global' };
      await adapter.savePreference('scoped-pref', testData, 'global');

      const loaded = await adapter.loadPreference('scoped-pref', 'project');
      expect(loaded).toBeNull();
    });

    it('should update existing preference', async () => {
      await adapter.savePreference('update-test', { value: 'old' });
      await adapter.savePreference('update-test', { value: 'new' });

      const loaded = await adapter.loadPreference<{ value: string }>('update-test');
      expect(loaded).toEqual({ value: 'new' });
    });

    it('should delete a preference', async () => {
      await adapter.savePreference('delete-test', { value: 'test' });
      await adapter.deletePreference('delete-test');

      const loaded = await adapter.loadPreference('delete-test');
      expect(loaded).toBeNull();
    });

    it('should list all preference keys', async () => {
      await adapter.savePreference('pref1', { value: 1 });
      await adapter.savePreference('pref2', { value: 2 });
      await adapter.savePreference('pref3', { value: 3 });

      const keys = await adapter.listPreferences();
      expect(keys).toContain('pref1');
      expect(keys).toContain('pref2');
      expect(keys).toContain('pref3');
    });

    it('should list preferences with prefix filter', async () => {
      await adapter.savePreference('whisker-theme', { value: 'dark' });
      await adapter.savePreference('whisker-font', { value: '14' });
      await adapter.savePreference('other-pref', { value: 'test' });

      const keys = await adapter.listPreferences('whisker-');
      expect(keys).toContain('whisker-theme');
      expect(keys).toContain('whisker-font');
      expect(keys).not.toContain('other-pref');
    });
  });

  describe('Story Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should save a story', async () => {
      const story = {
        id: 'story-1',
        metadata: { title: 'Test Story', author: 'Test' },
        passages: [],
      };

      await adapter.saveStory(story);
      // Should not throw
    });

    it('should load a saved story', async () => {
      const story = {
        id: 'story-2',
        metadata: { title: 'Test Story 2', author: 'Test' },
        passages: [{ id: 'p1', title: 'Start', content: 'Beginning' }],
      };

      await adapter.saveStory(story);
      const loaded = await adapter.loadStory('story-2');

      expect(loaded).toBeDefined();
      expect(loaded.id).toBe('story-2');
      expect(loaded.metadata.title).toBe('Test Story 2');
      expect(loaded.passages).toHaveLength(1);
    });

    it('should return null for non-existent story', async () => {
      const loaded = await adapter.loadStory('non-existent-story');
      expect(loaded).toBeNull();
    });

    it('should update existing story', async () => {
      const story = {
        id: 'story-3',
        metadata: { title: 'Original Title' },
        passages: [],
      };

      await adapter.saveStory(story);

      story.metadata.title = 'Updated Title';
      await adapter.saveStory(story);

      const loaded = await adapter.loadStory('story-3');
      expect(loaded.metadata.title).toBe('Updated Title');
    });

    it('should delete a story', async () => {
      const story = {
        id: 'story-4',
        metadata: { title: 'To Delete' },
        passages: [],
      };

      await adapter.saveStory(story);
      await adapter.deleteStory('story-4');

      const loaded = await adapter.loadStory('story-4');
      expect(loaded).toBeNull();
    });

    it('should list all stories', async () => {
      const story1 = {
        id: 'story-5',
        metadata: { title: 'Story 5' },
        passages: [],
      };

      const story2 = {
        id: 'story-6',
        metadata: { title: 'Story 6' },
        passages: [],
      };

      await adapter.saveStory(story1);
      await adapter.saveStory(story2);

      const stories = await adapter.listStories();
      expect(stories.length).toBeGreaterThanOrEqual(2);

      const ids = stories.map(s => s.id);
      expect(ids).toContain('story-5');
      expect(ids).toContain('story-6');
    });

    it('should add updatedAt timestamp when saving story', async () => {
      const story = {
        id: 'story-7',
        metadata: { title: 'Story 7' },
        passages: [],
      };

      await adapter.saveStory(story);
      const loaded = await adapter.loadStory('story-7');

      expect(loaded.updatedAt).toBeDefined();
      expect(typeof loaded.updatedAt).toBe('string');
    });
  });

  describe('Quota Information', () => {
    it('should get quota info', async () => {
      const quotaInfo = await adapter.getQuotaInfo();

      expect(quotaInfo).toHaveProperty('used');
      expect(quotaInfo).toHaveProperty('total');
      expect(quotaInfo).toHaveProperty('available');
      expect(typeof quotaInfo.used).toBe('number');
      expect(typeof quotaInfo.total).toBe('number');
      expect(typeof quotaInfo.available).toBe('number');
    });
  });

  describe('Clear Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should clear all data', async () => {
      // Add some data
      await adapter.savePreference('pref1', { value: 1 });
      await adapter.saveStory({ id: 'story-1', metadata: {}, passages: [] });

      // Clear all
      await adapter.clearAll();

      // Verify cleared
      const pref = await adapter.loadPreference('pref1');
      const story = await adapter.loadStory('story-1');

      expect(pref).toBeNull();
      expect(story).toBeNull();
    });
  });

  describe('Connection Management', () => {
    it('should close connection', () => {
      adapter.close();
      expect(adapter.isReady()).toBe(false);
    });

    it('should reinitialize after close', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);

      adapter.close();
      expect(adapter.isReady()).toBe(false);

      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations before initialization', async () => {
      const newAdapter = new IndexedDBAdapter({ dbName: 'error-test', version: 1 });

      // Should auto-initialize
      await newAdapter.savePreference('test', { value: 'test' });
      expect(newAdapter.isReady()).toBe(true);

      newAdapter.close();
    });

    it('should handle invalid data gracefully', async () => {
      await adapter.initialize();

      // Should not throw
      await adapter.savePreference('test', undefined as any);
      const loaded = await adapter.loadPreference('test');
      expect(loaded).toBeUndefined();
    });
  });
});
