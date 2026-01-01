/**
 * WLS 1.0 Collection Validator
 *
 * Validates LIST, ARRAY, and MAP declarations.
 * Error codes: WLS-COL-001 through WLS-COL-010
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

/**
 * Check if a string is a valid identifier
 */
function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

export class WlsCollectionValidator implements Validator {
  name = 'wls_collections';
  category = 'collections' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate LIST declarations
    issues.push(...this.validateLists(story));

    // Validate ARRAY declarations
    issues.push(...this.validateArrays(story));

    // Validate MAP declarations
    issues.push(...this.validateMaps(story));

    return issues;
  }

  private validateLists(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if story has lists (from parsed AST)
    const lists = (story as unknown as { lists?: Array<{ name: string; values: Array<{ value: string; active: boolean }> }> }).lists;

    if (!lists || !Array.isArray(lists)) {
      return issues;
    }

    for (const list of lists) {
      const listName = list.name;
      const values = list.values || [];

      // Check for empty list
      if (values.length === 0) {
        issues.push({
          id: `empty_list_${listName}`,
          code: 'WLS-COL-002',
          severity: 'warning',
          category: 'collections',
          message: `LIST "${listName}" has no values`,
          description: 'A LIST declaration should have at least one value.',
          context: { listName },
          fixable: false,
        });
      }

      // Check for duplicate values and invalid identifiers
      const seenValues = new Set<string>();

      for (const v of values) {
        const valueName = typeof v === 'object' ? v.value : v;

        // Check for duplicates
        if (seenValues.has(valueName)) {
          issues.push({
            id: `dup_list_val_${listName}_${valueName}`,
            code: 'WLS-COL-001',
            severity: 'error',
            category: 'collections',
            message: `Duplicate value "${valueName}" in LIST "${listName}"`,
            description: 'LIST declarations cannot have duplicate values.',
            context: { listName, value: valueName },
            fixable: false,
          });
        } else {
          seenValues.add(valueName);
        }

        // Check for valid identifier
        if (!isValidIdentifier(valueName)) {
          issues.push({
            id: `invalid_list_val_${listName}_${valueName}`,
            code: 'WLS-COL-003',
            severity: 'error',
            category: 'collections',
            message: `Invalid value name "${valueName}" in LIST "${listName}"`,
            description: 'LIST values must be valid identifiers.',
            context: { listName, value: valueName },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }

  private validateArrays(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if story has arrays (from parsed AST)
    const arrays = (story as unknown as { arrays?: Array<{ name: string; elements: Array<{ index: number | null; value: unknown }> }> }).arrays;

    if (!arrays || !Array.isArray(arrays)) {
      return issues;
    }

    for (const array of arrays) {
      const arrayName = array.name;
      const elements = array.elements || [];

      // Check for duplicate and negative indices
      const seenIndices = new Set<number>();

      for (const elem of elements) {
        if (typeof elem === 'object' && elem.index !== null && elem.index !== undefined) {
          const index = elem.index;

          // Check for negative index
          if (index < 0) {
            issues.push({
              id: `neg_array_idx_${arrayName}_${index}`,
              code: 'WLS-COL-005',
              severity: 'error',
              category: 'collections',
              message: `Negative index ${index} in ARRAY "${arrayName}"`,
              description: 'ARRAY indices must be non-negative.',
              context: { arrayName, index },
              fixable: false,
            });
          }

          // Check for duplicate index
          if (seenIndices.has(index)) {
            issues.push({
              id: `dup_array_idx_${arrayName}_${index}`,
              code: 'WLS-COL-004',
              severity: 'error',
              category: 'collections',
              message: `Duplicate index ${index} in ARRAY "${arrayName}"`,
              description: 'ARRAY declarations cannot have duplicate explicit indices.',
              context: { arrayName, index },
              fixable: false,
            });
          } else {
            seenIndices.add(index);
          }
        }
      }
    }

    return issues;
  }

  private validateMaps(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if story has maps (from parsed AST)
    const maps = (story as unknown as { maps?: Array<{ name: string; entries: Array<{ key: string; value: unknown }> }> }).maps;

    if (!maps || !Array.isArray(maps)) {
      return issues;
    }

    for (const map of maps) {
      const mapName = map.name;
      const entries = map.entries || [];

      // Check for duplicate keys
      const seenKeys = new Set<string>();

      for (const entry of entries) {
        const key = entry.key;

        // Check for duplicates
        if (seenKeys.has(key)) {
          issues.push({
            id: `dup_map_key_${mapName}_${key}`,
            code: 'WLS-COL-006',
            severity: 'error',
            category: 'collections',
            message: `Duplicate key "${key}" in MAP "${mapName}"`,
            description: 'MAP declarations cannot have duplicate keys.',
            context: { mapName, key },
            fixable: false,
          });
        } else {
          seenKeys.add(key);
        }

        // Check for valid key (must be string)
        if (typeof key !== 'string') {
          issues.push({
            id: `invalid_map_key_${mapName}_${key}`,
            code: 'WLS-COL-007',
            severity: 'error',
            category: 'collections',
            message: `Invalid key "${key}" in MAP "${mapName}"`,
            description: 'MAP keys must be valid identifiers or strings.',
            context: { mapName, key: String(key) },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }
}
