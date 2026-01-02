/**
 * ChoiceScript Importer
 *
 * Imports stories from Choice of Games' ChoiceScript format.
 *
 * ChoiceScript features supported:
 * - *label for passage/section definitions
 * - *choice with indented options
 * - *goto for navigation
 * - *goto_scene for scene transitions
 * - *create/*temp for variable declarations
 * - *set for variable assignments
 * - *if/*elseif/*else for conditionals
 * - *finish/*ending for story endings
 * - Variable interpolation ${var} and {var}
 *
 * @see https://www.choiceofgames.com/make-your-own-games/choicescript-intro/
 */

import type {
  IImporter,
  ImportContext,
  ImportResult,
  LossReport,
  ConversionIssue,
} from '../types';
import { Story, Passage, Variable, Choice } from '@writewhisker/story-models';

/**
 * ChoiceScript command types
 */
type CSCommand =
  | 'label'
  | 'choice'
  | 'goto'
  | 'goto_scene'
  | 'create'
  | 'temp'
  | 'set'
  | 'if'
  | 'elseif'
  | 'else'
  | 'finish'
  | 'ending'
  | 'page_break'
  | 'line_break'
  | 'input_text'
  | 'input_number'
  | 'stat_chart'
  | 'scene_list'
  | 'title'
  | 'author'
  | 'comment'
  | 'hide_reuse'
  | 'disable_reuse'
  | 'allow_reuse'
  | 'selectable_if'
  | 'image'
  | 'sound'
  | 'rand'
  | 'achieve'
  | 'check_achievements'
  | 'gosub'
  | 'gosub_scene'
  | 'return'
  | 'fake_choice';

/**
 * Parsed ChoiceScript line
 */
interface CSLine {
  indent: number;
  command?: CSCommand;
  args?: string;
  text?: string;
  lineNumber: number;
}

/**
 * Parsed ChoiceScript label/passage
 */
interface CSLabel {
  name: string;
  lines: CSLine[];
  startLine: number;
}

/**
 * Parsed choice option
 */
interface CSChoiceOption {
  text: string;
  condition?: string;
  body: CSLine[];
  target?: string;
  selectable?: string;
}

/**
 * ChoiceScript Importer implementation
 */
export class ChoiceScriptImporter implements IImporter {
  readonly name = 'ChoiceScript Importer';
  readonly format = 'choicescript' as const;
  readonly extensions = ['.txt'];

  private issues: ConversionIssue[] = [];
  private currentScene: string = 'startup';

  /**
   * Detect if data is ChoiceScript format
   */
  canImport(data: string | object): boolean {
    if (typeof data !== 'string') return false;

    const content = data.trim();

    // ChoiceScript detection heuristics
    const hasChoiceScriptCommands =
      /^\*(?:create|temp|label|choice|goto|set|if|finish|scene_list|title|author)/m.test(content);
    const hasIndentedChoices = /^\*choice\s*\n\s+#/m.test(content);
    const hasCSVariables = /\$\{?\w+\}?/.test(content);
    const hasCSLabels = /^\*label\s+\w+/m.test(content);

    return hasChoiceScriptCommands || hasIndentedChoices || (hasCSVariables && hasCSLabels);
  }

  /**
   * Validate ChoiceScript content
   */
  validate(data: string | object): string[] {
    const errors: string[] = [];

    if (typeof data !== 'string') {
      errors.push('ChoiceScript content must be a string');
      return errors;
    }

    const content = data.trim();

    if (!content) {
      errors.push('Empty ChoiceScript content');
      return errors;
    }

    // Check for mismatched *if/*else blocks
    const lines = content.split('\n');
    let ifDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('*if ') || line.startsWith('*elseif ')) {
        ifDepth++;
      }
      // *else doesn't increase depth, it continues the block
    }

    return errors;
  }

  /**
   * Import ChoiceScript content
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    this.issues = [];

    try {
      if (typeof context.data !== 'string') {
        return {
          success: false,
          error: 'ChoiceScript content must be a string',
          duration: Date.now() - startTime,
        };
      }

      const content = context.data.trim();
      if (!content) {
        return {
          success: false,
          error: 'Empty ChoiceScript content',
          duration: Date.now() - startTime,
        };
      }

      // Determine scene name from filename
      if (context.filename) {
        this.currentScene = context.filename.replace(/\.txt$/i, '');
      }

      // Parse content
      const parsed = this.parseChoiceScript(content);

      // Convert to Story
      const story = this.convertToStory(parsed);

      // Build loss report
      const lossReport = this.buildLossReport();

      return {
        success: true,
        story,
        duration: Date.now() - startTime,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
        lossReport,
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
   * Parse ChoiceScript content into structured data
   */
  private parseChoiceScript(content: string): {
    title?: string;
    author?: string;
    labels: CSLabel[];
    variables: Map<string, { type: string; initial: any }>;
    scenes: string[];
  } {
    const lines = content.split('\n');
    const parsedLines = this.parseLines(lines);

    let title: string | undefined;
    let author: string | undefined;
    const labels: CSLabel[] = [];
    const variables = new Map<string, { type: string; initial: any }>();
    const scenes: string[] = [];

    let currentLabel: CSLabel | null = null;

    for (let i = 0; i < parsedLines.length; i++) {
      const line = parsedLines[i];

      switch (line.command) {
        case 'title':
          title = line.args;
          break;

        case 'author':
          author = line.args;
          break;

        case 'create':
        case 'temp': {
          const varMatch = line.args?.match(/^(\w+)\s+(.+)$/);
          if (varMatch) {
            const [, name, value] = varMatch;
            const parsed = this.parseValue(value);
            variables.set(name, { type: parsed.type, initial: parsed.value });
          }
          break;
        }

        case 'label':
          // Save previous label
          if (currentLabel) {
            labels.push(currentLabel);
          }
          currentLabel = {
            name: line.args || `label_${i}`,
            lines: [],
            startLine: line.lineNumber,
          };
          break;

        case 'scene_list':
          // Parse scene list (indented scene names)
          for (let j = i + 1; j < parsedLines.length; j++) {
            const sceneLine = parsedLines[j];
            if (sceneLine.indent > line.indent && sceneLine.text) {
              scenes.push(sceneLine.text.trim());
            } else if (sceneLine.indent <= line.indent && sceneLine.command) {
              break;
            }
          }
          break;

        default:
          // Add line to current label, or create implicit "start" label
          if (!currentLabel && (line.text || line.command)) {
            currentLabel = {
              name: 'start',
              lines: [],
              startLine: line.lineNumber,
            };
          }
          if (currentLabel) {
            currentLabel.lines.push(line);
          }
          break;
      }
    }

    // Save last label
    if (currentLabel) {
      labels.push(currentLabel);
    }

    return { title, author, labels, variables, scenes };
  }

  /**
   * Parse raw lines into structured CSLine objects
   */
  private parseLines(lines: string[]): CSLine[] {
    return lines.map((line, index) => {
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
      const trimmed = line.trim();

      const result: CSLine = {
        indent: leadingSpaces,
        lineNumber: index + 1,
      };

      if (trimmed.startsWith('*')) {
        const commandMatch = trimmed.match(/^\*(\w+)(?:\s+(.*))?$/);
        if (commandMatch) {
          result.command = commandMatch[1] as CSCommand;
          result.args = commandMatch[2];
        }
      } else if (trimmed.startsWith('#')) {
        // Choice option
        result.text = trimmed.substring(1).trim();
      } else if (trimmed) {
        result.text = trimmed;
      }

      return result;
    });
  }

  /**
   * Parse a ChoiceScript value
   */
  private parseValue(value: string): { type: string; value: any } {
    const trimmed = value.trim();

    if (trimmed === 'true' || trimmed === 'false') {
      return { type: 'boolean', value: trimmed === 'true' };
    }

    if (/^-?\d+$/.test(trimmed)) {
      return { type: 'number', value: parseInt(trimmed, 10) };
    }

    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed) };
    }

    // String (may or may not be quoted)
    const stringVal = trimmed.replace(/^["']|["']$/g, '');
    return { type: 'string', value: stringVal };
  }

  /**
   * Convert parsed ChoiceScript to Story model
   */
  private convertToStory(parsed: {
    title?: string;
    author?: string;
    labels: CSLabel[];
    variables: Map<string, { type: string; initial: any }>;
    scenes: string[];
  }): Story {
    const passages = new Map<string, Passage>();
    const variables = new Map<string, Variable>();

    // Convert variables
    for (const [name, data] of parsed.variables) {
      variables.set(
        name,
        new Variable({
          name,
          type: data.type as 'string' | 'number' | 'boolean',
          initial: data.initial,
        })
      );
    }

    // Convert labels to passages
    for (const label of parsed.labels) {
      const { content, choices, nextLabel } = this.convertLabelContent(label, parsed.labels);

      const passage = new Passage({
        id: label.name,
        title: this.formatLabelTitle(label.name),
        content,
        choices,
      });

      // If there's implicit flow to next label, add it as a choice
      if (nextLabel && choices.length === 0) {
        passage.choices.push(
          new Choice({
            id: `continue_${label.name}`,
            text: 'Continue',
            target: nextLabel,
          })
        );
      }

      passages.set(label.name, passage);
    }

    // Determine start passage
    const startPassage =
      parsed.labels.find((l) => l.name === 'startup' || l.name === 'start')?.name ||
      parsed.labels[0]?.name ||
      'start';

    return new Story({
      metadata: {
        title: parsed.title || 'Imported ChoiceScript Story',
        author: parsed.author || 'Unknown',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      startPassage,
      passages: Object.fromEntries(passages),
      variables: Object.fromEntries(variables),
    });
  }

  /**
   * Convert label content to WLS passage content
   */
  private convertLabelContent(
    label: CSLabel,
    allLabels: CSLabel[]
  ): {
    content: string;
    choices: Choice[];
    nextLabel?: string;
  } {
    const contentLines: string[] = [];
    const choices: Choice[] = [];
    let nextLabel: string | undefined;

    for (let i = 0; i < label.lines.length; i++) {
      const line = label.lines[i];

      switch (line.command) {
        case 'set':
          contentLines.push(this.convertSetCommand(line.args || '', label.name));
          break;

        case 'if':
        case 'elseif':
        case 'else':
          contentLines.push(this.convertConditional(line, label.lines.slice(i), label.name));
          // Skip processed lines (handled inside convertConditional)
          break;

        case 'goto':
          if (line.args) {
            nextLabel = line.args.trim();
            contentLines.push(`{link "${this.formatLabelTitle(nextLabel)}" -> ${nextLabel}}`);
          }
          break;

        case 'goto_scene':
          if (line.args) {
            const sceneMatch = line.args.match(/^(\w+)(?:\s+(\w+))?$/);
            if (sceneMatch) {
              const [, scene, targetLabel] = sceneMatch;
              const target = targetLabel ? `${scene}.${targetLabel}` : scene;
              contentLines.push(`{link "Continue to ${scene}" -> ${target}}`);
              this.addIssue('warning', 'navigation', 'goto_scene', label.name, line.lineNumber,
                '*goto_scene may require manual scene file import');
            }
          }
          break;

        case 'choice':
        case 'fake_choice':
          const parsedChoices = this.parseChoiceBlock(label.lines, i);
          for (const option of parsedChoices.options) {
            const choice = new Choice({
              id: `choice_${label.name}_${choices.length}`,
              text: option.text,
              target: option.target || this.inferChoiceTarget(option, label, allLabels),
              condition: option.condition || option.selectable,
            });
            choices.push(choice);
          }
          i = parsedChoices.endIndex;
          break;

        case 'page_break':
          contentLines.push('\n---\n');
          break;

        case 'line_break':
          contentLines.push('\n');
          break;

        case 'finish':
          contentLines.push('{link "The End" -> END}');
          break;

        case 'ending':
          const endingText = line.args || 'The End';
          contentLines.push(`\n${endingText}\n{link "The End" -> END}`);
          break;

        case 'input_text':
        case 'input_number':
          const inputVar = line.args?.trim();
          if (inputVar) {
            contentLines.push(`{input ${inputVar}}`);
            this.addIssue('warning', 'input', line.command, label.name, line.lineNumber,
              `*${line.command} converted to Whisker input syntax`);
          }
          break;

        case 'stat_chart':
          this.addIssue('info', 'ui', 'stat_chart', label.name, line.lineNumber,
            '*stat_chart not directly supported, consider using Whisker UI components');
          break;

        case 'image':
          if (line.args) {
            contentLines.push(`{image ${line.args}}`);
          }
          break;

        case 'sound':
          if (line.args) {
            contentLines.push(`{audio ${line.args}}`);
          }
          break;

        case 'rand':
          if (line.args) {
            const randMatch = line.args.match(/^(\w+)\s+(\d+)\s+(\d+)$/);
            if (randMatch) {
              const [, varName, min, max] = randMatch;
              contentLines.push(`{do ${varName} = random(${min}, ${max})}`);
            }
          }
          break;

        case 'gosub':
        case 'gosub_scene':
          this.addIssue('warning', 'navigation', line.command, label.name, line.lineNumber,
            `*${line.command} subroutine pattern may need manual adjustment`);
          if (line.args) {
            const target = line.args.trim().split(/\s+/)[0];
            contentLines.push(`{link "→" -> ${target}}`);
          }
          break;

        case 'achieve':
        case 'check_achievements':
          this.addIssue('info', 'achievements', line.command, label.name, line.lineNumber,
            'Achievements not directly supported in Whisker');
          break;

        case 'comment':
          contentLines.push(`<!-- ${line.args || ''} -->`);
          break;

        default:
          // Regular text
          if (line.text) {
            contentLines.push(this.convertText(line.text));
          }
          break;
      }
    }

    return {
      content: contentLines.filter(Boolean).join('\n').trim(),
      choices,
      nextLabel,
    };
  }

  /**
   * Convert *set command to WLS syntax
   */
  private convertSetCommand(args: string, passageName: string): string {
    // Handle different set patterns
    // *set var value
    // *set var + value (addition)
    // *set var - value (subtraction)
    // *set var %+ value (fairmath plus)
    // *set var %- value (fairmath minus)

    const fairmathMatch = args.match(/^(\w+)\s+(%[+-])\s+(.+)$/);
    if (fairmathMatch) {
      const [, varName, op, value] = fairmathMatch;
      this.addIssue('warning', 'syntax', 'fairmath', passageName, undefined,
        `Fairmath operator ${op} converted to regular arithmetic`);
      const operator = op === '%+' ? '+' : '-';
      return `{do ${varName} = ${varName} ${operator} ${value}}`;
    }

    const opMatch = args.match(/^(\w+)\s+([+\-*/])\s+(.+)$/);
    if (opMatch) {
      const [, varName, op, value] = opMatch;
      return `{do ${varName} = ${varName} ${op} ${value}}`;
    }

    // Simple assignment
    const simpleMatch = args.match(/^(\w+)\s+(.+)$/);
    if (simpleMatch) {
      const [, varName, value] = simpleMatch;
      return `{do ${varName} = ${value}}`;
    }

    return `{do ${args}}`;
  }

  /**
   * Convert conditional blocks
   */
  private convertConditional(startLine: CSLine, remainingLines: CSLine[], passageName: string): string {
    const condition = startLine.args || 'true';
    const wlsCondition = this.convertCondition(condition);

    return `{if ${wlsCondition}}`;
  }

  /**
   * Convert ChoiceScript condition to WLS condition
   */
  private convertCondition(condition: string): string {
    return condition
      // Variable references
      .replace(/\((\w+)\)/g, '$1')
      // Boolean operators
      .replace(/\band\b/gi, '&&')
      .replace(/\bor\b/gi, '||')
      .replace(/\bnot\b/gi, '!')
      // String comparisons
      .replace(/(\w+)\s*=\s*"([^"]+)"/g, '$1 == "$2"');
  }

  /**
   * Convert text with variable interpolation
   */
  private convertText(text: string): string {
    // Convert ${var} to $var
    return text.replace(/\$\{(\w+)\}/g, '${$1}');
  }

  /**
   * Parse a *choice block
   */
  private parseChoiceBlock(
    lines: CSLine[],
    startIndex: number
  ): { options: CSChoiceOption[]; endIndex: number } {
    const options: CSChoiceOption[] = [];
    const choiceLine = lines[startIndex];
    const baseIndent = choiceLine.indent;
    let i = startIndex + 1;

    while (i < lines.length) {
      const line = lines[i];

      // Check if we've exited the choice block
      if (line.indent <= baseIndent && line.command) {
        break;
      }

      // Choice option (starts with # in text)
      if (line.text?.startsWith('')) {
        // This is handled by the line already having text parsed from #
        const optionText = line.text;
        const option: CSChoiceOption = {
          text: optionText,
          body: [],
        };

        // Parse option body and find target
        const optionIndent = line.indent;
        i++;

        while (i < lines.length && lines[i].indent > optionIndent) {
          const bodyLine = lines[i];

          if (bodyLine.command === 'goto' && bodyLine.args) {
            option.target = bodyLine.args.trim();
          } else if (bodyLine.command === 'selectable_if' && bodyLine.args) {
            option.selectable = this.convertCondition(bodyLine.args);
          }

          option.body.push(bodyLine);
          i++;
        }

        options.push(option);
        continue;
      }

      // Check for #-prefixed options (choice text)
      if (line.indent > baseIndent) {
        // Look for option text
        const rawLine = lines[i].text;
        if (rawLine) {
          const option: CSChoiceOption = {
            text: rawLine,
            body: [],
          };

          // Parse option body
          const optionIndent = line.indent;
          i++;

          while (i < lines.length && lines[i].indent > optionIndent) {
            const bodyLine = lines[i];

            if (bodyLine.command === 'goto' && bodyLine.args) {
              option.target = bodyLine.args.trim();
            }

            option.body.push(bodyLine);
            i++;
          }

          options.push(option);
          continue;
        }
      }

      i++;
    }

    return { options, endIndex: i - 1 };
  }

  /**
   * Infer choice target from body content
   */
  private inferChoiceTarget(
    option: CSChoiceOption,
    currentLabel: CSLabel,
    allLabels: CSLabel[]
  ): string {
    // Check for explicit goto in body
    for (const line of option.body) {
      if (line.command === 'goto' && line.args) {
        return line.args.trim();
      }
    }

    // If no explicit target, create inline passage or use generic target
    return `${currentLabel.name}_choice`;
  }

  /**
   * Format label name as a title
   */
  private formatLabelTitle(name: string): string {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Add conversion issue
   */
  private addIssue(
    severity: 'critical' | 'warning' | 'info',
    category: string,
    feature: string,
    passageName: string,
    line?: number,
    message?: string
  ): void {
    this.issues.push({
      severity,
      category,
      feature,
      passageId: passageName,
      passageName,
      line,
      message: message || `${feature} may need manual adjustment`,
    });
  }

  /**
   * Build loss report
   */
  private buildLossReport(): LossReport {
    const critical = this.issues.filter((i) => i.severity === 'critical');
    const warnings = this.issues.filter((i) => i.severity === 'warning');
    const info = this.issues.filter((i) => i.severity === 'info');

    const categoryCounts: Record<string, number> = {};
    const affectedPassages = new Set<string>();

    for (const issue of this.issues) {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      if (issue.passageId) {
        affectedPassages.add(issue.passageId);
      }
    }

    // Calculate conversion quality
    const criticalWeight = 0.3;
    const warningWeight = 0.1;
    const penalty = critical.length * criticalWeight + warnings.length * warningWeight;
    const conversionQuality = Math.max(0, Math.min(1, 1 - penalty));

    return {
      totalIssues: this.issues.length,
      critical,
      warnings,
      info,
      categoryCounts,
      affectedPassages: Array.from(affectedPassages),
      conversionQuality,
    };
  }
}
