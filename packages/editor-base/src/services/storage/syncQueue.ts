/**
 * Sync Queue Service
 *
 * Manages the queue of pending sync operations for GitHub
 */

import { IndexedDBAdapter } from './IndexedDBAdapter';
import { handleError } from '../../utils/errorHandling';

export interface SyncQueueEntry {
  id: string;
  storyId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: Date;
  data: any;
  retryCount: number;
  lastError?: string;
}

class SyncQueueService {
  private db: IndexedDBAdapter;
  private initialized = false;

  constructor() {
    this.db = new IndexedDBAdapter({ dbName: 'whisker-storage', version: 1 });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.db.initialize();
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
      const queueEntry: SyncQueueEntry = {
        ...entry,
        id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        retryCount: 0,
      };

      await this.db.addToSyncQueue(queueEntry);
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
      const queue = await this.db.getSyncQueue();

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
    await this.db.removeFromSyncQueue(id);
  }

  /**
   * Update retry count for failed operation
   */
  async incrementRetry(id: string, error?: string): Promise<void> {
    await this.initialize();
    const queue = await this.db.getSyncQueue();
    const entry = queue.find(e => e.id === id);

    if (entry) {
      entry.retryCount++;
      if (error) {
        entry.lastError = error;
      }
      await this.db.addToSyncQueue(entry);
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
    await this.db.clearSyncQueue();
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
