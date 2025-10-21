/**
 * Markdown Exporter
 *
 * Exports stories as Markdown documentation for readability and sharing.
 */

import type { Story } from '../../models/Story';
import type { Passage } from '../../models/Passage';
import type { Choice } from '../../models/Choice';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * Markdown Exporter
 *
 * Creates a human-readable Markdown document of the story.
 */
export class MarkdownExporter implements IExporter {
  readonly name = 'Markdown Exporter';
  readonly format = 'markdown' as const;
  readonly extension = '.md';
  readonly mimeType = 'text/markdown';

  /**
   * Export a story to Markdown
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const sections: string[] = [];

      // Title and metadata
      sections.push(this.generateHeader(context));

      // Validation summary (if included)
      if (context.options.includeValidation && context.validation) {
        sections.push(this.generateValidationSection(context.validation));
      }

      // Quality metrics (if included)
      if (context.options.includeMetrics && context.metrics) {
        sections.push(this.generateMetricsSection(context.metrics));
      }

      // Story structure
      sections.push(this.generateStructureSection(context.story));

      // Passages
      sections.push(this.generatePassagesSection(context.story));

      // Variables
      if (context.story.variables.size > 0) {
        sections.push(this.generateVariablesSection(context.story));
      }

      const content = sections.join('\n\n---\n\n');

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.md`;

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
   * Generate header section
   */
  private generateHeader(context: ExportContext): string {
    const { story } = context;
    const { metadata } = story;

    return `# ${metadata.title}

**Author:** ${metadata.author || 'Unknown'}
**Version:** ${metadata.version || '1.0.0'}
**Created:** ${metadata.created ? new Date(metadata.created).toLocaleDateString() : 'Unknown'}
**Modified:** ${metadata.modified ? new Date(metadata.modified).toLocaleDateString() : 'Unknown'}

${metadata.description || ''}`;
  }

  /**
   * Generate validation section
   */
  private generateValidationSection(validation: any): string {
    const status = validation.valid ? '✅ Valid' : `❌ ${validation.errorCount} errors`;

    return `## Validation Status

**Status:** ${status}
**Errors:** ${validation.errorCount}
**Warnings:** ${validation.warningCount}
**Info:** ${validation.infoCount}

${validation.issues && validation.issues.length > 0 ? `
### Issues

${validation.issues.map((issue: any) => `- **[${issue.severity.toUpperCase()}]** ${issue.message} ${issue.passageId ? `(Passage: ${issue.passageId})` : ''}`).join('\n')}
` : ''}`;
  }

  /**
   * Generate metrics section
   */
  private generateMetricsSection(metrics: any): string {
    return `## Quality Metrics

### Structure
- **Depth:** ${metrics.structure?.depth || 0}
- **Branching Factor:** ${metrics.structure?.branchingFactor?.toFixed(2) || 0}
- **Density:** ${metrics.structure?.density?.toFixed(2) || 0}

### Content
- **Total Passages:** ${metrics.content?.totalPassages || 0}
- **Total Choices:** ${metrics.content?.totalChoices || 0}
- **Total Variables:** ${metrics.content?.totalVariables || 0}
- **Total Words:** ${metrics.content?.totalWords || 0}

### Complexity
- **Unique Endings:** ${metrics.complexity?.uniqueEndings || 0}
- **Reachability Score:** ${(metrics.complexity?.reachabilityScore * 100).toFixed(1) || 0}%
- **Conditional Complexity:** ${metrics.complexity?.conditionalComplexity || 0}

### Estimates
- **Estimated Play Time:** ${metrics.estimates?.estimatedPlayTime || 0} minutes
- **Estimated Unique Paths:** ${metrics.estimates?.estimatedUniquePaths || 0}`;
  }

  /**
   * Generate structure section
   */
  private generateStructureSection(story: Story): string {
    const passages = Array.from(story.passages.values());
    const totalPassages = passages.length;
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const totalVariables = story.variables.size;

    return `## Story Structure

- **Total Passages:** ${totalPassages}
- **Total Choices:** ${totalChoices}
- **Total Variables:** ${totalVariables}
- **Start Passage:** ${story.startPassage ? story.getPassage(story.startPassage)?.title : 'Not set'}`;
  }

  /**
   * Generate passages section
   */
  private generatePassagesSection(story: Story): string {
    const passages = Array.from(story.passages.values());

    // Sort passages: start first, then alphabetically
    const sortedPassages = passages.sort((a, b) => {
      if (a.id === story.startPassage) return -1;
      if (b.id === story.startPassage) return 1;
      return a.title.localeCompare(b.title);
    });

    const passageSections = sortedPassages.map(passage => {
      return this.generatePassageSection(passage, story);
    });

    return `## Passages\n\n${passageSections.join('\n\n')}`;
  }

  /**
   * Generate individual passage section
   */
  private generatePassageSection(passage: Passage, story: Story): string {
    const isStart = passage.id === story.startPassage;
    const title = isStart ? `${passage.title} ⭐ (Start)` : passage.title;

    const sections: string[] = [
      `### ${title}`,
    ];

    // Tags
    if (passage.tags.length > 0) {
      sections.push(`**Tags:** ${passage.tags.join(', ')}`);
    }

    // Content
    if (passage.content) {
      sections.push('');
      sections.push(passage.content);
    }

    // Choices
    if (passage.choices.length > 0) {
      sections.push('');
      sections.push('**Choices:**');
      sections.push('');
      passage.choices.forEach((choice, index) => {
        sections.push(this.generateChoiceMarkdown(choice, index + 1, story));
      });
    }

    return sections.join('\n');
  }

  /**
   * Generate choice markdown
   */
  private generateChoiceMarkdown(choice: Choice, index: number, story: Story): string {
    const target = choice.target ? story.getPassage(choice.target) : null;
    const targetText = target ? target.title : choice.target || '(none)';

    let line = `${index}. **${choice.text}**`;

    if (choice.target) {
      line += ` → *${targetText}*`;
    }

    if (choice.condition) {
      line += ` \`[if ${choice.condition}]\``;
    }

    return line;
  }

  /**
   * Generate variables section
   */
  private generateVariablesSection(story: Story): string {
    const variables = Array.from(story.variables.values());

    const varList = variables.map(v => {
      const value = typeof v.value === 'string' ? `"${v.value}"` : v.value;
      return `- **${v.name}** = \`${value}\` (${v.type})`;
    }).join('\n');

    return `## Variables\n\n${varList}`;
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'markdown') {
      errors.push('Invalid format for Markdown exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Estimate: roughly 500 bytes per passage + metadata
    const passages = Array.from(story.passages.values());
    return 1000 + (passages.length * 500);
  }
}
