#!/usr/bin/env node
/**
 * WLS 1.0 Lint CLI
 * Command-line tool for validating Whisker story files
 * WLS 1.0 Gap 6: Developer Experience
 */

import * as fs from 'fs';
import * as path from 'path';
import { lintFile, type LintResult, type LintOptions, type LintIssue } from './index.js';

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
 * Format issues as text output
 */
function formatIssues(issues: LintIssue[], content: string, useColors: boolean): string {
  const lines = content.split('\n');
  const output: string[] = [];

  for (const issue of issues) {
    const line = issue.line ?? 1;
    const col = issue.column ?? 1;
    const severity = issue.severity.toUpperCase();
    const code = issue.code ? `[${issue.code}] ` : '';

    // Color codes
    const red = useColors ? '\x1b[31m' : '';
    const yellow = useColors ? '\x1b[33m' : '';
    const cyan = useColors ? '\x1b[36m' : '';
    const reset = useColors ? '\x1b[0m' : '';

    const color = issue.severity === 'error' ? red : issue.severity === 'warning' ? yellow : cyan;

    output.push(`  ${color}${severity}${reset} ${code}${issue.message}`);
    output.push(`    at line ${line}, column ${col}`);

    // Show the source line if available
    if (line > 0 && line <= lines.length) {
      output.push(`    ${lines[line - 1]}`);
      output.push(`    ${' '.repeat(col - 1)}^`);
    }

    if (issue.suggestion) {
      output.push(`    Suggestion: ${issue.suggestion}`);
    }

    output.push('');
  }

  return output.join('\n');
}

/**
 * Format summary line
 */
function formatSummary(issues: LintIssue[], useColors: boolean): string {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;

  const red = useColors ? '\x1b[31m' : '';
  const yellow = useColors ? '\x1b[33m' : '';
  const cyan = useColors ? '\x1b[36m' : '';
  const green = useColors ? '\x1b[32m' : '';
  const reset = useColors ? '\x1b[0m' : '';

  if (errors === 0 && warnings === 0 && info === 0) {
    return `${green}No issues found.${reset}`;
  }

  const parts: string[] = [];
  if (errors > 0) parts.push(`${red}${errors} error${errors !== 1 ? 's' : ''}${reset}`);
  if (warnings > 0) parts.push(`${yellow}${warnings} warning${warnings !== 1 ? 's' : ''}${reset}`);
  if (info > 0) parts.push(`${cyan}${info} info${reset}`);

  return `Found ${parts.join(', ')}.`;
}

/**
 * Format issues as SARIF
 */
function formatAsSarif(issues: LintIssue[], filePath: string): object {
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'whisker-lint',
            version: '1.0.0',
            informationUri: 'https://writewhisker.io',
            rules: [],
          },
        },
        results: issues.map((issue, index) => ({
          ruleId: issue.code || `issue-${index}`,
          level: issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'note',
          message: {
            text: issue.message,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: filePath,
                },
                region: {
                  startLine: issue.line ?? 1,
                  startColumn: issue.column ?? 1,
                },
              },
            },
          ],
        })),
      },
    ],
  };
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
    const sarif = formatAsSarif(allIssues, firstFile);
    console.log(JSON.stringify(sarif, null, 2));
  } else {
    // Text output
    for (const result of allResults) {
      if (!args.quiet || result.errorCount > 0) {
        console.log(`\n${result.file}:`);
        if (result.issues.length > 0) {
          console.log(formatIssues(result.issues, result.content, args.colors));
        } else {
          console.log('  No issues found.');
        }
      }
    }

    // Summary
    if (!args.quiet) {
      const totalIssues = allResults.flatMap(r => r.issues);
      console.log('\n' + formatSummary(totalIssues, args.colors));
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
