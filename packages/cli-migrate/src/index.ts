/**
 * CLI Migrate Command
 *
 * Migration tools for upgrading Whisker stories between versions.
 * Includes reserved word detection, deprecated pattern detection,
 * and comprehensive migration reporting.
 */

import type { Command, CommandContext } from './types.js';
import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Migration version
 */
export type MigrationVersion = '1.0.0' | '2.0.0' | '3.0.0';

/**
 * Lua reserved keywords that cannot be used as variable names
 */
export const LUA_KEYWORDS = new Set([
  'if', 'else', 'elseif', 'then', 'end', 'for', 'while', 'do',
  'repeat', 'until', 'break', 'return', 'local', 'function',
  'in', 'and', 'or', 'not', 'nil', 'true', 'false', 'goto'
]);

/**
 * Lua builtin functions that should not be shadowed
 */
export const LUA_BUILTINS = new Set([
  'print', 'tostring', 'tonumber', 'pairs', 'ipairs', 'next',
  'type', 'error', 'assert', 'pcall', 'xpcall', 'setmetatable',
  'getmetatable', 'rawget', 'rawset', 'rawequal', 'select',
  'unpack', 'require', 'load', 'loadstring', 'dofile',
  'collectgarbage', 'coroutine', 'string', 'table', 'math',
  'io', 'os', 'debug', 'package'
]);

/**
 * Story API reserved words
 */
export const STORY_API_RESERVED = new Set([
  'game_state', 'passages', 'history', 'tags', 'save', 'load',
  'restart', 'current_passage', 'visited', 'turn_count', 'choice'
]);

/**
 * All reserved words combined
 */
export const ALL_RESERVED_WORDS = new Set([
  ...LUA_KEYWORDS,
  ...LUA_BUILTINS,
  ...STORY_API_RESERVED
]);

/**
 * Deprecated pattern types
 */
export interface DeprecatedPattern {
  pattern: RegExp;
  type: string;
  description: string;
  replacement?: string;
}

/**
 * Deprecated Twine/Twee patterns
 */
export const DEPRECATED_PATTERNS: DeprecatedPattern[] = [
  {
    pattern: /<<if\s+([^>]+)>>/g,
    type: 'twine-if-macro',
    description: '<<if>> macro (use @if directive)',
    replacement: '@if $1'
  },
  {
    pattern: /<<else>>/g,
    type: 'twine-else-macro',
    description: '<<else>> macro (use @else directive)',
    replacement: '@else'
  },
  {
    pattern: /<<elseif\s+([^>]+)>>/g,
    type: 'twine-elseif-macro',
    description: '<<elseif>> macro (use @elseif directive)',
    replacement: '@elseif $1'
  },
  {
    pattern: /<<endif>>/g,
    type: 'twine-endif-macro',
    description: '<<endif>> macro (use @end directive)',
    replacement: '@end'
  },
  {
    pattern: /<<set\s+\$(\w+)\s*=\s*([^>]+)>>/g,
    type: 'twine-set-macro',
    description: '<<set>> macro (use Lua assignment)',
    replacement: '$1 = $2'
  },
  {
    pattern: /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    type: 'twine-link-pipe',
    description: '[[text|target]] link syntax (use @link directive)',
    replacement: '@link{text="$1", target="$2"}'
  },
  {
    pattern: /\[\[([^\]>]+)->([^\]]+)\]\]/g,
    type: 'twine-link-arrow',
    description: '[[text->target]] link syntax (use @link directive)',
    replacement: '@link{text="$1", target="$2"}'
  },
  {
    pattern: /\[\[([^\]|>]+)\]\]/g,
    type: 'twine-link-simple',
    description: '[[passage]] link syntax (use @link directive)',
    replacement: '@link{target="$1"}'
  },
  {
    pattern: /\$(\w+)/g,
    type: 'twine-variable',
    description: '$variable syntax (use Lua variables)',
    replacement: '$1'
  }
];

/**
 * Detected issue in content
 */
export interface ContentIssue {
  type: 'reserved-word' | 'deprecated-pattern';
  category: string;
  line: number;
  column: number;
  original: string;
  suggested?: string;
  description: string;
}

/**
 * Migration report
 */
export interface MigrationReport {
  timestamp: string;
  inputFile?: string;
  fromVersion: string;
  toVersion: string;
  success: boolean;
  summary: {
    totalIssues: number;
    reservedWordIssues: number;
    deprecatedPatternIssues: number;
    passagesAnalyzed: number;
    passagesWithIssues: number;
    automaticFixes: number;
    manualFixesRequired: number;
  };
  changes: string[];
  issues: ContentIssue[];
  errors: string[];
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors?: string[];
  report?: MigrationReport;
}

/**
 * Check if a word is a reserved word
 */
export function isReservedWord(word: string): boolean {
  return ALL_RESERVED_WORDS.has(word.toLowerCase());
}

/**
 * Get the category of a reserved word
 */
export function getReservedWordCategory(word: string): string | null {
  const lower = word.toLowerCase();
  if (LUA_KEYWORDS.has(lower)) return 'lua-keyword';
  if (LUA_BUILTINS.has(lower)) return 'lua-builtin';
  if (STORY_API_RESERVED.has(lower)) return 'story-api';
  return null;
}

/**
 * Generate a safe variable name by adding a suffix
 */
export function getSafeVariableName(name: string): string {
  return `${name}_var`;
}

/**
 * Find reserved words in content
 */
export function findReservedWordsInContent(content: string, passageTitle?: string): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const lines = content.split('\n');

  // Pattern to find variable assignments: name = value
  const assignmentPattern = /\b(\w+)\s*=/g;
  // Pattern to find variable declarations in scripts
  const declarationPattern = /(?:local\s+)?(\w+)\s*=/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let match;

    // Check assignments
    assignmentPattern.lastIndex = 0;
    while ((match = assignmentPattern.exec(line)) !== null) {
      const varName = match[1];
      const category = getReservedWordCategory(varName);

      if (category) {
        issues.push({
          type: 'reserved-word',
          category,
          line: lineNum + 1,
          column: match.index + 1,
          original: varName,
          suggested: getSafeVariableName(varName),
          description: `'${varName}' is a ${category.replace('-', ' ')} and cannot be used as a variable name`
        });
      }
    }
  }

  return issues;
}

/**
 * Find deprecated patterns in content
 */
export function findDeprecatedPatterns(content: string): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of DEPRECATED_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.pattern.lastIndex = 0;
      let match;

      while ((match = pattern.pattern.exec(line)) !== null) {
        let suggested: string | undefined;

        if (pattern.replacement) {
          // Apply replacement with captured groups
          suggested = pattern.replacement;
          for (let i = 1; i < match.length; i++) {
            suggested = suggested.replace(`$${i}`, match[i] || '');
          }
        }

        issues.push({
          type: 'deprecated-pattern',
          category: pattern.type,
          line: lineNum + 1,
          column: match.index + 1,
          original: match[0],
          suggested,
          description: pattern.description
        });
      }
    }
  }

  return issues;
}

/**
 * Analyze a story for migration issues
 */
export function analyzeStory(story: any): ContentIssue[] {
  const issues: ContentIssue[] = [];

  // Analyze passages
  if (story.passages && Array.isArray(story.passages)) {
    for (const passage of story.passages) {
      if (passage.content) {
        const reservedWordIssues = findReservedWordsInContent(passage.content, passage.title);
        const deprecatedIssues = findDeprecatedPatterns(passage.content);

        // Add passage context to issues
        for (const issue of [...reservedWordIssues, ...deprecatedIssues]) {
          issues.push({
            ...issue,
            description: `[${passage.title || 'Untitled'}] ${issue.description}`
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Apply automatic fixes to content
 */
export function applyAutomaticFixes(content: string, issues: ContentIssue[]): string {
  let fixed = content;

  // Sort issues by position (reverse order to maintain positions)
  const sortedIssues = [...issues]
    .filter(i => i.suggested)
    .sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });

  const lines = fixed.split('\n');

  for (const issue of sortedIssues) {
    if (issue.line <= lines.length && issue.suggested) {
      const line = lines[issue.line - 1];
      const before = line.substring(0, issue.column - 1);
      const after = line.substring(issue.column - 1 + issue.original.length);
      lines[issue.line - 1] = before + issue.suggested + after;
    }
  }

  return lines.join('\n');
}

/**
 * Rename reserved words in a story
 */
export function renameReservedWords(story: any): { story: any; renames: Map<string, string> } {
  const renames = new Map<string, string>();
  const migratedStory = JSON.parse(JSON.stringify(story));

  if (migratedStory.passages && Array.isArray(migratedStory.passages)) {
    for (const passage of migratedStory.passages) {
      if (passage.content) {
        const issues = findReservedWordsInContent(passage.content);

        for (const issue of issues) {
          if (issue.type === 'reserved-word' && issue.suggested) {
            renames.set(issue.original, issue.suggested);
            // Replace all occurrences of the variable name
            const regex = new RegExp(`\\b${issue.original}\\b`, 'g');
            passage.content = passage.content.replace(regex, issue.suggested);
          }
        }
      }
    }
  }

  return { story: migratedStory, renames };
}

/**
 * Generate migration report in text format
 */
export function generateTextReport(report: MigrationReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('WHISKER MIGRATION REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Timestamp: ${report.timestamp}`);
  if (report.inputFile) {
    lines.push(`Input File: ${report.inputFile}`);
  }
  lines.push(`Migration: ${report.fromVersion} → ${report.toVersion}`);
  lines.push(`Status: ${report.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('SUMMARY');
  lines.push('-'.repeat(60));
  lines.push(`Total Issues Found: ${report.summary.totalIssues}`);
  lines.push(`  - Reserved Word Issues: ${report.summary.reservedWordIssues}`);
  lines.push(`  - Deprecated Pattern Issues: ${report.summary.deprecatedPatternIssues}`);
  lines.push(`Passages Analyzed: ${report.summary.passagesAnalyzed}`);
  lines.push(`Passages with Issues: ${report.summary.passagesWithIssues}`);
  lines.push(`Automatic Fixes Applied: ${report.summary.automaticFixes}`);
  lines.push(`Manual Fixes Required: ${report.summary.manualFixesRequired}`);
  lines.push('');

  if (report.changes.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('CHANGES MADE');
    lines.push('-'.repeat(60));
    for (const change of report.changes) {
      lines.push(`  ✓ ${change}`);
    }
    lines.push('');
  }

  if (report.issues.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('ISSUES DETECTED');
    lines.push('-'.repeat(60));
    for (const issue of report.issues) {
      lines.push(`  Line ${issue.line}, Col ${issue.column}:`);
      lines.push(`    Type: ${issue.type} (${issue.category})`);
      lines.push(`    Found: "${issue.original}"`);
      if (issue.suggested) {
        lines.push(`    Suggested: "${issue.suggested}"`);
      }
      lines.push(`    ${issue.description}`);
      lines.push('');
    }
  }

  if (report.errors.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('ERRORS');
    lines.push('-'.repeat(60));
    for (const error of report.errors) {
      lines.push(`  ✗ ${error}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Create a migration report
 */
export function createMigrationReport(
  story: any,
  fromVersion: string,
  toVersion: string,
  changes: string[],
  errors: string[],
  inputFile?: string
): MigrationReport {
  const issues = analyzeStory(story);
  const passagesWithIssues = new Set(
    issues.map(i => i.description.match(/\[([^\]]+)\]/)?.[1]).filter(Boolean)
  ).size;

  const reservedWordIssues = issues.filter(i => i.type === 'reserved-word').length;
  const deprecatedPatternIssues = issues.filter(i => i.type === 'deprecated-pattern').length;
  const automaticFixes = issues.filter(i => i.suggested && i.type === 'reserved-word').length;

  return {
    timestamp: new Date().toISOString(),
    inputFile,
    fromVersion,
    toVersion,
    success: errors.length === 0,
    summary: {
      totalIssues: issues.length,
      reservedWordIssues,
      deprecatedPatternIssues,
      passagesAnalyzed: story.passages?.length || 0,
      passagesWithIssues,
      automaticFixes,
      manualFixesRequired: deprecatedPatternIssues
    },
    changes,
    issues,
    errors
  };
}

/**
 * Migration function
 */
export type MigrationFunction = (story: any) => any;

/**
 * Migration registry
 */
const migrations: Map<string, MigrationFunction> = new Map();

/**
 * Register a migration
 */
export function registerMigration(fromVersion: string, toVersion: string, fn: MigrationFunction): void {
  const key = `${fromVersion}->${toVersion}`;
  migrations.set(key, fn);
}

/**
 * Migrate a story
 */
export async function migrateStory(
  story: any,
  targetVersion: MigrationVersion
): Promise<MigrationResult> {
  const currentVersion = story.version || '1.0.0';
  const changes: string[] = [];
  const errors: string[] = [];

  if (currentVersion === targetVersion) {
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      changes: ['No migration needed - already at target version'],
    };
  }

  let migratedStory = { ...story };

  // Determine migration path
  const path = getMigrationPath(currentVersion, targetVersion);

  if (path.length === 0) {
    return {
      success: false,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      changes: [],
      errors: ['No migration path found'],
    };
  }

  // Execute migrations in order
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const key = `${from}->${to}`;
    const migrationFn = migrations.get(key);

    if (!migrationFn) {
      errors.push(`Missing migration: ${key}`);
      continue;
    }

    try {
      migratedStory = migrationFn(migratedStory);
      changes.push(`Migrated from ${from} to ${to}`);
    } catch (error) {
      errors.push(`Migration ${key} failed: ${error}`);
    }
  }

  return {
    success: errors.length === 0,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    changes,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Get migration path between versions
 */
function getMigrationPath(from: string, to: string): string[] {
  // Simple linear path for now
  const versions = ['1.0.0', '2.0.0', '3.0.0'];
  const fromIndex = versions.indexOf(from);
  const toIndex = versions.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return [];
  }

  if (fromIndex < toIndex) {
    return versions.slice(fromIndex, toIndex + 1);
  } else {
    return versions.slice(toIndex, fromIndex + 1).reverse();
  }
}

/**
 * Detect story version
 */
export function detectVersion(story: any): string {
  if (story.version) {
    return story.version;
  }

  // Detect based on structure
  if (story.metadata?.createdAt) {
    return '2.0.0';
  }

  if (story.passages && Array.isArray(story.passages)) {
    return '1.0.0';
  }

  return '1.0.0';
}

/**
 * Create a backup of a story
 */
export async function createBackup(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

  await fs.copyFile(filePath, backupPath);

  return backupPath;
}

// Register built-in migrations

/**
 * Migration 1.0.0 -> 2.0.0
 * Adds metadata and timestamps
 */
registerMigration('1.0.0', '2.0.0', (story: any) => {
  const now = new Date().toISOString();

  return {
    ...story,
    version: '2.0.0',
    metadata: {
      ...story.metadata,
      createdAt: story.metadata?.createdAt || now,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '1.0.0',
    },
  };
});

/**
 * Migration 2.0.0 -> 3.0.0
 * Adds passage IDs and normalizes structure
 */
registerMigration('2.0.0', '3.0.0', (story: any) => {
  const now = new Date().toISOString();

  // Generate IDs for passages that don't have them
  const passages = story.passages.map((passage: any, index: number) => {
    if (!passage.id) {
      return {
        ...passage,
        id: `passage-${Date.now()}-${index}`,
      };
    }
    return passage;
  });

  return {
    ...story,
    version: '3.0.0',
    passages,
    metadata: {
      ...story.metadata,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '2.0.0',
    },
  };
});

/**
 * Migration 3.0.0 -> 2.0.0 (downgrade)
 */
registerMigration('3.0.0', '2.0.0', (story: any) => {
  const now = new Date().toISOString();

  return {
    ...story,
    version: '2.0.0',
    metadata: {
      ...story.metadata,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '3.0.0',
    },
  };
});

/**
 * Migration 2.0.0 -> 1.0.0 (downgrade)
 */
registerMigration('2.0.0', '1.0.0', (story: any) => {
  const { metadata, ...rest } = story;

  return {
    ...rest,
    version: '1.0.0',
  };
});

/**
 * Validate migrated story
 */
export function validateMigratedStory(story: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate story ID
  if (!story.id) {
    errors.push('Story is missing an ID');
  }

  // Validate story name
  if (!story.name) {
    errors.push('Story is missing a name');
  }

  // Validate passages array
  if (!story.passages || !Array.isArray(story.passages)) {
    errors.push('Story passages must be an array');
  }

  if (Array.isArray(story.passages)) {
    const passages = story.passages;

    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      if (!passage.id) {
        errors.push(`Passage ${i} is missing an ID`);
      }

      if (!passage.title) {
        errors.push(`Passage ${i} is missing a title`);
      }

      if (passage.content === undefined) {
        errors.push(`Passage ${i} is missing content`);
      }
    }

    // Check for duplicate IDs
    const ids = passages.map((p: any) => p.id).filter((id: any) => id);
    const duplicateIds = ids.filter((id: any, index: number) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate passage IDs: ${Array.from(new Set(duplicateIds)).join(', ')}`);
    }

    // Check for duplicate titles
    const titles = passages.map((p: any) => p.title).filter((t: any) => t);
    const duplicateTitles = titles.filter((title: any, index: number) => titles.indexOf(title) !== index);
    if (duplicateTitles.length > 0) {
      errors.push(`Duplicate passage titles: ${Array.from(new Set(duplicateTitles)).join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get migration info
 */
export function getMigrationInfo(fromVersion: string, toVersion: string): {
  path: string[];
  description: string;
} {
  const path = getMigrationPath(fromVersion, toVersion);

  let description = '';

  if (path.length === 0) {
    description = 'No migration path available';
  } else if (path.length === 2) {
    description = `Direct migration from ${fromVersion} to ${toVersion}`;
  } else {
    description = `Migration through ${path.length - 2} intermediate version(s): ${path.slice(1, -1).join(' -> ')}`;
  }

  return { path, description };
}

/**
 * Migrate command
 */
export const migrateCommand: Command = {
  name: 'migrate',
  description: 'Migrate a Whisker story to a different version',
  options: [
    {
      name: 'input',
      alias: 'i',
      description: 'Input story file',
      type: 'string',
      required: true,
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output file (defaults to overwriting input)',
      type: 'string',
    },
    {
      name: 'version',
      alias: 'v',
      description: 'Target version (1.0.0, 2.0.0, 3.0.0)',
      type: 'string',
      required: true,
    },
    {
      name: 'backup',
      alias: 'b',
      description: 'Create backup before migration',
      type: 'boolean',
      default: true,
    },
    {
      name: 'validate',
      description: 'Validate migrated story',
      type: 'boolean',
      default: true,
    },
    {
      name: 'dry-run',
      alias: 'd',
      description: 'Show changes without applying them',
      type: 'boolean',
      default: false,
    },
    {
      name: 'verbose',
      description: 'Show detailed output',
      type: 'boolean',
      default: false,
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Report output format (text, json)',
      type: 'string',
      default: 'text',
    },
    {
      name: 'fix-reserved-words',
      description: 'Automatically rename reserved word variables',
      type: 'boolean',
      default: false,
    },
    {
      name: 'report',
      alias: 'r',
      description: 'Output path for migration report',
      type: 'string',
    },
  ],
  execute: async (context: CommandContext) => {
    const { options, cwd } = context;
    const path = await import('path');
    const fs = await import('fs/promises');

    const inputPath = path.resolve(cwd, options.input);
    const outputPath = options.output ? path.resolve(cwd, options.output) : inputPath;
    const targetVersion = options.version as MigrationVersion;
    const isDryRun = options['dry-run'] === true;
    const isVerbose = options.verbose === true;
    const reportFormat = options.format as string || 'text';
    const fixReservedWords = options['fix-reserved-words'] === true;
    const reportPath = options.report ? path.resolve(cwd, options.report) : undefined;

    console.log('Migrating story...');
    console.log(`  Input: ${inputPath}`);
    console.log(`  Target version: ${targetVersion}`);
    if (isDryRun) {
      console.log('  Mode: DRY RUN (no changes will be written)');
    }
    console.log('');

    // Read story
    const storyContent = await fs.readFile(inputPath, 'utf-8');
    let story = JSON.parse(storyContent);

    // Detect current version
    const currentVersion = detectVersion(story);
    console.log(`  Current version: ${currentVersion}`);

    // Get migration info
    const info = getMigrationInfo(currentVersion, targetVersion);
    console.log(`  ${info.description}`);
    console.log('');

    // Analyze story for issues
    const issues = analyzeStory(story);
    const reservedWordIssues = issues.filter(i => i.type === 'reserved-word');
    const deprecatedPatternIssues = issues.filter(i => i.type === 'deprecated-pattern');

    if (issues.length > 0) {
      console.log(`⚠ Found ${issues.length} issue(s):`);
      console.log(`  - ${reservedWordIssues.length} reserved word issue(s)`);
      console.log(`  - ${deprecatedPatternIssues.length} deprecated pattern(s)`);
      console.log('');

      if (isVerbose) {
        for (const issue of issues) {
          console.log(`  Line ${issue.line}, Col ${issue.column}: ${issue.description}`);
          if (issue.suggested) {
            console.log(`    Suggested: ${issue.suggested}`);
          }
        }
        console.log('');
      }
    }

    // Apply reserved word fixes if requested
    if (fixReservedWords && reservedWordIssues.length > 0) {
      const { story: fixedStory, renames } = renameReservedWords(story);
      story = fixedStory;
      console.log(`✓ Renamed ${renames.size} reserved word variable(s):`);
      for (const [original, renamed] of renames) {
        console.log(`    ${original} → ${renamed}`);
      }
      console.log('');
    }

    // Create backup if requested (not in dry-run mode)
    if (!isDryRun && options.backup !== false && outputPath === inputPath) {
      const backupPath = await createBackup(inputPath);
      console.log(`✓ Backup created: ${backupPath}`);
      console.log('');
    }

    // Perform migration
    const result = await migrateStory(story, targetVersion);

    if (!result.success) {
      console.error('✗ Migration failed:');
      if (result.errors) {
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }
      process.exit(1);
    }

    console.log('Migration steps:');
    for (const change of result.changes) {
      console.log(`  ✓ ${change}`);
    }
    console.log('');

    // Create migration report
    const report = createMigrationReport(
      story,
      currentVersion,
      targetVersion,
      result.changes,
      result.errors || [],
      inputPath
    );

    // Validate if requested
    if (options.validate !== false) {
      const validation = validateMigratedStory(story);
      if (!validation.valid) {
        console.error('✗ Validation failed:');
        for (const error of validation.errors) {
          console.error(`  - ${error}`);
        }
        process.exit(1);
      }
      console.log('✓ Validation passed');
      console.log('');
    }

    // Write report if requested
    if (reportPath) {
      const reportContent = reportFormat === 'json'
        ? JSON.stringify(report, null, 2)
        : generateTextReport(report);
      await fs.writeFile(reportPath, reportContent);
      console.log(`✓ Report saved: ${reportPath}`);
    }

    // Write output (unless dry-run)
    if (!isDryRun) {
      await fs.writeFile(outputPath, JSON.stringify(story, null, 2));
      console.log(`✓ Migration complete: ${outputPath}`);
    } else {
      console.log('ℹ Dry run complete - no changes written');
      if (isVerbose) {
        console.log('');
        console.log('Report:');
        console.log(generateTextReport(report));
      }
    }
  },
};
