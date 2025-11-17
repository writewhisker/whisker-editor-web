/**
 * Legacy Data Migration
 * Migrates data from old whisker-data IndexedDB to new storage layer
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { IndexedDBBackend } from '../backends/IndexedDBBackend.js';
import type { PreferenceEntry, SyncQueueEntry, GitHubTokenData } from '../types/ExtendedStorage.js';

const LEGACY_DB_NAME = 'whisker-data';
const LEGACY_DB_VERSION = 1;

export interface MigrationResult {
  preferencesCount: number;
  syncQueueCount: number;
  githubTokenMigrated: boolean;
  errors: string[];
}

export class LegacyDataMigration {
  private legacyDb: IDBPDatabase | null = null;

  /**
   * Check if legacy database exists
   */
  async hasLegacyData(): Promise<boolean> {
    try {
      const databases = await indexedDB.databases();
      return databases.some((db) => db.name === LEGACY_DB_NAME);
    } catch (error) {
      // indexedDB.databases() not supported in all browsers
      // Try to open the database to check if it exists
      try {
        const db = await openDB(LEGACY_DB_NAME, LEGACY_DB_VERSION);
        const hasData = db.objectStoreNames.length > 0;
        db.close();
        return hasData;
      } catch {
        return false;
      }
    }
  }

  /**
   * Open legacy database
   */
  private async openLegacyDatabase(): Promise<void> {
    if (this.legacyDb) return;

    // Try to open existing database
    // In real browsers, openDB without version opens latest version
    // In fake-indexedDB, we need to try with expected version
    try {
      this.legacyDb = await openDB(LEGACY_DB_NAME, LEGACY_DB_VERSION);
    } catch (error) {
      // Database doesn't exist or can't be opened
      this.legacyDb = null;
    }
  }

  /**
   * Close legacy database
   */
  private closeLegacyDatabase(): void {
    if (this.legacyDb) {
      this.legacyDb.close();
      this.legacyDb = null;
    }
  }

  /**
   * Migrate all legacy data to new storage
   */
  async migrate(backend: IndexedDBBackend): Promise<MigrationResult> {
    const result: MigrationResult = {
      preferencesCount: 0,
      syncQueueCount: 0,
      githubTokenMigrated: false,
      errors: [],
    };

    try {
      await this.openLegacyDatabase();

      if (!this.legacyDb) {
        throw new Error('Failed to open legacy database');
      }

      // Migrate preferences
      if (this.legacyDb.objectStoreNames.contains('preferences')) {
        try {
          result.preferencesCount = await this.migratePreferences(backend);
        } catch (error) {
          result.errors.push(`Preferences migration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate sync queue
      if (this.legacyDb.objectStoreNames.contains('syncQueue')) {
        try {
          result.syncQueueCount = await this.migrateSyncQueue(backend);
        } catch (error) {
          result.errors.push(`Sync queue migration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate GitHub token
      if (this.legacyDb.objectStoreNames.contains('auth')) {
        try {
          result.githubTokenMigrated = await this.migrateGitHubToken(backend);
        } catch (error) {
          result.errors.push(`GitHub token migration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return result;
    } finally {
      this.closeLegacyDatabase();
    }
  }

  /**
   * Migrate preferences from legacy database
   */
  private async migratePreferences(backend: IndexedDBBackend): Promise<number> {
    if (!this.legacyDb) throw new Error('Legacy database not open');
    if (!backend.savePreference) throw new Error('Backend does not support preferences');

    const tx = this.legacyDb.transaction('preferences', 'readonly');
    const store = tx.objectStore('preferences');
    const allKeys = await store.getAllKeys();

    let count = 0;
    for (const key of allKeys) {
      const value = await store.get(key);
      if (value) {
        // Transform legacy preference format to new format
        const entry: PreferenceEntry = {
          value: value.value ?? value,
          scope: value.scope ?? 'user',
          updatedAt: value.updatedAt ?? new Date().toISOString(),
        };
        await backend.savePreference(String(key), entry);
        count++;
      }
    }

    return count;
  }

  /**
   * Migrate sync queue from legacy database
   */
  private async migrateSyncQueue(backend: IndexedDBBackend): Promise<number> {
    if (!this.legacyDb) throw new Error('Legacy database not open');
    if (!backend.addToSyncQueue) throw new Error('Backend does not support sync queue');

    const tx = this.legacyDb.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const allEntries = await store.getAll();

    let count = 0;
    for (const entry of allEntries) {
      // Transform legacy sync queue entry to new format
      const syncEntry: SyncQueueEntry = {
        id: entry.id ?? crypto.randomUUID(),
        storyId: entry.storyId,
        operation: entry.operation ?? 'update',
        timestamp: entry.timestamp ?? new Date().toISOString(),
        data: entry.data ?? {},
        retryCount: entry.retryCount ?? 0,
        lastError: entry.lastError,
      };
      await backend.addToSyncQueue(syncEntry);
      count++;
    }

    return count;
  }

  /**
   * Migrate GitHub token from legacy database
   */
  private async migrateGitHubToken(backend: IndexedDBBackend): Promise<boolean> {
    if (!this.legacyDb) throw new Error('Legacy database not open');
    if (!backend.saveGitHubToken) throw new Error('Backend does not support GitHub tokens');

    const tx = this.legacyDb.transaction('auth', 'readonly');
    const store = tx.objectStore('auth');
    const token = await store.get('github_token');

    if (token) {
      // Transform legacy token format to new format
      const tokenData: GitHubTokenData = {
        accessToken: token.accessToken ?? token.access_token ?? '',
        tokenType: token.tokenType ?? token.token_type ?? 'bearer',
        scope: token.scope ?? '',
        user: token.user ? {
          login: token.user.login,
          id: token.user.id,
          name: token.user.name ?? null,
          email: token.user.email ?? null,
          avatarUrl: token.user.avatarUrl ?? token.user.avatar_url ?? '',
        } : undefined,
      };

      await backend.saveGitHubToken(tokenData);
      return true;
    }

    return false;
  }

  /**
   * Delete legacy database after successful migration
   */
  async deleteLegacyDatabase(): Promise<void> {
    this.closeLegacyDatabase();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete legacy database'));
      request.onblocked = () => {
        console.warn('Legacy database deletion blocked. Close all tabs and try again.');
        reject(new Error('Database deletion blocked'));
      };
    });
  }
}
