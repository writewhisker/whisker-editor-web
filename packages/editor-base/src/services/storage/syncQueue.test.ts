/**
 * Tests for SyncQueueService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncQueue } from './syncQueue';
import type { SyncQueueEntry } from './syncQueue';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('SyncQueueService', () => {
  beforeEach(async () => {
    // Initialize the queue
    await syncQueue.initialize();
    // Clear any existing data
    await syncQueue.clearQueue();
  });

  afterEach(async () => {
    // Clean up after each test
    await syncQueue.clearQueue();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await syncQueue.initialize();
      // Should not throw
    });

    it('should handle multiple initialization calls', async () => {
      await syncQueue.initialize();
      await syncQueue.initialize();
      // Should not throw
    });
  });

  describe('Enqueue Operations', () => {
    it('should enqueue a create operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: { story: { id: 'story-1', title: 'Test' } },
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].storyId).toBe('story-1');
      expect(queue[0].operation).toBe('create');
    });

    it('should enqueue an update operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: { story: { id: 'story-2', title: 'Updated' } },
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe('update');
    });

    it('should enqueue a delete operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-3',
        operation: 'delete',
        data: { storyId: 'story-3' },
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe('delete');
    });

    it('should generate unique IDs for queue entries', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBeDefined();
      expect(queue[1].id).toBeDefined();
      expect(queue[0].id).not.toBe(queue[1].id);
    });

    it('should set timestamp automatically', async () => {
      const before = new Date();

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const after = new Date();
      const queue = await syncQueue.getQueue();

      expect(queue[0].timestamp).toBeDefined();
      const timestamp = new Date(queue[0].timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should initialize retryCount to 0', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue[0].retryCount).toBe(0);
    });

    it('should enqueue multiple operations', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-3',
        operation: 'delete',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(3);
    });
  });

  describe('Get Queue Operations', () => {
    it('should return empty queue initially', async () => {
      const queue = await syncQueue.getQueue();
      expect(queue).toEqual([]);
    });

    it('should return all queued operations', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(2);
    });

    it('should return queue sorted by timestamp (oldest first)', async () => {
      // Enqueue with slight delay to ensure different timestamps
      await syncQueue.enqueue({
        storyId: 'story-3',
        operation: 'create',
        data: {},
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(3);

      // Should be sorted oldest to newest
      const timestamps = queue.map(e => new Date(e.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('Get Queue For Story', () => {
    it('should return operations for specific story', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: {},
      });

      const queue = await syncQueue.getQueueForStory('story-1');
      expect(queue).toHaveLength(2);
      expect(queue[0].storyId).toBe('story-1');
      expect(queue[1].storyId).toBe('story-1');
    });

    it('should return empty array for story with no operations', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueueForStory('story-99');
      expect(queue).toEqual([]);
    });
  });

  describe('Dequeue Operations', () => {
    it('should remove operation from queue', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      await syncQueue.dequeue(entryId);

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue).toHaveLength(0);
    });

    it('should remove only the specified operation', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(2);

      // Find the entry with story-1 and dequeue it
      const story1Entry = queue.find(e => e.storyId === 'story-1');
      expect(story1Entry).toBeDefined();

      await syncQueue.dequeue(story1Entry!.id);

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue).toHaveLength(1);
      expect(updatedQueue[0].storyId).toBe('story-2');
    });

    it('should handle dequeuing non-existent operation', async () => {
      await syncQueue.dequeue('non-existent-id');
      // Should not throw
    });
  });

  describe('Retry Management', () => {
    it('should increment retry count', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      await syncQueue.incrementRetry(entryId);

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue[0].retryCount).toBe(1);
    });

    it('should increment retry count multiple times', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      await syncQueue.incrementRetry(entryId);
      await syncQueue.incrementRetry(entryId);
      await syncQueue.incrementRetry(entryId);

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue[0].retryCount).toBe(3);
    });

    it('should store error message with retry', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      await syncQueue.incrementRetry(entryId, 'Network error');

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue[0].lastError).toBe('Network error');
    });

    it('should update error message on subsequent retries', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const queue = await syncQueue.getQueue();
      const entryId = queue[0].id;

      await syncQueue.incrementRetry(entryId, 'First error');
      await syncQueue.incrementRetry(entryId, 'Second error');

      const updatedQueue = await syncQueue.getQueue();
      expect(updatedQueue[0].lastError).toBe('Second error');
      expect(updatedQueue[0].retryCount).toBe(2);
    });

    it('should handle incrementing retry for non-existent entry', async () => {
      await syncQueue.incrementRetry('non-existent-id', 'Error');
      // Should not throw
    });
  });

  describe('Queue Status', () => {
    it('should return false when queue is empty', async () => {
      const hasPending = await syncQueue.hasPending();
      expect(hasPending).toBe(false);
    });

    it('should return true when queue has entries', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      const hasPending = await syncQueue.hasPending();
      expect(hasPending).toBe(true);
    });

    it('should return correct count', async () => {
      expect(await syncQueue.getCount()).toBe(0);

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      expect(await syncQueue.getCount()).toBe(1);

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      expect(await syncQueue.getCount()).toBe(2);
    });
  });

  describe('Clear Queue', () => {
    it('should clear all operations', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.enqueue({
        storyId: 'story-2',
        operation: 'update',
        data: {},
      });

      await syncQueue.clearQueue();

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should make hasPending return false after clear', async () => {
      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: {},
      });

      await syncQueue.clearQueue();

      const hasPending = await syncQueue.hasPending();
      expect(hasPending).toBe(false);
    });

    it('should handle clearing empty queue', async () => {
      await syncQueue.clearQueue();
      // Should not throw

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist queue entries with all fields', async () => {
      const testData = {
        story: { id: 'story-1', title: 'Test Story' },
        githubInfo: { repo: 'owner/repo', filename: 'story.json' },
      };

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'update',
        data: testData,
      });

      const queue = await syncQueue.getQueue();
      expect(queue[0].data).toEqual(testData);
    });

    it('should persist complex nested data', async () => {
      const complexData = {
        story: {
          id: 'story-1',
          metadata: { title: 'Test', author: 'Author', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString(), tags: ['tag1', 'tag2'] },
          passages: [
            { id: 'p1', title: 'Start', content: 'Text' },
            { id: 'p2', title: 'Next', content: 'More text' },
          ],
        },
      };

      await syncQueue.enqueue({
        storyId: 'story-1',
        operation: 'create',
        data: complexData,
      });

      const queue = await syncQueue.getQueue();
      expect(queue[0].data).toEqual(complexData);
    });
  });
});
