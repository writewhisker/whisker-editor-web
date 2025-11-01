/**
 * Story Comparison Utilities
 *
 * Provides functions for comparing two Story instances and detecting differences.
 */

import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';
import type { Variable } from '../models/Variable';

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface PassageDiff {
  passageId: string;
  title: string;
  status: DiffStatus;
  leftPassage?: Passage;
  rightPassage?: Passage;
  changes?: string[];
  leftWordCount?: number;
  rightWordCount?: number;
  leftChoiceCount?: number;
  rightChoiceCount?: number;
}

export interface VariableDiff {
  name: string;
  status: DiffStatus;
  leftVariable?: Variable;
  rightVariable?: Variable;
  changes?: string[];
}

export interface StoryStats {
  passageCount: number;
  variableCount: number;
  totalWords: number;
  totalChoices: number;
}

export interface StoryComparison {
  metadataChanged: boolean;
  metadataChanges: string[];
  passageDiffs: PassageDiff[];
  variableDiffs: VariableDiff[];
  leftStats: StoryStats;
  rightStats: StoryStats;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

/**
 * Compare two passages and return the list of changes
 */
function comparePassages(left: Passage, right: Passage): string[] {
  const changes: string[] = [];

  // Compare content
  if (left.content !== right.content) {
    const leftWords = countWords(left.content);
    const rightWords = countWords(right.content);
    const wordDiff = rightWords - leftWords;
    changes.push(`Content changed (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`);
  }

  // Compare choices
  if (left.choices.length !== right.choices.length) {
    const diff = right.choices.length - left.choices.length;
    changes.push(`Choices changed (${diff > 0 ? '+' : ''}${diff})`);
  } else {
    // Check if choices themselves changed
    for (let i = 0; i < left.choices.length; i++) {
      const leftChoice = left.choices[i];
      const rightChoice = right.choices[i];

      if (leftChoice.text !== rightChoice.text ||
          leftChoice.target !== rightChoice.target ||
          leftChoice.condition !== rightChoice.condition) {
        changes.push(`Choice ${i + 1} modified`);
      }
    }
  }

  // Compare tags
  const leftTags = new Set(left.tags);
  const rightTags = new Set(right.tags);
  const addedTags = [...rightTags].filter(t => !leftTags.has(t));
  const removedTags = [...leftTags].filter(t => !rightTags.has(t));

  if (addedTags.length > 0) {
    changes.push(`Tags added: ${addedTags.join(', ')}`);
  }
  if (removedTags.length > 0) {
    changes.push(`Tags removed: ${removedTags.join(', ')}`);
  }

  // Compare scripts
  if (left.onEnterScript !== right.onEnterScript) {
    changes.push('onEnter script changed');
  }
  if (left.onExitScript !== right.onExitScript) {
    changes.push('onExit script changed');
  }

  // Compare position
  if (left.position.x !== right.position.x || left.position.y !== right.position.y) {
    changes.push('Position changed');
  }

  // Compare color
  if (left.color !== right.color) {
    changes.push('Color changed');
  }

  return changes;
}

/**
 * Compare two variables and return the list of changes
 */
function compareVariables(left: Variable, right: Variable): string[] {
  const changes: string[] = [];

  if (left.type !== right.type) {
    changes.push(`Type: ${left.type} → ${right.type}`);
  }

  if (left.initial !== right.initial) {
    changes.push(`Initial value: ${left.initial} → ${right.initial}`);
  }

  return changes;
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate statistics for a story
 */
function calculateStats(story: Story): StoryStats {
  let totalWords = 0;
  let totalChoices = 0;

  for (const passage of story.passages.values()) {
    totalWords += countWords(passage.content);
    totalChoices += passage.choices.length;
  }

  return {
    passageCount: story.passages.size,
    variableCount: story.variables.size,
    totalWords,
    totalChoices
  };
}

/**
 * Compare metadata between two stories
 */
function compareMetadata(left: Story, right: Story): { changed: boolean; changes: string[] } {
  const changes: string[] = [];

  if (left.metadata.title !== right.metadata.title) {
    changes.push(`Title: "${left.metadata.title}" → "${right.metadata.title}"`);
  }

  if (left.metadata.author !== right.metadata.author) {
    changes.push(`Author: "${left.metadata.author}" → "${right.metadata.author}"`);
  }

  if (left.metadata.version !== right.metadata.version) {
    changes.push(`Version: ${left.metadata.version} → ${right.metadata.version}`);
  }

  if (left.metadata.ifid !== right.metadata.ifid) {
    changes.push(`IFID changed`);
  }

  if (left.metadata.description !== right.metadata.description) {
    changes.push(`Description changed`);
  }

  // Compare tags
  const leftTags = new Set(left.metadata.tags || []);
  const rightTags = new Set(right.metadata.tags || []);
  const addedTags = [...rightTags].filter(t => !leftTags.has(t));
  const removedTags = [...leftTags].filter(t => !rightTags.has(t));

  if (addedTags.length > 0) {
    changes.push(`Story tags added: ${addedTags.join(', ')}`);
  }
  if (removedTags.length > 0) {
    changes.push(`Story tags removed: ${removedTags.join(', ')}`);
  }

  return {
    changed: changes.length > 0,
    changes
  };
}

/**
 * Compare two stories and return a detailed comparison
 */
export function compareStories(left: Story, right: Story): StoryComparison {
  // Compare metadata
  const { changed: metadataChanged, changes: metadataChanges } = compareMetadata(left, right);

  // Calculate statistics
  const leftStats = calculateStats(left);
  const rightStats = calculateStats(right);

  // Compare passages
  const passageDiffs: PassageDiff[] = [];
  const leftPassageIds = new Set([...left.passages.keys()]);
  const rightPassageIds = new Set([...right.passages.keys()]);
  const allPassageIds = new Set([...leftPassageIds, ...rightPassageIds]);

  for (const passageId of allPassageIds) {
    const leftPassage = left.passages.get(passageId);
    const rightPassage = right.passages.get(passageId);

    if (leftPassage && rightPassage) {
      // Passage exists in both - check for modifications
      const changes = comparePassages(leftPassage, rightPassage);

      passageDiffs.push({
        passageId,
        title: rightPassage.title,
        status: changes.length > 0 ? 'modified' : 'unchanged',
        leftPassage,
        rightPassage,
        changes: changes.length > 0 ? changes : undefined,
        leftWordCount: countWords(leftPassage.content),
        rightWordCount: countWords(rightPassage.content),
        leftChoiceCount: leftPassage.choices.length,
        rightChoiceCount: rightPassage.choices.length
      });
    } else if (leftPassage && !rightPassage) {
      // Passage removed in right version
      passageDiffs.push({
        passageId,
        title: leftPassage.title,
        status: 'removed',
        leftPassage,
        leftWordCount: countWords(leftPassage.content),
        leftChoiceCount: leftPassage.choices.length
      });
    } else if (!leftPassage && rightPassage) {
      // Passage added in right version
      passageDiffs.push({
        passageId,
        title: rightPassage.title,
        status: 'added',
        rightPassage,
        rightWordCount: countWords(rightPassage.content),
        rightChoiceCount: rightPassage.choices.length
      });
    }
  }

  // Compare variables
  const variableDiffs: VariableDiff[] = [];
  const leftVarNames = new Set([...left.variables.keys()]);
  const rightVarNames = new Set([...right.variables.keys()]);
  const allVarNames = new Set([...leftVarNames, ...rightVarNames]);

  for (const varName of allVarNames) {
    const leftVar = left.variables.get(varName);
    const rightVar = right.variables.get(varName);

    if (leftVar && rightVar) {
      // Variable exists in both - check for modifications
      const changes = compareVariables(leftVar, rightVar);

      variableDiffs.push({
        name: varName,
        status: changes.length > 0 ? 'modified' : 'unchanged',
        leftVariable: leftVar,
        rightVariable: rightVar,
        changes: changes.length > 0 ? changes : undefined
      });
    } else if (leftVar && !rightVar) {
      // Variable removed in right version
      variableDiffs.push({
        name: varName,
        status: 'removed',
        leftVariable: leftVar
      });
    } else if (!leftVar && rightVar) {
      // Variable added in right version
      variableDiffs.push({
        name: varName,
        status: 'added',
        rightVariable: rightVar
      });
    }
  }

  // Calculate summary
  const summary = {
    added: passageDiffs.filter(d => d.status === 'added').length,
    removed: passageDiffs.filter(d => d.status === 'removed').length,
    modified: passageDiffs.filter(d => d.status === 'modified').length,
    unchanged: passageDiffs.filter(d => d.status === 'unchanged').length
  };

  return {
    metadataChanged,
    metadataChanges,
    passageDiffs,
    variableDiffs,
    leftStats,
    rightStats,
    summary
  };
}

/**
 * Merge stories based on selected passages
 *
 * @param baseStory - The story to merge into
 * @param sourceStory - The story to merge from
 * @param selectedPassageIds - IDs of passages to merge (empty = all)
 * @param source - Which source to use ('left' or 'right')
 */
export function mergeStories(
  baseStory: Story,
  sourceStory: Story,
  selectedPassageIds: string[] = [],
  source: 'left' | 'right' = 'right'
): Story {
  // Create a copy of the base story
  const mergedStory = new (baseStory.constructor as typeof Story)(baseStory.serialize());

  if (selectedPassageIds.length === 0) {
    // No specific passages selected - accept entire story from source
    if (source === 'right') {
      // Replace with source story
      return new (sourceStory.constructor as typeof Story)(sourceStory.serialize());
    } else {
      // Keep base story
      return mergedStory;
    }
  }

  // Merge selected passages
  for (const passageId of selectedPassageIds) {
    const sourcePassage = sourceStory.passages.get(passageId);

    if (sourcePassage) {
      if (source === 'right') {
        // Add/update from right source
        mergedStory.passages.set(passageId, sourcePassage);
      } else {
        // Keep left source (do nothing if it exists, or remove if it doesn't)
        if (!baseStory.passages.has(passageId)) {
          mergedStory.passages.delete(passageId);
        }
      }
    } else if (source === 'left') {
      // Passage doesn't exist in source, remove from merged
      mergedStory.passages.delete(passageId);
    }
  }

  // Update modification timestamp
  mergedStory.metadata.modified = new Date().toISOString();

  return mergedStory;
}
