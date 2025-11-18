/**
 * Static Publisher
 *
 * Publishes stories as standalone HTML files that can be downloaded
 * and hosted anywhere.
 */

import type { IPublisher, PublishOptions, PublishResult } from './types';
import type { Story } from '@writewhisker/core-ts';
import { StaticSiteExporter } from '../export/formats/StaticSiteExporter';

export class StaticPublisher implements IPublisher {
  readonly platform = 'static' as const;
  readonly name = 'Static HTML';
  readonly description = 'Download as standalone HTML file';
  readonly requiresAuth = false;

  async publish(story: Story, options: PublishOptions): Promise<PublishResult> {
    try {
      const exporter = new StaticSiteExporter();

      // Export story
      const result = await exporter.export({
        story,
        options: {
          format: 'html-standalone',
          filename: options.filename,
          theme: options.defaultTheme,
        },
      });

      if (!result.success) {
        return {
          success: false,
          platform: this.platform,
          error: result.error || 'Export failed',
        };
      }

      // Create blob for download
      const blob = new Blob([result.content as string], { type: 'text/html' });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || 'story.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        platform: this.platform,
        fileData: blob,
        filename: result.filename,
        metadata: {
          size: blob.size,
        },
      };
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
