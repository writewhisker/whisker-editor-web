#!/usr/bin/env node
/**
 * WLS 1.0 Lint CLI
 * Command-line tool for validating Whisker story files
 * WLS 1.0 Gap 6: Developer Experience
 */

import * as fs from 'fs';
import * as path from 'path';
import { lintFile, lintContent, type LintResult, type LintOptions } from './index.js';
import { formatErrors, formatErrorsAsSarif, formatSummary } from '@writewhisker/story-validation';

/**
 * CLI argument parsing
 */
interface CLIArgs {
  files: string[];
  format: 'text' | 'json' | 'sarif';
  rules: string[];
  severity: 'all' | 'errors' | 'warnings';
  colors: boolean;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    files: [],
    format: 'text',
    rules: ['all'],
    severity: 'all',
    colors: process.stdout.isTTY ?? false,
    quiet: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--format' || arg === '-f') {
      result.format = (args[++i] as CLIArgs['format']) || 'text';
    } else if (arg === '--rules' || arg === '-r') {
      result.rules = (args[++i] || 'all').split(',');
    } else if (arg === '--severity' || arg === '-s') {
      result.severity = (args[++i] as CLIArgs['severity']) || 'all';
    } else if (arg === '--no-color') {
      result.colors = false;
    } else if (arg === '--color') {
      result.colors = true;
    } else if (arg === '--quiet' || arg === '-q') {
      result.quiet = true;
    } else if (!arg.startsWith('-')) {
      result.files.push(arg);
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
whisker-lint - WLS 1.0 Story Linter

Usage:
  whisker-lint [options] <files...>

Options:
  -h, --help          Show this help message
  -v, --version       Show version number
  -f, --format <fmt>  Output format: text (default), json, sarif
  -r, --rules <list>  Comma-separated list of rules: all, errors, warnings
  -s, --severity <s>  Filter by severity: all (default), errors, warnings
  --color             Force color output
  --no-color          Disable color output
  -q, --quiet         Only output errors

Examples:
  whisker-lint story.ws
  whisker-lint --format=json story.ws
  whisker-lint --rules=errors,warnings *.ws
  whisker-lint --format=sarif --no-color story.ws > report.sarif

Exit Codes:
  0  No errors found
  1  Errors found
  2  Invalid arguments or file not found
`);
}

/**
 * Show version
 */
function showVersion(): void {
  console.log('whisker-lint v1.0.0');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  if (args.files.length === 0) {
    console.error('Error: No files specified');
    showHelp();
    process.exit(2);
  }

  // Resolve file paths
  const files: string[] = [];
  for (const pattern of args.files) {
    if (pattern.includes('*')) {
      // Simple glob expansion (in real implementation, use a glob library)
      const dir = path.dirname(pattern);
      const ext = path.extname(pattern);
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry.endsWith(ext)) {
            files.push(path.join(dir, entry));
          }
        }
      }
    } else {
      files.push(pattern);
    }
  }

  // Lint options
  const options: LintOptions = {
    useColors: args.colors,
    includeInfo: args.severity === 'all',
    includeWarnings: args.severity !== 'errors',
  };

  // Collect results
  let hasErrors = false;
  const allResults: LintResult[] = [];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(2);
    }

    const result = await lintFile(file, options);
    allResults.push(result);

    if (result.errorCount > 0) {
      hasErrors = true;
    }
  }

  // Output results
  if (args.format === 'json') {
    console.log(JSON.stringify(allResults, null, 2));
  } else if (args.format === 'sarif') {
    // Combine all issues for SARIF output
    const allIssues = allResults.flatMap(r => r.issues);
    const firstFile = files[0] || 'story.ws';
    const sarif = formatErrorsAsSarif(allIssues, '', firstFile);
    console.log(JSON.stringify(sarif, null, 2));
  } else {
    // Text output
    for (const result of allResults) {
      if (!args.quiet || result.errorCount > 0) {
        console.log(`\n${result.file}:`);
        if (result.issues.length > 0) {
          console.log(formatErrors(result.issues, result.content, { useColors: args.colors }));
        } else {
          console.log('  No issues found.');
        }
      }
    }

    // Summary
    if (!args.quiet) {
      const totalIssues = allResults.flatMap(r => r.issues);
      console.log('\n' + formatSummary(totalIssues, { useColors: args.colors }));
    }
  }

  // Exit with appropriate code
  process.exit(hasErrors ? 1 : 0);
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(2);
});
