/**
 * Version Management for Published Stories
 *
 * Tracks publish history, versions, and enables rollback functionality.
 */

import type { PublishPlatform, PublishResult } from './types';

/**
 * Version information for a published story
 */
export interface StoryVersion {
  /** Unique version ID */
  id: string;

  /** Version number (e.g., "1.0.0", "1.1.0") */
  version: string;

  /** Story ID */
  storyId: string;

  /** Story title at time of publishing */
  storyTitle: string;

  /** Platform published to */
  platform: PublishPlatform;

  /** Published URL */
  url?: string;

  /** Timestamp of publication */
  publishedAt: number;

  /** Description/notes for this version */
  notes?: string;

  /** Story content snapshot (optional) */
  snapshot?: string;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Version history for a story
 */
export interface VersionHistory {
  /** Story ID */
  storyId: string;

  /** Current version */
  currentVersion: string;

  /** All versions */
  versions: StoryVersion[];
}

/**
 * Version Manager
 *
 * Manages version history, tracking, and rollback functionality.
 */
export class VersionManager {
  private readonly storageKey = 'whisker-publish-versions';

  /**
   * Get version history for a story
   */
  getHistory(storyId: string): VersionHistory | null {
    const allHistories = this.getAllHistories();
    return allHistories[storyId] || null;
  }

  /**
   * Get all version histories
   */
  private getAllHistories(): Record<string, VersionHistory> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load version histories:', error);
      return {};
    }
  }

  /**
   * Save all version histories
   */
  private saveAllHistories(histories: Record<string, VersionHistory>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(histories));
    } catch (error) {
      console.error('Failed to save version histories:', error);
    }
  }

  /**
   * Add a new version to history
   */
  addVersion(
    storyId: string,
    storyTitle: string,
    version: string,
    platform: PublishPlatform,
    result: PublishResult,
    notes?: string,
    snapshot?: string
  ): StoryVersion {
    const allHistories = this.getAllHistories();

    // Get or create history for this story
    let history = allHistories[storyId];
    if (!history) {
      history = {
        storyId,
        currentVersion: version,
        versions: [],
      };
      allHistories[storyId] = history;
    }

    // Create new version entry
    const newVersion: StoryVersion = {
      id: this.generateVersionId(),
      version,
      storyId,
      storyTitle,
      platform,
      url: result.url,
      publishedAt: Date.now(),
      notes,
      snapshot,
      metadata: result.metadata,
    };

    // Add to versions list
    history.versions.push(newVersion);
    history.currentVersion = version;

    // Sort versions by publishedAt (newest first)
    history.versions.sort((a, b) => b.publishedAt - a.publishedAt);

    // Save
    this.saveAllHistories(allHistories);

    return newVersion;
  }

  /**
   * Get a specific version
   */
  getVersion(storyId: string, versionId: string): StoryVersion | null {
    const history = this.getHistory(storyId);
    if (!history) return null;

    return history.versions.find(v => v.id === versionId) || null;
  }

  /**
   * Get versions for a story
   */
  getVersions(storyId: string): StoryVersion[] {
    const history = this.getHistory(storyId);
    return history?.versions || [];
  }

  /**
   * Get latest version
   */
  getLatestVersion(storyId: string): StoryVersion | null {
    const versions = this.getVersions(storyId);
    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * Delete a version
   */
  deleteVersion(storyId: string, versionId: string): boolean {
    const allHistories = this.getAllHistories();
    const history = allHistories[storyId];

    if (!history) return false;

    const index = history.versions.findIndex(v => v.id === versionId);
    if (index === -1) return false;

    history.versions.splice(index, 1);

    // Update current version if we deleted it
    if (history.versions.length > 0) {
      history.currentVersion = history.versions[0].version;
    }

    this.saveAllHistories(allHistories);
    return true;
  }

  /**
   * Clear all versions for a story
   */
  clearHistory(storyId: string): void {
    const allHistories = this.getAllHistories();
    delete allHistories[storyId];
    this.saveAllHistories(allHistories);
  }

  /**
   * Clear all version histories
   */
  clearAllHistories(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Increment version number
   */
  incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
    const parts = currentVersion.split('.').map(Number);

    // Ensure we have at least 3 parts
    while (parts.length < 3) {
      parts.push(0);
    }

    const [major, minor, patch] = parts;

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  }

  /**
   * Suggest next version number
   */
  suggestNextVersion(storyId: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
    const history = this.getHistory(storyId);
    const currentVersion = history?.currentVersion || '0.0.0';
    return this.incrementVersion(currentVersion, type);
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export version history as JSON
   */
  exportHistory(storyId: string): string {
    const history = this.getHistory(storyId);
    if (!history) {
      throw new Error(`No history found for story ${storyId}`);
    }

    return JSON.stringify(history, null, 2);
  }

  /**
   * Import version history from JSON
   */
  importHistory(json: string): void {
    try {
      const history = JSON.parse(json) as VersionHistory;

      // Validate structure
      if (!history.storyId || !history.versions) {
        throw new Error('Invalid history format');
      }

      const allHistories = this.getAllHistories();
      allHistories[history.storyId] = history;
      this.saveAllHistories(allHistories);
    } catch (error) {
      throw new Error(`Failed to import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics for version history
   */
  getStatistics(storyId: string): {
    totalVersions: number;
    platforms: Record<PublishPlatform, number>;
    firstPublished?: number;
    lastPublished?: number;
  } {
    const versions = this.getVersions(storyId);

    const platforms: Record<string, number> = {};
    let firstPublished: number | undefined;
    let lastPublished: number | undefined;

    versions.forEach(v => {
      platforms[v.platform] = (platforms[v.platform] || 0) + 1;

      if (!firstPublished || v.publishedAt < firstPublished) {
        firstPublished = v.publishedAt;
      }
      if (!lastPublished || v.publishedAt > lastPublished) {
        lastPublished = v.publishedAt;
      }
    });

    return {
      totalVersions: versions.length,
      platforms: platforms as Record<PublishPlatform, number>,
      firstPublished,
      lastPublished,
    };
  }
}

// Singleton instance
let versionManagerInstance: VersionManager | null = null;

/**
 * Get the version manager instance
 */
export function getVersionManager(): VersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager();
  }
  return versionManagerInstance;
}
