/**
 * JSON Exporter
 *
 * Exports stories to JSON format for backup, interchange, and debugging.
 */

import type { Story } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportMetadata,
  ExportOptions,
  IExporter,
} from '../types';
import packageJson from '../../package.json';

/**
 * JSON export data structure
 */
interface JSONExportData {
  /** Export metadata */
  metadata: ExportMetadata;

  /** Story data */
  story: ReturnType<Story['serialize']>;

  /** Validation result (optional) */
  validation?: unknown;

  /** Quality metrics (optional) */
  metrics?: unknown;

  /** Test scenarios (optional) */
  testScenarios?: unknown[];
}

/**
 * JSON Exporter
 *
 * Exports stories to JSON format with optional validation and metrics.
 */
export class JSONExporter implements IExporter {
  readonly name = 'JSON Exporter';
  readonly format = 'json' as const;
  readonly extension = '.json';
  readonly mimeType = 'application/json';

  /**
   * Export a story to JSON
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Build export data
      const exportData: JSONExportData = {
        metadata: this.buildMetadata(context),
        story: context.story.serialize(),
      };

      // Include validation if requested
      if (context.options.includeValidation && context.validation) {
        exportData.validation = context.validation;
      }

      // Include metrics if requested
      if (context.options.includeMetrics && context.metrics) {
        exportData.metrics = this.transformMetrics(context.metrics);
      }

      // Include test scenarios if requested
      if (context.options.includeTestScenarios && context.testScenarios) {
        exportData.testScenarios = context.testScenarios;
      }

      // Convert to JSON string
      const indent = context.options.prettyPrint !== false ? 2 : undefined;
      const content = JSON.stringify(exportData, null, indent);

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.json`;

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
   * Build export metadata
   */
  private buildMetadata(context: ExportContext): ExportMetadata {
    const { story, validation } = context;

    let validationStatus: 'valid' | 'warnings' | 'errors' | undefined;
    if (validation) {
      if (validation.errorCount > 0) {
        validationStatus = 'errors';
      } else if (validation.warningCount > 0) {
        validationStatus = 'warnings';
      } else {
        validationStatus = 'valid';
      }
    }

    return {
      exportDate: new Date().toISOString(),
      editorVersion: packageJson.version,
      formatVersion: '1.0.0',
      storyId: story.metadata.title, // Use title as ID since Story doesn't have an id property
      storyTitle: story.metadata.title,
      storyAuthor: story.metadata.author,
      validationStatus,
      exportOptions: context.options,
    };
  }

  /**
   * Transform flat metrics to nested structure for export
   */
  private transformMetrics(metrics: any): any {
    // If already nested, return as-is
    if (metrics.structure || metrics.content || metrics.complexity || metrics.estimates) {
      return metrics;
    }

    // Transform flat structure to nested
    return {
      structure: {
        depth: metrics.depth ?? 0,
        branchingFactor: metrics.branchingFactor ?? 0,
        density: metrics.density ?? 0,
      },
      content: {
        totalPassages: metrics.totalPassages ?? 0,
        totalChoices: metrics.totalChoices ?? 0,
        totalVariables: metrics.totalVariables ?? 0,
        totalWords: metrics.totalWords ?? 0,
        avgWordsPerPassage: metrics.avgWordsPerPassage ?? 0,
      },
      complexity: {
        uniqueEndings: metrics.uniqueEndings ?? 0,
        reachabilityScore: metrics.reachabilityScore ?? 0,
        conditionalComplexity: metrics.conditionalComplexity ?? 0,
        variableComplexity: metrics.variableComplexity ?? 0,
      },
      estimates: {
        estimatedPlayTime: metrics.estimatedPlayTime ?? 0,
        estimatedPaths: metrics.estimatedPaths ?? 0,
      },
    };
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    // JSON export has minimal validation requirements
    if (options.format !== 'json') {
      errors.push('Invalid format for JSON exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Rough estimate: JSON is about 1.5x the serialized object size
    const jsonString = JSON.stringify(story.serialize());
    return jsonString.length * 1.5;
  }
}
