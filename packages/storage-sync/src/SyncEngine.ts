import type { StorageAdapter } from '@writewhisker/storage-adapters';

export interface SyncConfig {
  syncInterval: number;
  conflictResolution: 'local' | 'remote' | 'latest' | 'manual';
  retryAttempts: number;
  retryDelay: number;
}

export interface SyncStatus {
  lastSync: number;
  syncing: boolean;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

export interface SyncConflict<T = any> {
  key: string;
  local: T;
  remote: T;
  timestamp: number;
}

export interface SyncError {
  message: string;
  timestamp: number;
  key?: string;
}

export class SyncEngine<T = any> {
  private config: SyncConfig;
  private localStore: StorageAdapter<T>;
  private remoteStore: StorageAdapter<T>;
  private status: SyncStatus;
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];

  constructor(
    localStore: StorageAdapter<T>,
    remoteStore: StorageAdapter<T>,
    config: Partial<SyncConfig> = {}
  ) {
    this.localStore = localStore;
    this.remoteStore = remoteStore;
    this.config = {
      syncInterval: 60000, // 1 minute
      conflictResolution: 'latest',
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
    this.status = {
      lastSync: 0,
      syncing: false,
      conflicts: [],
      errors: [],
    };
  }

  public async start(): Promise<void> {
    await this.sync();

    this.syncTimer = setInterval(() => {
      this.sync();
    }, this.config.syncInterval);
  }

  public stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public async sync(): Promise<void> {
    if (this.status.syncing) {
      return;
    }

    this.status.syncing = true;
    this.notifyListeners();

    try {
      const localKeys = await this.localStore.keys();
      const remoteKeys = await this.remoteStore.keys();

      const allKeys = new Set([...localKeys, ...remoteKeys]);
      const allKeysArray = Array.from(allKeys);

      for (const key of allKeysArray) {
        await this.syncKey(key);
      }

      this.status.lastSync = Date.now();
      this.status.errors = [];
    } catch (error) {
      this.status.errors.push({
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      });
    } finally {
      this.status.syncing = false;
      this.notifyListeners();
    }
  }

  private async syncKey(key: string): Promise<void> {
    const localValue = await this.localStore.get(key);
    const remoteValue = await this.remoteStore.get(key);

    if (localValue === null && remoteValue !== null) {
      // Remote only - copy to local
      await this.localStore.set(key, remoteValue);
    } else if (localValue !== null && remoteValue === null) {
      // Local only - copy to remote
      await this.remoteStore.set(key, localValue);
    } else if (localValue !== null && remoteValue !== null) {
      // Both exist - check for conflicts
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        await this.resolveConflict(key, localValue, remoteValue);
      }
    }
  }

  private async resolveConflict(key: string, local: T, remote: T): Promise<void> {
    const conflict: SyncConflict<T> = {
      key,
      local,
      remote,
      timestamp: Date.now(),
    };

    switch (this.config.conflictResolution) {
      case 'local':
        await this.remoteStore.set(key, local);
        break;
      case 'remote':
        await this.localStore.set(key, remote);
        break;
      case 'latest':
        // Use remote as latest (in real impl, would check timestamps)
        await this.localStore.set(key, remote);
        break;
      case 'manual':
        this.status.conflicts.push(conflict);
        break;
    }
  }

  public async resolveManualConflict(key: string, value: T): Promise<void> {
    await this.localStore.set(key, value);
    await this.remoteStore.set(key, value);

    this.status.conflicts = this.status.conflicts.filter(c => c.key !== key);
    this.notifyListeners();
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public addEventListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getStatus()));
  }
}
