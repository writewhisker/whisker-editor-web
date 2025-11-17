/**
 * Background Sync Service
 *
 * Handles automatic syncing of stories to GitHub in the background
 */

import { writable, get } from 'svelte/store';
import { syncQueue, type SyncQueueEntry } from './syncQueue';
import { saveFile, getFile } from '@writewhisker/github';
import { isAuthenticated } from '@writewhisker/github';
import {
  handleError,
  classifyError,
  ErrorSeverity,
  ErrorCategory,
  withRetry,
  isOnline,
  whenOnline,
} from '../../utils/errorHandling';

export type SyncState = 'idle' | 'syncing' | 'error';

interface BackgroundSyncStatus {
  state: SyncState;
  lastSyncTime: Date | null;
  error: string | null;
  pendingCount: number;
}

class BackgroundSyncService {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isSyncing = false;
  
  public status = writable<BackgroundSyncStatus>({
    state: 'idle',
    lastSyncTime: null,
    error: null,
    pendingCount: 0,
  });

  /**
   * Start the background sync service
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      console.warn('Background sync already running');
      return;
    }

    this.isRunning = true;
    
    // Run immediately
    this.syncNow();

    // Then run periodically
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalMs);

    console.log('Background sync service started');
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    console.log('Background sync service stopped');
  }

  /**
   * Trigger a sync operation immediately
   */
  async syncNow(): Promise<void> {
    // Don't start new sync if already syncing
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    // Check if authenticated
    if (!get(isAuthenticated)) {
      console.log('Not authenticated, skipping sync');
      this.updateStatus({ state: 'idle' });
      return;
    }

    // Check if online
    if (!isOnline()) {
      console.log('Offline, skipping sync');
      this.updateStatus({
        state: 'idle',
        error: 'Offline - will sync when connection restored',
      });
      return;
    }

    this.isSyncing = true;
    this.updateStatus({ state: 'syncing' });

    try {
      const queue = await syncQueue.getQueue();
      const pendingCount = queue.length;

      if (pendingCount === 0) {
        console.log('No pending sync operations');
        this.updateStatus({ 
          state: 'idle',
          lastSyncTime: new Date(),
          error: null,
          pendingCount: 0,
        });
        return;
      }

      console.log('Processing ${pendingCount} pending sync operations');

      // Process queue entries one by one
      for (const entry of queue) {
        try {
          // Use retry logic with exponential backoff
          await withRetry(
            () => this.processSyncEntry(entry),
            {
              maxRetries: 2, // Will be retried 2 times before incrementing queue retry count
              initialDelay: 1000,
              maxDelay: 10000,
              onRetry: (attempt, error) => {
                console.log(`Retry attempt ${attempt} for sync entry ${entry.id}:`, error.message);
              },
            }
          );

          // Success - remove from queue
          await syncQueue.dequeue(entry.id);
        } catch (error: any) {
          const appError = handleError(error, 'BackgroundSync.processSyncEntry', { silent: false });

          // Increment retry count with user-friendly error message
          await syncQueue.incrementRetry(entry.id, appError.userMessage || appError.message);

          // Get updated entry to check retry count
          const updatedQueue = await syncQueue.getQueue();
          const updatedEntry = updatedQueue.find(e => e.id === entry.id);
          const currentRetryCount = updatedEntry?.retryCount || entry.retryCount + 1;

          // If max retries exceeded (5), remove from queue
          if (currentRetryCount >= 5) {
            console.warn(`Max retries exceeded for entry ${entry.id}, removing from queue`);
            await syncQueue.dequeue(entry.id);

            // Update status with persistent error
            this.updateStatus({
              state: 'error',
              error: `Failed to sync after ${currentRetryCount + 1} attempts: ${appError.userMessage}`,
            });
          }
        }
      }

      const remainingCount = await syncQueue.getCount();
      
      this.updateStatus({
        state: 'idle',
        lastSyncTime: new Date(),
        error: null,
        pendingCount: remainingCount,
      });

      console.log('Sync completed successfully');
    } catch (error: any) {
      const appError = handleError(error, 'BackgroundSync.syncNow', { silent: false });

      this.updateStatus({
        state: 'error',
        error: appError.userMessage || 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single sync entry
   */
  private async processSyncEntry(entry: SyncQueueEntry): Promise<void> {
    const { operation, storyId, data } = entry;

    switch (operation) {
      case 'create':
      case 'update':
        await this.syncStoryToGitHub(storyId, data);
        break;
      case 'delete':
        // For now, we don't handle deletes from the queue
        // This would require GitHub file deletion API
        console.warn('Delete operation not yet implemented in background sync');
        break;
      default:
        console.warn('Unknown operation:', operation);
    }
  }

  /**
   * Sync a story to GitHub
   */
  private async syncStoryToGitHub(storyId: string, storyData: any): Promise<void> {
    const { repo, filename } = storyData.githubInfo;

    if (!repo || !filename) {
      throw new Error('Missing GitHub repository or filename information');
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      throw new Error('Invalid repository format');
    }

    // Get existing file SHA if it exists
    let sha: string | undefined;
    try {
      const existingFile = await getFile(owner, repoName, filename);
      sha = existingFile.sha;
    } catch (err: any) {
      // File doesn't exist yet, that's okay (404 is expected for new files)
      if (err.status !== 404) {
        // Log other errors but continue with creation
        console.warn('Error checking for existing file:', err.message);
      }
    }

    const content = JSON.stringify(storyData.story, null, 2);
    const commitMessage = sha
      ? `Update ${filename} (auto-sync)`
      : `Create ${filename} (auto-sync)`;

    // Execute save with whenOnline wrapper to ensure connectivity
    await whenOnline(
      () => saveFile(owner, repoName, filename, content, commitMessage, sha),
      {
        waitTimeout: 30000, // Wait up to 30 seconds for connection
        offlineMessage: 'Cannot sync - device is offline',
      }
    );
  }

  /**
   * Update sync status
   */
  private updateStatus(updates: Partial<BackgroundSyncStatus>): void {
    this.status.update(current => ({
      ...current,
      ...updates,
    }));
  }

  /**
   * Get current status
   */
  getStatus(): BackgroundSyncStatus {
    return get(this.status);
  }

  /**
   * Check if syncing is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncService();
