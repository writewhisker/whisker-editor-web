/**
 * Application Initialization
 *
 * Handles initialization of storage, migration, and other app-wide services
 */

import { initializeStorage } from './storageAdapter.js';
import { ModernStoryMigration } from '../services/storage/modernStoryMigration.js';
import type { MigrationProgress } from '../services/storage/modernStoryMigration.js';

export interface InitializationOptions {
  /**
   * Callback for migration progress updates
   */
  onMigrationProgress?: (progress: MigrationProgress) => void;

  /**
   * Whether to automatically run migration if needed
   * @default true
   */
  autoMigrate?: boolean;

  /**
   * Whether to automatically cleanup old data after successful migration
   * @default true
   */
  autoCleanup?: boolean;
}

export interface InitializationResult {
  success: boolean;
  migrationPerformed: boolean;
  storiesMigrated: number;
  errors: string[];
}

/**
 * Initialize the application
 * - Initializes storage adapter
 * - Checks for and performs data migration if needed
 * - Cleans up old data after successful migration
 */
export async function initializeApp(
  options: InitializationOptions = {}
): Promise<InitializationResult> {
  const {
    onMigrationProgress,
    autoMigrate = true,
    autoCleanup = true,
  } = options;

  const result: InitializationResult = {
    success: true,
    migrationPerformed: false,
    storiesMigrated: 0,
    errors: [],
  };

  try {
    // Initialize storage adapter first
    await initializeStorage();
    console.log('Storage adapter initialized');

    // Check if migration is needed
    const migration = new ModernStoryMigration();
    const needsMigration = await migration.needsMigration();

    if (needsMigration) {
      console.log('Data migration needed');

      if (autoMigrate) {
        console.log('Starting automatic migration...');

        // Perform migration
        const migrationResult = await migration.migrate(onMigrationProgress);

        result.migrationPerformed = true;
        result.storiesMigrated = migrationResult.storiesMigrated;

        if (migrationResult.success) {
          console.log(`Migration successful: ${migrationResult.storiesMigrated} stories migrated`);

          // Cleanup old data if requested
          if (autoCleanup && migrationResult.storiesMigrated > 0) {
            console.log('Cleaning up old data...');
            const cleaned = await migration.cleanupOldData();
            console.log(`Cleaned up ${cleaned} old localStorage keys`);
          }
        } else {
          console.error('Migration completed with errors:', migrationResult.errors);
          result.errors = migrationResult.errors.map(e => `${e.key}: ${e.error}`);
          result.success = false;
        }
      } else {
        console.warn('Migration needed but autoMigrate is disabled');
        result.errors.push('Migration needed but not performed (autoMigrate=false)');
      }
    } else {
      console.log('No migration needed');
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Application initialization failed:', error);
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

/**
 * Get current migration status
 */
export function getMigrationStatus(): {
  complete: boolean;
  version: number;
  storiesInLocalStorage: number;
} {
  const migration = new ModernStoryMigration();
  return migration.getMigrationStatus();
}
