import type { StoryData } from '@writewhisker/core-ts';

/**
 * Export options for all exporters
 */
export interface ExportOptions {
  /**
   * Minify output (remove unnecessary whitespace)
   * @default false
   */
  minify?: boolean;

  /**
   * Include story metadata in export
   * @default true
   */
  includeMetadata?: boolean;

  /**
   * Custom CSS to inject into HTML exports
   */
  customCSS?: string;
}

/**
 * Base interface for all story exporters
 */
export interface Exporter {
  /**
   * Export a story to the target format
   * @param story - Story data to export
   * @param options - Export options
   * @returns Exported content as a string
   */
  export(story: StoryData, options?: ExportOptions): Promise<string>;
}
