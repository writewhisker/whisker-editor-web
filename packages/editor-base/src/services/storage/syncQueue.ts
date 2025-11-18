/**
 * Sync Queue Service
 *
 * Manages the queue of pending sync operations for GitHub.
 * This is a thin wrapper around @writewhisker/storage's SyncQueueService
 * that provides editor-specific error handling.
 */

import { createIndexedDBStorage, SyncQueueService, type SyncQueueEntry } from '@writewhisker/storage';
import { handleError } from '../../utils/errorHandling';

// Re-export SyncQueueEntry for backward compatibility
export type { SyncQueueEntry };

/**
 * Error handler that integrates with editor-base error handling
 */
function createErrorHandler() {
  return (error: unknown, context: string) => {
    handleError(error, context, { silent: false });
  };
}

/**
 * Create a SyncQueueService with editor-specific error handling
 */
function createEditorSyncQueue(): SyncQueueService {
  const storage = createIndexedDBStorage();
  const backend = storage.getBackend();
  return new SyncQueueService(backend, createErrorHandler());
}

// Singleton instance
export const syncQueue = createEditorSyncQueue();
