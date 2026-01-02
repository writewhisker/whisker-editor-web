/**
 * WLS 1.x to 2.0 Migration Tool
 *
 * Automatically migrates WLS 1.x stories to 2.0 format, handling:
 * - Reserved word conflicts (thread, await, spawn, sync, channel)
 * - LIST syntax changes
 * - Syntax pattern detection that may need manual review
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MigrationResult {
  content: string;
  changes: MigrationChange[];
  warnings: MigrationWarning[];
  version: '2.0';
}

export interface MigrationChange {
  type: 'reserved_word' | 'syntax' | 'directive' | 'operator';
  line: number;
  column: number;
  original: string;
  replacement: string;
  reason: string;
}

export interface MigrationWarning {
  type: 'manual_review' | 'potential_conflict' | 'deprecated';
  line: number;
  message: string;
  suggestion?: string;
}

// Reserved words in WLS 2.0 that may conflict with 1.x variable names
const RESERVED_WORDS_2_0 = [
  'thread',
  'await',
  'spawn',
  'sync',
  'channel',
  'LIST',
  'EXTERNAL',
];

// Patterns that might need manual review
const REVIEW_PATTERNS = [
  {
    pattern: /->->/g,
    message: 'Story uses tunnels - review for thread interaction compatibility',
    type: 'manual_review' as const,
  },
  {
    pattern: /@delay\s/g,
    message: '@delay syntax changed in 2.0 - verify format',
    type: 'manual_review' as const,
  },
  {
    pattern: /\{do\s+\$thread\b/g,
    message: '$thread is a reserved variable in 2.0',
    type: 'potential_conflict' as const,
  },
];

export interface MigrateOptions {
  preserveComments?: boolean;
  addVersionDirective?: boolean;
}

/**
 * Migrate WLS 1.x source to 2.0
 */
export function migrate(
  source: string,
  _options: MigrateOptions = {}
): MigrationResult {
  const changes: MigrationChange[] = [];
  const warnings: MigrationWarning[] = [];
  let content = source;

  // Add version directive if not present
  if (!content.includes('@version:')) {
    content = '@version: 2.0\n' + content;
    changes.push({
      type: 'directive',
      line: 1,
      column: 0,
      original: '',
      replacement: '@version: 2.0',
      reason: 'Added WLS 2.0 version directive',
    });
  }

  // Check for reserved words used as variable names
  for (const word of RESERVED_WORDS_2_0) {
    const varRegex = new RegExp('\\$' + word + '\\b', 'gi');
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const lineInfo = getLineInfo(content, match.index);
      const original = match[0];
      const replacement = '$_migrated_' + word;

      changes.push({
        type: 'reserved_word',
        line: lineInfo.line,
        column: lineInfo.column,
        original,
        replacement,
        reason: "'" + word + "' is a reserved keyword in WLS 2.0",
      });
    }

    // Apply the replacement
    content = content.replace(varRegex, '$_migrated_' + word);
  }

  // Check for patterns needing manual review
  for (const { pattern, message, type } of REVIEW_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(source)) !== null) {
      const lineInfo = getLineInfo(source, match.index);
      warnings.push({
        type,
        line: lineInfo.line,
        message,
      });
    }
  }

  // Check for LIST usage that might need updating
  if (content.includes('LIST ') || content.match(/\bLIST\s+\w+\s*=/)) {
    warnings.push({
      type: 'manual_review',
      line: 0,
      message: 'Story uses LIST - verify state machine operator compatibility',
      suggestion: 'Review += and -= operators for state transitions',
    });
  }

  return {
    content,
    changes,
    warnings,
    version: '2.0',
  };
}

/**
 * Get line and column info from character index
 */
function getLineInfo(
  content: string,
  index: number
): { line: number; column: number } {
  const before = content.substring(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Format migration report for console output
 */
export function formatReport(result: MigrationResult): string {
  const lines: string[] = [];

  lines.push('WLS 1.x to 2.0 Migration Report');
  lines.push('================================');
  lines.push('');
  lines.push('Changes: ' + result.changes.length);
  lines.push('Warnings: ' + result.warnings.length);
  lines.push('');

  if (result.changes.length > 0) {
    lines.push('Changes Applied:');
    for (const change of result.changes) {
      lines.push(
        '  Line ' +
          change.line +
          ': ' +
          (change.original || '(none)') +
          ' -> ' +
          change.replacement
      );
      lines.push('    Reason: ' + change.reason);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings (Manual Review Needed):');
    for (const warning of result.warnings) {
      lines.push('  Line ' + warning.line + ': ' + warning.message);
      if (warning.suggestion) {
        lines.push('    Suggestion: ' + warning.suggestion);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Migrate a file
 */
export function migrateFile(
  inputPath: string,
  outputPath?: string
): MigrationResult {
  const source = fs.readFileSync(inputPath, 'utf-8');
  const result = migrate(source);

  const output = outputPath || inputPath.replace(/\.ws$/, '.2x.ws');
  fs.writeFileSync(output, result.content, 'utf-8');

  return result;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(
      '\nWLS 1.x to 2.0 Migration Tool\n\n' +
        'Usage:\n' +
        '  npx tsx tools/migrate-1x-to-2x.ts <input.ws> [output.ws]\n' +
        '  npx tsx tools/migrate-1x-to-2x.ts --batch <directory>\n\n' +
        'Options:\n' +
        '  --help, -h     Show this help message\n' +
        '  --batch        Migrate all .ws files in directory\n' +
        '  --dry-run      Show changes without writing files\n' +
        '  --verbose, -v  Show detailed output\n\n' +
        'Examples:\n' +
        '  npx tsx tools/migrate-1x-to-2x.ts story.ws\n' +
        '  npx tsx tools/migrate-1x-to-2x.ts story.ws story-v2.ws\n' +
        '  npx tsx tools/migrate-1x-to-2x.ts --batch ./stories\n'
    );
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const batchMode = args.includes('--batch');

  // Remove flags from args
  const filteredArgs = args.filter(
    (a) => !a.startsWith('--') && !a.startsWith('-')
  );

  if (batchMode) {
    const directory = filteredArgs[0] || '.';
    const files = fs
      .readdirSync(directory)
      .filter((f) => f.endsWith('.ws') && !f.endsWith('.2x.ws'));

    console.log('Migrating ' + files.length + ' files in ' + directory + '...');

    for (const file of files) {
      const inputPath = path.join(directory, file);
      const source = fs.readFileSync(inputPath, 'utf-8');
      const result = migrate(source);

      console.log('\n' + file + ':');
      console.log('  Changes: ' + result.changes.length);
      console.log('  Warnings: ' + result.warnings.length);

      if (!dryRun) {
        const outputPath = inputPath.replace(/\.ws$/, '.2x.ws');
        fs.writeFileSync(outputPath, result.content, 'utf-8');
        console.log('  Written to: ' + outputPath);
      }
    }
  } else {
    const [inputFile, outputFile] = filteredArgs;

    if (!inputFile) {
      console.error('Error: No input file specified');
      process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
      console.error('Error: File not found: ' + inputFile);
      process.exit(1);
    }

    const source = fs.readFileSync(inputFile, 'utf-8');
    const result = migrate(source);

    if (verbose) {
      console.log(formatReport(result));
    } else {
      console.log('Migration complete:');
      console.log('  Changes: ' + result.changes.length);
      console.log('  Warnings: ' + result.warnings.length);

      for (const change of result.changes) {
        console.log(
          '  - ' +
            (change.original || '(added)') +
            ' -> ' +
            change.replacement +
            ': ' +
            change.reason
        );
      }

      for (const warning of result.warnings) {
        console.log('  ! ' + warning.message);
      }
    }

    if (!dryRun) {
      const output = outputFile || inputFile.replace(/\.ws$/, '.2x.ws');
      fs.writeFileSync(output, result.content, 'utf-8');
      console.log('Written to: ' + output);
    }
  }
}
