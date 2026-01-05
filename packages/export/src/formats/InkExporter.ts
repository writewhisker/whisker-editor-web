/**
 * Ink Exporter
 *
 * Exports stories to Ink narrative scripting language format (.ink files).
 * Ink is developed by Inkle Studios for interactive fiction.
 *
 * Supported conversions:
 * - Passages -> Knots (=== knot_name ===)
 * - Choices -> Ink choices (* [text] -> target)
 * - Variables -> VAR declarations
 * - Conditionals -> Ink conditionals ({ condition: text })
 * - Tags -> Comments
 */

import type { Story, Variable } from '@writewhisker/core-ts';
import type { Passage } from '@writewhisker/core-ts';
import type { Choice } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * Ink Exporter
 *
 * Creates Ink script from a Whisker story.
 */
export class InkExporter implements IExporter {
  readonly name = 'Ink Exporter';
  readonly format = 'ink' as const;
  readonly extension = '.ink';
  readonly mimeType = 'text/plain';

  /**
   * Export a story to Ink format
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const sections: string[] = [];

      // Header comment with metadata
      sections.push(this.generateHeader(context));

      // Global variables
      const variablesSection = this.generateVariablesSection(context.story);
      if (variablesSection) {
        sections.push(variablesSection);
      }

      // Generate knots from passages
      sections.push(this.generateKnots(context.story, warnings));

      const content = sections.join('\n\n');

      // Calculate file size
      const size = new Blob([content]).size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.ink`;

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
   * Generate header section with metadata
   */
  private generateHeader(context: ExportContext): string {
    const { story } = context;
    const { metadata } = story;

    const lines: string[] = [
      `// ${metadata.title}`,
    ];

    if (metadata.author) {
      lines.push(`// by ${metadata.author}`);
    }

    if (metadata.description) {
      lines.push(`// ${metadata.description}`);
    }

    lines.push(`// Exported from Whisker on ${new Date().toISOString()}`);

    return lines.join('\n');
  }

  /**
   * Generate global variables section
   */
  private generateVariablesSection(story: Story): string | null {
    const variables = Array.from(story.variables.values()) as Variable[];

    if (variables.length === 0) {
      return null;
    }

    const varLines = variables.map(v => {
      const value = this.formatInkValue(v.initial, v.type);
      return `VAR ${v.name} = ${value}`;
    });

    return varLines.join('\n');
  }

  /**
   * Format a value for Ink syntax
   */
  private formatInkValue(value: string | number | boolean, type: string): string {
    switch (type) {
      case 'string':
        return `"${String(value).replace(/"/g, '\\"')}"`;
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return String(value);
      default:
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '\\"')}"`;
        }
        return String(value);
    }
  }

  /**
   * Generate all knots from passages
   */
  private generateKnots(story: Story, warnings: string[]): string {
    const passages = Array.from(story.passages.values() as Iterable<Passage>);

    // Sort passages: start first, then alphabetically
    const sortedPassages = passages.sort((a, b) => {
      if (a.id === story.startPassage) return -1;
      if (b.id === story.startPassage) return 1;
      return a.title.localeCompare(b.title);
    });

    const knots = sortedPassages.map(passage => {
      return this.generateKnot(passage, story, warnings);
    });

    return knots.join('\n\n');
  }

  /**
   * Generate a single knot from a passage
   */
  private generateKnot(passage: Passage, story: Story, warnings: string[]): string {
    const parts: string[] = [];
    const knotName = this.sanitizeKnotName(passage.title);

    // Knot header
    parts.push(`=== ${knotName} ===`);

    // Tags as comments
    if (passage.tags.length > 0) {
      parts.push(`// Tags: ${passage.tags.join(', ')}`);
    }

    // Content with variable interpolation converted
    if (passage.content) {
      const convertedContent = this.convertContent(passage.content);
      parts.push(convertedContent);
    }

    // Choices
    if (passage.choices.length > 0) {
      for (const choice of passage.choices) {
        parts.push(this.generateChoice(choice, story, warnings));
      }
    } else {
      // No choices - add END divert
      parts.push('-> END');
    }

    return parts.join('\n');
  }

  /**
   * Convert content to Ink format
   */
  private convertContent(content: string): string {
    let result = content;

    // Convert ${variable} to {variable}
    result = result.replace(/\$\{(\w+)\}/g, '{$1}');
    result = result.replace(/\$(\w+)/g, '{$1}');

    // Convert WLS conditionals {if condition: text} to Ink {condition: text}
    result = result.replace(/\{if\s+([^:]+):\s*([^}]+)\}/g, '{$1: $2}');

    return result;
  }

  /**
   * Generate a choice in Ink format
   */
  private generateChoice(choice: Choice, story: Story, warnings: string[]): string {
    const target = choice.target ? story.getPassage(choice.target) : null;
    const targetName = target ? this.sanitizeKnotName(target.title) : 'END';

    let line = `* [${choice.text}]`;

    // Add condition if present
    if (choice.condition) {
      const inkCondition = this.convertCondition(choice.condition);
      line = `{ ${inkCondition} } ${line}`;
      warnings.push(`Conditional choice "${choice.text}" converted to Ink conditional block`);
    }

    // Add effects as variable assignments
    if (choice.effects && choice.effects.length > 0) {
      for (const effect of choice.effects) {
        line += `\n    ~ ${effect.variable} = ${this.formatEffectValue(effect)}`;
      }
    }

    // Add target divert
    line += `\n    -> ${targetName}`;

    return line;
  }

  /**
   * Convert WLS condition to Ink condition
   */
  private convertCondition(condition: string): string {
    let result = condition;

    // Convert 'and' to 'and' (same in Ink)
    // Convert 'or' to 'or' (same in Ink)
    // Convert '==' to '==' (same)
    // Convert '!=' to '!=' (same)
    // Convert 'not' to 'not' (same in Ink)

    // Convert ${variable} to variable
    result = result.replace(/\$\{(\w+)\}/g, '$1');
    result = result.replace(/\$(\w+)/g, '$1');

    return result;
  }

  /**
   * Format effect value
   */
  private formatEffectValue(effect: any): string {
    if (effect.operation === 'add') {
      return `${effect.variable} + ${effect.value}`;
    } else if (effect.operation === 'subtract') {
      return `${effect.variable} - ${effect.value}`;
    } else if (effect.operation === 'multiply') {
      return `${effect.variable} * ${effect.value}`;
    } else if (effect.operation === 'divide') {
      return `${effect.variable} / ${effect.value}`;
    } else if (effect.operation === 'toggle') {
      return `not ${effect.variable}`;
    } else {
      // Direct assignment
      const value = effect.value;
      if (typeof value === 'string') {
        return `"${value}"`;
      } else if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return String(value);
    }
  }

  /**
   * Sanitize a passage title to be a valid Ink knot name
   */
  private sanitizeKnotName(name: string): string {
    // Ink knot names must be valid identifiers
    let result = name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1') // Can't start with number
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    // Ensure we have a valid name
    if (!result || /^\d/.test(result)) {
      result = '_' + result;
    }

    return result || 'unnamed';
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'ink') {
      errors.push('Invalid format for Ink exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Estimate: roughly 300 bytes per passage + variables
    const passages = Array.from(story.passages.values());
    const variables = story.variables.size;
    return 200 + (passages.length * 300) + (variables * 50);
  }
}
