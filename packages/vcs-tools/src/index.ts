/**
 * VCS Tools for Whisker Stories
 *
 * Provides diff and merge capabilities for story versioning.
 */

export {
  diffStories,
  formatDiff,
  getSummary,
  type ChangeType,
  type FieldChange,
  type PassageChange,
  type ChoiceChange,
  type VariableChange,
  type MetadataChange,
  type StoryDiffResult,
  type DiffOptions,
} from './StoryDiff';

export {
  mergeStories,
  resolveConflicts,
  type StoryMergeResult,
  type StoryConflict,
  type ConflictResolutionStrategy,
  type MergeOptions,
} from './StoryMerge';
