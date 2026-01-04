/**
 * WLS Exporter
 *
 * Exports stories to WLS (Whisker Language Specification) 1.0 text format.
 */

import type { Story, Passage, Variable } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * WLS Exporter
 *
 * Exports stories to WLS 1.0 text format (.ws files).
 */
export class WLSExporter implements IExporter {
  readonly name = 'WLS Exporter';
  readonly format = 'wls' as const;
  readonly extension = '.ws';
  readonly mimeType = 'text/plain';

  /**
   * Export a story to WLS format
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const { story, options } = context;
      const lines: string[] = [];

      // Add story header directives
      this.addStoryHeader(lines, story);

      // Add variable declarations
      this.addVariables(lines, story);

      // Add passages
      this.addPassages(lines, story, warnings);

      // Join lines with newlines
      const content = lines.join('\n');

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = options.filename
        ? `${options.filename}${this.extension}`
        : `${storyName}_${timestamp}${this.extension}`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content,
        format: 'wls',
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
   * Add story header directives
   * Note: WLS 1.0 uses colon after directive name (e.g., @title: value)
   */
  private addStoryHeader(lines: string[], story: Story): void {
    const { metadata } = story;

    // Required directives
    if (metadata.title) {
      lines.push(`@title: ${metadata.title}`);
    }

    // Optional directives
    if (metadata.author) {
      lines.push(`@author: ${metadata.author}`);
    }

    if (metadata.version) {
      lines.push(`@version: ${metadata.version}`);
    }

    if (metadata.ifid) {
      lines.push(`@ifid: ${metadata.ifid}`);
    }

    // Start passage
    if (story.startPassage) {
      const startPassage = story.getPassage(story.startPassage);
      if (startPassage) {
        lines.push(`@start: ${startPassage.title}`);
      }
    }

    if (metadata.description) {
      lines.push(`@description: ${metadata.description}`);
    }

    // Add blank line after header
    if (lines.length > 0) {
      lines.push('');
    }
  }

  /**
   * Add variable declarations
   */
  private addVariables(lines: string[], story: Story): void {
    const variables: Variable[] = Array.from(story.variables.values());

    if (variables.length === 0) {
      return;
    }

    lines.push('@vars');

    for (const variable of variables) {
      const prefix = variable.scope === 'temp' ? '_' : '';
      const value = this.formatValue(variable.value);
      lines.push(`  ${prefix}${variable.name} = ${value}`);
    }

    lines.push('@/vars');
    lines.push('');
  }

  /**
   * Add passages
   */
  private addPassages(lines: string[], story: Story, warnings: string[]): void {
    const passages: Passage[] = Array.from(story.passages.values());

    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      // Passage header
      // WLS 1.0 uses square brackets for tags: :: PassageName [tag1, tag2]
      let header = `:: ${passage.title}`;

      // Add tags
      if (passage.tags && passage.tags.length > 0) {
        const tagList = passage.tags.join(', ');
        header += ` [${tagList}]`;
      }

      lines.push(header);

      // Passage metadata directives
      if (passage.hasMetadata('fallback')) {
        lines.push(`@fallback ${passage.getMetadata('fallback')}`);
      }

      if (passage.onEnterScript) {
        lines.push(`@onEnter ${passage.onEnterScript}`);
      }

      if (passage.onExitScript) {
        lines.push(`@onExit ${passage.onExitScript}`);
      }

      // Passage content
      if (passage.content) {
        lines.push(passage.content);
      }

      // Choices
      for (const choice of passage.choices) {
        this.addChoice(lines, choice, warnings);
      }

      // Add blank line between passages
      if (i < passages.length - 1) {
        lines.push('');
      }
    }
  }

  /**
   * Add a choice
   */
  private addChoice(lines: string[], choice: any, warnings: string[]): void {
    // Choice marker
    const marker = choice.choiceType === 'sticky' ? '*' : '+';

    // Build choice line
    let line = `${marker} [${choice.text}]`;

    // Condition
    if (choice.condition) {
      line += `{if ${choice.condition}}`;
    }

    // Action
    if (choice.action) {
      line += `{\$ ${choice.action}}`;
    }

    // Target
    if (choice.target) {
      line += ` -> ${choice.target}`;
    }

    lines.push(line);
  }

  /**
   * Format a value for WLS output
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'nil';
    }

    if (typeof value === 'string') {
      // Escape special characters in strings
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (Array.isArray(value)) {
      const items = value.map(v => this.formatValue(v)).join(', ');
      return `{${items}}`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `${k} = ${this.formatValue(v)}`)
        .join(', ');
      return `{${entries}}`;
    }

    return String(value);
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'wls') {
      errors.push('Invalid format for WLS exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Rough estimate: count characters in all content
    let size = 0;

    // Header directives
    size += 200; // Approximate header size

    // Variables
    size += story.variables.size * 50;

    // Passages
    for (const passage of story.passages.values()) {
      size += passage.title.length + 10;
      size += passage.content.length;
      size += passage.choices.length * 50;
    }

    return size;
  }
}
