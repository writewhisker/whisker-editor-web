/**
 * Cloud Storage Adapter
 *
 * Provides cloud synchronization for preferences and stories.
 * Supports offline-first operation with sync queue.
 */

import type { PreferenceScope } from '@writewhisker/storage';
import type { IStorageAdapter } from './types';
import { LocalStorageAdapter } from './LocalStorageAdapter';

export interface CloudStorageConfig {
  userId: string;
  syncEnabled: boolean;
  conflictResolution: 'local' | 'remote' | 'newest' | 'ask';
  syncInterval?: number; // milliseconds
  apiEndpoint?: string;
  apiKey?: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'save' | 'delete';
  key: string;
  value?: any;
  scope?: PreferenceScope;
  timestamp: number;
  retries: number;
}

export interface SyncStatus {
  lastSync: number | null;
  pendingOperations: number;
  syncing: boolean;
  online: boolean;
  error: string | null;
}

export interface ConflictResolution {
  key: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  resolution?: 'local' | 'remote';
}

export type ConflictCallback = (conflicts: ConflictResolution[]) => Promise<ConflictResolution[]>;

/**
 * Cloud Storage Adapter
 *
 * Features:
 * - Offline-first operation with local cache
 * - Automatic sync queue for offline operations
 * - Conflict resolution strategies
 * - Online/offline detection
 * - Background sync worker
 *
 * Note: This is a partial implementation focusing on preference syncing.
 * Full IStorageAdapter implementation is pending.
 */
export class CloudStorageAdapter {
  private config: CloudStorageConfig;
  private localAdapter: LocalStorageAdapter;
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncWorker: number | null = null;
  private status: SyncStatus = {
    lastSync: null,
    pendingOperations: 0,
    syncing: false,
    online: true,
    error: null,
  };
  private conflictCallback: ConflictCallback | null = null;
  private ready = false;

  constructor(config: CloudStorageConfig, conflictCallback?: ConflictCallback) {
    this.config = {
      syncInterval: 30000, // 30 seconds default
      ...config,
    };
    this.localAdapter = new LocalStorageAdapter();
    this.conflictCallback = conflictCallback || null;
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    // Initialize local adapter
    await this.localAdapter.initialize();

    // Load sync queue from local storage
    await this.loadSyncQueue();

    // Set up online/offline detection
    this.setupOnlineDetection();

    // Start sync worker if sync is enabled
    if (this.config.syncEnabled) {
      this.startSyncWorker();
    }

    // Do initial sync if online
    if (this.isOnline && this.config.syncEnabled) {
      await this.sync();
    }

    this.ready = true;
  }

  /**
   * Check if adapter is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Save a preference
   */
  async savePreference<T>(
    key: string,
    value: T,
    scope: PreferenceScope = 'global'
  ): Promise<void> {
    const timestamp = Date.now();

    // Save to cache
    this.cache.set(key, { value, timestamp });

    // Save to local storage immediately
    await this.localAdapter.savePreference(key, value, scope);

    // Queue for cloud sync
    if (this.config.syncEnabled) {
      this.queueOperation({
        id: `${key}-${timestamp}`,
        operation: 'save',
        key,
        value,
        scope,
        timestamp,
        retries: 0,
      });

      // Try immediate sync if online
      if (this.isOnline && !this.status.syncing) {
        this.processSyncQueue();
      }
    }
  }

  /**
   * Load a preference
   */
  async loadPreference<T>(
    key: string,
    scope: PreferenceScope = 'global'
  ): Promise<T | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached.value as T;
    }

    // Load from local storage
    const localValue = await this.localAdapter.loadPreference(key, scope) as T | null;

    if (localValue !== null) {
      this.cache.set(key, { value: localValue, timestamp: Date.now() });
      return localValue;
    }

    // Try to fetch from cloud if online
    if (this.isOnline && this.config.syncEnabled) {
      try {
        const remoteValue = await this.fetchFromCloud<T>(key, scope);
        if (remoteValue !== null) {
          // Save to local cache and storage
          this.cache.set(key, { value: remoteValue, timestamp: Date.now() });
          await this.localAdapter.savePreference(key, remoteValue, scope);
          return remoteValue;
        }
      } catch (error) {
        console.error('Failed to fetch from cloud:', error);
      }
    }

    return null;
  }

  /**
   * Delete a preference
   */
  async deletePreference(key: string): Promise<void> {
    // Remove from cache
    this.cache.delete(key);

    // Delete from local storage
    await this.localAdapter.deletePreference(key);

    // Queue for cloud deletion
    if (this.config.syncEnabled) {
      this.queueOperation({
        id: `${key}-${Date.now()}`,
        operation: 'delete',
        key,
        timestamp: Date.now(),
        retries: 0,
      });

      // Try immediate sync if online
      if (this.isOnline && !this.status.syncing) {
        this.processSyncQueue();
      }
    }
  }

  /**
   * List all preference keys
   */
  async listPreferences(prefix: string = ''): Promise<string[]> {
    return this.localAdapter.listPreferences(prefix);
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{ used: number; total: number; available: number }> {
    return this.localAdapter.getQuotaInfo();
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Manually trigger a sync
   */
  async sync(): Promise<void> {
    if (!this.config.syncEnabled) {
      throw new Error('Sync is not enabled');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (this.status.syncing) {
      return; // Already syncing
    }

    this.status.syncing = true;
    this.status.error = null;

    try {
      // 1. Pull changes from cloud
      await this.pullFromCloud();

      // 2. Push pending changes to cloud
      await this.processSyncQueue();

      this.status.lastSync = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.error = errorMessage;
      throw error;
    } finally {
      this.status.syncing = false;
    }
  }

  /**
   * Enable or disable sync
   */
  setSyncEnabled(enabled: boolean): void {
    this.config.syncEnabled = enabled;

    if (enabled && this.isOnline && !this.syncWorker) {
      this.startSyncWorker();
      // Trigger immediate sync
      this.sync().catch(err => console.error('Sync failed:', err));
    } else if (!enabled && this.syncWorker) {
      this.stopSyncWorker();
    }
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(strategy: 'local' | 'remote' | 'newest' | 'ask'): void {
    this.config.conflictResolution = strategy;
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Close the adapter and clean up
   */
  close(): void {
    this.stopSyncWorker();
    this.saveSyncQueue();
    this.ready = false;
  }

  // Private Methods

  /**
   * Queue an operation for sync
   */
  private queueOperation(item: SyncQueueItem): void {
    this.syncQueue.push(item);
    this.status.pendingOperations = this.syncQueue.length;
    this.saveSyncQueue();
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const maxRetries = 3;
    const processedItems: string[] = [];

    for (const item of [...this.syncQueue]) {
      try {
        if (item.operation === 'save') {
          await this.pushToCloud(item.key, item.value, item.scope || 'global');
        } else if (item.operation === 'delete') {
          await this.deleteFromCloud(item.key);
        }

        processedItems.push(item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.retries++;

        if (item.retries >= maxRetries) {
          console.error(`Max retries reached for item ${item.id}, removing from queue`);
          processedItems.push(item.id);
        }
      }
    }

    // Remove processed items from queue
    this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item.id));
    this.status.pendingOperations = this.syncQueue.length;
    this.saveSyncQueue();
  }

  /**
   * Pull changes from cloud
   */
  private async pullFromCloud(): Promise<void> {
    if (!this.config.apiEndpoint) {
      return; // No cloud endpoint configured
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}/preferences?userId=${this.config.userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const remoteData: Array<{ key: string; value: any; timestamp: number; scope: PreferenceScope }> = await response.json();

      // Process remote changes and detect conflicts
      const conflicts: ConflictResolution[] = [];

      for (const remote of remoteData) {
        const cached = this.cache.get(remote.key);
        const local = await this.localAdapter.loadPreference(remote.key, remote.scope);

        if (local !== null && cached) {
          // Potential conflict
          const localTimestamp = cached.timestamp;
          const remoteTimestamp = remote.timestamp;

          if (JSON.stringify(local) !== JSON.stringify(remote.value)) {
            conflicts.push({
              key: remote.key,
              localValue: local,
              remoteValue: remote.value,
              localTimestamp,
              remoteTimestamp,
            });
          }
        } else {
          // No conflict, just update
          this.cache.set(remote.key, { value: remote.value, timestamp: remote.timestamp });
          await this.localAdapter.savePreference(remote.key, remote.value, remote.scope);
        }
      }

      // Handle conflicts
      if (conflicts.length > 0) {
        await this.resolveConflicts(conflicts);
      }
    } catch (error) {
      console.error('Failed to pull from cloud:', error);
      throw error;
    }
  }

  /**
   * Push a value to cloud
   */
  private async pushToCloud<T>(
    key: string,
    value: T,
    scope: PreferenceScope
  ): Promise<void> {
    if (!this.config.apiEndpoint) {
      return; // No cloud endpoint configured
    }

    const timestamp = Date.now();

    const response = await fetch(`${this.config.apiEndpoint}/preferences`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        userId: this.config.userId,
        key,
        value,
        scope,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Fetch a value from cloud
   */
  private async fetchFromCloud<T>(
    key: string,
    scope: PreferenceScope
  ): Promise<T | null> {
    if (!this.config.apiEndpoint) {
      return null;
    }

    const response = await fetch(
      `${this.config.apiEndpoint}/preferences/${key}?userId=${this.config.userId}&scope=${scope}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value as T;
  }

  /**
   * Delete a value from cloud
   */
  private async deleteFromCloud(key: string): Promise<void> {
    if (!this.config.apiEndpoint) {
      return;
    }

    const response = await fetch(
      `${this.config.apiEndpoint}/preferences/${key}?userId=${this.config.userId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(conflicts: ConflictResolution[]): Promise<void> {
    const strategy = this.config.conflictResolution;

    if (strategy === 'ask' && this.conflictCallback) {
      // Ask user to resolve
      const resolved = await this.conflictCallback(conflicts);

      for (const conflict of resolved) {
        if (conflict.resolution === 'local') {
          // Keep local, push to cloud
          await this.pushToCloud(conflict.key, conflict.localValue, 'global');
        } else if (conflict.resolution === 'remote') {
          // Use remote, update local
          this.cache.set(conflict.key, { value: conflict.remoteValue, timestamp: conflict.remoteTimestamp });
          await this.localAdapter.savePreference(conflict.key, conflict.remoteValue, 'global');
        }
      }
    } else {
      // Automatic resolution
      for (const conflict of conflicts) {
        let resolution: 'local' | 'remote';

        if (strategy === 'local') {
          resolution = 'local';
        } else if (strategy === 'remote') {
          resolution = 'remote';
        } else {
          // 'newest' strategy
          resolution = conflict.localTimestamp > conflict.remoteTimestamp ? 'local' : 'remote';
        }

        if (resolution === 'local') {
          await this.pushToCloud(conflict.key, conflict.localValue, 'global');
        } else {
          this.cache.set(conflict.key, { value: conflict.remoteValue, timestamp: conflict.remoteTimestamp });
          await this.localAdapter.savePreference(conflict.key, conflict.remoteValue, 'global');
        }
      }
    }
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Set up online/offline detection
   */
  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;
    this.status.online = this.isOnline;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.status.online = true;
      console.log('Cloud sync: Online');

      // Trigger sync when coming online
      if (this.config.syncEnabled) {
        this.sync().catch(err => console.error('Sync failed:', err));
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.status.online = false;
      console.log('Cloud sync: Offline');
    });
  }

  /**
   * Start the background sync worker
   */
  private startSyncWorker(): void {
    if (this.syncWorker !== null) return;

    this.syncWorker = window.setInterval(() => {
      if (this.isOnline && this.config.syncEnabled && !this.status.syncing) {
        this.sync().catch(err => console.error('Background sync failed:', err));
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop the background sync worker
   */
  private stopSyncWorker(): void {
    if (this.syncWorker !== null) {
      clearInterval(this.syncWorker);
      this.syncWorker = null;
    }
  }

  /**
   * Save sync queue to local storage
   */
  private saveSyncQueue(): void {
    try {
      const key = `whisker-cloud-sync-queue-${this.config.userId}`;
      localStorage.setItem(key, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Load sync queue from local storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const key = `whisker-cloud-sync-queue-${this.config.userId}`;
      const data = localStorage.getItem(key);

      if (data) {
        this.syncQueue = JSON.parse(data);
        this.status.pendingOperations = this.syncQueue.length;
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }
}
