/**
 * Text Exporter
 *
 * Exports stories to plain text format (.txt files).
 * Creates a simple, readable document of the story for print or offline reading.
 *
 * Features:
 * - Clean, readable formatting
 * - Clear passage separation
 * - Numbered choices
 * - Optional variable listing
 * - No special markup or syntax
 */

import type { Story, Variable } from '@writewhisker/core-ts';
import type { Passage } from '@writewhisker/core-ts';
import type { Choice } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * Text Exporter
 *
 * Creates a plain text document from a Whisker story.
 */
export class TextExporter implements IExporter {
  readonly name = 'Text Exporter';
  readonly format = 'text' as const;
  readonly extension = '.txt';
  readonly mimeType = 'text/plain';

  /**
   * Export a story to plain text format
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const sections: string[] = [];

      // Title and metadata
      sections.push(this.generateHeader(context));

      // Story structure summary
      sections.push(this.generateStructureSection(context.story));

      // Variables section
      if (context.story.variables.size > 0) {
        sections.push(this.generateVariablesSection(context.story));
      }

      // All passages
      sections.push(this.generatePassagesSection(context.story, warnings));

      const content = sections.join('\n\n' + '='.repeat(60) + '\n\n');

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.txt`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content,
        filename,
        mimeType: this.mimeType,
        size,
        duration,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate header section
   */
  private generateHeader(context: ExportContext): string {
    const { story } = context;
    const { metadata } = story;

    const lines: string[] = [];

    // Title as heading
    const title = metadata.title || 'Untitled Story';
    lines.push(title.toUpperCase());
    lines.push('='.repeat(title.length));
    lines.push('');

    if (metadata.author) {
      lines.push(`Author: ${metadata.author}`);
    }

    if (metadata.version) {
      lines.push(`Version: ${metadata.version}`);
    }

    if (metadata.description) {
      lines.push('');
      lines.push(metadata.description);
    }

    lines.push('');
    lines.push(`Exported: ${new Date().toLocaleDateString()}`);

    return lines.join('\n');
  }

  /**
   * Generate story structure section
   */
  private generateStructureSection(story: Story): string {
    const passages = Array.from(story.passages.values() as Iterable<Passage>);
    const totalPassages = passages.length;
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const totalVariables = story.variables.size;

    const startPassage = story.startPassage
      ? story.getPassage(story.startPassage)
      : null;

    const lines: string[] = [
      'STORY STRUCTURE',
      '-'.repeat(16),
      '',
      `Total Passages: ${totalPassages}`,
      `Total Choices: ${totalChoices}`,
      `Total Variables: ${totalVariables}`,
      `Start Passage: ${startPassage?.title || 'Not set'}`,
    ];

    return lines.join('\n');
  }

  /**
   * Generate variables section
   */
  private generateVariablesSection(story: Story): string {
    const variables = Array.from(story.variables.values()) as Variable[];

    const lines: string[] = [
      'VARIABLES',
      '-'.repeat(9),
      '',
    ];

    for (const v of variables) {
      const value = this.formatValue(v.initial);
      lines.push(`  ${v.name} = ${value} (${v.type})`);
    }

    return lines.join('\n');
  }

  /**
   * Generate all passages section
   */
  private generatePassagesSection(story: Story, warnings: string[]): string {
    const passages = Array.from(story.passages.values() as Iterable<Passage>);

    // Sort passages: start first, then alphabetically
    const sortedPassages = passages.sort((a, b) => {
      if (a.id === story.startPassage) return -1;
      if (b.id === story.startPassage) return 1;
      return a.title.localeCompare(b.title);
    });

    const lines: string[] = [
      'PASSAGES',
      '-'.repeat(8),
    ];

    for (const passage of sortedPassages) {
      lines.push('');
      lines.push(this.generatePassageSection(passage, story, warnings));
    }

    return lines.join('\n');
  }

  /**
   * Generate a single passage section
   */
  private generatePassageSection(passage: Passage, story: Story, warnings: string[]): string {
    const isStart = passage.id === story.startPassage;
    const lines: string[] = [];

    // Passage header
    const header = isStart ? `[${passage.title}] (START)` : `[${passage.title}]`;
    lines.push(header);
    lines.push('-'.repeat(header.length));

    // Tags
    if (passage.tags.length > 0) {
      lines.push(`Tags: ${passage.tags.join(', ')}`);
      lines.push('');
    }

    // Content
    if (passage.content) {
      // Strip any special markup for plain text
      const plainContent = this.stripMarkup(passage.content);
      lines.push(plainContent);
    }

    // Choices
    if (passage.choices.length > 0) {
      lines.push('');
      lines.push('Choices:');
      passage.choices.forEach((choice, index) => {
        lines.push(this.generateChoiceLine(choice, index + 1, story, warnings));
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate a choice line
   */
  private generateChoiceLine(
    choice: Choice,
    index: number,
    story: Story,
    warnings: string[]
  ): string {
    const target = choice.target ? story.getPassage(choice.target) : null;
    const targetName = target ? target.title : choice.target || '(no target)';

    let line = `  ${index}. ${choice.text}`;
    line += ` -> [${targetName}]`;

    if (choice.condition) {
      line += ` (if: ${choice.condition})`;
      warnings.push(`Choice "${choice.text}" has condition that may not render in text`);
    }

    return line;
  }

  /**
   * Strip markup from content
   */
  private stripMarkup(content: string): string {
    let result = content;

    // Remove variable references ${var} and $var
    result = result.replace(/\$\{(\w+)\}/g, '[$1]');
    result = result.replace(/\$(\w+)/g, '[$1]');

    // Remove conditionals {if ...}
    result = result.replace(/\{if\s+[^}]+\}/g, '');

    // Remove other braces markup
    result = result.replace(/\{[^}]+\}/g, '');

    // Clean up multiple newlines
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
  }

  /**
   * Format a value for display
   */
  private formatValue(value: string | number | boolean | undefined): string {
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'text') {
      errors.push('Invalid format for Text exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Estimate: roughly 200 bytes per passage + header
    const passages = Array.from(story.passages.values());
    const variables = story.variables.size;
    return 500 + (passages.length * 200) + (variables * 30);
  }
}
