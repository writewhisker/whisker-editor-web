/**
 * JSON Importer
 *
 * Imports stories from JSON format (exported by JSONExporter).
 */

import { Story } from '@writewhisker/core-ts';
import type {
  ImportContext,
  ImportResult,
  IImporter,
} from '../types';
import { importWhiskerFile, isWhiskerCoreFormat } from '@writewhisker/core-ts';

/**
 * JSON Importer
 *
 * Imports stories from JSON format with validation.
 */
export class JSONImporter implements IImporter {
  readonly name = 'JSON Importer';
  readonly format = 'json' as const;
  readonly extensions = ['.json'];

  /**
   * Import a story from JSON
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Parse JSON
      const data = typeof context.data === 'string'
        ? JSON.parse(context.data)
        : context.data;

      // Detect format and extract story data
      let storyData;

      // Check if it's whisker-core format
      if (isWhiskerCoreFormat(data)) {
        warnings.push('Detected whisker-core format - converting to editor format');
        storyData = importWhiskerFile(data);
      } else if (data.story) {
        // New format (from JSONExporter)
        storyData = data.story;

        // Add warnings from export metadata
        if (data.metadata?.validationStatus === 'errors') {
          warnings.push('Imported story had validation errors');
        } else if (data.metadata?.validationStatus === 'warnings') {
          warnings.push('Imported story had validation warnings');
        }
      } else if (data.metadata && data.passages) {
        // Direct story data format (could be editor or core format with Record)
        storyData = importWhiskerFile(data);
      } else {
        throw new Error('Invalid JSON format: missing story data');
      }

      // Deserialize story
      const story = Story.deserialize(storyData);

      // Validate story structure
      if (!story.metadata?.title) {
        warnings.push('Story has no title');
      }

      if (story.passages.size === 0) {
        warnings.push('Story has no passages');
      }

      if (!story.startPassage) {
        warnings.push('Story has no start passage set');
      }

      // Auto-validate if requested
      let validation;
      if (context.options.validateAfterImport) {
        // Validation would be performed by the calling code
        // We just set a flag indicating validation should happen
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        story,
        validation,
        duration,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
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
   * Check if data can be imported by this importer
   */
  canImport(data: string | object): boolean {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      // Check for whisker-core format
      if (isWhiskerCoreFormat(parsed)) {
        return true;
      }

      // Check for story data structure
      const hasNewFormat = parsed.story && parsed.metadata;
      const hasDirectFormat = parsed.metadata && parsed.passages;

      return !!(hasNewFormat || hasDirectFormat);
    } catch {
      return false;
    }
  }

  /**
   * Validate import data
   */
  validate(data: string | object): string[] {
    const errors: string[] = [];

    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      // Check for story data
      const storyData = parsed.story || parsed;

      if (!storyData.metadata) {
        errors.push('Missing story metadata');
      }

      if (!storyData.passages) {
        errors.push('Missing story passages');
      }

      if (storyData.passages && typeof storyData.passages !== 'object') {
        errors.push('Invalid passages format');
      }

      if (storyData.variables && typeof storyData.variables !== 'object') {
        errors.push('Invalid variables format');
      }
    } catch (error) {
      errors.push('Invalid JSON format');
    }

    return errors;
  }

  /**
   * Get format version from data
   */
  getFormatVersion(data: string | object): string {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed.metadata?.formatVersion || '1.0.0';
    } catch {
      return 'unknown';
    }
  }
}
