/**
 * WLS 1.0 Expression Validator
 *
 * Validates Lua expressions used in WLS constructs:
 * - Expression interpolations ${expr}
 * - Conditional expressions {if expr}
 * - Choice conditions [text]{if expr}
 */

import type { Story } from '@writewhisker/story-models';
import { parse } from '@writewhisker/parser';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class WlsExpressionValidator implements Validator {
  name = 'wls_expressions';
  category = 'expression' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Parse passage content to validate expressions
      const wlsContent = this.buildWlsContent(passage);
      const result = parse(wlsContent);

      // Look for expression-related parse errors
      for (const error of result.errors) {
        if (this.isExpressionError(error.message)) {
          issues.push({
            id: `wls_expr_${passage.id}_${error.location.start.line}_${error.location.start.column}`,
            code: 'WLS-EXP-007',
            severity: 'error',
            category: 'expression',
            message: `Expression error in "${passage.title}"`,
            description: `${error.message}${error.suggestion ? `. ${error.suggestion}` : ''}`,
            passageId: passage.id,
            passageTitle: passage.title,
            context: { passageName: passage.title },
            fixable: false,
          });
        }
      }

      // Check for common expression mistakes in content
      const textIssues = this.findExpressionIssues(passage.content, passage.id);
      for (const issue of textIssues) {
        issues.push({
          ...issue,
          passageId: passage.id,
          passageTitle: passage.title,
        });
      }

      // Check choice conditions
      for (const choice of passage.choices) {
        if (choice.condition) {
          const conditionIssues = this.validateCondition(choice.condition, passage.id, choice.id);
          for (const issue of conditionIssues) {
            issues.push({
              ...issue,
              passageId: passage.id,
              passageTitle: passage.title,
              choiceId: choice.id,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Build WLS content from a passage for parsing
   */
  private buildWlsContent(passage: { id: string; title: string; content: string; choices: Array<{ text: string; target?: string; condition?: string }> }): string {
    let wlsContent = `:: ${passage.title}\n`;
    wlsContent += passage.content;

    for (const choice of passage.choices) {
      wlsContent += `\n+ [${choice.text}]`;
      if (choice.condition) {
        wlsContent += `{if ${choice.condition}}`;
      }
      if (choice.target) {
        wlsContent += ` -> ${choice.target}`;
      }
    }

    return wlsContent;
  }

  /**
   * Check if a parse error is expression-related
   */
  private isExpressionError(message: string): boolean {
    const expressionKeywords = [
      'expression',
      'operator',
      'operand',
      'unexpected token',
      'expected',
      'parenthesis',
      'bracket',
    ];
    const lowerMessage = message.toLowerCase();
    return expressionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Find common expression issues in text
   */
  private findExpressionIssues(text: string, passageId: string): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Check for empty expressions ${}
    const emptyExprPattern = /\$\{\s*\}/g;
    let match;
    while ((match = emptyExprPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_expr_empty_${passageId}_${match.index}`,
        code: 'WLS-EXP-001',
        severity: 'error',
        category: 'expression',
        message: `Empty expression interpolation`,
        description: `Expression interpolation ${'${}'} is empty. Provide a valid expression.`,
        fixable: false,
      });
    }

    // Check for unclosed conditionals
    const unclosedIfPattern = /\{if\s+[^}]*$/gm;
    while ((match = unclosedIfPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_expr_unclosed_if_${passageId}_${match.index}`,
        code: 'WLS-EXP-002',
        severity: 'error',
        category: 'expression',
        message: `Unclosed conditional`,
        description: `Conditional expression started with {if but missing closing }.`,
        fixable: false,
      });
    }

    // Check for missing condition in {if}
    const emptyIfPattern = /\{if\s*\}/g;
    while ((match = emptyIfPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_expr_empty_if_${passageId}_${match.index}`,
        code: 'WLS-EXP-001',
        severity: 'error',
        category: 'expression',
        message: `Empty conditional expression`,
        description: `Conditional {if } is missing a condition. Provide a boolean expression.`,
        fixable: false,
      });
    }

    // Check for assignment in conditions (common mistake)
    // Single = instead of == in {if x = y}
    const assignInCondPattern = /\{if[^}]*\s([a-zA-Z_]\w*)\s*=\s*(?![=])/g;
    while ((match = assignInCondPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_expr_assign_in_cond_${passageId}_${match.index}`,
        code: 'WLS-EXP-003',
        severity: 'warning',
        category: 'expression',
        message: `Possible assignment in condition`,
        description: `Using = in a condition might be assignment instead of comparison. Use == for equality comparison.`,
        fixable: true,
        fixDescription: `Change = to ==`,
      });
    }

    return issues;
  }

  /**
   * Validate a choice condition expression
   */
  private validateCondition(condition: string, passageId: string, choiceId: string): Omit<ValidationIssue, 'passageId' | 'passageTitle' | 'choiceId'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle' | 'choiceId'>[] = [];

    // Check for empty condition
    if (!condition.trim()) {
      issues.push({
        id: `wls_expr_empty_cond_${passageId}_${choiceId}`,
        code: 'WLS-EXP-001',
        severity: 'error',
        category: 'expression',
        message: `Empty choice condition`,
        description: `Choice condition is empty. Provide a valid boolean expression.`,
        fixable: false,
      });
      return issues;
    }

    // Check for assignment operator (common mistake)
    // Pattern: variable = value (not == or ~=)
    const assignPattern = /\b([a-zA-Z_]\w*)\s*=\s*(?![=])/;
    const assignMatch = condition.match(assignPattern);
    if (assignMatch) {
      issues.push({
        id: `wls_expr_cond_assign_${passageId}_${choiceId}`,
        code: 'WLS-EXP-003',
        severity: 'warning',
        category: 'expression',
        message: `Possible assignment in choice condition`,
        description: `"${assignMatch[1]} =" looks like assignment. Did you mean "==" for comparison?`,
        fixable: true,
        fixDescription: `Change = to ==`,
      });
    }

    return issues;
  }
}
