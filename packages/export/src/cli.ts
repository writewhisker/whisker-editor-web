#!/usr/bin/env node
/**
 * Whisker Export CLI
 * Export Whisker stories to multiple formats
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { StoryData } from '@writewhisker/core-ts';
import { StandaloneExporter } from './exporters/html/StandaloneExporter.js';
import { TemplateExporter } from './exporters/html/TemplateExporter.js';
import { MarkdownExporter } from './exporters/markdown/MarkdownExporter.js';
import { TwineExporter } from './exporters/json/TwineExporter.js';

const program = new Command();

program
  .name('whisker-export')
  .description('Export Whisker stories to multiple formats')
  .version('1.0.0');

program
  .command('export')
  .description('Export a story to a specific format')
  .argument('<input>', 'Input story file (JSON)')
  .option('-f, --format <format>', 'Export format: html-standalone, html-template, markdown, twine', 'html-standalone')
  .option('-o, --output <file>', 'Output file path')
  .option('-t, --theme <theme>', 'Theme for template export: default, dark, minimal, classic', 'default')
  .option('--minify', 'Minify output (HTML only)', false)
  .option('--no-metadata', 'Exclude metadata from export')
  .option('--css <file>', 'Custom CSS file (template export only)')
  .option('--twine-format <format>', 'Twine story format: harlowe, sugarcube, snowman, chapbook', 'harlowe')
  .action(async (input, options) => {
    try {
      // Read input file
      const inputPath = resolve(input);
      const storyJson = await readFile(inputPath, 'utf-8');
      const story: StoryData = JSON.parse(storyJson);

      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const ext = getExtension(options.format);
        outputPath = inputPath.replace(/\.json$/, ext);
      }
      outputPath = resolve(outputPath);

      // Prepare export options
      const exportOptions = {
        minify: options.minify,
        includeMetadata: options.metadata !== false,
        customCSS: options.css ? await readFile(resolve(options.css), 'utf-8') : undefined
      };

      // Export based on format
      let output: string;

      switch (options.format) {
        case 'html-standalone':
          const standaloneExporter = new StandaloneExporter();
          output = await standaloneExporter.export(story, exportOptions);
          break;

        case 'html-template':
          const templateExporter = new TemplateExporter();
          output = await templateExporter.export(story, {
            ...exportOptions,
            theme: options.theme
          });
          break;

        case 'markdown':
          const markdownExporter = new MarkdownExporter();
          output = await markdownExporter.export(story, exportOptions);
          break;

        case 'twine':
          const twineExporter = new TwineExporter();
          output = await twineExporter.export(story, {
            ...exportOptions,
            storyFormat: options.twineFormat
          });
          break;

        default:
          throw new Error(`Unknown format: ${options.format}`);
      }

      // Write output file
      await writeFile(outputPath, output, 'utf-8');

      console.log(`✓ Exported to ${outputPath}`);
      console.log(`  Format: ${options.format}`);
      console.log(`  Size: ${(output.length / 1024).toFixed(2)} KB`);

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('list-formats')
  .description('List available export formats')
  .action(() => {
    console.log('Available export formats:');
    console.log('  html-standalone  - Self-contained HTML with embedded player');
    console.log('  html-template    - Customizable HTML with themes');
    console.log('  markdown         - Markdown documentation format');
    console.log('  twine            - Twine 2 JSON format');
    console.log('');
    console.log('Available themes (for html-template):');
    console.log('  default          - Clean, modern theme');
    console.log('  dark             - Dark mode theme');
    console.log('  minimal          - Minimalist theme');
    console.log('  classic          - Classic book-style theme');
    console.log('');
    console.log('Available Twine formats:');
    console.log('  harlowe          - Twine 2 Harlowe format (default)');
    console.log('  sugarcube        - SugarCube format');
    console.log('  snowman          - Snowman format');
    console.log('  chapbook         - Chapbook format');
  });

function getExtension(format: string): string {
  switch (format) {
    case 'html-standalone':
    case 'html-template':
      return '.html';
    case 'markdown':
      return '.md';
    case 'twine':
      return '.json';
    default:
      return '.txt';
  }
}

program.parse();
