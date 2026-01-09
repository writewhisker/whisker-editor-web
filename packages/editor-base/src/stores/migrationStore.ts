/**
 * Migration Store
 *
 * State management for story format migration (legacy to WLS).
 */

import { writable, derived, get } from 'svelte/store';
import type { Story, Passage } from '@writewhisker/core-ts';

/**
 * Detected story version
 */
export type StoryVersion = '0.x' | '1.0' | 'unknown';

/**
 * Migration change item
 */
export interface MigrationChange {
  type: 'syntax' | 'structure' | 'metadata' | 'variable' | 'choice';
  category: string;
  original: string;
  migrated: string;
  passageTitle?: string;
  line?: number;
}

/**
 * Migration preview result
 */
export interface MigrationPreview {
  version: StoryVersion;
  targetVersion: '1.0';
  changes: MigrationChange[];
  warnings: string[];
  errors: string[];
  canMigrate: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  story?: Story;
  changes: MigrationChange[];
  warnings: string[];
  errors: string[];
  duration: number;
}

/**
 * Migration history entry
 */
export interface MigrationHistoryEntry {
  id: string;
  timestamp: number;
  storyTitle: string;
  fromVersion: StoryVersion;
  toVersion: '1.0';
  changeCount: number;
  success: boolean;
  error?: string;
}

// Stores
export const isMigrating = writable<boolean>(false);
export const migrationError = writable<string | null>(null);
export const migrationHistory = writable<MigrationHistoryEntry[]>([]);
export const currentMigrationPreview = writable<MigrationPreview | null>(null);

// Derived stores
export const recentMigrations = derived(migrationHistory, ($history) => {
  return $history.slice(0, 10);
});

/**
 * Detect story version from content/structure
 */
export function detectStoryVersion(story: Story): StoryVersion {
  // Check for WLS markers
  const passages = Array.from(story.passages.values() as Iterable<Passage>);

  let hasLegacySyntax = false;
  let hasWLS1Syntax = false;

  for (const passage of passages) {
    const content = passage.content || '';

    // Legacy Twine/Twee patterns
    if (content.includes('<<') || content.includes('>>')) {
      hasLegacySyntax = true;
    }
    if (/\[\[.+\]\]/.test(content)) {
      hasLegacySyntax = true;
    }

    // WLS patterns
    if (content.includes('{if ') || content.includes('{$')) {
      hasWLS1Syntax = true;
    }

    // Check choice structure - WLS uses separate Choice objects
    if (passage.choices && passage.choices.length > 0) {
      hasWLS1Syntax = true;
    }
  }

  // Check metadata for version indicator
  if (story.metadata?.version === '1.0') {
    return '1.0';
  }

  if (hasLegacySyntax && !hasWLS1Syntax) {
    return '0.x';
  }

  if (hasWLS1Syntax) {
    return '1.0';
  }

  return 'unknown';
}

/**
 * Detect if story content contains legacy syntax
 */
export function detectLegacySyntax(content: string): {
  hasLegacy: boolean;
  patterns: { type: string; match: string; line: number }[];
} {
  const patterns: { type: string; match: string; line: number }[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Twine macro syntax <<...>>
    const macroMatch = line.match(/<<[^>]+>>/g);
    if (macroMatch) {
      macroMatch.forEach(match => {
        patterns.push({
          type: 'macro',
          match,
          line: index + 1,
        });
      });
    }

    // Twine link syntax [[...]]
    const linkMatch = line.match(/\[\[[^\]]+\]\]/g);
    if (linkMatch) {
      linkMatch.forEach(match => {
        patterns.push({
          type: 'link',
          match,
          line: index + 1,
        });
      });
    }

    // Twine variable syntax $variable without WLS context
    const varMatch = line.match(/\$\w+(?![}\s]*[|:])/g);
    if (varMatch && !line.includes('{') && !line.includes('->')) {
      varMatch.forEach(match => {
        patterns.push({
          type: 'variable',
          match,
          line: index + 1,
        });
      });
    }
  });

  return {
    hasLegacy: patterns.length > 0,
    patterns,
  };
}

/**
 * Generate migration preview
 */
export function generateMigrationPreview(story: Story): MigrationPreview {
  const version = detectStoryVersion(story);
  const changes: MigrationChange[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (version === '1.0') {
    return {
      version,
      targetVersion: '1.0',
      changes: [],
      warnings: ['Story is already in WLS format'],
      errors: [],
      canMigrate: false,
    };
  }

  const passages = Array.from(story.passages.values() as Iterable<Passage>);

  for (const passage of passages) {
    const content = passage.content || '';
    const detection = detectLegacySyntax(content);

    for (const pattern of detection.patterns) {
      let migrated = '';
      let category = '';

      switch (pattern.type) {
        case 'macro': {
          // Convert <<if condition>> to {if condition}
          const macroContent = pattern.match.slice(2, -2);
          if (macroContent.startsWith('if ')) {
            migrated = `{${macroContent}}`;
            category = 'Conditional';
          } else if (macroContent.startsWith('set ')) {
            // <<set $var to value>> to {$ var = value}
            const setMatch = macroContent.match(/set\s+\$(\w+)\s+to\s+(.+)/);
            if (setMatch) {
              migrated = `{$ ${setMatch[1]} = ${setMatch[2]}}`;
            } else {
              migrated = `{$ ${macroContent.slice(4)}}`;
            }
            category = 'Variable Assignment';
          } else if (macroContent === 'endif' || macroContent === '/if') {
            migrated = '{/}';
            category = 'Conditional End';
          } else if (macroContent === 'else') {
            migrated = '{else}';
            category = 'Conditional Else';
          } else {
            migrated = `{$ ${macroContent}}`;
            category = 'Macro';
            warnings.push(`Macro "${pattern.match}" may need manual review`);
          }
          break;
        }

        case 'link': {
          // Convert [[text|target]] or [[text->target]] to choice
          const linkContent = pattern.match.slice(2, -2);
          let text = linkContent;
          let target = linkContent;

          if (linkContent.includes('|')) {
            [text, target] = linkContent.split('|');
          } else if (linkContent.includes('->')) {
            [text, target] = linkContent.split('->');
          }

          migrated = `+ [${text.trim()}] -> ${target.trim()}`;
          category = 'Link to Choice';
          break;
        }

        case 'variable': {
          // $var stays mostly the same in WLS
          migrated = pattern.match;
          category = 'Variable Reference';
          break;
        }
      }

      if (migrated) {
        changes.push({
          type: pattern.type === 'link' ? 'choice' : 'syntax',
          category,
          original: pattern.match,
          migrated,
          passageTitle: passage.title,
          line: pattern.line,
        });
      }
    }
  }

  // Check for potential issues
  if (changes.length === 0 && version === '0.x') {
    warnings.push('Legacy patterns detected but no automatic migrations available');
  }

  return {
    version,
    targetVersion: '1.0',
    changes,
    warnings,
    errors,
    canMigrate: changes.length > 0 && errors.length === 0,
  };
}

/**
 * Apply migration to story
 */
export function applyMigration(story: Story, preview: MigrationPreview): MigrationResult {
  const startTime = Date.now();
  const appliedChanges: MigrationChange[] = [];
  const warnings: string[] = [...preview.warnings];
  const errors: string[] = [];

  try {
    // Clone the story for migration
    const migratedStory = story.clone();

    // Group changes by passage
    const changesByPassage = new Map<string, MigrationChange[]>();
    for (const change of preview.changes) {
      const passageTitle = change.passageTitle || '';
      if (!changesByPassage.has(passageTitle)) {
        changesByPassage.set(passageTitle, []);
      }
      changesByPassage.get(passageTitle)!.push(change);
    }

    // Apply changes to each passage
    for (const passage of migratedStory.passages.values()) {
      const passageChanges = changesByPassage.get(passage.title) || [];
      if (passageChanges.length === 0) continue;

      let content = passage.content || '';

      // Sort changes by line (descending) to avoid offset issues
      passageChanges.sort((a, b) => (b.line || 0) - (a.line || 0));

      for (const change of passageChanges) {
        // Replace the original with migrated version
        content = content.replace(change.original, change.migrated);
        appliedChanges.push(change);
      }

      passage.content = content;
    }

    // Update story metadata
    migratedStory.metadata.version = '1.0';
    migratedStory.metadata.migratedAt = new Date().toISOString();
    migratedStory.metadata.migratedFrom = preview.version;

    return {
      success: true,
      story: migratedStory,
      changes: appliedChanges,
      warnings,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      changes: appliedChanges,
      warnings,
      errors: [error instanceof Error ? error.message : String(error)],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Migration actions
 */
export const migrationActions = {
  /**
   * Preview migration for a story
   */
  previewMigration(story: Story): MigrationPreview {
    const preview = generateMigrationPreview(story);
    currentMigrationPreview.set(preview);
    return preview;
  },

  /**
   * Execute migration
   */
  async migrate(story: Story): Promise<MigrationResult> {
    isMigrating.set(true);
    migrationError.set(null);

    try {
      const preview = get(currentMigrationPreview) || generateMigrationPreview(story);

      if (!preview.canMigrate) {
        throw new Error('Story cannot be migrated');
      }

      const result = applyMigration(story, preview);

      if (result.success) {
        // Add to history
        const historyEntry: MigrationHistoryEntry = {
          id: `migration_${Date.now()}`,
          timestamp: Date.now(),
          storyTitle: story.metadata.title || 'Untitled',
          fromVersion: preview.version,
          toVersion: '1.0',
          changeCount: result.changes.length,
          success: true,
        };
        migrationHistory.update(h => [historyEntry, ...h]);
      }

      isMigrating.set(false);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      migrationError.set(message);
      isMigrating.set(false);

      return {
        success: false,
        changes: [],
        warnings: [],
        errors: [message],
        duration: 0,
      };
    }
  },

  /**
   * Clear migration preview
   */
  clearPreview(): void {
    currentMigrationPreview.set(null);
  },

  /**
   * Clear migration error
   */
  clearError(): void {
    migrationError.set(null);
  },

  /**
   * Clear migration history
   */
  clearHistory(): void {
    migrationHistory.set([]);
  },
};
