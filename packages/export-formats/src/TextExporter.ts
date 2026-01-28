/**
 * Text Exporter (GAP-049)
 * Converts story data to .ws text format
 */

import type { StoryData, Exporter, TextExportOptions, Passage } from './types';

/**
 * Text Exporter - Converts story data to .ws text format
 */
export class TextExporter implements Exporter {
  public async export(
    data: StoryData,
    options: TextExportOptions = { format: 'ws' }
  ): Promise<string> {
    const lineEnding = options.lineEnding === 'crlf' ? '\r\n' : '\n';
    const lines: string[] = [];

    // Add metadata header
    if (data.title) {
      lines.push(`@title ${data.title}`);
    }
    if (data.author) {
      lines.push(`@author ${data.author}`);
    }
    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        if (key !== 'title' && key !== 'author') {
          lines.push(`@${key} ${value}`);
        }
      }
    }

    // Add blank line after metadata if any was written
    if (lines.length > 0) {
      lines.push('');
    }

    // Sort passages if requested
    let passages = [...data.passages];
    if (options.sortPassages) {
      passages.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Convert each passage
    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      // Add separator between passages
      if (i > 0 && options.passageSeparator !== false) {
        lines.push('');
      }

      // Format passage
      const passageLines = this.formatPassage(passage);
      lines.push(...passageLines);
    }

    return lines.join(lineEnding);
  }

  /**
   * Format a single passage
   */
  private formatPassage(passage: Passage): string[] {
    const lines: string[] = [];

    // Passage header
    let header = `:: ${passage.title}`;
    if (passage.tags && passage.tags.length > 0) {
      header += ` [${passage.tags.join(', ')}]`;
    }
    lines.push(header);

    // Passage content
    if (passage.content) {
      // Split content into lines and preserve formatting
      const contentLines = passage.content.split('\n');
      lines.push(...contentLines);
    }

    return lines;
  }

  public getFileExtension(): string {
    return 'ws';
  }

  public getMimeType(): string {
    return 'text/x-whisker';
  }
}

/**
 * Simple roundtrip test utility
 * Converts story data to text and back
 * Note: Full AST-based roundtrip requires the parser package
 */
export function storyToText(data: StoryData, options?: TextExportOptions): Promise<string> {
  const exporter = new TextExporter();
  return exporter.export(data, options);
}

/**
 * Format a single passage to text
 */
export function formatPassage(passage: Passage): string {
  let result = `:: ${passage.title}`;
  if (passage.tags && passage.tags.length > 0) {
    result += ` [${passage.tags.join(', ')}]`;
  }
  result += '\n' + passage.content;
  return result;
}
