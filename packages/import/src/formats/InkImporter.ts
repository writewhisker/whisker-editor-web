/**
 * Ink Importer
 *
 * Imports stories from Ink narrative scripting language format (.ink files).
 * Converts Ink syntax to WLS 1.0 Story model.
 *
 * Supported Ink features:
 * - Knots (=== knot_name ===) -> Passages
 * - Stitches (= stitch_name) -> Sub-passages or inline content
 * - Variables (VAR name = value) -> Story variables
 * - Choices (* [text] / + [sticky]) -> Choices
 * - Diverts (-> target) -> Navigation
 * - Gathers (-) -> Gather points
 * - Conditionals ({ condition: text }) -> Conditionals
 * - Tunnels (-> target -> and <-) -> Tunnel calls/returns
 *
 * Limitations:
 * - Threads are converted to sequential content
 * - External functions require manual implementation
 * - Some advanced list operations may be simplified
 */

import { Story, Passage, Choice, Variable } from '@writewhisker/core-ts';
import type {
  ImportContext,
  ImportResult,
  IImporter,
  ConversionIssue,
  LossReport,
} from '../types';

/**
 * Parsed Ink knot/stitch structure
 */
interface InkKnot {
  name: string;
  content: string[];
  stitches: Map<string, string[]>;
  isFunction?: boolean;
}

/**
 * Parsed Ink story structure
 */
interface ParsedInkStory {
  title: string;
  author?: string;
  variables: Map<string, { value: string; type: string }>;
  knots: Map<string, InkKnot>;
  includes: string[];
  externalFunctions: string[];
}

/**
 * Ink Importer
 *
 * Imports stories from Ink format with conversion to WLS 1.0.
 */
export class InkImporter implements IImporter {
  readonly name = 'Ink Importer';
  readonly format = 'ink' as const;
  readonly extensions = ['.ink'];

  private issues: ConversionIssue[] = [];
  private currentKnot: string = '';

  /**
   * Import a story from Ink format
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    this.issues = [];

    try {
      const content = typeof context.data === 'string'
        ? context.data
        : JSON.stringify(context.data);

      // Parse Ink content
      const parsed = this.parseInk(content);

      // Convert to Story model
      const story = this.convertToStory(parsed);

      // Build loss report
      const lossReport = this.buildLossReport();

      const duration = Date.now() - startTime;

      return {
        success: true,
        story,
        duration,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
        lossReport,
        warnings: this.issues
          .filter(i => i.severity === 'warning')
          .map(i => i.message),
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
   * Check if data can be imported as Ink
   */
  canImport(data: string | object): boolean {
    if (typeof data !== 'string') return false;

    // Check for Ink-specific patterns
    const hasKnot = /^===\s*\w+\s*===?\s*$/m.test(data);
    const hasChoice = /^\s*[*+]\s*\[/.test(data);
    const hasVar = /^\s*VAR\s+\w+\s*=/m.test(data);
    const hasDivert = /->\s*\w+/.test(data);

    // At least two Ink patterns should match
    const matches = [hasKnot, hasChoice, hasVar, hasDivert].filter(Boolean).length;
    return matches >= 2;
  }

  /**
   * Validate Ink data
   */
  validate(data: string | object): string[] {
    const errors: string[] = [];

    if (typeof data !== 'string') {
      errors.push('Ink import requires string content');
      return errors;
    }

    // Check for basic Ink structure
    if (!data.trim()) {
      errors.push('Empty Ink content');
    }

    // Check for unmatched braces
    const openBraces = (data.match(/{/g) || []).length;
    const closeBraces = (data.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }

    return errors;
  }

  /**
   * Parse Ink content into intermediate structure
   */
  private parseInk(content: string): ParsedInkStory {
    const story: ParsedInkStory = {
      title: 'Untitled Ink Story',
      variables: new Map(),
      knots: new Map(),
      includes: [],
      externalFunctions: [],
    };

    const lines = content.split('\n');
    let currentKnot: InkKnot | null = null;
    let currentStitch: string | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Block comments
      if (trimmed.startsWith('/*')) {
        while (i < lines.length && !lines[i].includes('*/')) i++;
        continue;
      }

      // Include directive
      if (trimmed.startsWith('INCLUDE')) {
        const include = trimmed.match(/INCLUDE\s+(.+)/)?.[1];
        if (include) {
          story.includes.push(include.trim());
          this.addIssue('info', 'include', 'INCLUDE directive',
            `INCLUDE ${include} - external files not automatically resolved`);
        }
        continue;
      }

      // External function declaration
      if (trimmed.startsWith('EXTERNAL')) {
        const func = trimmed.match(/EXTERNAL\s+(\w+)/)?.[1];
        if (func) {
          story.externalFunctions.push(func);
          this.addIssue('warning', 'external', 'EXTERNAL function',
            `External function ${func} requires manual implementation`);
        }
        continue;
      }

      // Variable declaration
      const varMatch = trimmed.match(/^VAR\s+(\w+)\s*=\s*(.+)$/);
      if (varMatch) {
        const [, name, value] = varMatch;
        story.variables.set(name, {
          value: value.trim(),
          type: this.inferType(value.trim()),
        });
        continue;
      }

      // Constant declaration
      const constMatch = trimmed.match(/^CONST\s+(\w+)\s*=\s*(.+)$/);
      if (constMatch) {
        const [, name, value] = constMatch;
        story.variables.set(name, {
          value: value.trim(),
          type: this.inferType(value.trim()),
        });
        continue;
      }

      // Knot header (=== knot_name ===)
      const knotMatch = trimmed.match(/^===\s*(\w+)\s*(?:\((.*?)\))?\s*===?$/);
      if (knotMatch) {
        // Save previous knot
        if (currentKnot) {
          if (currentStitch) {
            currentKnot.stitches.set(currentStitch, [...currentContent]);
          } else {
            currentKnot.content = [...currentContent];
          }
          story.knots.set(currentKnot.name, currentKnot);
        }

        const [, name, params] = knotMatch;
        currentKnot = {
          name,
          content: [],
          stitches: new Map(),
          isFunction: !!params,
        };
        currentStitch = null;
        currentContent = [];
        this.currentKnot = name;

        if (params) {
          this.addIssue('warning', 'function', 'Parameterized knot',
            `Knot ${name} has parameters - converted to regular passage`, name);
        }
        continue;
      }

      // Function header (=== function name(params) ===)
      const funcMatch = trimmed.match(/^===\s*function\s+(\w+)\s*\((.*?)\)\s*===?$/);
      if (funcMatch) {
        if (currentKnot) {
          if (currentStitch) {
            currentKnot.stitches.set(currentStitch, [...currentContent]);
          } else {
            currentKnot.content = [...currentContent];
          }
          story.knots.set(currentKnot.name, currentKnot);
        }

        const [, name] = funcMatch;
        currentKnot = {
          name,
          content: [],
          stitches: new Map(),
          isFunction: true,
        };
        currentStitch = null;
        currentContent = [];
        this.currentKnot = name;

        this.addIssue('warning', 'function', 'Ink function',
          `Function ${name} converted to tunnel passage`, name);
        continue;
      }

      // Stitch header (= stitch_name)
      const stitchMatch = trimmed.match(/^=\s*(\w+)\s*$/);
      if (stitchMatch && currentKnot) {
        // Save previous stitch content
        if (currentStitch) {
          currentKnot.stitches.set(currentStitch, [...currentContent]);
        } else {
          currentKnot.content = [...currentContent];
        }

        currentStitch = stitchMatch[1];
        currentContent = [];
        continue;
      }

      // Regular content line
      currentContent.push(line);
    }

    // Save last knot
    if (currentKnot) {
      if (currentStitch) {
        currentKnot.stitches.set(currentStitch, [...currentContent]);
      } else {
        currentKnot.content = [...currentContent];
      }
      story.knots.set(currentKnot.name, currentKnot);
    }

    // If no knots, create implicit Start
    if (story.knots.size === 0 && lines.some(l => l.trim())) {
      story.knots.set('Start', {
        name: 'Start',
        content: lines.filter(l => !l.trim().startsWith('VAR') && !l.trim().startsWith('CONST')),
        stitches: new Map(),
      });
    }

    return story;
  }

  /**
   * Convert parsed Ink to Story model
   */
  private convertToStory(parsed: ParsedInkStory): Story {
    const passages = new Map<string, Passage>();
    const variables = new Map<string, Variable>();

    // Convert variables
    for (const [name, { value, type }] of parsed.variables) {
      variables.set(name, new Variable({
        name,
        type: type as 'string' | 'number' | 'boolean',
        initial: this.parseValue(value, type),
        scope: 'story',
      }));
    }

    // Convert knots to passages
    for (const [knotName, knot] of parsed.knots) {
      // Convert main knot content
      const { content, choices } = this.convertContent(knot.content, knotName);

      const passage = new Passage({
        id: knotName,
        title: knotName,
        content,
      });

      // Add choices
      for (const choice of choices) {
        passage.addChoice(choice);
      }

      passages.set(knotName, passage);

      // Convert stitches as separate passages
      for (const [stitchName, stitchContent] of knot.stitches) {
        const fullName = `${knotName}.${stitchName}`;
        const { content: sContent, choices: sChoices } = this.convertContent(stitchContent, fullName);

        const stitchPassage = new Passage({
          id: fullName,
          title: fullName,
          content: sContent,
        });

        for (const choice of sChoices) {
          stitchPassage.addChoice(choice);
        }

        passages.set(fullName, stitchPassage);
      }
    }

    // Determine start passage
    let startPassage = 'Start';
    if (!passages.has('Start') && passages.size > 0) {
      startPassage = passages.keys().next().value ?? 'Start';
    }

    return new Story({
      startPassage,
      passages: Object.fromEntries(passages),
      variables: Object.fromEntries(variables),
      metadata: {
        title: parsed.title,
        author: parsed.author,
      },
    });
  }

  /**
   * Convert Ink content lines to WLS content and choices
   */
  private convertContent(lines: string[], passageName: string): { content: string; choices: Choice[] } {
    const contentParts: string[] = [];
    const choices: Choice[] = [];
    let choiceIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Choice (* or +)
      const choiceMatch = trimmed.match(/^([*+]+)\s*(?:\[([^\]]*)\])?\s*(.*)$/);
      if (choiceMatch) {
        const [, markers, bracketText, afterText] = choiceMatch;
        const isSticky = markers.startsWith('+');
        const depth = markers.length;

        // Extract target from divert
        let target = '';
        let text = bracketText || afterText || 'Continue';
        let remainingText = afterText || '';

        const divertMatch = remainingText.match(/->\s*(\w+(?:\.\w+)?)/);
        if (divertMatch) {
          target = divertMatch[1];
          remainingText = remainingText.replace(/->\s*\w+(?:\.\w+)?/, '').trim();
        }

        // If no explicit divert, use fallthrough
        if (!target && passageName) {
          // Will be handled by gather or next knot
        }

        const choice = new Choice({
          id: `${passageName}_choice_${choiceIndex++}`,
          text: text.trim() || 'Continue',
          target: target || undefined,
        });

        choices.push(choice);
        continue;
      }

      // Gather point (-)
      if (trimmed.match(/^-+\s*/)) {
        const gatherContent = trimmed.replace(/^-+\s*/, '');
        if (gatherContent) {
          contentParts.push(gatherContent);
        }
        continue;
      }

      // Divert (-> target)
      const divertMatch = trimmed.match(/^->\s*(\w+(?:\.\w+)?)\s*$/);
      if (divertMatch) {
        const target = divertMatch[1];
        // Add as navigation choice if at end of content
        choices.push(new Choice({
          id: `${passageName}_divert_${choiceIndex++}`,
          text: 'Continue',
          target,
        }));
        continue;
      }

      // Tunnel call (-> target ->)
      const tunnelMatch = trimmed.match(/^->\s*(\w+(?:\.\w+)?)\s*->$/);
      if (tunnelMatch) {
        contentParts.push(`-> ${tunnelMatch[1]} ->`);
        continue;
      }

      // Tunnel return (<-)
      if (trimmed === '<-') {
        contentParts.push('<-');
        continue;
      }

      // Variable assignment (~ var = value)
      const assignMatch = trimmed.match(/^~\s*(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const [, varName, value] = assignMatch;
        contentParts.push(`{do ${varName} = ${this.convertExpression(value)}}`);
        continue;
      }

      // Conditional content ({ condition: text } or { condition })
      const condMatch = trimmed.match(/^\{([^}]+)\}$/);
      if (condMatch) {
        const inner = condMatch[1];
        if (inner.includes(':')) {
          // Inline conditional
          const [cond, text] = inner.split(':').map(s => s.trim());
          contentParts.push(`{${this.convertExpression(cond)}: ${text} | }`);
        } else if (inner.includes('|')) {
          // Alternatives
          contentParts.push(`{| ${inner} }`);
        } else {
          // Just condition check or variable interpolation
          contentParts.push(`\${${this.convertExpression(inner)}}`);
        }
        continue;
      }

      // Regular text (convert inline Ink syntax)
      let converted = line;

      // Convert inline variable references {var}
      converted = converted.replace(/\{(\w+)\}/g, (_, v) => `\$${v}`);

      // Convert inline conditionals {cond: text}
      converted = converted.replace(/\{([^:}]+):([^}]+)\}/g,
        (_, cond, text) => `{${this.convertExpression(cond.trim())}: ${text.trim()} | }`);

      contentParts.push(converted);
    }

    return {
      content: contentParts.join('\n'),
      choices,
    };
  }

  /**
   * Convert Ink expression to WLS expression
   */
  private convertExpression(expr: string): string {
    let result = expr.trim();

    // Convert 'and' to &&, 'or' to ||, 'not' to !
    result = result.replace(/\band\b/g, '&&');
    result = result.replace(/\bor\b/g, '||');
    result = result.replace(/\bnot\b/g, '!');

    // Convert equals comparison
    result = result.replace(/\s*==\s*/g, ' == ');
    result = result.replace(/\s*!=\s*/g, ' != ');

    return result;
  }

  /**
   * Infer type from value string
   */
  private inferType(value: string): string {
    if (value === 'true' || value === 'false') return 'boolean';
    if (/^-?\d+$/.test(value)) return 'number';
    if (/^-?\d+\.\d+$/.test(value)) return 'number';
    if (value.startsWith('"') || value.startsWith("'")) return 'string';
    return 'string';
  }

  /**
   * Parse value string to typed value
   */
  private parseValue(value: string, type: string): string | number | boolean {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      default:
        return value.replace(/^["']|["']$/g, '');
    }
  }

  /**
   * Add conversion issue
   */
  private addIssue(
    severity: 'critical' | 'warning' | 'info',
    category: string,
    feature: string,
    message: string,
    passageName?: string
  ): void {
    this.issues.push({
      severity,
      category,
      feature,
      message,
      passageName,
      passageId: passageName,
    });
  }

  /**
   * Build loss report from collected issues
   */
  private buildLossReport(): LossReport {
    const critical = this.issues.filter(i => i.severity === 'critical');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const info = this.issues.filter(i => i.severity === 'info');

    const categoryCounts: Record<string, number> = {};
    for (const issue of this.issues) {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    }

    const affectedPassages = [...new Set(
      this.issues.filter(i => i.passageName).map(i => i.passageName!)
    )];

    // Calculate quality (1.0 = perfect, 0.0 = all critical)
    const criticalWeight = 0.3;
    const warningWeight = 0.1;
    const quality = Math.max(0, 1 - (critical.length * criticalWeight) - (warnings.length * warningWeight));

    return {
      totalIssues: this.issues.length,
      critical,
      warnings,
      info,
      categoryCounts,
      affectedPassages,
      conversionQuality: quality,
    };
  }
}
