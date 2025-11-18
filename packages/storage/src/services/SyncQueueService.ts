/**
 * Sync Queue Service
 *
 * Framework-agnostic service for managing the queue of pending sync operations.
 * Can be used with any storage backend that implements IStorageBackend.
 */

import type { IStorageBackend } from '../interfaces/IStorageBackend';
import type { SyncQueueEntry } from '../types/ExtendedStorage';

export type { SyncQueueEntry };

/**
 * Optional error handler callback
 * Allows applications to provide their own error handling logic
 */
export type ErrorHandler = (error: unknown, context: string) => void;

export class SyncQueueService {
  private backend: IStorageBackend;
  private initialized = false;
  private errorHandler?: ErrorHandler;

  constructor(backend: IStorageBackend, errorHandler?: ErrorHandler) {
    this.backend = backend;
    this.errorHandler = errorHandler;
  }

  /**
   * Initialize the storage backend
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.backend.initialize();
      this.initialized = true;
    } catch (error: any) {
      this.handleError(error, 'SyncQueue.initialize');
      throw new Error(`Failed to initialize sync queue: ${error.message}`);
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
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      if (this.backend.addToSyncQueue) {
        await this.backend.addToSyncQueue(queueEntry);
      }
    } catch (error: any) {
      this.handleError(error, 'SyncQueue.enqueue');
      throw new Error(`Failed to enqueue sync operation: ${error.message}`);
    }
  }

  /**
   * Get all pending sync operations
   */
  async getQueue(): Promise<SyncQueueEntry[]> {
    await this.initialize();

    try {
      if (!this.backend.getSyncQueue) {
        return [];
      }

      const queue = await this.backend.getSyncQueue();

      // Sort by timestamp (oldest first)
      return queue.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error: any) {
      this.handleError(error, 'SyncQueue.getQueue');
      console.error('Failed to get sync queue:', error.message);
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

    if (this.backend.removeFromSyncQueue) {
      await this.backend.removeFromSyncQueue(id);
    }
  }

  /**
   * Update retry count for failed operation
   */
  async incrementRetry(id: string, error?: string): Promise<void> {
    await this.initialize();

    if (!this.backend.getSyncQueue || !this.backend.addToSyncQueue) {
      return;
    }

    const queue = await this.backend.getSyncQueue();
    const entry = queue.find(e => e.id === id);

    if (entry) {
      entry.retryCount++;
      if (error) {
        entry.lastError = error;
      }
      await this.backend.addToSyncQueue(entry);
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

    if (this.backend.clearSyncQueue) {
      await this.backend.clearSyncQueue();
    }
  }

  /**
   * Get count of pending operations
   */
  async getCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Handle errors with optional callback
   */
  private handleError(error: unknown, context: string): void {
    if (this.errorHandler) {
      this.errorHandler(error, context);
    }
  }
}
