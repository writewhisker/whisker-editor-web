#!/usr/bin/env node

/**
 * Whisker Story Validation CLI
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { createDefaultValidator } from '@writewhisker/core-ts';
import type { StoryData } from '@writewhisker/core-ts';
import { createReporter, type ReporterFormat } from './reporters/index.js';

const program = new Command();

program
  .name('whisker-validate')
  .description('Validate Whisker interactive fiction stories')
  .version('1.0.0');

program
  .argument('<files...>', 'Story files to validate (supports glob patterns)')
  .option('-f, --format <format>', 'Output format: console, json, junit, html', 'console')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--no-color', 'Disable colored output')
  .action(async (files: string[], options) => {
    try {
      // Expand glob patterns
      const expandedFiles: string[] = [];
      for (const pattern of files) {
        const matches = await glob(pattern, { nodir: true });
        expandedFiles.push(...matches);
      }

      if (expandedFiles.length === 0) {
        console.error('No files found matching the provided patterns');
        process.exit(1);
      }

      // Validate format
      const format = options.format as ReporterFormat;
      if (!['console', 'json', 'junit', 'html'].includes(format)) {
        console.error(`Invalid format: ${format}`);
        console.error('Supported formats: console, json, junit, html');
        process.exit(1);
      }

      // Process files
      const validator = createDefaultValidator();
      let totalErrors = 0;
      let totalWarnings = 0;
      let totalInfo = 0;

      for (const file of expandedFiles) {
        try {
          const content = await readFile(file, 'utf-8');
          const story: StoryData = JSON.parse(content);

          // Validate
          const result = validator.validate(story);

          // Create reporter
          const reporter = createReporter(format);
          const output = reporter.format(result);

          // Output
          if (options.output) {
            await writeFile(options.output, output, 'utf-8');
            console.log(`Report written to ${options.output}`);
          } else {
            console.log(output);
          }

          // Track totals
          totalErrors += result.issues.filter(i => i.severity === 'error').length;
          totalWarnings += result.issues.filter(i => i.severity === 'warning').length;
          totalInfo += result.issues.filter(i => i.severity === 'info').length;

          // Exit with error if validation failed
          if (!result.valid) {
            process.exit(1);
          }
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
          process.exit(1);
        }
      }

      // Success
      if (expandedFiles.length > 1) {
        console.log(`\nValidated ${expandedFiles.length} files`);
        console.log(`Total: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info`);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();
