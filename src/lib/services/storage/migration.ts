/**
 * Storage Migration Utility
 *
 * Handles migration of localStorage data to new storage adapter format.
 * Provides utilities for checking migration status and performing migrations.
 */

import { getDefaultStorageAdapter } from './StorageServiceFactory';
import type { IStorageAdapter } from './types';

interface MigrationStatus {
  version: string;
  migratedAt: string;
  itemsMigrated: number;
}

interface MigrationResult {
  success: boolean;
  itemsMigrated: number;
  errors: string[];
}

/**
 * Storage Migration Utility
 */
export class StorageMigration {
  private adapter: IStorageAdapter | null = null;
  private readonly MIGRATION_KEY = 'whisker-migration-status';
  private readonly CURRENT_VERSION = '1.0.0';

  // Keys that need migration
  private readonly KEYS_TO_MIGRATE = [
    'whisker-theme',
    'whisker-view-preferences',
    'whisker-global-view-mode',
    'whisker-preferences-version',
    'whisker-tag-colors',
    'whisker_export_preferences',
    'whisker_export_history',
    'whisker_import_history',
  ];

  async initialize(): Promise<void> {
    this.adapter = await getDefaultStorageAdapter();
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    const status = this.getMigrationStatus();
    return status === null || status.version !== this.CURRENT_VERSION;
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus | null {
    try {
      const stored = localStorage.getItem(this.MIGRATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set migration status
   */
  private setMigrationStatus(status: MigrationStatus): void {
    try {
      localStorage.setItem(this.MIGRATION_KEY, JSON.stringify(status));
    } catch (e) {
      console.error('Failed to save migration status:', e);
    }
  }

  /**
   * Migrate all preferences
   */
  async migrateAll(): Promise<MigrationResult> {
    if (!this.adapter) {
      throw new Error('Migration not initialized');
    }

    const errors: string[] = [];
    let itemsMigrated = 0;

    // Check if already migrated
    const status = this.getMigrationStatus();
    if (status && status.version === this.CURRENT_VERSION) {
      return {
        success: true,
        itemsMigrated: 0,
        errors: ['Already migrated to version ' + this.CURRENT_VERSION],
      };
    }

    // Migrate each key
    for (const key of this.KEYS_TO_MIGRATE) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          // Parse and re-save through adapter to ensure format consistency
          const parsed = JSON.parse(value);
          await this.adapter.setPreference(key, parsed);
          itemsMigrated++;
        }
      } catch (e) {
        errors.push(`Failed to migrate ${key}: ${e}`);
      }
    }

    // Save migration status
    this.setMigrationStatus({
      version: this.CURRENT_VERSION,
      migratedAt: new Date().toISOString(),
      itemsMigrated,
    });

    return {
      success: errors.length === 0,
      itemsMigrated,
      errors,
    };
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{
    used: number;
    available: number;
    total: number;
  }> {
    // Calculate localStorage usage
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            // Approximate size in bytes (chars * 2 for UTF-16)
            used += (key.length + value.length) * 2;
          }
        }
      }
    } catch (e) {
      console.error('Failed to calculate storage usage:', e);
    }

    // Most browsers allow ~5-10MB for localStorage
    const total = 10 * 1024 * 1024; // 10MB
    const available = total - used;

    return { used, available, total };
  }

  /**
   * Clear all migration data (for testing)
   */
  clearMigrationStatus(): void {
    try {
      localStorage.removeItem(this.MIGRATION_KEY);
    } catch (e) {
      console.error('Failed to clear migration status:', e);
    }
  }

  /**
   * Get list of keys that would be migrated
   */
  getKeysToMigrate(): string[] {
    return [...this.KEYS_TO_MIGRATE];
  }
}

// Singleton instance
let migrationInstance: StorageMigration | null = null;

/**
 * Get the migration utility singleton
 */
export async function getMigrationUtil(): Promise<StorageMigration> {
  if (!migrationInstance) {
    migrationInstance = new StorageMigration();
    await migrationInstance.initialize();
  }
  return migrationInstance;
}

/**
 * Reset migration utility (for testing)
 */
export function resetMigrationUtil(): void {
  migrationInstance = null;
}
