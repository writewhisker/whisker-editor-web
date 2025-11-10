/**
 * Tests for StoryMigration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoryMigration } from './storyMigration';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('StoryMigration', () => {
  let migration: StoryMigration;

  beforeEach(() => {
    migration = new StoryMigration();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    migration.close();
    localStorage.clear();
  });

  describe('Migration Detection', () => {
    it('should detect no migration needed when no stories exist', async () => {
      const needed = await migration.needsMigration();
      expect(needed).toBe(false);
    });

    it('should detect migration needed when stories exist in localStorage', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Test Story' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should detect no migration needed after completion', async () => {
      localStorage.setItem('whisker-story-migration-complete', 'true');
      localStorage.setItem('whisker-story-migration-version', '1');

      const needed = await migration.needsMigration();
      expect(needed).toBe(false);
    });

    it('should detect migration needed for different version', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Test Story' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));
      localStorage.setItem('whisker-story-migration-complete', 'true');
      localStorage.setItem('whisker-story-migration-version', '0');

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });
  });

  describe('Story Key Detection', () => {
    it('should find stories with whisker-story- prefix', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Test' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should find stories with whisker_story_ prefix', async () => {
      const story = {
        metadata: { id: 'story-2', title: 'Test' },
        passages: [],
      };

      localStorage.setItem('whisker_story_story-2', JSON.stringify(story));

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should find stories with story- prefix', async () => {
      const story = {
        metadata: { id: 'story-3', title: 'Test' },
        passages: [],
      };

      localStorage.setItem('story-story-3', JSON.stringify(story));

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should find stories with project- prefix', async () => {
      const story = {
        metadata: { id: 'project-1', title: 'Test' },
        passages: [],
      };

      localStorage.setItem('project-project-1', JSON.stringify(story));

      const needed = await migration.needsMigration();
      expect(needed).toBe(true);
    });

    it('should not find non-story keys', async () => {
      localStorage.setItem('whisker-theme', 'dark');
      localStorage.setItem('whisker-preferences', '{}');

      const needed = await migration.needsMigration();
      expect(needed).toBe(false);
    });
  });

  describe('Migration Execution', () => {
    it('should migrate a single story successfully', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Test Story', author: 'Test', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
        passages: [{ id: 'p1', title: 'Start', content: 'Beginning' }],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(result.storiesMigrated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toBe(0);
    });

    it('should migrate multiple stories', async () => {
      const story1 = {
        metadata: { id: 'story-multi-1', title: 'Story 1' },
        passages: [],
      };

      const story2 = {
        metadata: { id: 'story-multi-2', title: 'Story 2' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-multi-1', JSON.stringify(story1));
      localStorage.setItem('whisker-story-story-multi-2', JSON.stringify(story2));

      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(result.storiesMigrated).toBeGreaterThanOrEqual(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should report progress during migration', async () => {
      const story1 = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      const story2 = {
        metadata: { id: 'story-2', title: 'Story 2' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story1));
      localStorage.setItem('whisker-story-story-2', JSON.stringify(story2));

      const progressReports: any[] = [];
      const progressCallback = (progress: any) => {
        progressReports.push(progress);
      };

      await migration.migrate(progressCallback);

      expect(progressReports.length).toBeGreaterThan(0);
      expect(progressReports[0]).toHaveProperty('current');
      expect(progressReports[0]).toHaveProperty('total');
      expect(progressReports[0]).toHaveProperty('currentStory');
    });

    it('should skip stories without metadata.id', async () => {
      const invalidStory = {
        title: 'Invalid Story',
        passages: [],
      };

      localStorage.setItem('whisker-story-invalid', JSON.stringify(invalidStory));

      const result = await migration.migrate();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid story structure');
    });

    it('should skip already migrated stories', async () => {
      const story = {
        metadata: { id: 'story-skip-test', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-skip-test', JSON.stringify(story));

      // First migration
      const result1 = await migration.migrate();
      expect(result1.storiesMigrated).toBeGreaterThanOrEqual(1);

      // Second migration should skip
      const result2 = await migration.migrate();
      expect(result2.skipped).toBeGreaterThanOrEqual(1);
      expect(result2.storiesMigrated).toBe(0);
    });

    it('should mark migration as complete', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      await migration.migrate();

      const status = migration.getMigrationStatus();
      expect(status.complete).toBe(true);
      expect(status.version).toBe(1);
    });

    it('should handle empty migration', async () => {
      const result = await migration.migrate();

      expect(result.success).toBe(true);
      expect(result.storiesMigrated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed JSON', async () => {
      localStorage.setItem('whisker-story-bad', 'invalid json {{{');

      const result = await migration.migrate();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe('whisker-story-bad');
    });
  });

  describe('Migration Status', () => {
    it('should return correct initial status', () => {
      const status = migration.getMigrationStatus();

      expect(status.complete).toBe(false);
      expect(status.version).toBe(0);
      expect(status.storiesInLocalStorage).toBe(0);
    });

    it('should return correct status after migration', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      await migration.migrate();

      const status = migration.getMigrationStatus();

      expect(status.complete).toBe(true);
      expect(status.version).toBe(1);
    });

    it('should count stories in localStorage', () => {
      const story1 = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      const story2 = {
        metadata: { id: 'story-2', title: 'Story 2' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story1));
      localStorage.setItem('whisker-story-story-2', JSON.stringify(story2));

      const status = migration.getMigrationStatus();
      expect(status.storiesInLocalStorage).toBe(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up localStorage after successful migration', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      // Migrate
      await migration.migrate();

      // Cleanup
      const cleaned = await migration.cleanupOldData();

      expect(cleaned).toBe(1);
      expect(localStorage.getItem('whisker-story-story-1')).toBeNull();
    });

    it('should not clean up if story not in IndexedDB', async () => {
      const story = {
        metadata: { id: 'story-no-clean', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-no-clean', JSON.stringify(story));

      // Don't migrate, just try to cleanup
      const cleaned = await migration.cleanupOldData();

      // Should not clean up this specific story since it wasn't migrated
      expect(localStorage.getItem('whisker-story-story-no-clean')).not.toBeNull();
    });

    it('should clean up multiple stories', async () => {
      const story1 = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      const story2 = {
        metadata: { id: 'story-2', title: 'Story 2' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story1));
      localStorage.setItem('whisker-story-story-2', JSON.stringify(story2));

      await migration.migrate();
      const cleaned = await migration.cleanupOldData();

      expect(cleaned).toBe(2);
    });
  });

  describe('Rollback', () => {
    it('should rollback migration', async () => {
      const story = {
        metadata: { id: 'story-1', title: 'Story 1' },
        passages: [],
      };

      localStorage.setItem('whisker-story-story-1', JSON.stringify(story));

      // Migrate
      await migration.migrate();

      // Rollback
      const success = await migration.rollback();
      expect(success).toBe(true);

      // Check migration markers cleared
      const status = migration.getMigrationStatus();
      expect(status.complete).toBe(false);

      // Check story still in localStorage
      expect(localStorage.getItem('whisker-story-story-1')).not.toBeNull();
    });
  });
});
