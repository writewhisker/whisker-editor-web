/**
 * Tag Store
 *
 * Manages tag colors and tag-related operations.
 *
 * Phase 4 refactoring: Uses PreferenceService for storage adapter integration
 */

import { derived, writable, get } from 'svelte/store';
import { currentStory } from './projectStore';
import type { Story } from '../models/Story';
import { getPreferenceService } from '../services/storage/PreferenceService';

// Get preference service instance
const prefService = getPreferenceService();

// Tag metadata interface
export interface TagInfo {
  name: string;
  color: string;
  usageCount: number;
  passageIds: string[];
}

// Predefined color palette for tags
export const TAG_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#a855f7', // Violet
] as const;

// Hash function to deterministically assign colors to tags
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

// Custom color overrides
const customTagColors = writable<Record<string, string>>(loadCustomColors());

function loadCustomColors(): Record<string, string> {
  return prefService.getPreferenceSync<Record<string, string>>('whisker-tag-colors', {});
}

function saveCustomColors(colors: Record<string, string>) {
  prefService.setPreferenceSync('whisker-tag-colors', colors);
}

// Derived store: tag registry
export const tagRegistry = derived(
  [currentStory, customTagColors],
  ([$story, $customColors]) => {
    if (!$story) return new Map<string, TagInfo>();

    const registry = new Map<string, TagInfo>();

    // Collect all tags from passages
    $story.passages.forEach((passage) => {
      passage.tags.forEach((tagName) => {
        if (!registry.has(tagName)) {
          registry.set(tagName, {
            name: tagName,
            color: $customColors[tagName] || hashStringToColor(tagName),
            usageCount: 0,
            passageIds: [],
          });
        }

        const tag = registry.get(tagName)!;
        tag.usageCount++;
        tag.passageIds.push(passage.id);
      });
    });

    return registry;
  }
);

// Derived store: sorted tags by usage
export const tagsByUsage = derived(tagRegistry, ($registry) => {
  return Array.from($registry.values()).sort((a, b) => b.usageCount - a.usageCount);
});

// Derived store: sorted tags by name
export const tagsByName = derived(tagRegistry, ($registry) => {
  return Array.from($registry.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// Tag actions
export const tagActions = {
  /**
   * Get color for a tag (custom or hash-based)
   */
  getTagColor(tagName: string): string {
    const customColors = get(customTagColors);
    return customColors[tagName] || hashStringToColor(tagName);
  },

  /**
   * Set custom color for a tag
   */
  setTagColor(tagName: string, color: string) {
    customTagColors.update((colors) => {
      const updated = { ...colors, [tagName]: color };
      saveCustomColors(updated);
      return updated;
    });
  },

  /**
   * Reset tag to default hash-based color
   */
  resetTagColor(tagName: string) {
    customTagColors.update((colors) => {
      const updated = { ...colors };
      delete updated[tagName];
      saveCustomColors(updated);
      return updated;
    });
  },

  /**
   * Rename a tag globally across all passages
   */
  renameTag(oldName: string, newName: string, story: Story): number {
    let count = 0;

    story.passages.forEach((passage) => {
      const index = passage.tags.indexOf(oldName);
      if (index !== -1) {
        passage.tags[index] = newName;
        count++;
      }
    });

    // Move custom color if exists
    const customColors = get(customTagColors);
    if (customColors[oldName]) {
      customTagColors.update((colors) => {
        const updated = { ...colors };
        updated[newName] = updated[oldName];
        delete updated[oldName];
        saveCustomColors(updated);
        return updated;
      });
    }

    return count;
  },

  /**
   * Delete a tag globally from all passages
   */
  deleteTag(tagName: string, story: Story): number {
    let count = 0;

    story.passages.forEach((passage) => {
      const index = passage.tags.indexOf(tagName);
      if (index !== -1) {
        passage.tags.splice(index, 1);
        count++;
      }
    });

    // Remove custom color if exists
    const customColors = get(customTagColors);
    if (customColors[tagName]) {
      this.resetTagColor(tagName);
    }

    return count;
  },

  /**
   * Merge two tags (replace all instances of sourceTag with targetTag)
   */
  mergeTags(sourceTag: string, targetTag: string, story: Story): number {
    let count = 0;

    story.passages.forEach((passage) => {
      const sourceIndex = passage.tags.indexOf(sourceTag);
      const targetIndex = passage.tags.indexOf(targetTag);

      if (sourceIndex !== -1) {
        // Remove source tag
        passage.tags.splice(sourceIndex, 1);

        // Add target tag if not already present
        if (targetIndex === -1) {
          passage.tags.push(targetTag);
        }

        count++;
      }
    });

    // Remove source tag custom color
    const customColors = get(customTagColors);
    if (customColors[sourceTag]) {
      this.resetTagColor(sourceTag);
    }

    return count;
  },

  /**
   * Get all unique tags
   */
  getAllTags(): string[] {
    const registry = get(tagRegistry);
    return Array.from(registry.keys()).sort();
  },

  /**
   * Get tag info by name
   */
  getTagInfo(tagName: string): TagInfo | undefined {
    const registry = get(tagRegistry);
    return registry.get(tagName);
  },

  /**
   * Get passages using a specific tag
   */
  getPassagesWithTag(tagName: string, story: Story): string[] {
    const info = this.getTagInfo(tagName);
    return info ? info.passageIds : [];
  },

  /**
   * Add tag to a passage
   */
  addTagToPassage(passageId: string, tagName: string, story: Story): boolean {
    const passage = story.getPassage(passageId);
    if (!passage) return false;

    if (!passage.tags.includes(tagName)) {
      passage.tags.push(tagName);
      return true;
    }

    return false;
  },

  /**
   * Remove tag from a passage
   */
  removeTagFromPassage(passageId: string, tagName: string, story: Story): boolean {
    const passage = story.getPassage(passageId);
    if (!passage) return false;

    const index = passage.tags.indexOf(tagName);
    if (index !== -1) {
      passage.tags.splice(index, 1);
      return true;
    }

    return false;
  },

  /**
   * Get tag statistics
   */
  getTagStatistics() {
    const registry = get(tagRegistry);
    const tags = Array.from(registry.values());

    return {
      totalTags: tags.length,
      totalUsages: tags.reduce((sum, tag) => sum + tag.usageCount, 0),
      mostUsedTag: tags.length > 0 ? tags.reduce((a, b) => (a.usageCount > b.usageCount ? a : b)) : null,
      averageUsage: tags.length > 0 ? tags.reduce((sum, tag) => sum + tag.usageCount, 0) / tags.length : 0,
    };
  },

  /**
   * Reset custom colors (for testing)
   * @internal
   */
  _resetCustomColors() {
    customTagColors.set({});
  },
};
