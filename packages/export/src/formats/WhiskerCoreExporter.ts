/**
 * Whisker Core Exporter
 *
 * Exports stories to whisker-core compatible format.
 * This format is compatible with the whisker-core Lua engine.
 */

import type { Story, Passage } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * Whisker Core Exporter
 *
 * Exports stories to the canonical whisker-core format with:
 * - format: "whisker"
 * - formatVersion: "1.0" or "2.0"
 * - Settings object with startPassage
 * - Passages as array (not Record)
 * - Variables as simple key-value pairs
 */
export class WhiskerCoreExporter implements IExporter {
  readonly name = 'Whisker Core Exporter';
  readonly format = 'whisker-core' as const;
  readonly extension = '.whisker';
  readonly mimeType = 'application/json';

  /**
   * Export a story to whisker-core format
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const { story, options } = context;

      // Get format version from options (default to 1.0)
      const formatVersion = options.whiskerCoreVersion || '1.0';
      const stripExtensions = options.stripExtensions !== false; // Default to true

      // Serialize to whisker-core format
      let coreData;
      if (formatVersion === '2.1') {
        coreData = story.serializeWhiskerV21({
          stripExtensions
        });
      } else {
        coreData = story.serializeWhiskerCore({
          formatVersion,
          stripExtensions
        });
      }

      // Warn if editor extensions are present and not stripped
      if (!stripExtensions) {
        const hasExtensions = Array.from(story.passages.values()).some(
          (p: Passage) => p.onEnterScript || p.onExitScript || p.color
        );
        if (hasExtensions) {
          warnings.push(
            'Story contains editor-specific extensions (onEnterScript, onExitScript, color) that may not be recognized by whisker-core'
          );
        }
      }

      // Convert to JSON string
      const indent = options.prettyPrint !== false ? 2 : undefined;
      const content = JSON.stringify(coreData, null, indent);

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.whisker`;

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
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'whisker-core') {
      errors.push('Invalid format for Whisker Core exporter');
    }

    if (options.whiskerCoreVersion &&
        options.whiskerCoreVersion !== '1.0' &&
        options.whiskerCoreVersion !== '2.0' &&
        options.whiskerCoreVersion !== '2.1') {
      errors.push('whiskerCoreVersion must be "1.0", "2.0", or "2.1"');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Estimate based on whisker-core serialization
    const coreData = story.serializeWhiskerCore();
    const jsonString = JSON.stringify(coreData);
    return jsonString.length;
  }
}
