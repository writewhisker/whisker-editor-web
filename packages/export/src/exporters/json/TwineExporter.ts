import type { StoryData, PassageData } from '@writewhisker/core-ts';
import type { Exporter, ExportOptions } from '../Exporter';

/**
 * Twine 2 story format
 */
interface TwineStory {
  name: string;
  ifid: string;
  tagColors?: Record<string, string>;
  'zoom'?: number;
  startPassage?: number;
  passages: TwinePassage[];
}

/**
 * Twine 2 passage format
 */
interface TwinePassage {
  pid: number;
  name: string;
  tags?: string[];
  position?: string;
  size?: string;
  text: string;
}

/**
 * Twine export options
 */
export interface TwineExportOptions extends ExportOptions {
  /**
   * Twine story format to use
   * @default 'Harlowe'
   */
  storyFormat?: 'Harlowe' | 'SugarCube' | 'Snowman' | 'Chapbook';

  /**
   * Include position data
   * @default true
   */
  includePositions?: boolean;

  /**
   * Pretty print JSON
   * Overrides minify option
   * @default true
   */
  prettyPrint?: boolean;
}

/**
 * Twine 2 JSON format exporter
 *
 * Exports Whisker stories to Twine 2 JSON format for compatibility
 * with the Twine editor and other Twine-compatible tools.
 *
 * Features:
 * - Converts passages with choices to Twine link format
 * - Preserves passage positions
 * - Supports multiple story formats (Harlowe, SugarCube, etc.)
 * - Includes metadata and tags
 */
export class TwineExporter implements Exporter {
  /**
   * Export story to Twine 2 JSON format
   */
  async export(story: StoryData, options: TwineExportOptions = {}): Promise<string> {
    try {
      const twineStory = this.convertToTwineFormat(story, options);

      const prettyPrint = options.prettyPrint !== false && !options.minify;
      const json = JSON.stringify(twineStory, null, prettyPrint ? 2 : 0);

      return json;
    } catch (error) {
      throw new Error(
        `Failed to export Twine JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert Whisker story to Twine format
   */
  private convertToTwineFormat(story: StoryData, options: TwineExportOptions): TwineStory {
    const storyFormat = options.storyFormat || 'Harlowe';

    // Create IFID if not present
    const ifid = story.metadata.ifid || this.generateIFID();

    // Create passage ID mapping
    const passageIds = new Map<string, number>();
    const passages = Object.values(story.passages || {}) as PassageData[];

    passages.forEach((passage, index) => {
      passageIds.set(passage.id, index + 1);
    });

    // Find start passage PID
    const startPassagePid = passageIds.get(story.startPassage);

    // Convert passages
    const twinePassages = passages.map((passage) =>
      this.convertPassage(passage, passageIds, story, options, storyFormat)
    );

    // Collect tag colors
    const tagColors: Record<string, string> = {};
    for (const passage of passages) {
      if (passage.tags && passage.tags.length > 0) {
        for (const tag of passage.tags) {
          if (!tagColors[tag] && passage.color) {
            tagColors[tag] = passage.color;
          }
        }
      }
    }

    const twineStory: TwineStory = {
      name: story.metadata.title || 'Untitled Story',
      ifid: ifid,
      passages: twinePassages,
    };

    if (Object.keys(tagColors).length > 0) {
      twineStory.tagColors = tagColors;
    }

    if (startPassagePid !== undefined) {
      twineStory.startPassage = startPassagePid;
    }

    return twineStory;
  }

  /**
   * Convert a single passage to Twine format
   */
  private convertPassage(
    passage: PassageData,
    passageIds: Map<string, number>,
    story: StoryData,
    options: TwineExportOptions,
    storyFormat: string
  ): TwinePassage {
    const pid = passageIds.get(passage.id) || 0;

    let text = passage.content || '';

    // Add variable initialization if this is the start passage
    if (passage.id === story.startPassage && Object.keys(story.variables || {}).length > 0) {
      text = this.generateVariableInitialization(story, storyFormat) + '\n\n' + text;
    }

    // Add onEnter script
    if (passage.onEnterScript) {
      text = this.convertScript(passage.onEnterScript, storyFormat, 'enter') + '\n\n' + text;
    }

    // Add choices
    if (passage.choices && passage.choices.length > 0) {
      text += '\n\n' + this.convertChoices(passage.choices, passageIds, story, storyFormat);
    }

    // Add onExit script
    if (passage.onExitScript) {
      text += '\n\n' + this.convertScript(passage.onExitScript, storyFormat, 'exit');
    }

    const twinePassage: TwinePassage = {
      pid: pid,
      name: passage.title,
      text: text,
    };

    if (passage.tags && passage.tags.length > 0) {
      twinePassage.tags = passage.tags;
    }

    if (options.includePositions !== false && passage.position) {
      twinePassage.position = `${passage.position.x},${passage.position.y}`;
      if (passage.size) {
        twinePassage.size = `${passage.size.width},${passage.size.height}`;
      }
    }

    return twinePassage;
  }

  /**
   * Generate variable initialization code
   */
  private generateVariableInitialization(story: StoryData, storyFormat: string): string {
    const lines: string[] = [];

    for (const [name, varData] of Object.entries(story.variables || {})) {
      const value = this.formatValue((varData as any).initial, storyFormat);

      switch (storyFormat) {
        case 'SugarCube':
          lines.push(`<<set $${name} to ${value}>>`);
          break;
        case 'Harlowe':
          lines.push(`(set: $${name} to ${value})`);
          break;
        case 'Snowman':
          lines.push(`<% s.${name} = ${value}; %>`);
          break;
        case 'Chapbook':
          lines.push(`${name}: ${value}`);
          break;
        default:
          lines.push(`/* ${name} = ${value} */`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert script to story format syntax
   */
  private convertScript(script: string, storyFormat: string, timing: 'enter' | 'exit'): string {
    // This is a simplified conversion
    // In production, you'd want a proper Lua-to-target-format transpiler

    switch (storyFormat) {
      case 'SugarCube':
        return `<<script>>\n${script}\n<</script>>`;
      case 'Harlowe':
        // Harlowe doesn't support arbitrary JavaScript
        return `<!-- Script (${timing}): ${script} -->`;
      case 'Snowman':
        return `<% ${script} %>`;
      case 'Chapbook':
        return `[JavaScript]\n${script}`;
      default:
        return `<!-- ${script} -->`;
    }
  }

  /**
   * Convert choices to Twine link format
   */
  private convertChoices(
    choices: any[],
    passageIds: Map<string, number>,
    story: StoryData,
    storyFormat: string
  ): string {
    const lines: string[] = [];

    for (const choice of choices) {
      const targetPassage = story.passages?.[choice.target];
      const targetName = targetPassage ? targetPassage.title : choice.target;

      let choiceLine = '';

      switch (storyFormat) {
        case 'SugarCube':
          if (choice.condition || choice.action) {
            if (choice.condition) {
              choiceLine += `<<if ${choice.condition}>>\n`;
            }
            if (choice.action) {
              choiceLine += `<<link "${choice.text}" "${targetName}">><<set ${choice.action}>><</link>>`;
            } else {
              choiceLine += `[[${choice.text}|${targetName}]]`;
            }
            if (choice.condition) {
              choiceLine += `\n<</if>>`;
            }
          } else {
            choiceLine = `[[${choice.text}|${targetName}]]`;
          }
          break;

        case 'Harlowe':
          if (choice.condition) {
            choiceLine = `(if: ${choice.condition})[\n  [[${choice.text}|${targetName}]]\n]`;
          } else {
            choiceLine = `[[${choice.text}|${targetName}]]`;
          }
          break;

        case 'Snowman':
          choiceLine = `<a href="javascript:void(0)" data-passage="${targetName}">${choice.text}</a>`;
          break;

        case 'Chapbook':
          choiceLine = `[${choice.text}](${targetName})`;
          break;

        default:
          choiceLine = `[[${choice.text}|${targetName}]]`;
      }

      lines.push(choiceLine);
    }

    return lines.join('\n');
  }

  /**
   * Format a value for the target story format
   */
  private formatValue(value: any, storyFormat: string): string {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return String(value);
  }

  /**
   * Generate a unique IFID (Interactive Fiction ID)
   * Format: UUID v4
   */
  private generateIFID(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get supported story formats
   */
  static getSupportedFormats(): string[] {
    return ['Harlowe', 'SugarCube', 'Snowman', 'Chapbook'];
  }
}
