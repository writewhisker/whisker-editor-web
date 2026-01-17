/**
 * Ink Format Adapter
 *
 * Provides bi-directional conversion between Whisker stories and Ink format.
 * Ink is a narrative scripting language by Inkle Studios.
 */

import {
  Story as StoryClass,
  Passage as PassageClass,
  Variable as VariableClass,
  type Story,
  type Passage,
} from '@writewhisker/story-models';

export interface InkStory {
  title: string;
  author?: string;
  knots: InkKnot[];
  globalVariables: InkVariable[];
  metadata?: Record<string, any>;
}

export interface InkKnot {
  name: string;
  content: string;
  stitches: InkStitch[];
  choices: InkChoice[];
  position?: { x: number; y: number };
}

export interface InkStitch {
  name: string;
  content: string;
  choices: InkChoice[];
}

export interface InkChoice {
  text: string;
  target: string;
  condition?: string;
  once?: boolean;
}

export interface InkVariable {
  name: string;
  value: any;
  type: 'VAR' | 'CONST';
}

/**
 * Converts a Whisker Story to Ink format
 */
export class InkExporter {
  /**
   * Export story to Ink script format
   */
  public exportToInk(story: Story): string {
    const inkStory = this.convertToInk(story);
    return this.generateInkScript(inkStory);
  }

  /**
   * Convert Whisker Story to Ink structure
   */
  public convertToInk(story: Story): InkStory {
    const knots = story.mapPassages(passage => this.convertPassageToKnot(passage));

    return {
      title: story.metadata.title,
      author: story.metadata?.author,
      knots,
      globalVariables: this.extractVariables(story),
      metadata: story.metadata,
    };
  }

  private convertPassageToKnot(passage: Passage): InkKnot {
    const { content, choices } = this.parseContentForChoices(passage.content);

    return {
      name: this.sanitizeKnotName(passage.title),
      content,
      stitches: [],
      choices,
      position: passage.position,
    };
  }

  private parseContentForChoices(content: string): { content: string; choices: InkChoice[] } {
    const choices: InkChoice[] = [];
    const lines = content.split('\n');
    const contentLines: string[] = [];

    for (const line of lines) {
      // Check for Whisker link syntax [[Target]] or [[Text|Target]]
      const linkMatch = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (linkMatch) {
        const text = linkMatch[2] || linkMatch[1];
        const target = linkMatch[2] ? linkMatch[1] : linkMatch[1];
        choices.push({
          text,
          target: this.sanitizeKnotName(target),
          once: false,
        });
      } else {
        contentLines.push(line);
      }
    }

    return {
      content: contentLines.join('\n').trim(),
      choices,
    };
  }

  private extractVariables(story: Story): InkVariable[] {
    // Extract variables from story
    const variables: InkVariable[] = [];

    for (const [name, variable] of story.variables) {
      variables.push({
        name,
        value: variable.initial,
        type: 'VAR',
      });
    }

    return variables;
  }

  private generateInkScript(inkStory: InkStory): string {
    const parts: string[] = [];

    // Header
    parts.push(`// ${inkStory.title}`);
    if (inkStory.author) {
      parts.push(`// by ${inkStory.author}`);
    }
    parts.push('');

    // Global variables
    if (inkStory.globalVariables.length > 0) {
      for (const variable of inkStory.globalVariables) {
        parts.push(`${variable.type} ${variable.name} = ${JSON.stringify(variable.value)}`);
      }
      parts.push('');
    }

    // Knots
    for (const knot of inkStory.knots) {
      parts.push(this.generateKnotScript(knot));
      parts.push('');
    }

    return parts.join('\n');
  }

  private generateKnotScript(knot: InkKnot): string {
    const parts: string[] = [];

    // Knot header
    parts.push(`=== ${knot.name} ===`);

    // Content
    if (knot.content) {
      parts.push(knot.content);
    }

    // Choices
    for (const choice of knot.choices) {
      let choiceStr = `* [${choice.text}]`;
      if (choice.condition) {
        choiceStr = `${choice.condition}: ${choiceStr}`;
      }
      choiceStr += ` -> ${choice.target}`;
      parts.push(choiceStr);
    }

    // Stitches
    for (const stitch of knot.stitches) {
      parts.push('');
      parts.push(`= ${stitch.name}`);
      parts.push(stitch.content);
      for (const choice of stitch.choices) {
        parts.push(`* [${choice.text}] -> ${choice.target}`);
      }
    }

    return parts.join('\n');
  }

  private sanitizeKnotName(name: string): string {
    // Ink knot names must be valid identifiers
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1'); // Can't start with number
  }
}

/**
 * Converts Ink format to Whisker Story
 */
export class InkImporter {
  /**
   * Import from Ink script format
   */
  public importFromInk(inkScript: string): Story {
    const inkStory = this.parseInkScript(inkScript);
    return this.convertToWhisker(inkStory);
  }

  /**
   * Parse Ink script to structure
   */
  public parseInkScript(script: string): InkStory {
    const lines = script.split('\n');
    const knots: InkKnot[] = [];
    const globalVariables: InkVariable[] = [];
    let title = 'Untitled';
    let author: string | undefined;

    let currentKnot: InkKnot | null = null;
    let currentStitch: InkStitch | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Comments with metadata
      if (line.startsWith('//')) {
        const comment = line.substring(2).trim();
        if (!title || title === 'Untitled') {
          title = comment.replace(/^by\s+/i, '');
        } else if (comment.match(/^by\s+/i)) {
          author = comment.replace(/^by\s+/i, '');
        }
        continue;
      }

      // Global variables
      if (line.match(/^(VAR|CONST)\s+/)) {
        const variable = this.parseVariable(line);
        if (variable) {
          globalVariables.push(variable);
        }
        continue;
      }

      // Knot definition
      if (line.startsWith('===')) {
        if (currentKnot) {
          knots.push(currentKnot);
        }
        const knotName = line.replace(/^===\s*/, '').replace(/\s*===$/, '').trim();
        currentKnot = {
          name: knotName,
          content: '',
          stitches: [],
          choices: [],
        };
        currentStitch = null;
        continue;
      }

      // Stitch definition
      if (line.startsWith('=') && currentKnot) {
        if (currentStitch) {
          currentKnot.stitches.push(currentStitch);
        }
        const stitchName = line.replace(/^=\s*/, '').trim();
        currentStitch = {
          name: stitchName,
          content: '',
          choices: [],
        };
        continue;
      }

      // Choice
      if (line.startsWith('*') || line.startsWith('+')) {
        const choice = this.parseChoice(line);
        if (choice) {
          if (currentStitch) {
            currentStitch.choices.push(choice);
          } else if (currentKnot) {
            currentKnot.choices.push(choice);
          }
        }
        continue;
      }

      // Regular content
      if (currentStitch) {
        currentStitch.content += (currentStitch.content ? '\n' : '') + line;
      } else if (currentKnot) {
        currentKnot.content += (currentKnot.content ? '\n' : '') + line;
      }
    }

    // Add last knot
    if (currentKnot) {
      if (currentStitch) {
        currentKnot.stitches.push(currentStitch);
      }
      knots.push(currentKnot);
    }

    return {
      title,
      author,
      knots,
      globalVariables,
    };
  }

  private parseVariable(line: string): InkVariable | null {
    const match = line.match(/^(VAR|CONST)\s+(\w+)\s*=\s*(.+)$/);
    if (!match) return null;

    const type = match[1] as 'VAR' | 'CONST';
    const name = match[2];
    let value: any = match[3].trim();

    // Try to parse value
    try {
      value = JSON.parse(value);
    } catch {
      // Keep as string
    }

    return { name, value, type };
  }

  private parseChoice(line: string): InkChoice | null {
    // Remove leading * or +
    const content = line.replace(/^[*+]\s*/, '');

    // Extract text in brackets
    const textMatch = content.match(/\[([^\]]+)\]/);
    if (!textMatch) return null;

    const text = textMatch[1];

    // Extract target after ->
    const targetMatch = content.match(/->\s*(\w+)/);
    const target = targetMatch?.[1] || '';

    // Check for conditions
    const conditionMatch = content.match(/\{([^}]+)\}:/);
    const condition = conditionMatch?.[1];

    return {
      text,
      target,
      condition,
      once: line.startsWith('*'),
    };
  }

  /**
   * Convert Ink structure to Whisker Story
   */
  public convertToWhisker(inkStory: InkStory): Story {
    const passages = inkStory.knots.map((knot, index) => this.convertKnotToPassage(knot, index));

    const story = new StoryClass({
      metadata: {
        title: inkStory.title,
        author: inkStory.author || '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ...inkStory.metadata,
      },
      startPassage: passages[0]?.id || 'start',
    });

    // Add passages to story
    for (const passage of passages) {
      story.passages.set(passage.id, passage);
    }

    // Add variables
    for (const variable of inkStory.globalVariables) {
      const storyVar = new VariableClass({
        name: variable.name,
        initial: variable.value,
      });
      story.variables.set(variable.name, storyVar);
    }

    return story;
  }

  private convertKnotToPassage(knot: InkKnot, index: number): Passage {
    // Combine content and choices into Whisker format
    let content = knot.content;

    // Add choices as links
    for (const choice of knot.choices) {
      content += `\n\n[[${choice.text}|${choice.target}]]`;
    }

    // Add stitches as inline content (simplified)
    for (const stitch of knot.stitches) {
      content += `\n\n## ${stitch.name}\n${stitch.content}`;
      for (const choice of stitch.choices) {
        content += `\n[[${choice.text}|${choice.target}]]`;
      }
    }

    return new PassageClass({
      id: this.generateId(),
      title: knot.name,
      content: content.trim(),
      tags: [],
      position: knot.position || {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 200,
      },
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Main adapter class
 */
export class InkAdapter {
  private exporter = new InkExporter();
  private importer = new InkImporter();

  public export(story: Story): string {
    return this.exporter.exportToInk(story);
  }

  public import(inkScript: string): Story {
    return this.importer.importFromInk(inkScript);
  }
}
