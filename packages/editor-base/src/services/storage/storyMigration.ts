/**
 * Story Migration Utility
 *
 * Migrates story data from localStorage to IndexedDB for better performance
 * and larger storage capacity.
 */

import { IndexedDBAdapter } from './IndexedDBAdapter';

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

export class StoryMigration {
  private adapter: IndexedDBAdapter;
  private migrationKey = 'whisker-story-migration-complete';
  private migrationVersionKey = 'whisker-story-migration-version';
  private currentMigrationVersion = 1;

  constructor() {
    this.adapter = new IndexedDBAdapter();
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      // Check if migration has been completed
      const migrationComplete = localStorage.getItem(this.migrationKey);
      const migrationVersion = localStorage.getItem(this.migrationVersionKey);

      if (migrationComplete === 'true' &&
          parseInt(migrationVersion || '0') >= this.currentMigrationVersion) {
        return false;
      }

      // Check if there are any story keys in localStorage
      const storyKeys = this.findStoryKeys();
      return storyKeys.length > 0;
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
      // Initialize IndexedDB
      await this.adapter.initialize();

      // Find all story keys in localStorage
      const storyKeys = this.findStoryKeys();
      const total = storyKeys.length;

      if (total === 0) {
        // No stories to migrate
        this.markMigrationComplete();
        return result;
      }

      // Migrate each story
      for (let i = 0; i < storyKeys.length; i++) {
        const key = storyKeys[i];

        try {
          // Report progress
          if (progressCallback) {
            progressCallback({
              current: i + 1,
              total,
              currentStory: key,
            });
          }

          // Check if already migrated
          const storyId = this.extractStoryId(key);
          if (storyId) {
            const existing = await this.adapter.loadStory(storyId);
            if (existing) {
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

          // Parse story data
          const story = JSON.parse(storyData);

          // Validate story structure
          if (!story.metadata || !story.metadata.id) {
            result.errors.push({
              key,
              error: 'Invalid story structure: missing metadata.id',
            });
            continue;
          }

          // Save to IndexedDB
          await this.adapter.saveStory(story);
          result.storiesMigrated++;

          console.log(`Migrated story: ${story.metadata.title || story.metadata.id}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({ key, error: errorMessage });
          console.error(`Failed to migrate story ${key}:`, error);
        }
      }

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
   * Rollback migration (restore from localStorage)
   */
  async rollback(): Promise<boolean> {
    try {
      // Clear migration markers
      localStorage.removeItem(this.migrationKey);
      localStorage.removeItem(this.migrationVersionKey);

      // Clear IndexedDB stories
      await this.adapter.initialize();
      const stories = await this.adapter.listStories();

      for (const story of stories) {
        await this.adapter.deleteStory(story.metadata?.id || story.id);
      }

      console.log('Migration rolled back successfully');
      return true;
    } catch (error) {
      console.error('Failed to rollback migration:', error);
      return false;
    }
  }

  /**
   * Clean up old localStorage keys after successful migration
   */
  async cleanupOldData(): Promise<number> {
    let cleaned = 0;

    try {
      const storyKeys = this.findStoryKeys();

      for (const key of storyKeys) {
        try {
          const storyId = this.extractStoryId(key);
          if (storyId) {
            // Verify story exists in IndexedDB
            await this.adapter.initialize();
            const story = await this.adapter.loadStory(storyId);

            if (story) {
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
    const storiesInLocalStorage = this.findStoryKeys().length;

    return {
      complete,
      version,
      storiesInLocalStorage,
    };
  }

  /**
   * Find all story keys in localStorage
   */
  private findStoryKeys(): string[] {
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
      console.log('Story migration marked as complete');
    } catch (error) {
      console.error('Failed to mark migration as complete:', error);
    }
  }

  /**
   * Close the adapter connection
   */
  close(): void {
    this.adapter.close();
  }
}
