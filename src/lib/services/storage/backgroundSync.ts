/**
 * Background Sync Service
 *
 * Handles automatic syncing of stories to GitHub in the background
 */

import { writable, get } from 'svelte/store';
import { syncQueue, type SyncQueueEntry } from './syncQueue';
import { saveFile, getFile } from '../github/githubApi';
import { isAuthenticated } from '../github/githubAuth';

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
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      this.updateStatus({ state: 'idle' });
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
          await this.processSyncEntry(entry);
          await syncQueue.dequeue(entry.id);
        } catch (error: any) {
          console.error('Failed to process sync entry:', error);
          
          // Increment retry count
          await syncQueue.incrementRetry(entry.id, error.message);
          
          // If max retries exceeded (5), remove from queue
          if (entry.retryCount >= 5) {
            console.warn('Max retries exceeded, removing from queue');
            await syncQueue.dequeue(entry.id);
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
      console.error('Sync error:', error);
      this.updateStatus({
        state: 'error',
        error: error.message || 'Sync failed',
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
    } catch (err) {
      // File doesn't exist yet, that's okay
    }

    const content = JSON.stringify(storyData.story, null, 2);
    const commitMessage = sha 
      ? 'Update ' + filename + ' (auto-sync)'
      : 'Create ' + filename + ' (auto-sync)';

    await saveFile(owner, repoName, filename, content, commitMessage, sha);
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
