/**
 * HTML Exporter
 *
 * Exports stories as standalone HTML files with embedded player.
 */

import type { Story } from '../../models/Story';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';
import { generateHTMLPlayer } from './HTMLPlayerTemplate';

/**
 * HTML Exporter
 *
 * Creates a self-contained HTML file with an embedded story player.
 */
export class HTMLExporter implements IExporter {
  readonly name = 'HTML Exporter';
  readonly format = 'html' as const;
  readonly extension = '.html';
  readonly mimeType = 'text/html';

  /**
   * Export a story to HTML
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate story has a start passage
      if (!context.story.startPassage) {
        warnings.push('Story has no start passage set');
      }

      // Serialize story data
      const storyData = context.story.serialize();
      const storyJSON = JSON.stringify(storyData);

      // Generate HTML
      const html = generateHTMLPlayer(storyJSON, context.story.metadata.title, {
        theme: context.options.theme,
        customTheme: context.options.customTheme,
        customCSS: context.options.customCSS,
        customJS: context.options.customJS,
        language: context.options.language || 'en',
      });

      // Minify if requested
      let content = html;
      if (context.options.minifyHTML) {
        content = this.minifyHTML(html);
      }

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.html`;

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
   * Basic HTML minification
   */
  private minifyHTML(html: string): string {
    return html
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove excess whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace between tags
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'html') {
      errors.push('Invalid format for HTML exporter');
    }

    if (options.theme && !['light', 'dark', 'auto'].includes(options.theme)) {
      errors.push('Invalid theme option');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Estimate: base template (~5KB) + story data (~2x JSON size)
    const storyJSON = JSON.stringify(story.serialize());
    const baseTemplateSize = 5000;
    return baseTemplateSize + (storyJSON.length * 2);
  }
}
