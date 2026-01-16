#!/usr/bin/env node
/**
 * whisker-fmt - WLS Story Formatter
 *
 * Formats WLS source files per WLS Chapter 14.4.2.
 * Provides consistent formatting for Whisker story files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '@writewhisker/parser';

/**
 * CLI argument parsing
 */
interface FmtArgs {
  files: string[];
  write: boolean;
  check: boolean;
  indent: number;
  lineLength: number;
  help: boolean;
  version: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): FmtArgs {
  const result: FmtArgs = {
    files: [],
    write: false,
    check: false,
    indent: 2,
    lineLength: 80,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--write' || arg === '-w') {
      result.write = true;
    } else if (arg === '--check' || arg === '-c') {
      result.check = true;
    } else if (arg === '--indent') {
      result.indent = parseInt(args[++i] || '2', 10);
    } else if (arg.startsWith('--indent=')) {
      result.indent = parseInt(arg.slice(9), 10);
    } else if (arg === '--line-length') {
      result.lineLength = parseInt(args[++i] || '80', 10);
    } else if (arg.startsWith('--line-length=')) {
      result.lineLength = parseInt(arg.slice(14), 10);
    } else if (!arg.startsWith('-')) {
      result.files.push(arg);
    }
  }

  return result;
}

/**
 * Formatting options
 */
interface FormatOptions {
  indent: number;
  lineLength: number;
}

/**
 * Format a WLS source string
 */
function formatSource(source: string, options: FormatOptions): string {
  const lines = source.split('\n');
  const formatted: string[] = [];
  const indent = ' '.repeat(options.indent);

  let inPassage = false;
  let lastWasBlank = false;
  let lastWasPassage = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Trim trailing whitespace
    line = line.trimEnd();

    // Detect passage markers
    const isPassageMarker = line.trimStart().startsWith('::');
    const isChoiceMarker = /^\s*[+*]\s/.test(line);
    const isGatherMarker = /^\s*-\s/.test(line);
    const isConditional = line.trimStart().startsWith('{');
    const isClosingConditional = line.trimStart() === '{/}';
    const isBlank = line.trim() === '';

    // Add blank line before passages (except first)
    if (isPassageMarker && formatted.length > 0 && !lastWasBlank) {
      formatted.push('');
    }

    // Format passage markers
    if (isPassageMarker) {
      // Normalize passage marker spacing: :: Name [tags]
      const match = line.match(/^\s*::\s*(\S+)(?:\s+(.*))?$/);
      if (match) {
        const name = match[1];
        const rest = match[2] || '';
        line = `:: ${name}${rest ? ' ' + rest.trim() : ''}`;
      }
      inPassage = true;
      lastWasPassage = true;
    }

    // Format choice markers - ensure consistent indentation
    if (isChoiceMarker && inPassage) {
      const match = line.match(/^(\s*)[+*]\s*(.*)$/);
      if (match) {
        const marker = line.trimStart()[0];
        const content = match[2].trim();
        line = `${marker} ${content}`;
      }
    }

    // Format gather markers
    if (isGatherMarker && inPassage) {
      const match = line.match(/^(\s*)-\s*(.*)$/);
      if (match) {
        const content = match[2].trim();
        line = `- ${content}`;
      }
    }

    // Skip multiple consecutive blank lines
    if (isBlank) {
      if (!lastWasBlank && !lastWasPassage) {
        formatted.push('');
      }
      lastWasBlank = true;
      lastWasPassage = false;
      continue;
    }

    formatted.push(line);
    lastWasBlank = false;
    lastWasPassage = isPassageMarker;
  }

  // Remove trailing blank lines
  while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
    formatted.pop();
  }

  // Ensure single trailing newline
  return formatted.join('\n') + '\n';
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
whisker-fmt - WLS Story Formatter (WLS Chapter 14.4)

Usage:
  whisker-fmt [options] <files...>

Options:
  -h, --help            Show this help message
  -v, --version         Show version number
  -w, --write           Write formatted output back to file
  -c, --check           Check if files are formatted (no changes)
  --indent=<n>          Indentation width (default: 2)
  --line-length=<n>     Maximum line length (default: 80)

Formatting Rules:
  - Consistent indentation (2 spaces default)
  - Blank line between passages
  - Aligned choice markers
  - Normalized whitespace
  - Single trailing newline

Examples:
  whisker-fmt story.ws                    # Output to stdout
  whisker-fmt --write story.ws            # Format in place
  whisker-fmt --check story.ws            # Check formatting
  whisker-fmt --indent=4 story.ws         # Custom indentation

Exit Codes:
  0  Files are formatted (or formatting succeeded)
  1  Files need formatting (--check mode)
  2  Invalid arguments or file not found
`);
}

/**
 * Show version
 */
function showVersion(): void {
  console.log('whisker-fmt v1.0.0');
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

  const options: FormatOptions = {
    indent: args.indent,
    lineLength: args.lineLength,
  };

  let hasChanges = false;

  for (const file of args.files) {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(2);
    }

    const original = fs.readFileSync(file, 'utf-8');
    const formatted = formatSource(original, options);

    if (args.check) {
      // Check mode - report if file needs formatting
      if (original !== formatted) {
        console.log(`${file}: needs formatting`);
        hasChanges = true;
      }
    } else if (args.write) {
      // Write mode - format in place
      if (original !== formatted) {
        fs.writeFileSync(file, formatted, 'utf-8');
        console.log(`Formatted: ${file}`);
        hasChanges = true;
      } else {
        console.log(`Unchanged: ${file}`);
      }
    } else {
      // Default - output to stdout
      process.stdout.write(formatted);
    }
  }

  // Exit code for check mode
  if (args.check && hasChanges) {
    process.exit(1);
  }

  process.exit(0);
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(2);
});

// Export for programmatic use
export { formatSource, FormatOptions };
