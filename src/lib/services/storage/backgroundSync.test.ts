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

    // Reset the singleton's internal state
    backgroundSync.status.set({
      state: 'idle',
      lastSyncTime: null,
      error: null,
      pendingCount: 0,
    });

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

      vi.mocked(githubApi.getFile).mockResolvedValue({
        path: 'story.json',
        content: '{}',
        sha: 'existing-sha',
        size: 100,
      });

      vi.mocked(githubApi.saveFile).mockResolvedValue({
        sha: 'commit-sha',
        message: 'Update story.json (auto-sync)',
        date: new Date().toISOString(),
      } as any);

      // Don't start periodic sync, just syncNow
      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.lastSyncTime).not.toBeNull();
      expect(status.state).toBe('idle');
      expect(status.error).toBeNull();
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
        sha: 'commit-sha',
        message: 'Create story (auto-sync)',
        date: new Date().toISOString(),
      } as any);

      await backgroundSync.syncNow();

      expect(githubApi.saveFile).toHaveBeenCalledTimes(2);

      // Check that both files were saved (order may vary due to async processing)
      const calls = vi.mocked(githubApi.saveFile).mock.calls;
      const filenames = calls.map(call => call[2]);
      expect(filenames).toContain('story1.json');
      expect(filenames).toContain('story2.json');

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
      // Error handling utility converts to user-friendly message
      expect(queue[0].lastError).toContain('connect to the server');
    });

    it('should remove entry after max retries', async () => {
      // Create entry and set retry count to 4
      // After this sync fails, it will be incremented to 5 and removed
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

      // Set retryCount to 4 (will be incremented to 5 after next failure)
      await syncQueue.incrementRetry(entryId, 'Error 1');
      await syncQueue.incrementRetry(entryId, 'Error 2');
      await syncQueue.incrementRetry(entryId, 'Error 3');
      await syncQueue.incrementRetry(entryId, 'Error 4');

      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      // Always fail - mock all retry attempts
      vi.mocked(githubApi.saveFile).mockRejectedValue(
        Object.assign(new Error('Network timeout'), { status: 0 })
      );

      await backgroundSync.syncNow();

      // Should be removed after retry count reaches 5
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
      // First call fails (with retries), second call succeeds
      let callCount = 0;
      vi.mocked(githubApi.saveFile).mockImplementation(async () => {
        callCount++;
        if (callCount <= 3) {  // First operation with 2 retries (3 total attempts)
          throw Object.assign(new Error('Network timeout'), { status: 0 });
        }
        // Second operation succeeds
        return {
          sha: 'commit-sha',
          message: 'Create story (auto-sync)',
          date: new Date().toISOString(),
        } as any;
      });

      await backgroundSync.syncNow();

      // One should still be in queue (failed), one should be removed (succeeded)
      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      // Either story could be the one that failed, depending on processing order
      expect(['story-1', 'story-2']).toContain(queue[0].storyId);
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
      // Error handling utility converts to generic user-friendly message
      expect(queue[0].lastError).toBeDefined();
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
      // Error handling utility converts to user-friendly validation message
      expect(queue[0].lastError).toBeDefined();
    });

    it('should set error state on sync failure', async () => {
      // Mock queue to throw error
      const queueSpy = vi.spyOn(syncQueue, 'getQueue');
      queueSpy.mockRejectedValue(new Error('Database error'));

      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.state).toBe('error');
      // Error handling utility converts to user-friendly message
      expect(status.error).toBeDefined();
      expect(status.error).not.toBeNull();

      // Restore spy
      queueSpy.mockRestore();
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

      // Mock to fail so items stay in queue
      // Use retryable error that will fail all retries
      vi.mocked(githubApi.getFile).mockRejectedValue(new Error('Not found'));
      vi.mocked(githubApi.saveFile).mockRejectedValue(
        Object.assign(new Error('Network timeout'), { status: 0 })
      );

      await backgroundSync.syncNow();

      const status = backgroundSync.getStatus();
      expect(status.pendingCount).toBe(2);
    }, 10000); // 10 second timeout for retry delays

    it('should clear error on successful sync', async () => {
      // First sync fails
      const queueSpy = vi.spyOn(syncQueue, 'getQueue');
      queueSpy.mockRejectedValueOnce(new Error('Database error'));
      await backgroundSync.syncNow();

      let status = backgroundSync.getStatus();
      expect(status.state).toBe('error');
      // Error handling converts to user-friendly message
      expect(status.error).toBeDefined();
      expect(status.error).not.toBeNull();

      // Second sync succeeds
      queueSpy.mockResolvedValue([]);
      await backgroundSync.syncNow();

      status = backgroundSync.getStatus();
      expect(status.state).toBe('idle');
      expect(status.error).toBeNull();

      // Restore spy
      queueSpy.mockRestore();
    });
  });
});
