/**
 * Conflict Resolution Types
 *
 * Types for handling merge conflicts in collaborative editing
 */

import type { Story } from '@writewhisker/core-ts';

/**
 * Represents different types of conflicts
 */
export type ConflictType = 'content' | 'metadata' | 'structure' | 'deletion';

/**
 * Represents the resolution strategy
 */
export type ConflictResolution = 'local' | 'remote' | 'manual' | 'merge';

/**
 * Represents a single difference in text content
 */
export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  localLines?: string[];
  remoteLines?: string[];
  startLine: number;
  endLine: number;
}

/**
 * Represents a conflict between local and remote changes
 */
export interface Conflict {
  id: string;
  type: ConflictType;
  path: string; // Path to the conflicting element (e.g., "passages.abc123.content")
  description: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  localUser?: string;
  remoteUser?: string;
  resolution?: ConflictResolution;
  resolvedValue?: any;
  autoMergeable: boolean;
}

/**
 * Represents the result of a merge operation
 */
export interface MergeResult {
  success: boolean;
  conflicts: Conflict[];
  mergedStory?: Story;
  error?: string;
}

/**
 * Options for conflict detection
 */
export interface ConflictDetectionOptions {
  compareContent?: boolean;
  compareMetadata?: boolean;
  compareStructure?: boolean;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

/**
 * Options for auto-merge
 */
export interface AutoMergeOptions {
  preferLocal?: boolean;
  preferRemote?: boolean;
  preferNewer?: boolean;
  mergeNonConflicting?: boolean;
}

/**
 * Represents a three-way merge context
 */
export interface MergeContext {
  base?: Story; // Common ancestor
  local: Story; // Current local version
  remote: Story; // Incoming remote version
  localUser?: string;
  remoteUser?: string;
}
