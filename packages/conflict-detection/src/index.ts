/**
 * Conflict Detection
 *
 * Framework-agnostic 3-way merge algorithm for collaborative editing.
 * Zero dependencies. Implements operational transformation concepts.
 */

export type ConflictResolution = 'base' | 'local' | 'remote' | 'merged';

export interface MergeResult<T = any> {
  resolved: T;
  conflicts: Conflict<T>[];
  resolution: ConflictResolution;
  success: boolean;
}

export interface Conflict<T = any> {
  path: string;
  base: T;
  local: T;
  remote: T;
  type: 'modify-modify' | 'delete-modify' | 'modify-delete' | 'add-add';
}

export interface Change {
  type: 'add' | 'modify' | 'delete';
  path: string;
  oldValue?: any;
  newValue?: any;
  timestamp?: number;
}

/**
 * Diff two objects and return list of changes
 */
export function diff(base: any, modified: any, path: string = ''): Change[] {
  const changes: Change[] = [];

  // Handle primitives
  if (typeof base !== 'object' || base === null || typeof modified !== 'object' || modified === null) {
    if (base !== modified) {
      if (base === undefined || base === null) {
        changes.push({ type: 'add', path, newValue: modified });
      } else if (modified === undefined || modified === null) {
        changes.push({ type: 'delete', path, oldValue: base });
      } else {
        changes.push({ type: 'modify', path, oldValue: base, newValue: modified });
      }
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(base) && Array.isArray(modified)) {
    if (JSON.stringify(base) !== JSON.stringify(modified)) {
      changes.push({ type: 'modify', path, oldValue: base, newValue: modified });
    }
    return changes;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(base), ...Object.keys(modified)]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    const baseValue = base[key];
    const modifiedValue = modified[key];

    if (!(key in base)) {
      changes.push({ type: 'add', path: newPath, newValue: modifiedValue });
    } else if (!(key in modified)) {
      changes.push({ type: 'delete', path: newPath, oldValue: baseValue });
    } else if (typeof baseValue === 'object' && baseValue !== null &&
               typeof modifiedValue === 'object' && modifiedValue !== null &&
               !Array.isArray(baseValue) && !Array.isArray(modifiedValue)) {
      changes.push(...diff(baseValue, modifiedValue, newPath));
    } else if (JSON.stringify(baseValue) !== JSON.stringify(modifiedValue)) {
      changes.push({ type: 'modify', path: newPath, oldValue: baseValue, newValue: modifiedValue });
    }
  }

  return changes;
}

/**
 * 3-way merge algorithm
 */
export function merge<T = any>(base: T, local: T, remote: T): MergeResult<T> {
  // Fast path: no changes
  if (JSON.stringify(base) === JSON.stringify(local) && JSON.stringify(base) === JSON.stringify(remote)) {
    return {
      resolved: base,
      conflicts: [],
      resolution: 'base',
      success: true,
    };
  }

  // Fast path: only local changed
  if (JSON.stringify(base) === JSON.stringify(remote)) {
    return {
      resolved: local,
      conflicts: [],
      resolution: 'local',
      success: true,
    };
  }

  // Fast path: only remote changed
  if (JSON.stringify(base) === JSON.stringify(local)) {
    return {
      resolved: remote,
      conflicts: [],
      resolution: 'remote',
      success: true,
    };
  }

  // Both changed - need to merge
  const localChanges = diff(base, local);
  const remoteChanges = diff(base, remote);

  const conflicts: Conflict[] = detectConflicts(base, local, remote, localChanges, remoteChanges);

  if (conflicts.length === 0) {
    // No conflicts - can auto-merge
    const resolved = applyChanges(base, [...localChanges, ...remoteChanges]);
    return {
      resolved: resolved as T,
      conflicts: [],
      resolution: 'merged',
      success: true,
    };
  }

  // Has conflicts - return local version with conflict info
  return {
    resolved: local,
    conflicts,
    resolution: 'local',
    success: false,
  };
}

/**
 * Detect conflicts between local and remote changes
 */
function detectConflicts(base: any, local: any, remote: any, localChanges: Change[], remoteChanges: Change[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const localPaths = new Set(localChanges.map(c => c.path));
  const remotePaths = new Set(remoteChanges.map(c => c.path));

  // Find paths modified in both versions
  const conflictPaths = new Set([...localPaths].filter(p => remotePaths.has(p)));

  for (const path of conflictPaths) {
    const localChange = localChanges.find(c => c.path === path)!;
    const remoteChange = remoteChanges.find(c => c.path === path)!;

    // Check if changes are compatible
    if (JSON.stringify(localChange.newValue) !== JSON.stringify(remoteChange.newValue)) {
      let type: Conflict['type'] = 'modify-modify';

      if (localChange.type === 'delete' && remoteChange.type === 'modify') {
        type = 'delete-modify';
      } else if (localChange.type === 'modify' && remoteChange.type === 'delete') {
        type = 'modify-delete';
      } else if (localChange.type === 'add' && remoteChange.type === 'add') {
        type = 'add-add';
      }

      conflicts.push({
        path,
        base: getValueAtPath(base, path),
        local: localChange.newValue ?? null,
        remote: remoteChange.newValue ?? null,
        type,
      });
    }
  }

  return conflicts;
}

/**
 * Apply a list of changes to an object
 */
function applyChanges(obj: any, changes: Change[]): any {
  const result = JSON.parse(JSON.stringify(obj));

  for (const change of changes) {
    const parts = change.path.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const lastKey = parts[parts.length - 1];

    if (change.type === 'delete') {
      delete current[lastKey];
    } else {
      current[lastKey] = change.newValue;
    }
  }

  return result;
}

/**
 * Get value at a path in an object
 */
function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Resolve a conflict by choosing a resolution strategy
 */
export function resolveConflict<T = any>(conflict: Conflict<T>, strategy: 'local' | 'remote' | 'base'): T {
  switch (strategy) {
    case 'local':
      return conflict.local;
    case 'remote':
      return conflict.remote;
    case 'base':
      return conflict.base;
  }
}

/**
 * Apply conflict resolutions to a merge result
 */
export function applyResolutions<T = any>(
  mergeResult: MergeResult<T>,
  resolutions: Map<string, 'local' | 'remote' | 'base'>
): T {
  let resolved = JSON.parse(JSON.stringify(mergeResult.resolved));

  for (const conflict of mergeResult.conflicts) {
    const resolution = resolutions.get(conflict.path);
    if (resolution) {
      const value = resolveConflict(conflict, resolution);
      const parts = conflict.path.split('.');
      let current = resolved;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }
  }

  return resolved;
}

/**
 * Check if two values can be automatically merged
 */
export function canAutoMerge(base: any, local: any, remote: any): boolean {
  const result = merge(base, local, remote);
  return result.success && result.conflicts.length === 0;
}
