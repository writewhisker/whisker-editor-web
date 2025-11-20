/**
 * Conflict Detector
 *
 * Detects conflicts between local and remote story versions
 */

import type { Story, Passage } from '@writewhisker/core-ts';
import type {
  Conflict,
  ConflictType,
  MergeContext,
  MergeResult,
  ConflictDetectionOptions,
  DiffChunk,
} from '../types/conflict';
import { generateId } from '@writewhisker/core-ts';

export class ConflictDetector {
  /**
   * Detect conflicts between local and remote stories
   */
  static detectConflicts(
    context: MergeContext,
    options: ConflictDetectionOptions = {}
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    const {
      compareContent = true,
      compareMetadata = true,
      compareStructure = true,
    } = options;

    // Compare metadata
    if (compareMetadata) {
      conflicts.push(...this.detectMetadataConflicts(context));
    }

    // Compare passages
    if (compareContent || compareStructure) {
      conflicts.push(...this.detectPassageConflicts(context, options));
    }

    return conflicts;
  }

  /**
   * Detect metadata conflicts
   */
  private static detectMetadataConflicts(context: MergeContext): Conflict[] {
    const conflicts: Conflict[] = [];
    const { local, remote, localUser, remoteUser } = context;

    // Check title
    if (local.metadata.title !== remote.metadata.title) {
      conflicts.push({
        id: generateId(),
        type: 'metadata',
        path: 'metadata.title',
        description: 'Story title conflict',
        localValue: local.metadata.title,
        remoteValue: remote.metadata.title,
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
        localUser,
        remoteUser,
        autoMergeable: false,
      });
    }

    // Check description
    if (
      local.metadata.description !== remote.metadata.description &&
      local.metadata.description &&
      remote.metadata.description
    ) {
      conflicts.push({
        id: generateId(),
        type: 'metadata',
        path: 'metadata.description',
        description: 'Story description conflict',
        localValue: local.metadata.description,
        remoteValue: remote.metadata.description,
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
        localUser,
        remoteUser,
        autoMergeable: false,
      });
    }

    // Check author
    if (local.metadata.author !== remote.metadata.author) {
      conflicts.push({
        id: generateId(),
        type: 'metadata',
        path: 'metadata.author',
        description: 'Story author conflict',
        localValue: local.metadata.author,
        remoteValue: remote.metadata.author,
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
        localUser,
        remoteUser,
        autoMergeable: false,
      });
    }

    return conflicts;
  }

  /**
   * Detect passage conflicts
   */
  private static detectPassageConflicts(
    context: MergeContext,
    options: ConflictDetectionOptions
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const { local, remote, localUser, remoteUser } = context;

    const localPassagesList = local.getPassages ? local.getPassages() : (local as any).passages || [];
    const remotePassagesList = remote.getPassages ? remote.getPassages() : (remote as any).passages || [];

    const localPassages = new Map<string, Passage>(localPassagesList.map((p: Passage) => [p.id, p]));
    const remotePassages = new Map<string, Passage>(remotePassagesList.map((p: Passage) => [p.id, p]));

    // Check for modified passages
    for (const [id, localPassage] of localPassages) {
      const remotePassage = remotePassages.get(id);

      if (!remotePassage) {
        // Passage deleted remotely but exists locally
        conflicts.push({
          id: generateId(),
          type: 'deletion',
          path: `passages.${id}`,
          description: `Passage "${localPassage.title}" was deleted remotely`,
          localValue: localPassage,
          remoteValue: null,
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
          localUser,
          remoteUser,
          autoMergeable: false,
        });
        continue;
      }

      // Check name conflict
      if (localPassage.title !== remotePassage.title) {
        conflicts.push({
          id: generateId(),
          type: 'metadata',
          path: `passages.${id}.name`,
          description: `Passage name conflict`,
          localValue: localPassage.title,
          remoteValue: remotePassage.title,
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
          localUser,
          remoteUser,
          autoMergeable: false,
        });
      }

      // Check content conflict
      if (
        options.compareContent &&
        localPassage.content !== remotePassage.content
      ) {
        const autoMergeable = this.isContentAutoMergeable(
          localPassage.content,
          remotePassage.content
        );

        conflicts.push({
          id: generateId(),
          type: 'content',
          path: `passages.${id}.content`,
          description: `Content conflict in passage "${localPassage.title}"`,
          localValue: localPassage.content,
          remoteValue: remotePassage.content,
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
          localUser,
          remoteUser,
          autoMergeable,
        });
      }

      // Check position conflict (structure)
      if (
        options.compareStructure &&
        (localPassage.position?.x !== remotePassage.position?.x ||
          localPassage.position?.y !== remotePassage.position?.y)
      ) {
        conflicts.push({
          id: generateId(),
          type: 'structure',
          path: `passages.${id}.position`,
          description: `Position conflict for passage "${localPassage.title}"`,
          localValue: localPassage.position,
          remoteValue: remotePassage.position,
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
          localUser,
          remoteUser,
          autoMergeable: true, // Position conflicts can be auto-resolved
        });
      }
    }

    // Check for passages added remotely
    for (const [id, remotePassage] of remotePassages) {
      if (!localPassages.has(id)) {
        // New passage added remotely - not a conflict, just note it
        // This can be auto-merged
      }
    }

    return conflicts;
  }

  /**
   * Check if content can be auto-merged (no overlapping changes)
   */
  private static isContentAutoMergeable(
    localContent: string,
    remoteContent: string
  ): boolean {
    // Simple heuristic: if one is a substring of the other, likely auto-mergeable
    // A more sophisticated implementation would use actual diff analysis
    if (localContent.includes(remoteContent) || remoteContent.includes(localContent)) {
      return true;
    }

    // Check if changes are in different parts of the content
    const localLines = localContent.split('\n');
    const remoteLines = remoteContent.split('\n');

    // If line count differs significantly, probably not auto-mergeable
    if (Math.abs(localLines.length - remoteLines.length) > 10) {
      return false;
    }

    return false;
  }

  /**
   * Generate diff chunks for visual comparison
   */
  static generateDiff(localContent: string, remoteContent: string): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    const localLines = localContent.split('\n');
    const remoteLines = remoteContent.split('\n');

    // Simple line-by-line diff
    const maxLines = Math.max(localLines.length, remoteLines.length);
    let currentChunk: DiffChunk | null = null;

    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i];
      const remoteLine = remoteLines[i];

      if (localLine === remoteLine) {
        // Equal lines
        if (currentChunk?.type !== 'equal') {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = {
            type: 'equal',
            localLines: [localLine],
            remoteLines: [remoteLine],
            startLine: i,
            endLine: i,
          };
        } else {
          currentChunk.localLines!.push(localLine);
          currentChunk.remoteLines!.push(remoteLine);
          currentChunk.endLine = i;
        }
      } else if (localLine && !remoteLine) {
        // Deletion (exists locally but not remotely)
        if (currentChunk?.type !== 'delete') {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = {
            type: 'delete',
            localLines: [localLine],
            startLine: i,
            endLine: i,
          };
        } else {
          currentChunk.localLines!.push(localLine);
          currentChunk.endLine = i;
        }
      } else if (!localLine && remoteLine) {
        // Insertion (exists remotely but not locally)
        if (currentChunk?.type !== 'insert') {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = {
            type: 'insert',
            remoteLines: [remoteLine],
            startLine: i,
            endLine: i,
          };
        } else {
          currentChunk.remoteLines!.push(remoteLine);
          currentChunk.endLine = i;
        }
      } else {
        // Replace (different on both sides)
        if (currentChunk?.type !== 'replace') {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = {
            type: 'replace',
            localLines: [localLine],
            remoteLines: [remoteLine],
            startLine: i,
            endLine: i,
          };
        } else {
          currentChunk.localLines!.push(localLine);
          currentChunk.remoteLines!.push(remoteLine);
          currentChunk.endLine = i;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Attempt auto-merge of non-conflicting changes
   */
  static autoMerge(context: MergeContext): MergeResult {
    const conflicts = this.detectConflicts(context);
    const autoMergeableConflicts = conflicts.filter((c) => !c.autoMergeable);

    if (autoMergeableConflicts.length === 0) {
      // All conflicts can be auto-resolved
      const mergedStory = this.performAutoMerge(context, conflicts);
      return {
        success: true,
        conflicts: [],
        mergedStory,
      };
    }

    return {
      success: false,
      conflicts: autoMergeableConflicts,
    };
  }

  /**
   * Perform automatic merge
   */
  private static performAutoMerge(
    context: MergeContext,
    conflicts: Conflict[]
  ): Story {
    // Start with local story
    const merged = { ...context.local };

    // Get passages lists
    const remotePassagesList = context.remote.getPassages ? context.remote.getPassages() : (context.remote as any).passages || [];
    const localPassagesList = merged.getPassages ? merged.getPassages() : (merged as any).passages || [];

    // Apply remote changes that don't conflict
    const remotePassages = new Map(remotePassagesList.map((p: any) => [p.id, p]));
    const localPassages = new Map(localPassagesList.map((p: any) => [p.id, p]));

    // Add new remote passages
    for (const [id, remotePassage] of remotePassages) {
      if (!localPassages.has(id)) {
        if (Array.isArray((merged as any).passages)) {
          (merged as any).passages.push(remotePassage);
        }
      }
    }

    // Auto-resolve simple conflicts
    for (const conflict of conflicts) {
      if (conflict.autoMergeable && conflict.type === 'structure') {
        // For position conflicts, prefer remote (last writer wins)
        const passageId = conflict.path.split('.')[1];
        const passages = (merged as any).passages || [];
        const passageIndex = passages.findIndex((p: any) => p.id === passageId);
        if (passageIndex >= 0 && Array.isArray(passages)) {
          passages[passageIndex].position = conflict.remoteValue;
        }
      }
    }

    return merged;
  }
}
