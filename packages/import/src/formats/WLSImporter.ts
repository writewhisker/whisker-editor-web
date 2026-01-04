/**
 * WLS Importer
 *
 * Imports stories from WLS (Whisker Language Specification) 1.0 text format.
 */

import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';
import { parse } from '@writewhisker/parser';
import type {
  StoryNode,
  PassageNode,
  ChoiceNode,
  VariableDeclarationNode,
  ContentNode,
  TextNode,
  InterpolationNode,
  ConditionalNode,
  AlternativesNode,
} from '@writewhisker/parser';
import type {
  ImportContext,
  ImportResult,
  IImporter,
  ConversionIssue,
  LossReport,
} from '../types';

/**
 * WLS Importer
 *
 * Imports stories from WLS 1.0 text format (.ws files).
 */
export class WLSImporter implements IImporter {
  readonly name = 'WLS Importer';
  readonly format = 'wls' as const;
  readonly extensions = ['.ws', '.wls'];

  /**
   * Import a story from WLS format
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const issues: ConversionIssue[] = [];

    try {
      // Parse WLS content
      const content = typeof context.data === 'string'
        ? context.data
        : JSON.stringify(context.data);

      const parseResult = parse(content);

      // Collect parse errors as warnings
      for (const error of parseResult.errors) {
        issues.push({
          severity: 'warning',
          category: 'syntax',
          feature: 'WLS syntax',
          line: error.location.start.line,
          original: error.message,
          message: `Parse error at line ${error.location.start.line}: ${error.message}`,
          suggestion: error.suggestion,
        });
      }

      // Convert AST to Story model
      if (!parseResult.ast) {
        return {
          success: false,
          error: 'Failed to parse WLS content',
          duration: Date.now() - startTime,
        };
      }
      const story = this.convertToStory(parseResult.ast, issues);

      // Add warnings from parse errors
      for (const issue of issues) {
        if (issue.severity === 'warning' || issue.severity === 'info') {
          warnings.push(issue.message);
        }
      }

      // Validate story structure
      if (!story.metadata?.title) {
        warnings.push('Story has no title');
      }

      if (story.passages.size === 0) {
        warnings.push('Story has no passages');
      }

      if (!story.startPassage) {
        warnings.push('Story has no start passage set');
      }

      const duration = Date.now() - startTime;

      // Build loss report if there are issues
      let lossReport: LossReport | undefined;
      if (issues.length > 0) {
        lossReport = this.buildLossReport(issues);
      }

      return {
        success: true,
        story,
        duration,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
        warnings: warnings.length > 0 ? warnings : undefined,
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
   * Check if data can be imported by this importer
   */
  canImport(data: string | object): boolean {
    if (typeof data !== 'string') {
      return false;
    }

    const trimmed = data.trim();

    // Check for WLS markers
    // Story header: @title:, @author:, @version:, @ifid:, @start:
    // Passage header: :: PassageName
    // Variable declaration: @vars
    const wlsPatterns = [
      /^@title\s*:/m,        // @title: directive
      /^@author\s*:/m,       // @author: directive
      /^@version\s*:/m,      // @version: directive
      /^@start\s*:/m,        // @start: directive
      /^@vars\s*$/m,         // @vars block
      /^::\s*\S+/m,          // Passage header
    ];

    return wlsPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Validate import data
   */
  validate(data: string | object): string[] {
    const errors: string[] = [];

    if (typeof data !== 'string') {
      errors.push('WLS import requires string data');
      return errors;
    }

    // Try parsing to check for errors
    const parseResult = parse(data);

    for (const error of parseResult.errors) {
      errors.push(`Line ${error.location.start.line}: ${error.message}`);
    }

    // Check for required content
    if (!parseResult.ast) {
      errors.push('Failed to parse WLS file');
    } else if (parseResult.ast.passages.length === 0) {
      errors.push('No passages found in WLS file');
    }

    return errors;
  }

  /**
   * Get format version from data
   */
  getFormatVersion(data: string | object): string {
    if (typeof data !== 'string') {
      return 'unknown';
    }

    // Look for @version: directive (WLS 1.0 format uses colon)
    const versionMatch = data.match(/^@version\s*:\s*(.+)$/m);
    return versionMatch ? versionMatch[1].trim() : '1.0';
  }

  /**
   * Convert parsed AST to Story model
   */
  private convertToStory(ast: StoryNode, issues: ConversionIssue[]): Story {
    // Extract metadata from directives
    let title = 'Untitled Story';
    let author = '';
    let version = '1.0.0';
    let description: string | undefined;
    let ifid: string | undefined;

    // Parser uses 'key' for directive name
    for (const directive of ast.metadata) {
      switch (directive.key) {
        case 'title':
          title = directive.value;
          break;
        case 'author':
          author = directive.value;
          break;
        case 'version':
          version = directive.value;
          break;
        case 'ifid':
          ifid = directive.value;
          break;
        case 'start':
          // Will be used for startPassage
          break;
        case 'description':
          description = directive.value;
          break;
      }
    }

    // Convert passages first to build the passages map
    const passagesMap: Record<string, ReturnType<Passage['serialize']>> = {};
    const convertedPassages: Passage[] = [];
    for (const passageNode of ast.passages) {
      const passage = this.convertPassage(passageNode, issues);
      passagesMap[passage.id] = passage.serialize();
      convertedPassages.push(passage);
    }

    // Create story with passages (avoids default "Start" passage creation)
    const now = new Date().toISOString();
    const story = new Story({
      metadata: {
        title,
        author,
        version,
        description,
        ifid,
        created: now,
        modified: now,
      },
      passages: passagesMap,
    });

    // Convert variables
    for (const varDecl of ast.variables) {
      const variable = this.convertVariable(varDecl);
      story.addVariable(variable);
    }

    // Set start passage (parser uses 'key' for directive name)
    const startDirective = ast.metadata.find(d => d.key === 'start');
    if (startDirective && typeof startDirective.value === 'string') {
      // Find passage by title
      const startPassage = convertedPassages.find(p => p.title === startDirective.value);
      if (startPassage) {
        story.startPassage = startPassage.id;
      }
    } else if (convertedPassages.length > 0) {
      // Default to first passage
      story.startPassage = convertedPassages[0].id;
    }

    return story;
  }

  /**
   * Convert variable declaration to Variable model
   */
  private convertVariable(varDecl: VariableDeclarationNode): Variable {
    // Convert AST expression to initial value
    let initial: string | number | boolean = '';
    let type: 'string' | 'number' | 'boolean' = 'string';

    if (varDecl.initialValue) {
      const expr = varDecl.initialValue;
      if (expr.type === 'literal' && 'value' in expr) {
        const value = (expr as { value: unknown }).value;
        if (typeof value === 'number') {
          initial = value;
          type = 'number';
        } else if (typeof value === 'boolean') {
          initial = value;
          type = 'boolean';
        } else {
          initial = String(value);
          type = 'string';
        }
      }
    }

    return new Variable({
      name: varDecl.name,
      type,
      initial,
      scope: varDecl.scope || 'story',
    });
  }

  /**
   * Convert passage node to Passage model
   */
  private convertPassage(passageNode: PassageNode, issues: ConversionIssue[]): Passage {
    // Separate choices from other content
    const choiceNodes = passageNode.content.filter(
      (node): node is ChoiceNode => node.type === 'choice'
    );
    const nonChoiceContent = passageNode.content.filter(
      node => node.type !== 'choice'
    );

    // Convert non-choice content to text
    const content = this.contentToText(nonChoiceContent, issues);

    // Create passage (note: parser uses 'name', not 'title')
    const passage = new Passage({
      title: passageNode.name,
      content,
      tags: passageNode.tags,
    });

    // Convert choices from content
    for (const choiceNode of choiceNodes) {
      const choice = this.convertChoice(choiceNode, issues);
      passage.addChoice(choice);
    }

    // Extract passage metadata directives (note: parser uses 'key', not 'directive')
    if (passageNode.metadata) {
      for (const metaNode of passageNode.metadata) {
        switch (metaNode.key) {
          case 'fallback':
            passage.setMetadata('fallback', metaNode.value);
            break;
          case 'onEnter':
            passage.onEnterScript = metaNode.value;
            break;
          case 'onExit':
            passage.onExitScript = metaNode.value;
            break;
        }
      }
    }

    return passage;
  }

  /**
   * Convert choice node to Choice model
   */
  private convertChoice(choiceNode: ChoiceNode, issues: ConversionIssue[]): Choice {
    // Parser uses 'choiceType' directly ('once' or 'sticky')
    return new Choice({
      text: this.contentToText(choiceNode.text, issues),
      target: choiceNode.target || undefined,
      condition: choiceNode.condition
        ? this.expressionToString(choiceNode.condition)
        : undefined,
      action: choiceNode.action
        ? this.actionsToString(choiceNode.action)
        : undefined,
      choiceType: choiceNode.choiceType,
    });
  }

  /**
   * Convert action expressions to string
   */
  private actionsToString(actions: unknown[] | unknown): string {
    if (Array.isArray(actions)) {
      return actions.map(a => this.expressionToString(a)).join('; ');
    }
    return this.expressionToString(actions);
  }

  /**
   * Convert content nodes to plain text (preserving WLS syntax for editor)
   */
  private contentToText(content: ContentNode[], issues: ConversionIssue[]): string {
    let result = '';

    for (const node of content) {
      switch (node.type) {
        case 'text':
          result += (node as TextNode).value;
          break;

        case 'interpolation': {
          const interp = node as InterpolationNode;
          if (interp.expression.type === 'variable') {
            // Simple variable: $var
            const varNode = interp.expression;
            const prefix = varNode.scope === 'temp' ? '_' : '';
            result += `$${prefix}${varNode.name}`;
          } else {
            // Expression: ${expr}
            result += `\${${this.expressionToString(interp.expression)}}`;
          }
          break;
        }

        case 'conditional': {
          const cond = node as ConditionalNode;
          // Block conditional
          result += `{${this.expressionToString(cond.condition)}}`;
          if (cond.consequent) {
            result += this.contentToText(cond.consequent, issues);
          }
          if (cond.alternatives) {
            for (const elif of cond.alternatives) {
              result += `{elif ${this.expressionToString(elif.condition)}}`;
              result += this.contentToText(elif.content, issues);
            }
          }
          if (cond.alternate) {
            result += `{else}`;
            result += this.contentToText(cond.alternate, issues);
          }
          result += `{/}`;
          break;
        }

        case 'alternatives': {
          const alt = node as AlternativesNode;
          const mode = alt.mode !== 'sequence' ? `:${alt.mode}` : '';
          const items = alt.options.map(item => this.contentToText(item, issues)).join(' | ');
          result += `{|${mode} ${items}}`;
          break;
        }

        case 'expression_statement': {
          result += `{\$ ${this.expressionToString(node.expression)}}`;
          break;
        }

        default:
          issues.push({
            severity: 'info',
            category: 'content',
            feature: `Unknown content type: ${(node as ContentNode).type}`,
            message: `Skipped unknown content node type: ${(node as ContentNode).type}`,
          });
      }
    }

    return result;
  }

  /**
   * Convert expression node to string representation
   */
  private expressionToString(expr: unknown): string {
    if (!expr || typeof expr !== 'object') {
      return String(expr);
    }

    const node = expr as Record<string, unknown>;

    switch (node.type) {
      case 'variable':
        const prefix = node.scope === 'temp' ? '_' : '';
        return `${prefix}${node.name}`;

      case 'literal':
        if (node.valueType === 'string') {
          return `"${node.value}"`;
        }
        return String(node.value);

      case 'identifier':
        return String(node.name);

      case 'binary_expression':
        return `${this.expressionToString(node.left)} ${node.operator} ${this.expressionToString(node.right)}`;

      case 'unary_expression':
        if (node.operator === 'not') {
          return `not ${this.expressionToString(node.argument)}`;
        }
        return `${node.operator}${this.expressionToString(node.argument)}`;

      case 'call_expression':
        const args = (node.arguments as unknown[])
          .map(arg => this.expressionToString(arg))
          .join(', ');
        return `${this.expressionToString(node.callee)}(${args})`;

      case 'member_expression':
        return `${this.expressionToString(node.object)}.${this.expressionToString(node.property)}`;

      case 'assignment_expression':
        return `${this.expressionToString(node.target)} ${node.operator || '='} ${this.expressionToString(node.value)}`;

      default:
        return '[expression]';
    }
  }

  /**
   * Build loss report from conversion issues
   */
  private buildLossReport(issues: ConversionIssue[]): LossReport {
    const critical = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');

    const categoryCounts: Record<string, number> = {};
    const affectedPassages = new Set<string>();

    for (const issue of issues) {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      if (issue.passageId) {
        affectedPassages.add(issue.passageId);
      }
    }

    return {
      totalIssues: issues.length,
      critical,
      warnings,
      info,
      categoryCounts,
      affectedPassages: Array.from(affectedPassages),
      conversionQuality: critical.length > 0 ? 0.5 : warnings.length > 0 ? 0.8 : 1.0,
    };
  }
}
