/**
 * Story Merge Algorithm
 *
 * Provides three-way merge capabilities for Whisker stories,
 * with conflict detection and resolution strategies.
 */

import type {
  StoryData,
  PassageData,
  VariableData,
  ChoiceData,
} from '@writewhisker/story-models';
import { diffStories, type PassageChange, type VariableChange } from './StoryDiff';

/**
 * Conflict types that can occur during merge
 */
export type ConflictType =
  | 'passage-content'
  | 'passage-title'
  | 'passage-script'
  | 'passage-deleted'
  | 'choice-modified'
  | 'choice-deleted'
  | 'variable-value'
  | 'variable-type'
  | 'variable-deleted'
  | 'metadata'
  | 'settings';

/**
 * Represents a conflict in the merge
 */
export interface StoryConflict {
  type: ConflictType;
  path: string;
  description: string;
  base: any;
  local: any;
  remote: any;
  passageId?: string;
  variableName?: string;
  choiceId?: string;
}

/**
 * Strategy for resolving conflicts
 */
export type ConflictResolutionStrategy = 'local' | 'remote' | 'base' | 'manual';

/**
 * Result of a merge operation
 */
export interface StoryMergeResult {
  success: boolean;
  merged: StoryData;
  conflicts: StoryConflict[];
  autoResolved: number;
  requiresResolution: number;
}

/**
 * Options for merge operation
 */
export interface MergeOptions {
  strategy?: ConflictResolutionStrategy;
  ignorePositions?: boolean;
  ignoreTimestamps?: boolean;
  autoResolveNonContent?: boolean;
}

/**
 * Perform a three-way merge of stories
 *
 * @param base - Common ancestor version
 * @param local - Local version (current user's changes)
 * @param remote - Remote version (other user's changes)
 * @param options - Merge options
 * @returns Merge result with conflicts
 */
export function mergeStories(
  base: StoryData,
  local: StoryData,
  remote: StoryData,
  options: MergeOptions = {}
): StoryMergeResult {
  const {
    strategy = 'manual',
    ignorePositions = true,
    ignoreTimestamps = true,
    autoResolveNonContent = true,
  } = options;

  const conflicts: StoryConflict[] = [];
  let autoResolved = 0;

  // Compute diffs from base
  const localDiff = diffStories(base, local, { ignorePositions, ignoreTimestamps });
  const remoteDiff = diffStories(base, remote, { ignorePositions, ignoreTimestamps });

  // Start with base as the foundation
  const merged: StoryData = JSON.parse(JSON.stringify(base));

  // Merge metadata
  const metadataResult = mergeMetadata(base.metadata, local.metadata, remote.metadata, localDiff, remoteDiff);
  merged.metadata = metadataResult.merged;
  conflicts.push(...metadataResult.conflicts);

  // Merge passages
  const passagesResult = mergePassages(base.passages, local.passages, remote.passages, localDiff, remoteDiff);
  merged.passages = passagesResult.merged;
  conflicts.push(...passagesResult.conflicts);

  // Merge variables
  const variablesResult = mergeVariables(base.variables, local.variables, remote.variables, localDiff, remoteDiff);
  merged.variables = variablesResult.merged;
  conflicts.push(...variablesResult.conflicts);

  // Merge settings
  const settingsResult = mergeSettings(base.settings || {}, local.settings || {}, remote.settings || {});
  merged.settings = settingsResult.merged;
  conflicts.push(...settingsResult.conflicts);

  // Merge start passage
  if (local.startPassage !== base.startPassage && remote.startPassage !== base.startPassage) {
    if (local.startPassage !== remote.startPassage) {
      conflicts.push({
        type: 'metadata',
        path: 'startPassage',
        description: 'Both versions changed the start passage',
        base: base.startPassage,
        local: local.startPassage,
        remote: remote.startPassage,
      });
      merged.startPassage = local.startPassage; // Default to local
    } else {
      merged.startPassage = local.startPassage; // Same change in both
      autoResolved++;
    }
  } else if (local.startPassage !== base.startPassage) {
    merged.startPassage = local.startPassage;
  } else if (remote.startPassage !== base.startPassage) {
    merged.startPassage = remote.startPassage;
  }

  // Auto-resolve based on strategy
  if (strategy !== 'manual') {
    for (const conflict of conflicts) {
      if (strategy === 'local') {
        applyResolution(merged, conflict, 'local');
        autoResolved++;
      } else if (strategy === 'remote') {
        applyResolution(merged, conflict, 'remote');
        autoResolved++;
      } else if (strategy === 'base') {
        applyResolution(merged, conflict, 'base');
        autoResolved++;
      }
    }
  }

  // Auto-resolve non-content conflicts if enabled
  if (autoResolveNonContent && strategy === 'manual') {
    for (const conflict of conflicts) {
      if (isNonContentConflict(conflict)) {
        applyResolution(merged, conflict, 'local');
        autoResolved++;
      }
    }
  }

  const requiresResolution = strategy === 'manual'
    ? conflicts.filter(c => !isNonContentConflict(c) || !autoResolveNonContent).length
    : 0;

  return {
    success: requiresResolution === 0,
    merged,
    conflicts,
    autoResolved,
    requiresResolution,
  };
}

/**
 * Merge metadata from three versions
 */
function mergeMetadata(
  base: StoryData['metadata'],
  local: StoryData['metadata'],
  remote: StoryData['metadata'],
  localDiff: ReturnType<typeof diffStories>,
  remoteDiff: ReturnType<typeof diffStories>
): { merged: StoryData['metadata']; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged = { ...base };

  // Simple fields
  for (const field of ['title', 'author', 'version', 'description'] as const) {
    const localChanged = localDiff.metadataChanges.some(m => m.field === field);
    const remoteChanged = remoteDiff.metadataChanges.some(m => m.field === field);

    if (localChanged && remoteChanged && local[field] !== remote[field]) {
      conflicts.push({
        type: 'metadata',
        path: `metadata.${field}`,
        description: `Both versions changed ${field}`,
        base: base[field],
        local: local[field],
        remote: remote[field],
      });
      merged[field] = local[field] as any; // Default to local
    } else if (localChanged) {
      merged[field] = local[field] as any;
    } else if (remoteChanged) {
      merged[field] = remote[field] as any;
    }
  }

  // Tags (merge arrays)
  const baseTags = new Set(base.tags || []);
  const localTags = new Set(local.tags || []);
  const remoteTags = new Set(remote.tags || []);

  const mergedTags = new Set(baseTags);

  // Add tags added in local
  for (const tag of localTags) {
    if (!baseTags.has(tag)) {
      mergedTags.add(tag);
    }
  }

  // Add tags added in remote
  for (const tag of remoteTags) {
    if (!baseTags.has(tag)) {
      mergedTags.add(tag);
    }
  }

  // Remove tags removed in local
  for (const tag of baseTags) {
    if (!localTags.has(tag)) {
      mergedTags.delete(tag);
    }
  }

  // Remove tags removed in remote
  for (const tag of baseTags) {
    if (!remoteTags.has(tag)) {
      mergedTags.delete(tag);
    }
  }

  merged.tags = Array.from(mergedTags);

  // Update modified timestamp
  merged.modified = new Date().toISOString();

  return { merged, conflicts };
}

/**
 * Merge passages from three versions
 */
function mergePassages(
  base: Record<string, PassageData>,
  local: Record<string, PassageData>,
  remote: Record<string, PassageData>,
  localDiff: ReturnType<typeof diffStories>,
  remoteDiff: ReturnType<typeof diffStories>
): { merged: Record<string, PassageData>; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged: Record<string, PassageData> = {};

  const allIds = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  for (const id of allIds) {
    const basePassage = base[id];
    const localPassage = local[id];
    const remotePassage = remote[id];

    const localChange = localDiff.passageChanges.find(p => p.passageId === id);
    const remoteChange = remoteDiff.passageChanges.find(p => p.passageId === id);

    // Both added (add-add conflict)
    if (!basePassage && localPassage && remotePassage) {
      if (JSON.stringify(localPassage) !== JSON.stringify(remotePassage)) {
        conflicts.push({
          type: 'passage-content',
          path: `passages.${id}`,
          description: `Both versions added passage "${localPassage.title}"`,
          base: null,
          local: localPassage,
          remote: remotePassage,
          passageId: id,
        });
      }
      merged[id] = localPassage; // Default to local
      continue;
    }

    // Only local added
    if (!basePassage && localPassage && !remotePassage) {
      merged[id] = localPassage;
      continue;
    }

    // Only remote added
    if (!basePassage && !localPassage && remotePassage) {
      merged[id] = remotePassage;
      continue;
    }

    // Local deleted, remote modified (delete-modify conflict)
    if (basePassage && !localPassage && remoteChange?.type === 'modified') {
      conflicts.push({
        type: 'passage-deleted',
        path: `passages.${id}`,
        description: `Local deleted passage "${basePassage.title}" but remote modified it`,
        base: basePassage,
        local: null,
        remote: remotePassage,
        passageId: id,
      });
      // Default: keep deleted (don't add to merged)
      continue;
    }

    // Remote deleted, local modified (modify-delete conflict)
    if (basePassage && localChange?.type === 'modified' && !remotePassage) {
      conflicts.push({
        type: 'passage-deleted',
        path: `passages.${id}`,
        description: `Remote deleted passage "${basePassage.title}" but local modified it`,
        base: basePassage,
        local: localPassage,
        remote: null,
        passageId: id,
      });
      merged[id] = localPassage!; // Default: keep local
      continue;
    }

    // Both deleted - no conflict
    if (basePassage && !localPassage && !remotePassage) {
      continue; // Don't add to merged
    }

    // Only local deleted
    if (basePassage && !localPassage) {
      continue; // Don't add to merged
    }

    // Only remote deleted
    if (basePassage && !remotePassage) {
      continue; // Don't add to merged
    }

    // Both exist - check for modifications
    if (localChange?.type === 'modified' && remoteChange?.type === 'modified') {
      // Both modified - need field-level merge
      const passageResult = mergePassageFields(basePassage!, localPassage!, remotePassage!);
      merged[id] = passageResult.merged;
      conflicts.push(...passageResult.conflicts.map(c => ({ ...c, passageId: id })));
    } else if (localChange?.type === 'modified') {
      merged[id] = localPassage!;
    } else if (remoteChange?.type === 'modified') {
      merged[id] = remotePassage!;
    } else {
      merged[id] = basePassage!;
    }
  }

  return { merged, conflicts };
}

/**
 * Merge individual passage fields
 */
function mergePassageFields(
  base: PassageData,
  local: PassageData,
  remote: PassageData
): { merged: PassageData; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged: PassageData = { ...base };

  // Title
  if (local.title !== base.title && remote.title !== base.title) {
    if (local.title !== remote.title) {
      conflicts.push({
        type: 'passage-title',
        path: `passages.${base.id}.title`,
        description: 'Both versions changed passage title',
        base: base.title,
        local: local.title,
        remote: remote.title,
      });
    }
    merged.title = local.title;
  } else if (local.title !== base.title) {
    merged.title = local.title;
  } else if (remote.title !== base.title) {
    merged.title = remote.title;
  }

  // Content (most important)
  if (local.content !== base.content && remote.content !== base.content) {
    if (local.content !== remote.content) {
      conflicts.push({
        type: 'passage-content',
        path: `passages.${base.id}.content`,
        description: 'Both versions changed passage content',
        base: base.content,
        local: local.content,
        remote: remote.content,
      });
    }
    merged.content = local.content;
  } else if (local.content !== base.content) {
    merged.content = local.content;
  } else if (remote.content !== base.content) {
    merged.content = remote.content;
  }

  // Scripts
  for (const script of ['onEnterScript', 'onExitScript'] as const) {
    const baseVal = base[script];
    const localVal = local[script];
    const remoteVal = remote[script];

    if (localVal !== baseVal && remoteVal !== baseVal) {
      if (localVal !== remoteVal) {
        conflicts.push({
          type: 'passage-script',
          path: `passages.${base.id}.${script}`,
          description: `Both versions changed ${script}`,
          base: baseVal,
          local: localVal,
          remote: remoteVal,
        });
      }
      merged[script] = localVal;
    } else if (localVal !== baseVal) {
      merged[script] = localVal;
    } else if (remoteVal !== baseVal) {
      merged[script] = remoteVal;
    }
  }

  // Position (take local by default)
  if (local.position?.x !== base.position?.x || local.position?.y !== base.position?.y) {
    merged.position = local.position;
  } else if (remote.position?.x !== base.position?.x || remote.position?.y !== base.position?.y) {
    merged.position = remote.position;
  }

  // Merge choices
  const choicesResult = mergeChoices(base.choices || [], local.choices || [], remote.choices || []);
  merged.choices = choicesResult.merged;
  conflicts.push(...choicesResult.conflicts.map(c => ({
    ...c,
    path: `passages.${base.id}.choices.${c.choiceId}`,
  })));

  // Tags (merge sets)
  const baseTags = new Set(base.tags || []);
  const localTags = new Set(local.tags || []);
  const remoteTags = new Set(remote.tags || []);
  const mergedTags = new Set([...localTags, ...remoteTags]);
  for (const tag of baseTags) {
    if (!localTags.has(tag) || !remoteTags.has(tag)) {
      mergedTags.delete(tag);
    }
  }
  merged.tags = Array.from(mergedTags);

  return { merged, conflicts };
}

/**
 * Merge choices from three versions
 */
function mergeChoices(
  base: ChoiceData[],
  local: ChoiceData[],
  remote: ChoiceData[]
): { merged: ChoiceData[]; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged: ChoiceData[] = [];

  const baseById = new Map(base.map(c => [c.id, c]));
  const localById = new Map(local.map(c => [c.id, c]));
  const remoteById = new Map(remote.map(c => [c.id, c]));

  const allIds = new Set([...baseById.keys(), ...localById.keys(), ...remoteById.keys()]);

  for (const id of allIds) {
    const baseChoice = baseById.get(id);
    const localChoice = localById.get(id);
    const remoteChoice = remoteById.get(id);

    // New in local only
    if (!baseChoice && localChoice && !remoteChoice) {
      merged.push(localChoice);
      continue;
    }

    // New in remote only
    if (!baseChoice && !localChoice && remoteChoice) {
      merged.push(remoteChoice);
      continue;
    }

    // New in both
    if (!baseChoice && localChoice && remoteChoice) {
      if (JSON.stringify(localChoice) !== JSON.stringify(remoteChoice)) {
        conflicts.push({
          type: 'choice-modified',
          path: `choice.${id}`,
          description: 'Both versions added the same choice differently',
          base: null,
          local: localChoice,
          remote: remoteChoice,
          choiceId: id,
        });
      }
      merged.push(localChoice);
      continue;
    }

    // Deleted in local, modified in remote
    if (baseChoice && !localChoice && remoteChoice) {
      if (JSON.stringify(baseChoice) !== JSON.stringify(remoteChoice)) {
        conflicts.push({
          type: 'choice-deleted',
          path: `choice.${id}`,
          description: 'Local deleted choice but remote modified it',
          base: baseChoice,
          local: null,
          remote: remoteChoice,
          choiceId: id,
        });
      }
      // Default: keep deleted
      continue;
    }

    // Deleted in remote, modified in local
    if (baseChoice && localChoice && !remoteChoice) {
      if (JSON.stringify(baseChoice) !== JSON.stringify(localChoice)) {
        conflicts.push({
          type: 'choice-deleted',
          path: `choice.${id}`,
          description: 'Remote deleted choice but local modified it',
          base: baseChoice,
          local: localChoice,
          remote: null,
          choiceId: id,
        });
        merged.push(localChoice);
      }
      // Default: keep deleted
      continue;
    }

    // Both deleted
    if (baseChoice && !localChoice && !remoteChoice) {
      continue;
    }

    // Both modified
    if (baseChoice && localChoice && remoteChoice) {
      const localChanged = JSON.stringify(baseChoice) !== JSON.stringify(localChoice);
      const remoteChanged = JSON.stringify(baseChoice) !== JSON.stringify(remoteChoice);

      if (localChanged && remoteChanged && JSON.stringify(localChoice) !== JSON.stringify(remoteChoice)) {
        conflicts.push({
          type: 'choice-modified',
          path: `choice.${id}`,
          description: 'Both versions modified the choice',
          base: baseChoice,
          local: localChoice,
          remote: remoteChoice,
          choiceId: id,
        });
        merged.push(localChoice);
      } else if (localChanged) {
        merged.push(localChoice);
      } else if (remoteChanged) {
        merged.push(remoteChoice);
      } else {
        merged.push(baseChoice);
      }
    }
  }

  return { merged, conflicts };
}

/**
 * Merge variables from three versions
 */
function mergeVariables(
  base: Record<string, VariableData>,
  local: Record<string, VariableData>,
  remote: Record<string, VariableData>,
  localDiff: ReturnType<typeof diffStories>,
  remoteDiff: ReturnType<typeof diffStories>
): { merged: Record<string, VariableData>; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged: Record<string, VariableData> = {};

  const allNames = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  for (const name of allNames) {
    const baseVar = base[name];
    const localVar = local[name];
    const remoteVar = remote[name];

    const localChange = localDiff.variableChanges.find(v => v.name === name);
    const remoteChange = remoteDiff.variableChanges.find(v => v.name === name);

    // Both added
    if (!baseVar && localVar && remoteVar) {
      if (JSON.stringify(localVar) !== JSON.stringify(remoteVar)) {
        conflicts.push({
          type: 'variable-value',
          path: `variables.${name}`,
          description: `Both versions added variable "${name}" with different values`,
          base: null,
          local: localVar,
          remote: remoteVar,
          variableName: name,
        });
      }
      merged[name] = localVar;
      continue;
    }

    // Only local added
    if (!baseVar && localVar && !remoteVar) {
      merged[name] = localVar;
      continue;
    }

    // Only remote added
    if (!baseVar && !localVar && remoteVar) {
      merged[name] = remoteVar;
      continue;
    }

    // Delete-modify conflicts
    if (baseVar && !localVar && remoteChange?.type === 'modified') {
      conflicts.push({
        type: 'variable-deleted',
        path: `variables.${name}`,
        description: `Local deleted variable "${name}" but remote modified it`,
        base: baseVar,
        local: null,
        remote: remoteVar,
        variableName: name,
      });
      continue;
    }

    if (baseVar && localChange?.type === 'modified' && !remoteVar) {
      conflicts.push({
        type: 'variable-deleted',
        path: `variables.${name}`,
        description: `Remote deleted variable "${name}" but local modified it`,
        base: baseVar,
        local: localVar,
        remote: null,
        variableName: name,
      });
      merged[name] = localVar!;
      continue;
    }

    // Both deleted
    if (baseVar && !localVar && !remoteVar) {
      continue;
    }

    // Only local deleted
    if (baseVar && !localVar) {
      continue;
    }

    // Only remote deleted
    if (baseVar && !remoteVar) {
      continue;
    }

    // Both modified
    if (localChange?.type === 'modified' && remoteChange?.type === 'modified') {
      if (JSON.stringify(localVar) !== JSON.stringify(remoteVar)) {
        // Check specific field conflicts
        if (localVar!.type !== remoteVar!.type) {
          conflicts.push({
            type: 'variable-type',
            path: `variables.${name}.type`,
            description: `Both versions changed variable "${name}" type`,
            base: baseVar?.type,
            local: localVar!.type,
            remote: remoteVar!.type,
            variableName: name,
          });
        }
        if (localVar!.initial !== remoteVar!.initial) {
          conflicts.push({
            type: 'variable-value',
            path: `variables.${name}.initial`,
            description: `Both versions changed variable "${name}" initial value`,
            base: baseVar?.initial,
            local: localVar!.initial,
            remote: remoteVar!.initial,
            variableName: name,
          });
        }
      }
      merged[name] = localVar!;
    } else if (localChange?.type === 'modified') {
      merged[name] = localVar!;
    } else if (remoteChange?.type === 'modified') {
      merged[name] = remoteVar!;
    } else {
      merged[name] = baseVar!;
    }
  }

  return { merged, conflicts };
}

/**
 * Merge settings from three versions
 */
function mergeSettings(
  base: Record<string, any>,
  local: Record<string, any>,
  remote: Record<string, any>
): { merged: Record<string, any>; conflicts: StoryConflict[] } {
  const conflicts: StoryConflict[] = [];
  const merged: Record<string, any> = { ...base };

  const allKeys = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  for (const key of allKeys) {
    const baseVal = base[key];
    const localVal = local[key];
    const remoteVal = remote[key];

    const localChanged = JSON.stringify(baseVal) !== JSON.stringify(localVal);
    const remoteChanged = JSON.stringify(baseVal) !== JSON.stringify(remoteVal);

    if (localChanged && remoteChanged) {
      if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
        conflicts.push({
          type: 'settings',
          path: `settings.${key}`,
          description: `Both versions changed setting "${key}"`,
          base: baseVal,
          local: localVal,
          remote: remoteVal,
        });
      }
      merged[key] = localVal;
    } else if (localChanged) {
      merged[key] = localVal;
    } else if (remoteChanged) {
      merged[key] = remoteVal;
    }
  }

  return { merged, conflicts };
}

/**
 * Check if a conflict is a non-content conflict (can be auto-resolved)
 */
function isNonContentConflict(conflict: StoryConflict): boolean {
  return conflict.type === 'metadata' ||
         conflict.type === 'settings';
}

/**
 * Apply a resolution to a conflict
 */
function applyResolution(
  story: StoryData,
  conflict: StoryConflict,
  resolution: 'local' | 'remote' | 'base'
): void {
  const value = resolution === 'local' ? conflict.local :
                resolution === 'remote' ? conflict.remote :
                conflict.base;

  const parts = conflict.path.split('.');
  let current: any = story;

  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  const lastKey = parts[parts.length - 1];

  if (value === null || value === undefined) {
    delete current[lastKey];
  } else {
    current[lastKey] = value;
  }
}

/**
 * Resolve conflicts with a map of resolutions
 */
export function resolveConflicts(
  mergeResult: StoryMergeResult,
  resolutions: Map<string, ConflictResolutionStrategy>
): StoryData {
  const resolved = JSON.parse(JSON.stringify(mergeResult.merged));

  for (const conflict of mergeResult.conflicts) {
    const resolution = resolutions.get(conflict.path);
    if (resolution && resolution !== 'manual') {
      applyResolution(resolved, conflict, resolution);
    }
  }

  return resolved;
}
