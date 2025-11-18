/**
 * Modern Story Migration Utility
 *
 * Migrates story data from localStorage to new @writewhisker/storage (IndexedDB)
 *
 * This migration utility uses the new storage architecture
 */

import { storageAdapter } from '../../adapters/storageAdapter.js';
import { Story } from '@writewhisker/core-ts';

export interface MigrationResult {
  success: boolean;
  storiesMigrated: number;
  errors: Array<{ key: string; error: string }>;
  skipped: number;
}

export interface MigrationProgress {
  current: number;
  total: number;
  currentStory: string;
}

export type ProgressCallback = (progress: MigrationProgress) => void;

export class ModernStoryMigration {
  private migrationKey = 'whisker-modern-migration-complete';
  private migrationVersionKey = 'whisker-modern-migration-version';
  private currentMigrationVersion = 2; // Version 2 for new storage architecture

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      // Check if migration has been completed
      const migrationComplete = localStorage.getItem(this.migrationKey);
      const migrationVersion = localStorage.getItem(this.migrationVersionKey);

      if (
        migrationComplete === 'true' &&
        parseInt(migrationVersion || '0') >= this.currentMigrationVersion
      ) {
        return false;
      }

      // Check for stories in localStorage
      const localStorageKeys = this.findLocalStorageStoryKeys();
      return localStorageKeys.length > 0;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Perform the migration
   */
  async migrate(progressCallback?: ProgressCallback): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      storiesMigrated: 0,
      errors: [],
      skipped: 0,
    };

    try {
      // Initialize new storage adapter
      await storageAdapter.initialize();

      // Migrate from localStorage
      await this.migrateFromLocalStorage(result, progressCallback);

      // Mark migration as complete if successful
      if (result.errors.length === 0) {
        this.markMigrationComplete();
      } else {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        key: 'migration',
        error: error instanceof Error ? error.message : String(error),
      });
      return result;
    }
  }

  /**
   * Migrate stories from localStorage
   */
  private async migrateFromLocalStorage(
    result: MigrationResult,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    const storyKeys = this.findLocalStorageStoryKeys();

    for (let i = 0; i < storyKeys.length; i++) {
      const key = storyKeys[i];

      try {
        // Report progress
        if (progressCallback) {
          progressCallback({
            current: result.storiesMigrated + i + 1,
            total: storyKeys.length,
            currentStory: key,
          });
        }

        // Check if already migrated
        const storyId = this.extractStoryId(key);
        if (storyId) {
          const exists = await storageAdapter.hasStory(storyId);
          if (exists) {
            result.skipped++;
            continue;
          }
        }

        // Load story from localStorage
        const storyData = localStorage.getItem(key);
        if (!storyData) {
          result.skipped++;
          continue;
        }

        // Parse and validate story data
        const projectData = JSON.parse(storyData);

        if (!projectData.metadata || !projectData.metadata.id) {
          result.errors.push({
            key,
            error: 'Invalid story structure: missing metadata.id',
          });
          continue;
        }

        // Deserialize and save to new storage
        const story = Story.deserializeProject(projectData);
        await storageAdapter.saveStory(story, projectData.metadata.id, true);
        result.storiesMigrated++;

        console.log(`Migrated story from localStorage: ${story.metadata.title || story.metadata.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({ key, error: errorMessage });
        console.error(`Failed to migrate story ${key}:`, error);
      }
    }
  }

  /**
   * Clean up old localStorage keys after successful migration
   */
  async cleanupOldData(): Promise<number> {
    let cleaned = 0;

    try {
      const storyKeys = this.findLocalStorageStoryKeys();

      for (const key of storyKeys) {
        try {
          const storyId = this.extractStoryId(key);
          if (storyId) {
            // Verify story exists in new storage
            const exists = await storageAdapter.hasStory(storyId);

            if (exists) {
              // Safe to remove from localStorage
              localStorage.removeItem(key);
              cleaned++;
              console.log(`Cleaned up localStorage key: ${key}`);
            }
          }
        } catch (error) {
          console.error(`Failed to cleanup key ${key}:`, error);
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return cleaned;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    complete: boolean;
    version: number;
    storiesInLocalStorage: number;
  } {
    const complete = localStorage.getItem(this.migrationKey) === 'true';
    const version = parseInt(localStorage.getItem(this.migrationVersionKey) || '0');
    const storiesInLocalStorage = this.findLocalStorageStoryKeys().length;

    return {
      complete,
      version,
      storiesInLocalStorage,
    };
  }

  /**
   * Find all story keys in localStorage
   */
  private findLocalStorageStoryKeys(): string[] {
    const keys: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && this.isStoryKey(key)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.error('Error finding story keys:', error);
    }

    return keys;
  }

  /**
   * Check if a key is a story key
   */
  private isStoryKey(key: string): boolean {
    // Match keys like: whisker-story-{id}, whisker_story_{id}, story-{id}, etc.
    return (
      key.startsWith('whisker-story-') ||
      key.startsWith('whisker_story_') ||
      key.startsWith('story-') ||
      key.startsWith('project-')
    );
  }

  /**
   * Extract story ID from localStorage key
   */
  private extractStoryId(key: string): string | null {
    const patterns = [
      /^whisker-story-(.+)$/,
      /^whisker_story_(.+)$/,
      /^story-(.+)$/,
      /^project-(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = key.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Mark migration as complete
   */
  private markMigrationComplete(): void {
    try {
      localStorage.setItem(this.migrationKey, 'true');
      localStorage.setItem(this.migrationVersionKey, String(this.currentMigrationVersion));
      console.log('Modern story migration marked as complete');
    } catch (error) {
      console.error('Failed to mark migration as complete:', error);
    }
  }
}
