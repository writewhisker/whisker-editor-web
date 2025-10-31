/**
 * Tests for BackgroundSyncService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backgroundSync } from './backgroundSync';
import { syncQueue } from './syncQueue';
import * as githubApi from '../github/githubApi';
import { isAuthenticated } from '../github/githubAuth';
import { get } from 'svelte/store';

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Mock modules
vi.mock('../github/githubApi', () => ({
  saveFile: vi.fn(),
  getFile: vi.fn(),
}));

vi.mock('../github/githubAuth', () => ({
  isAuthenticated: { subscribe: vi.fn() },
}));

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('BackgroundSyncService', () => {
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup isAuthenticated mock
    vi.mocked(isAuthenticated.subscribe).mockImplementation((callback) => {
      callback(true);
      return () => {};
    });

    // Initialize sync queue
    await syncQueue.initialize();
    await syncQueue.clearQueue();

    // Stop any running sync
    backgroundSync.stop();

    // Reset navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    backgroundSync.stop();
  });

  describe('Start and Stop', () => {
    it('should start the background sync service', () => {
      backgroundSync.start(100);
      const status = backgroundSync.getStatus();
      // Service should be initialized
      expect(status).toBeDefined();
    });

    it('should stop the background sync service', () => {
      backgroundSync.start(100);
      backgroundSync.stop();
      // Should not throw
    });

    it('should handle multiple start calls', () => {
      backgroundSync.start(100);
      backgroundSync.start(100);
      // Should log warning but not throw
      backgroundSync.stop();
    });

    it('should handle stop when not running', () => {
      backgroundSync.stop();
      // Should not throw
    });
  });

  describe('Sync Status', () => {
    it('should start with idle state', () => {
      const status = backgroundSync.getStatus();
      expect(status.state).toBe('idle');
      expect(status.lastSyncTime).toBeNull();
      expect(status.error).toBeNull();
      expect(status.pendingCount).toBe(0);
    });

    it('should update status during sync', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: { repo: 'owner/repo', filename: 'story.json' },
        },
      });

      vi.mocked(githubApi.saveFile).mockResolvedValue({
        content: { sha: 'abc123' },
        commit: { sha: 'def456', html_url: '' },
      } as any);

      backgroundSync.start(100);
      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.lastSyncTime).not.toBeNull();
      expect(status.state).toBe('idle');
      expect(status.error).toBeNull();

      backgroundSync.stop();
    });

    it('should track sync in progress', () => {
      expect(backgroundSync.isSyncInProgress()).toBe(false);
    });
  });

  describe('Sync Now - Basic Operations', () => {
    it('should skip sync when not authenticated', async () => {
      // Mock as not authenticated
      vi.mocked(isAuthenticated.subscribe).mockImplementation((callback) => {
        callback(false);
        return () => {};
      });

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {},
      });

      await backgroundSync.syncNow();

      // Should not call GitHub API
      expect(githubApi.saveFile).not.toHaveBeenCalled();
    });

    it('should skip sync when offline', async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {},
      });

      await backgroundSync.syncNow();

      expect(githubApi.saveFile).not.toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.state).toBe('idle');
      expect(status.pendingCount).toBe(0);
    });

    it('should skip sync when already syncing', async () => {
      // Start a sync (it will process empty queue)
      const promise1 = backgroundSync.syncNow();

      // Try to start another sync immediately
      const promise2 = backgroundSync.syncNow();

      await Promise.all([promise1, promise2]);

      // Should handle gracefully
      expect(backgroundSync.isSyncInProgress()).toBe(false);
    });
  });

  describe('Sync Now - Queue Processing', () => {
    it('should process create operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {
          story: { id: 'story-1', title: 'Test Story' },
          githubInfo: { repo: 'owner/repo', filename: 'story.json' },
        },
      });

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(githubApi.saveFile).mockResolvedValue({
        content: { sha: 'abc123' },
        commit: { sha: 'def456', html_url: '' },
      } as any);

      await backgroundSync.syncNow();

      expect(githubApi.saveFile).toHaveBeenCalledWith(
        'owner',
        'repo',
        'story.json',
        expect.any(String),
        expect.stringContaining('Create'),
        undefined
      );

      // Queue should be empty after successful sync
      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should process update operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1', title: 'Updated Story' },
          githubInfo: { repo: 'owner/repo', filename: 'story.json' },
        },
      });

      vi.mocked(githubApi.getFile).mockResolvedValue({
        path: 'story.json',
        content: '{}',
        sha: 'existing-sha',
        size: 100,
      });

      vi.mocked(githubApi.saveFile).mockResolvedValue({
        content: { sha: 'new-sha' },
        commit: { sha: 'commit-sha', html_url: '' },
      } as any);

      await backgroundSync.syncNow();

      expect(githubApi.getFile).toHaveBeenCalledWith('owner', 'repo', 'story.json');
      expect(githubApi.saveFile).toHaveBeenCalledWith(
        'owner',
        'repo',
        'story.json',
        expect.any(String),
        expect.stringContaining('Update'),
        'existing-sha'
      );

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should process multiple operations in order', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {
          story: { id: 'story-1' },
          githubInfo: { repo: 'owner/repo', filename: 'story1.json' },
        },
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {
          story: { id: 'story-2' },
          githubInfo: { repo: 'owner/repo', filename: 'story2.json' },
        },
      });

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile).mockResolvedValue({
        content: { sha: 'sha' },
        commit: { sha: 'commit', html_url: '' },
      } as any);

      await backgroundSync.syncNow();

      expect(githubApi.saveFile).toHaveBeenCalledTimes(2);
      expect(githubApi.saveFile).toHaveBeenNthCalledWith(
        1,
        'owner',
        'repo',
        'story1.json',
        expect.any(String),
        expect.any(String),
        expect.anything()
      );
      expect(githubApi.saveFile).toHaveBeenNthCalledWith(
        2,
        'owner',
        'repo',
        'story2.json',
        expect.any(String),
        expect.any(String),
        expect.anything()
      );

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should skip delete operations with warning', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'delete',
        data: { storyId: 'story-1' },
      });

      const consoleSpy = vi.spyOn(console, 'warn');

      await backgroundSync.syncNow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Delete operation not yet implemented')
      );

      // Delete operations should be removed from queue
      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should increment retry count on failure', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: { repo: 'owner/repo', filename: 'story.json' },
        },
      });

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile).mockRejectedValue(new Error('Network error'));

      await backgroundSync.syncNow();

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Network error');
    });

    it('should remove entry after max retries', async () => {
      // Create entry with 4 retries (will be removed on 5th)
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: { repo: 'owner/repo', filename: 'story.json' },
        },
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      // Set retryCount to 4
      await syncQueue.incrementRetry(entryId);
      await syncQueue.incrementRetry(entryId);
      await syncQueue.incrementRetry(entryId);
      await syncQueue.incrementRetry(entryId);

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile).mockRejectedValue(new Error('Network error'));

      await backgroundSync.syncNow();

      // Should be removed after 5th retry
      const finalQueue = await syncQueue.getQueue();
      expect(finalQueue).toHaveLength(0);
    });

    it('should continue processing queue after individual failure', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: { repo: 'owner/repo', filename: 'story1.json' },
        },
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {
          story: { id: 'story-2' },
          githubInfo: { repo: 'owner/repo', filename: 'story2.json' },
        },
      });

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile)
        .mockRejectedValueOnce(new Error('Error for story 1'))
        .mockResolvedValueOnce({
          content: { sha: 'sha' },
          commit: { sha: 'commit', html_url: '' },
        } as any);

      await backgroundSync.syncNow();

      // First should still be in queue (failed), second should be removed (succeeded)
      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].storyId).toBe('story-1');
    });

    it('should handle missing GitHub info', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: {}, // Missing repo and filename
        },
      });

      await backgroundSync.syncNow();

      // Should fail and increment retry
      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toContain('Missing GitHub repository');
    });

    it('should handle invalid repository format', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {
          story: { id: 'story-1' },
          githubInfo: {
            repo: 'invalid-format', // Should be owner/repo
            filename: 'story.json',
          },
        },
      });

      await backgroundSync.syncNow();

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toContain('Invalid repository format');
    });

    it('should set error state on sync failure', async () => {
      // Mock queue to throw error
      vi.spyOn(syncQueue, 'getQueue').mockRejectedValue(new Error('Database error'));

      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.state).toBe('error');
      expect(status.error).toBe('Database error');
    });
  });

  describe('Periodic Sync', () => {
    it('should run sync periodically', async () => {
      const syncSpy = vi.spyOn(backgroundSync, 'syncNow');

      backgroundSync.start(50); // 50ms interval

      // Wait for at least 2 sync cycles
      await new Promise(resolve => setTimeout(resolve, 120));

      expect(syncSpy).toHaveBeenCalled();

      backgroundSync.stop();
    });
  });

  describe('Status Updates', () => {
    it('should update pending count', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      // Mock to fail so items stay in queue
      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile).mockRejectedValue(new Error('Network error'));

      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.pendingCount).toBe(2);
    });

    it('should clear error on successful sync', async () => {
      // First sync fails
      vi.mocked(syncQueue.getQueue).mockRejectedValueOnce(new Error('Database error'));
      await backgroundSync.syncNow();

      let status = backgroundSync.getStatus();
      expect(status.state).toBe('error');
      expect(status.error).toBe('Database error');

      // Second sync succeeds
      vi.mocked(syncQueue.getQueue).mockResolvedValue([]);
      await backgroundSync.syncNow();

      status = backgroundSync.getStatus();
      expect(status.state).toBe('idle');
      expect(status.error).toBeNull();
    });
  });
});
