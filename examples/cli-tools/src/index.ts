#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Story } from '@writewhisker/core-ts';
import { HTMLExporter, JSONExporter } from '@writewhisker/export';

program
  .name('whisker')
  .description('CLI tools for Whisker interactive fiction')
  .version('1.0.0');

// Validate command
program
  .command('validate <file>')
  .description('Validate a Whisker story file')
  .action(async (file: string) => {
    try {
      console.log(`Validating ${file}...`);

      const data = JSON.parse(readFileSync(resolve(file), 'utf-8'));
      const story = Story.deserialize(data);

      const passages = story.getPassages();
      const startPassages = passages.filter((p) =>
        p.tags?.includes('start')
      );

      console.log('✓ Story loaded successfully');
      console.log(`  Title: ${story.metadata.title || 'Untitled'}`);
      console.log(`  Passages: ${passages.length}`);
      console.log(`  Start passages: ${startPassages.length}`);

      if (startPassages.length === 0) {
        console.warn('⚠ Warning: No start passage found');
      }

      console.log('✓ Validation complete');
    } catch (err) {
      console.error('✗ Validation failed:', (err as Error).message);
      process.exit(1);
    }
  });

// Export command
program
  .command('export <file>')
  .description('Export story to various formats')
  .option('-f, --format <format>', 'Export format (html|json)', 'html')
  .option('-o, --output <file>', 'Output file')
  .action(async (file: string, options: any) => {
    try {
      console.log(`Exporting ${file} to ${options.format}...`);

      const data = JSON.parse(readFileSync(resolve(file), 'utf-8'));
      const story = Story.deserialize(data);

      let output: string;
      let defaultExt: string;

      if (options.format === 'html') {
        const exporter = new HTMLExporter();
        output = await exporter.export(story);
        defaultExt = '.html';
      } else {
        const exporter = new JSONExporter();
        output = await exporter.export(story);
        defaultExt = '.json';
      }

      const outputFile =
        options.output ||
        file.replace(/\.[^.]+$/, '') + `.exported${defaultExt}`;
      writeFileSync(resolve(outputFile), output);

      console.log(`✓ Exported to ${outputFile}`);
    } catch (err) {
      console.error('✗ Export failed:', (err as Error).message);
      process.exit(1);
    }
  });

// Info command
program
  .command('info <file>')
  .description('Display story information')
  .action(async (file: string) => {
    try {
      const data = JSON.parse(readFileSync(resolve(file), 'utf-8'));
      const story = Story.deserialize(data);
      const passages = story.getPassages();

      console.log('\n=== Story Information ===\n');
      console.log(`Title:       ${story.metadata.title || 'Untitled'}`);
      console.log(`Author:      ${story.metadata.author || 'Unknown'}`);
      console.log(`Description: ${story.metadata.description || 'None'}`);
      console.log(`Passages:    ${passages.length}`);
      console.log(`ID:          ${story.id}`);
      console.log('\n=== Passages ===\n');

      passages.forEach((p) => {
        console.log(`  • ${p.name}`);
        if (p.tags && p.tags.length > 0) {
          console.log(`    Tags: ${p.tags.join(', ')}`);
        }
      });
    } catch (err) {
      console.error('✗ Failed to read story:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
