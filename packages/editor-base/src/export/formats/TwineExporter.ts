import type { IExporter } from '../types';
import type { ExportContext, ExportResult } from '../types';
import type { Story } from '@whisker/core-ts';
import type { Passage } from '@whisker/core-ts';
import { nanoid } from 'nanoid';

/**
 * Exports Whisker stories to Twine 2 HTML format (Harlowe 3.x compatible)
 */
export class TwineExporter implements IExporter {
  readonly name = 'Twine HTML Exporter';
  readonly format = 'twine' as const;
  readonly extension = '.html';
  readonly mimeType = 'text/html';

  async export(context: ExportContext): Promise<ExportResult> {
    try {
      const { story } = context;

      if (!story) {
        return {
          success: false,
          error: 'No story provided for export',
        };
      }

      // Generate Twine HTML
      const html = this.generateTwineHTML(story);

      return {
        success: true,
        content: html,
        filename: `${story.metadata.title || 'story'}.html`,
        mimeType: this.mimeType,
        size: html.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  private generateTwineHTML(story: Story): string {
    const passages = Array.from(story.passages.values() as Iterable<Passage>);
    const startPassage = story.startPassage || (passages[0]?.id ?? '1');
    const ifid = story.metadata.ifid || nanoid();

    // Convert passages to tw-passagedata elements
    const passageElements = passages
      .map((passage: Passage, index: number) => {
        const pid = String(index + 1);
        const name = this.escapeHTML(passage.title || `Passage ${pid}`);
        const tags = passage.tags?.join(' ') || '';
        const x = passage.position?.x ?? index * 150;
        const y = passage.position?.y ?? 100;
        const position = `${x},${y}`;
        const size = '100,100';
        const content = this.convertWhiskerToHarlowe(passage.content || '');

        return `<tw-passagedata pid="${pid}" name="${name}" tags="${tags}" position="${position}" size="${size}">${content}</tw-passagedata>`;
      })
      .join('\n');

    // Generate complete Twine HTML structure
    return `<tw-storydata name="${this.escapeHTML(story.metadata.title || 'Untitled Story')}" startnode="${startPassage}" creator="Whisker Editor" creator-version="1.0.0" ifid="${ifid}" zoom="1" format="Harlowe" format-version="3.3.5" options="" hidden>
<style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css"></style>
<script role="script" id="twine-user-script" type="text/twine-javascript"></script>
${passageElements}
</tw-storydata>`;
  }

  private convertWhiskerToHarlowe(content: string): string {
    let converted = content;

    // Convert Whisker conditionals to Harlowe (do this BEFORE variable conversion)
    converted = converted.replace(/\{\{#if\s+(.+?)\}\}/g, (_, condition) => `(if: ${condition})[`);
    converted = converted.replace(/\{\{else\}\}/g, '](else:)[');
    converted = converted.replace(/\{\{\/if\}\}/g, ']');

    // Convert Whisker set to Harlowe (do this BEFORE variable conversion)
    converted = converted.replace(/\{\{set\s+(\w+)\s*=\s*(.+?)\}\}/g, (_, varName, value) => `(set: $${varName} to ${value})`);

    // Convert Whisker variables {{var}} to Harlowe $var (do this LAST)
    converted = converted.replace(/\{\{(\w+)\}\}/g, (_, varName) => `$${varName}`);

    // Escape HTML entities
    converted = this.escapeHTML(converted);

    return converted;
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
