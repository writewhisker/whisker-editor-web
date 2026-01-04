/**
 * Story Diff Algorithm
 *
 * Provides passage-level change detection and human-readable diff output
 * for Whisker stories in VCS scenarios.
 */

import type { StoryData, PassageData, VariableData, ChoiceData } from '@writewhisker/story-models';

/**
 * Change types for diff operations
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * Represents a change to a specific field
 */
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Represents a change to a passage
 */
export interface PassageChange {
  type: ChangeType;
  passageId: string;
  passageTitle: string;
  fields?: FieldChange[];
  choiceChanges?: ChoiceChange[];
}

/**
 * Represents a change to a choice
 */
export interface ChoiceChange {
  type: ChangeType;
  choiceId: string;
  choiceText: string;
  fields?: FieldChange[];
}

/**
 * Represents a change to a variable
 */
export interface VariableChange {
  type: ChangeType;
  name: string;
  fields?: FieldChange[];
}

/**
 * Represents changes to story metadata
 */
export interface MetadataChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Complete diff result for a story
 */
export interface StoryDiffResult {
  metadataChanges: MetadataChange[];
  passageChanges: PassageChange[];
  variableChanges: VariableChange[];
  settingsChanges: FieldChange[];

  // Summary statistics
  summary: {
    passagesAdded: number;
    passagesRemoved: number;
    passagesModified: number;
    passagesUnchanged: number;
    variablesAdded: number;
    variablesRemoved: number;
    variablesModified: number;
    choicesAdded: number;
    choicesRemoved: number;
    choicesModified: number;
  };

  hasChanges: boolean;
}

/**
 * Options for diff generation
 */
export interface DiffOptions {
  ignorePositions?: boolean;
  ignoreTimestamps?: boolean;
  ignoreWhitespace?: boolean;
  maxContextLines?: number;
}

/**
 * Computes the diff between two Story versions
 */
export function diffStories(
  base: StoryData,
  modified: StoryData,
  options: DiffOptions = {}
): StoryDiffResult {
  const {
    ignorePositions = true,
    ignoreTimestamps = true,
    ignoreWhitespace = false,
  } = options;

  const metadataChanges = diffMetadata(base.metadata, modified.metadata);
  const passageChanges = diffPassages(base.passages, modified.passages, {
    ignorePositions,
    ignoreTimestamps,
    ignoreWhitespace,
  });
  const variableChanges = diffVariables(base.variables, modified.variables);
  const settingsChanges = diffSettings(base.settings || {}, modified.settings || {});

  const summary = {
    passagesAdded: passageChanges.filter(p => p.type === 'added').length,
    passagesRemoved: passageChanges.filter(p => p.type === 'removed').length,
    passagesModified: passageChanges.filter(p => p.type === 'modified').length,
    passagesUnchanged: passageChanges.filter(p => p.type === 'unchanged').length,
    variablesAdded: variableChanges.filter(v => v.type === 'added').length,
    variablesRemoved: variableChanges.filter(v => v.type === 'removed').length,
    variablesModified: variableChanges.filter(v => v.type === 'modified').length,
    choicesAdded: passageChanges.reduce((acc, p) =>
      acc + (p.choiceChanges?.filter(c => c.type === 'added').length || 0), 0),
    choicesRemoved: passageChanges.reduce((acc, p) =>
      acc + (p.choiceChanges?.filter(c => c.type === 'removed').length || 0), 0),
    choicesModified: passageChanges.reduce((acc, p) =>
      acc + (p.choiceChanges?.filter(c => c.type === 'modified').length || 0), 0),
  };

  const hasChanges =
    metadataChanges.length > 0 ||
    passageChanges.some(p => p.type !== 'unchanged') ||
    variableChanges.some(v => v.type !== 'unchanged') ||
    settingsChanges.length > 0;

  return {
    metadataChanges,
    passageChanges,
    variableChanges,
    settingsChanges,
    summary,
    hasChanges,
  };
}

/**
 * Diff story metadata
 */
function diffMetadata(
  base: StoryData['metadata'],
  modified: StoryData['metadata']
): MetadataChange[] {
  const changes: MetadataChange[] = [];
  const fields = ['title', 'author', 'version', 'description', 'ifid'] as const;

  for (const field of fields) {
    const oldVal = base[field];
    const newVal = modified[field];
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }

  // Check tags array
  const oldTags = (base.tags || []).sort().join(',');
  const newTags = (modified.tags || []).sort().join(',');
  if (oldTags !== newTags) {
    changes.push({ field: 'tags', oldValue: base.tags, newValue: modified.tags });
  }

  return changes;
}

/**
 * Diff passages between two story versions
 */
function diffPassages(
  base: Record<string, PassageData>,
  modified: Record<string, PassageData>,
  options: { ignorePositions: boolean; ignoreTimestamps: boolean; ignoreWhitespace: boolean }
): PassageChange[] {
  const changes: PassageChange[] = [];
  const allIds = new Set([...Object.keys(base), ...Object.keys(modified)]);

  for (const id of allIds) {
    const basePassage = base[id];
    const modifiedPassage = modified[id];

    if (!basePassage) {
      // Added
      changes.push({
        type: 'added',
        passageId: id,
        passageTitle: modifiedPassage.title,
      });
    } else if (!modifiedPassage) {
      // Removed
      changes.push({
        type: 'removed',
        passageId: id,
        passageTitle: basePassage.title,
      });
    } else {
      // Check for modifications
      const fieldChanges = diffPassageFields(basePassage, modifiedPassage, options);
      const choiceChanges = diffChoices(
        basePassage.choices || [],
        modifiedPassage.choices || [],
        options.ignoreWhitespace
      );

      if (fieldChanges.length > 0 || choiceChanges.some(c => c.type !== 'unchanged')) {
        changes.push({
          type: 'modified',
          passageId: id,
          passageTitle: modifiedPassage.title,
          fields: fieldChanges,
          choiceChanges,
        });
      } else {
        changes.push({
          type: 'unchanged',
          passageId: id,
          passageTitle: modifiedPassage.title,
        });
      }
    }
  }

  return changes;
}

/**
 * Diff fields within a passage
 */
function diffPassageFields(
  base: PassageData,
  modified: PassageData,
  options: { ignorePositions: boolean; ignoreTimestamps: boolean; ignoreWhitespace: boolean }
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Title
  if (base.title !== modified.title) {
    changes.push({ field: 'title', oldValue: base.title, newValue: modified.title });
  }

  // Content
  let baseContent = base.content;
  let modifiedContent = modified.content;
  if (options.ignoreWhitespace) {
    baseContent = normalizeWhitespace(baseContent);
    modifiedContent = normalizeWhitespace(modifiedContent);
  }
  if (baseContent !== modifiedContent) {
    changes.push({ field: 'content', oldValue: base.content, newValue: modified.content });
  }

  // Position (unless ignored)
  if (!options.ignorePositions) {
    if (base.position?.x !== modified.position?.x || base.position?.y !== modified.position?.y) {
      changes.push({ field: 'position', oldValue: base.position, newValue: modified.position });
    }
  }

  // Scripts
  if (base.onEnterScript !== modified.onEnterScript) {
    changes.push({ field: 'onEnterScript', oldValue: base.onEnterScript, newValue: modified.onEnterScript });
  }
  if (base.onExitScript !== modified.onExitScript) {
    changes.push({ field: 'onExitScript', oldValue: base.onExitScript, newValue: modified.onExitScript });
  }

  // Tags
  const oldTags = (base.tags || []).sort().join(',');
  const newTags = (modified.tags || []).sort().join(',');
  if (oldTags !== newTags) {
    changes.push({ field: 'tags', oldValue: base.tags, newValue: modified.tags });
  }

  // Color
  if (base.color !== modified.color) {
    changes.push({ field: 'color', oldValue: base.color, newValue: modified.color });
  }

  // Notes
  if (base.notes !== modified.notes) {
    changes.push({ field: 'notes', oldValue: base.notes, newValue: modified.notes });
  }

  return changes;
}

/**
 * Diff choices within a passage
 */
function diffChoices(
  base: ChoiceData[],
  modified: ChoiceData[],
  ignoreWhitespace: boolean
): ChoiceChange[] {
  const changes: ChoiceChange[] = [];
  const baseById = new Map(base.map(c => [c.id, c]));
  const modifiedById = new Map(modified.map(c => [c.id, c]));
  const allIds = new Set([...baseById.keys(), ...modifiedById.keys()]);

  for (const id of allIds) {
    const baseChoice = baseById.get(id);
    const modifiedChoice = modifiedById.get(id);

    if (!baseChoice) {
      changes.push({
        type: 'added',
        choiceId: id,
        choiceText: modifiedChoice!.text,
      });
    } else if (!modifiedChoice) {
      changes.push({
        type: 'removed',
        choiceId: id,
        choiceText: baseChoice.text,
      });
    } else {
      const fieldChanges = diffChoiceFields(baseChoice, modifiedChoice, ignoreWhitespace);
      if (fieldChanges.length > 0) {
        changes.push({
          type: 'modified',
          choiceId: id,
          choiceText: modifiedChoice.text,
          fields: fieldChanges,
        });
      } else {
        changes.push({
          type: 'unchanged',
          choiceId: id,
          choiceText: modifiedChoice.text,
        });
      }
    }
  }

  return changes;
}

/**
 * Diff fields within a choice
 */
function diffChoiceFields(
  base: ChoiceData,
  modified: ChoiceData,
  ignoreWhitespace: boolean
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (base.text !== modified.text) {
    changes.push({ field: 'text', oldValue: base.text, newValue: modified.text });
  }
  if (base.target !== modified.target) {
    changes.push({ field: 'target', oldValue: base.target, newValue: modified.target });
  }
  if (base.condition !== modified.condition) {
    changes.push({ field: 'condition', oldValue: base.condition, newValue: modified.condition });
  }
  if (base.action !== modified.action) {
    changes.push({ field: 'action', oldValue: base.action, newValue: modified.action });
  }
  if (base.choiceType !== modified.choiceType) {
    changes.push({ field: 'choiceType', oldValue: base.choiceType, newValue: modified.choiceType });
  }

  return changes;
}

/**
 * Diff variables between two story versions
 */
function diffVariables(
  base: Record<string, VariableData>,
  modified: Record<string, VariableData>
): VariableChange[] {
  const changes: VariableChange[] = [];
  const allNames = new Set([...Object.keys(base), ...Object.keys(modified)]);

  for (const name of allNames) {
    const baseVar = base[name];
    const modifiedVar = modified[name];

    if (!baseVar) {
      changes.push({ type: 'added', name });
    } else if (!modifiedVar) {
      changes.push({ type: 'removed', name });
    } else {
      const fieldChanges: FieldChange[] = [];

      if (baseVar.type !== modifiedVar.type) {
        fieldChanges.push({ field: 'type', oldValue: baseVar.type, newValue: modifiedVar.type });
      }
      if (baseVar.initial !== modifiedVar.initial) {
        fieldChanges.push({ field: 'initial', oldValue: baseVar.initial, newValue: modifiedVar.initial });
      }
      if (baseVar.scope !== modifiedVar.scope) {
        fieldChanges.push({ field: 'scope', oldValue: baseVar.scope, newValue: modifiedVar.scope });
      }

      if (fieldChanges.length > 0) {
        changes.push({ type: 'modified', name, fields: fieldChanges });
      } else {
        changes.push({ type: 'unchanged', name });
      }
    }
  }

  return changes;
}

/**
 * Diff story settings
 */
function diffSettings(
  base: Record<string, any>,
  modified: Record<string, any>
): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(base), ...Object.keys(modified)]);

  for (const key of allKeys) {
    const oldVal = base[key];
    const newVal = modified[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Generate human-readable diff output
 */
export function formatDiff(diff: StoryDiffResult, options: { color?: boolean } = {}): string {
  const lines: string[] = [];
  const { color = false } = options;

  const red = (s: string) => color ? `\x1b[31m${s}\x1b[0m` : s;
  const green = (s: string) => color ? `\x1b[32m${s}\x1b[0m` : s;
  const yellow = (s: string) => color ? `\x1b[33m${s}\x1b[0m` : s;
  const cyan = (s: string) => color ? `\x1b[36m${s}\x1b[0m` : s;
  const bold = (s: string) => color ? `\x1b[1m${s}\x1b[0m` : s;

  // Summary
  lines.push(bold('=== Story Diff Summary ==='));
  lines.push('');

  if (!diff.hasChanges) {
    lines.push('No changes detected.');
    return lines.join('\n');
  }

  const s = diff.summary;
  lines.push(`Passages: ${green(`+${s.passagesAdded}`)} ${red(`-${s.passagesRemoved}`)} ${yellow(`~${s.passagesModified}`)}`);
  lines.push(`Variables: ${green(`+${s.variablesAdded}`)} ${red(`-${s.variablesRemoved}`)} ${yellow(`~${s.variablesModified}`)}`);
  lines.push(`Choices: ${green(`+${s.choicesAdded}`)} ${red(`-${s.choicesRemoved}`)} ${yellow(`~${s.choicesModified}`)}`);
  lines.push('');

  // Metadata changes
  if (diff.metadataChanges.length > 0) {
    lines.push(bold('--- Metadata ---'));
    for (const change of diff.metadataChanges) {
      lines.push(`  ${cyan(change.field)}:`);
      lines.push(`    ${red('-')} ${formatValue(change.oldValue)}`);
      lines.push(`    ${green('+')} ${formatValue(change.newValue)}`);
    }
    lines.push('');
  }

  // Passage changes
  const passageChanges = diff.passageChanges.filter(p => p.type !== 'unchanged');
  if (passageChanges.length > 0) {
    lines.push(bold('--- Passages ---'));

    for (const change of passageChanges) {
      if (change.type === 'added') {
        lines.push(green(`+ [${change.passageTitle}]`));
      } else if (change.type === 'removed') {
        lines.push(red(`- [${change.passageTitle}]`));
      } else if (change.type === 'modified') {
        lines.push(yellow(`~ [${change.passageTitle}]`));

        if (change.fields) {
          for (const field of change.fields) {
            if (field.field === 'content') {
              lines.push(`    ${cyan('content')}:`);
              lines.push(...formatContentDiff(field.oldValue, field.newValue, '      '));
            } else {
              lines.push(`    ${cyan(field.field)}: ${red(formatValue(field.oldValue))} -> ${green(formatValue(field.newValue))}`);
            }
          }
        }

        if (change.choiceChanges) {
          const nonUnchanged = change.choiceChanges.filter(c => c.type !== 'unchanged');
          if (nonUnchanged.length > 0) {
            lines.push('    Choices:');
            for (const cc of nonUnchanged) {
              if (cc.type === 'added') {
                lines.push(green(`      + "${cc.choiceText}"`));
              } else if (cc.type === 'removed') {
                lines.push(red(`      - "${cc.choiceText}"`));
              } else if (cc.type === 'modified') {
                lines.push(yellow(`      ~ "${cc.choiceText}"`));
                if (cc.fields) {
                  for (const f of cc.fields) {
                    lines.push(`        ${f.field}: ${red(formatValue(f.oldValue))} -> ${green(formatValue(f.newValue))}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    lines.push('');
  }

  // Variable changes
  const varChanges = diff.variableChanges.filter(v => v.type !== 'unchanged');
  if (varChanges.length > 0) {
    lines.push(bold('--- Variables ---'));
    for (const change of varChanges) {
      if (change.type === 'added') {
        lines.push(green(`+ ${change.name}`));
      } else if (change.type === 'removed') {
        lines.push(red(`- ${change.name}`));
      } else if (change.type === 'modified') {
        lines.push(yellow(`~ ${change.name}`));
        if (change.fields) {
          for (const f of change.fields) {
            lines.push(`    ${f.field}: ${red(formatValue(f.oldValue))} -> ${green(formatValue(f.newValue))}`);
          }
        }
      }
    }
    lines.push('');
  }

  // Settings changes
  if (diff.settingsChanges.length > 0) {
    lines.push(bold('--- Settings ---'));
    for (const change of diff.settingsChanges) {
      lines.push(`  ${cyan(change.field)}:`);
      lines.push(`    ${red('-')} ${formatValue(change.oldValue)}`);
      lines.push(`    ${green('+')} ${formatValue(change.newValue)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === undefined) return '(undefined)';
  if (value === null) return '(null)';
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Format content diff with line-by-line comparison
 */
function formatContentDiff(oldContent: string, newContent: string, indent: string): string[] {
  const lines: string[] = [];
  const oldLines = (oldContent || '').split('\n');
  const newLines = (newContent || '').split('\n');

  // Simple line-by-line diff (could be enhanced with LCS algorithm)
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      lines.push(`${indent}+ ${newLine}`);
    } else if (newLine === undefined) {
      lines.push(`${indent}- ${oldLine}`);
    } else if (oldLine !== newLine) {
      lines.push(`${indent}- ${oldLine}`);
      lines.push(`${indent}+ ${newLine}`);
    }
    // Skip unchanged lines for brevity
  }

  if (lines.length === 0) {
    lines.push(`${indent}(content changed but no line differences found)`);
  }

  return lines;
}

/**
 * Get a summary of changes suitable for commit messages
 */
export function getSummary(diff: StoryDiffResult): string {
  const parts: string[] = [];
  const s = diff.summary;

  if (s.passagesAdded > 0) {
    parts.push(`added ${s.passagesAdded} passage${s.passagesAdded > 1 ? 's' : ''}`);
  }
  if (s.passagesRemoved > 0) {
    parts.push(`removed ${s.passagesRemoved} passage${s.passagesRemoved > 1 ? 's' : ''}`);
  }
  if (s.passagesModified > 0) {
    parts.push(`modified ${s.passagesModified} passage${s.passagesModified > 1 ? 's' : ''}`);
  }
  if (s.variablesAdded > 0 || s.variablesRemoved > 0 || s.variablesModified > 0) {
    const total = s.variablesAdded + s.variablesRemoved + s.variablesModified;
    parts.push(`${total} variable change${total > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No changes';
  }

  return parts.join(', ');
}
