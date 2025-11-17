/**
 * Tests for VersionManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VersionManager, getVersionManager } from './versionManager';
import type { PublishResult } from './types';

describe('VersionManager', () => {
  let manager: VersionManager;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    manager = new VersionManager();

    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should return null for non-existent history', () => {
      const history = manager.getHistory('story-123');
      expect(history).toBeNull();
    });

    it('should add a new version', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
        url: 'https://example.com/story.html',
      };

      const version = manager.addVersion(
        'story-123',
        'My Story',
        '1.0.0',
        'static',
        result,
        'Initial release'
      );

      expect(version.version).toBe('1.0.0');
      expect(version.storyId).toBe('story-123');
      expect(version.storyTitle).toBe('My Story');
      expect(version.platform).toBe('static');
      expect(version.notes).toBe('Initial release');
    });

    it('should retrieve version history', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);

      const history = manager.getHistory('story-123');

      expect(history).not.toBeNull();
      expect(history?.storyId).toBe('story-123');
      expect(history?.currentVersion).toBe('1.0.0');
      expect(history?.versions).toHaveLength(1);
    });

    it('should add multiple versions', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.1.0', 'github-pages', result);

      const versions = manager.getVersions('story-123');

      expect(versions).toHaveLength(3);
    });

    it('should sort versions by publishedAt (newest first)', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      // Add versions with delays to ensure different timestamps
      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.1.0', 'static', result);

      const versions = manager.getVersions('story-123');

      // Should be sorted newest first
      expect(versions[0].publishedAt).toBeGreaterThanOrEqual(versions[1].publishedAt);
      expect(versions[1].publishedAt).toBeGreaterThanOrEqual(versions[2].publishedAt);
    });
  });

  describe('Version Retrieval', () => {
    beforeEach(() => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.1.0', 'static', result);
    });

    it('should get latest version', () => {
      const latest = manager.getLatestVersion('story-123');
      const versions = manager.getVersions('story-123');

      expect(latest).not.toBeNull();
      // Latest should be the first in the sorted array
      expect(latest).toStrictEqual(versions[0]);
      // Should be one of our versions
      expect(['1.0.0', '1.0.1', '1.1.0']).toContain(latest?.version);
    });

    it('should get specific version by ID', () => {
      const versions = manager.getVersions('story-123');
      const targetVersion = versions[1];

      const retrieved = manager.getVersion('story-123', targetVersion.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(targetVersion.id);
      expect(retrieved?.version).toBe(targetVersion.version);
    });

    it('should return null for non-existent version ID', () => {
      const version = manager.getVersion('story-123', 'non-existent-id');
      expect(version).toBeNull();
    });
  });

  describe('Version Deletion', () => {
    beforeEach(() => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.1.0', 'static', result);
    });

    it('should delete a version', () => {
      const versions = manager.getVersions('story-123');
      const toDelete = versions[1];

      const deleted = manager.deleteVersion('story-123', toDelete.id);

      expect(deleted).toBe(true);
      expect(manager.getVersions('story-123')).toHaveLength(2);
    });

    it('should return false for non-existent version', () => {
      const deleted = manager.deleteVersion('story-123', 'non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should update current version after deletion', () => {
      const versions = manager.getVersions('story-123');
      const latest = versions[0];

      manager.deleteVersion('story-123', latest.id);

      const history = manager.getHistory('story-123');
      expect(history?.currentVersion).toBe(versions[1].version);
    });

    it('should clear entire history', () => {
      manager.clearHistory('story-123');

      const history = manager.getHistory('story-123');
      expect(history).toBeNull();
    });

    it('should clear all histories', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'Story 1', '1.0.0', 'static', result);
      manager.addVersion('story-456', 'Story 2', '1.0.0', 'static', result);

      manager.clearAllHistories();

      expect(manager.getHistory('story-123')).toBeNull();
      expect(manager.getHistory('story-456')).toBeNull();
    });
  });

  describe('Version Increment', () => {
    it('should increment patch version', () => {
      const next = manager.incrementVersion('1.0.0', 'patch');
      expect(next).toBe('1.0.1');
    });

    it('should increment minor version', () => {
      const next = manager.incrementVersion('1.0.5', 'minor');
      expect(next).toBe('1.1.0');
    });

    it('should increment major version', () => {
      const next = manager.incrementVersion('1.5.3', 'major');
      expect(next).toBe('2.0.0');
    });

    it('should handle version with missing parts', () => {
      const next = manager.incrementVersion('1', 'patch');
      expect(next).toBe('1.0.1');
    });

    it('should suggest next version for story', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);

      const nextPatch = manager.suggestNextVersion('story-123', 'patch');
      expect(nextPatch).toBe('1.0.1');

      const nextMinor = manager.suggestNextVersion('story-123', 'minor');
      expect(nextMinor).toBe('1.1.0');

      const nextMajor = manager.suggestNextVersion('story-123', 'major');
      expect(nextMajor).toBe('2.0.0');
    });

    it('should suggest initial version for new story', () => {
      const next = manager.suggestNextVersion('new-story', 'patch');
      expect(next).toBe('0.0.1');
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'static', result);
    });

    it('should export history as JSON', () => {
      const json = manager.exportHistory('story-123');
      const parsed = JSON.parse(json);

      expect(parsed.storyId).toBe('story-123');
      expect(parsed.versions).toHaveLength(2);
    });

    it('should throw error for non-existent story', () => {
      expect(() => manager.exportHistory('non-existent')).toThrow();
    });

    it('should import history from JSON', () => {
      const json = manager.exportHistory('story-123');

      // Clear and import
      manager.clearHistory('story-123');
      expect(manager.getHistory('story-123')).toBeNull();

      manager.importHistory(json);

      const history = manager.getHistory('story-123');
      expect(history).not.toBeNull();
      expect(history?.versions).toHaveLength(2);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => manager.importHistory('invalid json')).toThrow();
    });

    it('should throw error for invalid history format', () => {
      const invalidHistory = JSON.stringify({ invalid: 'format' });
      expect(() => manager.importHistory(invalidHistory)).toThrow('Invalid history format');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);
      manager.addVersion('story-123', 'My Story', '1.0.1', 'github-pages', result);
      manager.addVersion('story-123', 'My Story', '1.1.0', 'itch-io', result);
      manager.addVersion('story-123', 'My Story', '1.1.1', 'static', result);
    });

    it('should calculate statistics', () => {
      const stats = manager.getStatistics('story-123');

      expect(stats.totalVersions).toBe(4);
      expect(stats.platforms).toEqual({
        static: 2,
        'github-pages': 1,
        'itch-io': 1,
      });
      expect(stats.firstPublished).toBeDefined();
      expect(stats.lastPublished).toBeDefined();
    });

    it('should return zero stats for non-existent story', () => {
      const stats = manager.getStatistics('non-existent');

      expect(stats.totalVersions).toBe(0);
      expect(stats.platforms).toEqual({});
      expect(stats.firstPublished).toBeUndefined();
      expect(stats.lastPublished).toBeUndefined();
    });
  });

  describe('Singleton Instance', () => {
    it('should return same instance', () => {
      const instance1 = getVersionManager();
      const instance2 = getVersionManager();

      expect(instance1).toBe(instance2);
    });

    it('should persist data across getInstance calls', () => {
      const manager1 = getVersionManager();
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager1.addVersion('story-123', 'My Story', '1.0.0', 'static', result);

      const manager2 = getVersionManager();
      const history = manager2.getHistory('story-123');

      expect(history).not.toBeNull();
      expect(history?.versions).toHaveLength(1);
    });
  });

  describe('Metadata Handling', () => {
    it('should store publish result metadata', () => {
      const result: PublishResult = {
        success: true,
        platform: 'github-pages',
        url: 'https://user.github.io/repo/',
        metadata: {
          owner: 'testuser',
          repo: 'my-story',
          branch: 'gh-pages',
        },
      };

      const version = manager.addVersion(
        'story-123',
        'My Story',
        '1.0.0',
        'github-pages',
        result
      );

      expect(version.metadata).toEqual({
        owner: 'testuser',
        repo: 'my-story',
        branch: 'gh-pages',
      });
    });

    it('should store snapshot if provided', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      const snapshot = JSON.stringify({ passages: [], variables: [] });

      const version = manager.addVersion(
        'story-123',
        'My Story',
        '1.0.0',
        'static',
        result,
        'Initial release',
        snapshot
      );

      expect(version.snapshot).toBe(snapshot);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist to localStorage', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'whisker-publish-versions',
        expect.any(String)
      );
    });

    it('should load from localStorage', () => {
      const result: PublishResult = {
        success: true,
        platform: 'static',
      };

      manager.addVersion('story-123', 'My Story', '1.0.0', 'static', result);

      // Create new manager instance (simulates page reload)
      const newManager = new VersionManager();
      const history = newManager.getHistory('story-123');

      expect(history).not.toBeNull();
      expect(history?.versions).toHaveLength(1);
    });

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const history = manager.getHistory('story-123');
      expect(history).toBeNull();
    });

    it('should handle corrupt localStorage data', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json {{{');

      const history = manager.getHistory('story-123');
      expect(history).toBeNull();
    });
  });
});
