/**
 * Story Comparison Utilities
 * Compare two versions of a story and identify differences
 */

import type { Story } from '@whisker/core-ts';

export interface StoryDiff {
  passagesAdded: string[];
  passagesRemoved: string[];
  passagesModified: string[];
  metadataChanged: boolean;
  variablesChanged: boolean;
}

export function compareStories(oldStory: Story, newStory: Story): StoryDiff {
  const oldPassageIds = new Set(oldStory.passages.keys());
  const newPassageIds = new Set(newStory.passages.keys());

  const passagesAdded: string[] = [];
  const passagesRemoved: string[] = [];
  const passagesModified: string[] = [];

  // Find added passages
  for (const id of newPassageIds) {
    if (!oldPassageIds.has(id)) {
      passagesAdded.push(id);
    }
  }

  // Find removed passages
  for (const id of oldPassageIds) {
    if (!newPassageIds.has(id)) {
      passagesRemoved.push(id);
    }
  }

  // Find modified passages
  for (const id of newPassageIds) {
    if (oldPassageIds.has(id)) {
      const oldPassage = oldStory.passages.get(id);
      const newPassage = newStory.passages.get(id);

      if (oldPassage && newPassage) {
        const contentChanged = oldPassage.content !== newPassage.content;
        const titleChanged = oldPassage.title !== newPassage.title;
        const choicesChanged = JSON.stringify(oldPassage.choices) !== JSON.stringify(newPassage.choices);

        if (contentChanged || titleChanged || choicesChanged) {
          passagesModified.push(id);
        }
      }
    }
  }

  const metadataChanged = JSON.stringify(oldStory.metadata) !== JSON.stringify(newStory.metadata);
  const variablesChanged = JSON.stringify(oldStory.variables) !== JSON.stringify(newStory.variables);

  return {
    passagesAdded,
    passagesRemoved,
    passagesModified,
    metadataChanged,
    variablesChanged,
  };
}

export function getDiffSummary(diff: StoryDiff): string {
  const parts: string[] = [];

  if (diff.passagesAdded.length > 0) {
    parts.push(`${diff.passagesAdded.length} passage(s) added`);
  }

  if (diff.passagesRemoved.length > 0) {
    parts.push(`${diff.passagesRemoved.length} passage(s) removed`);
  }

  if (diff.passagesModified.length > 0) {
    parts.push(`${diff.passagesModified.length} passage(s) modified`);
  }

  if (diff.metadataChanged) {
    parts.push('metadata changed');
  }

  if (diff.variablesChanged) {
    parts.push('variables changed');
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes';
}
