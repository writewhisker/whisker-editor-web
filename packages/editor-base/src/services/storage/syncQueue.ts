/**
 * Sync Queue Service
 *
 * Manages the queue of pending sync operations for GitHub
 */

import { createIndexedDBStorage, type SyncQueueEntry } from '@writewhisker/storage';
import { handleError } from '../../utils/errorHandling';

// Re-export SyncQueueEntry for backward compatibility
export type { SyncQueueEntry };

class SyncQueueService {
  private storage = createIndexedDBStorage();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.storage.initialize();
      this.initialized = true;
    } catch (error: any) {
      const appError = handleError(error, 'SyncQueue.initialize', { silent: false });
      throw new Error(`Failed to initialize sync queue: ${appError.userMessage}`);
    }
  }

  /**
   * Add a sync operation to the queue
   */
  async enqueue(entry: Omit<SyncQueueEntry, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.initialize();

    try {
      const backend = this.storage.getBackend();

      const queueEntry: SyncQueueEntry = {
        ...entry,
        id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      if (backend.addToSyncQueue) {
        await backend.addToSyncQueue(queueEntry);
      }
    } catch (error: any) {
      const appError = handleError(error, 'SyncQueue.enqueue', { silent: false });
      throw new Error(`Failed to enqueue sync operation: ${appError.userMessage}`);
    }
  }

  /**
   * Get all pending sync operations
   */
  async getQueue(): Promise<SyncQueueEntry[]> {
    await this.initialize();

    try {
      const backend = this.storage.getBackend();

      if (!backend.getSyncQueue) {
        return [];
      }

      const queue = await backend.getSyncQueue();

      // Sort by timestamp (oldest first)
      return queue.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error: any) {
      const appError = handleError(error, 'SyncQueue.getQueue', { silent: false });
      console.error('Failed to get sync queue:', appError.message);
      return []; // Return empty array on error to prevent UI breakage
    }
  }

  /**
   * Get pending operations for a specific story
   */
  async getQueueForStory(storyId: string): Promise<SyncQueueEntry[]> {
    const queue = await this.getQueue();
    return queue.filter(entry => entry.storyId === storyId);
  }

  /**
   * Remove an operation from the queue
   */
  async dequeue(id: string): Promise<void> {
    await this.initialize();

    const backend = this.storage.getBackend();
    if (backend.removeFromSyncQueue) {
      await backend.removeFromSyncQueue(id);
    }
  }

  /**
   * Update retry count for failed operation
   */
  async incrementRetry(id: string, error?: string): Promise<void> {
    await this.initialize();

    const backend = this.storage.getBackend();

    if (!backend.getSyncQueue || !backend.addToSyncQueue) {
      return;
    }

    const queue = await backend.getSyncQueue();
    const entry = queue.find(e => e.id === id);

    if (entry) {
      entry.retryCount++;
      if (error) {
        entry.lastError = error;
      }
      await backend.addToSyncQueue(entry);
    }
  }

  /**
   * Check if there are pending operations
   */
  async hasPending(): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.length > 0;
  }

  /**
   * Clear all pending operations
   */
  async clearQueue(): Promise<void> {
    await this.initialize();

    const backend = this.storage.getBackend();
    if (backend.clearSyncQueue) {
      await backend.clearSyncQueue();
    }
  }

  /**
   * Get count of pending operations
   */
  async getCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

// Singleton instance
export const syncQueue = new SyncQueueService();
