import type { StoryData, PassageData, ChoiceData } from '@writewhisker/core-ts';
import type { Exporter, ExportOptions } from '../Exporter';

/**
 * Markdown export options
 */
export interface MarkdownExportOptions extends ExportOptions {
  /**
   * Include table of contents
   * @default true
   */
  includeTableOfContents?: boolean;

  /**
   * Include passage IDs
   * @default false
   */
  includePassageIds?: boolean;

  /**
   * Include choice conditions and actions
   * @default true
   */
  includeChoiceLogic?: boolean;

  /**
   * Include passage scripts
   * @default true
   */
  includeScripts?: boolean;

  /**
   * Heading level for passages (1-6)
   * @default 2
   */
  passageHeadingLevel?: number;
}

/**
 * Markdown exporter for documentation and readable story format
 *
 * Converts a Whisker story to Markdown format that:
 * - Preserves story structure and flow
 * - Creates readable documentation
 * - Includes metadata, passages, choices, and logic
 * - Can be used for version control and collaboration
 */
export class MarkdownExporter implements Exporter {
  /**
   * Export story to Markdown
   */
  async export(story: StoryData, options: MarkdownExportOptions = {}): Promise<string> {
    try {
      const sections: string[] = [];

      // Title and metadata
      sections.push(this.generateHeader(story, options));

      // Table of contents
      if (options.includeTableOfContents !== false) {
        sections.push(this.generateTableOfContents(story, options));
      }

      // Story information
      sections.push(this.generateStoryInfo(story, options));

      // Variables
      if (Object.keys(story.variables || {}).length > 0) {
        sections.push(this.generateVariables(story));
      }

      // Passages
      sections.push(this.generatePassages(story, options));

      // Join sections with double newlines
      let markdown = sections.join('\n\n---\n\n');

      // Remove excessive blank lines if minify is enabled
      if (options.minify) {
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
      }

      return markdown;
    } catch (error) {
      throw new Error(
        `Failed to export Markdown: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate document header
   */
  private generateHeader(story: StoryData, options: MarkdownExportOptions): string {
    const lines: string[] = [];

    lines.push(`# ${this.escapeMarkdown(story.metadata.title || 'Untitled Story')}`);
    lines.push('');

    if (options.includeMetadata !== false) {
      if (story.metadata.author) {
        lines.push(`**Author:** ${this.escapeMarkdown(story.metadata.author)}`);
      }
      if (story.metadata.version) {
        lines.push(`**Version:** ${this.escapeMarkdown(story.metadata.version)}`);
      }
      if (story.metadata.created) {
        lines.push(`**Created:** ${this.formatDate(story.metadata.created)}`);
      }
      if (story.metadata.modified) {
        lines.push(`**Last Modified:** ${this.formatDate(story.metadata.modified)}`);
      }
      if (story.metadata.description) {
        lines.push('');
        lines.push(`> ${this.escapeMarkdown(story.metadata.description)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(story: StoryData, options: MarkdownExportOptions): string {
    const lines: string[] = [];
    lines.push('## Table of Contents');
    lines.push('');
    lines.push('- [Story Information](#story-information)');

    if (Object.keys(story.variables || {}).length > 0) {
      lines.push('- [Variables](#variables)');
    }

    lines.push('- [Passages](#passages)');

    // List all passages
    const passages = Object.values(story.passages || {}) as PassageData[];
    for (const passage of passages) {
      const anchor = this.generateAnchor(passage.title || '');
      lines.push(`  - [${this.escapeMarkdown(passage.title || '')}](#${anchor})`);
    }

    return lines.join('\n');
  }

  /**
   * Generate story information section
   */
  private generateStoryInfo(story: StoryData, options: MarkdownExportOptions): string {
    const lines: string[] = [];
    lines.push('## Story Information');
    lines.push('');

    const passageCount = Object.keys(story.passages || {}).length;
    const variableCount = Object.keys(story.variables || {}).length;
    const startPassage = story.passages?.[story.startPassage];

    lines.push(`- **Total Passages:** ${passageCount}`);
    lines.push(`- **Total Variables:** ${variableCount}`);
    lines.push(`- **Start Passage:** ${startPassage ? this.escapeMarkdown(startPassage.title) : 'Not set'}`);

    // Count total choices
    let totalChoices = 0;
    for (const passage of Object.values(story.passages || {})) {
      totalChoices += ((passage as any).choices || []).length;
    }
    lines.push(`- **Total Choices:** ${totalChoices}`);

    return lines.join('\n');
  }

  /**
   * Generate variables section
   */
  private generateVariables(story: StoryData): string {
    const lines: string[] = [];
    lines.push('## Variables');
    lines.push('');
    lines.push('| Name | Type | Initial Value |');
    lines.push('|------|------|---------------|');

    for (const [name, varData] of Object.entries(story.variables || {})) {
      const initial = this.formatValue((varData as any).initial);
      lines.push(`| \`${this.escapeMarkdown(name)}\` | ${(varData as any).type} | ${initial} |`);
    }

    return lines.join('\n');
  }

  /**
   * Generate passages section
   */
  private generatePassages(story: StoryData, options: MarkdownExportOptions): string {
    const lines: string[] = [];
    lines.push('## Passages');
    lines.push('');

    const headingLevel = Math.max(1, Math.min(6, options.passageHeadingLevel || 2));
    const heading = '#'.repeat(headingLevel + 1);

    // Sort passages by title for consistency
    const passages = (Object.values(story.passages || {}) as PassageData[]).sort((a, b) =>
      (a.title || '').localeCompare(b.title || '')
    );

    for (const passage of passages) {
      lines.push(this.generatePassage(passage, story, options, heading));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate a single passage
   */
  private generatePassage(
    passage: PassageData,
    story: StoryData,
    options: MarkdownExportOptions,
    heading: string
  ): string {
    const lines: string[] = [];

    // Title
    let title = this.escapeMarkdown(passage.title);
    if (passage.id === story.startPassage) {
      title += ' ⭐ (Start)';
    }
    lines.push(`${heading} ${title}`);
    lines.push('');

    // Metadata
    if (options.includePassageIds) {
      lines.push(`**ID:** \`${passage.id}\``);
      lines.push('');
    }

    if (passage.tags && passage.tags.length > 0) {
      const tags = passage.tags.map(tag => `\`${this.escapeMarkdown(tag)}\``).join(', ');
      lines.push(`**Tags:** ${tags}`);
      lines.push('');
    }

    // Content
    if (passage.content) {
      lines.push('**Content:**');
      lines.push('');
      lines.push(passage.content.trim());
      lines.push('');
    }

    // Scripts
    if (options.includeScripts !== false) {
      if (passage.onEnterScript) {
        lines.push('**On Enter Script:**');
        lines.push('');
        lines.push('```lua');
        lines.push(passage.onEnterScript.trim());
        lines.push('```');
        lines.push('');
      }

      if (passage.onExitScript) {
        lines.push('**On Exit Script:**');
        lines.push('');
        lines.push('```lua');
        lines.push(passage.onExitScript.trim());
        lines.push('```');
        lines.push('');
      }
    }

    // Choices
    if (passage.choices && passage.choices.length > 0) {
      lines.push('**Choices:**');
      lines.push('');

      for (let i = 0; i < passage.choices.length; i++) {
        const choice = passage.choices[i];
        const targetPassage = story.passages?.[choice.target];
        const targetTitle = targetPassage ? targetPassage.title : choice.target;

        lines.push(`${i + 1}. **${this.escapeMarkdown(choice.text)}** → [${this.escapeMarkdown(targetTitle)}](#${this.generateAnchor(targetTitle)})`);

        if (options.includeChoiceLogic !== false) {
          if (choice.condition) {
            lines.push(`   - *Condition:* \`${this.escapeMarkdown(choice.condition)}\``);
          }
          if (choice.action) {
            lines.push(`   - *Action:* \`${this.escapeMarkdown(choice.action)}\``);
          }
        }
      }
      lines.push('');
    } else {
      lines.push('**Choices:** None (End passage)');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Escape special Markdown characters
   */
  private escapeMarkdown(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Generate anchor from title
   */
  private generateAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Format a value for display
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `\`"${this.escapeMarkdown(value)}"\``;
    }
    return `\`${String(value)}\``;
  }

  /**
   * Format ISO date string
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }
}
