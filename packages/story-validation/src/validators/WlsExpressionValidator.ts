/**
 * Expression Validator
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

    // WLS-EXP-004: Check for missing operands (operators at start/end or double operators)
    const missingOperandIssues = this.findMissingOperands(text, passageId);
    issues.push(...missingOperandIssues);

    // WLS-EXP-005: Check for invalid operators (&&, ||, ===, etc.)
    const invalidOpIssues = this.findInvalidOperators(text, passageId);
    issues.push(...invalidOpIssues);

    // WLS-EXP-006: Check for unmatched parentheses
    const unmatchedParenIssues = this.findUnmatchedParens(text, passageId);
    issues.push(...unmatchedParenIssues);

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

  /**
   * Find missing operands in expressions (WLS-EXP-004)
   * Checks for operators at start/end or double operators
   */
  private findMissingOperands(
    text: string,
    passageId: string
  ): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Extract expressions from ${...} and {if ...}
    const exprPatterns = [
      /\$\{([^}]+)\}/g,
      /\{if\s+([^}]+)\}/g,
    ];

    for (const pattern of exprPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const expr = match[1].trim();

        // Check for operator at start (except -)
        if (/^[+*/%^]/.test(expr)) {
          issues.push({
            id: `wls_expr_missing_operand_start_${passageId}_${match.index}`,
            code: 'WLS-EXP-004',
            severity: 'error',
            category: 'expression',
            message: `Missing operand at start of expression`,
            description: `Expression starts with an operator but is missing a left operand.`,
            fixable: false,
          });
        }

        // Check for operator at end
        if (/[+\-*/%^]\s*$/.test(expr)) {
          issues.push({
            id: `wls_expr_missing_operand_end_${passageId}_${match.index}`,
            code: 'WLS-EXP-004',
            severity: 'error',
            category: 'expression',
            message: `Missing operand at end of expression`,
            description: `Expression ends with an operator but is missing a right operand.`,
            fixable: false,
          });
        }

        // Check for double operators
        if (/[+\-*/%^]\s*[+\-*/%^]/.test(expr)) {
          issues.push({
            id: `wls_expr_double_operator_${passageId}_${match.index}`,
            code: 'WLS-EXP-004',
            severity: 'error',
            category: 'expression',
            message: `Double operators in expression`,
            description: `Expression contains consecutive operators without an operand between them.`,
            fixable: false,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find invalid operators (WLS-EXP-005)
   * Checks for JavaScript-style operators that should be Lua-style
   */
  private findInvalidOperators(
    text: string,
    passageId: string
  ): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    const invalidOps = [
      { pattern: '&&', expected: 'and', message: 'Use "and" instead of "&&"' },
      { pattern: '||', expected: 'or', message: 'Use "or" instead of "||"' },
      { pattern: '===', expected: '==', message: 'Use "==" instead of "==="' },
      { pattern: '!==', expected: '~=', message: 'Use "~=" instead of "!=="' },
    ];

    for (const { pattern, expected, message } of invalidOps) {
      const regex = new RegExp(pattern.replace(/[|]/g, '\\$&'), 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          id: `wls_expr_invalid_op_${passageId}_${match.index}`,
          code: 'WLS-EXP-005',
          severity: 'error',
          category: 'expression',
          message: `Invalid operator "${pattern}"`,
          description: `${message}. WLS uses Lua-style operators.`,
          fixable: true,
          fixDescription: `Change "${pattern}" to "${expected}"`,
        });
      }
    }

    return issues;
  }

  /**
   * Find unmatched parentheses in expressions (WLS-EXP-006)
   */
  private findUnmatchedParens(
    text: string,
    passageId: string
  ): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Extract expressions from ${...} and {if ...}
    const exprPatterns = [
      /\$\{([^}]+)\}/g,
      /\{if\s+([^}]+)\}/g,
    ];

    for (const pattern of exprPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const expr = match[1];
        let depth = 0;
        let hasUnmatched = false;

        for (let i = 0; i < expr.length; i++) {
          if (expr[i] === '(') {
            depth++;
          } else if (expr[i] === ')') {
            depth--;
            if (depth < 0) {
              hasUnmatched = true;
              break;
            }
          }
        }

        if (hasUnmatched || depth !== 0) {
          issues.push({
            id: `wls_expr_unmatched_parens_${passageId}_${match.index}`,
            code: 'WLS-EXP-006',
            severity: 'error',
            category: 'expression',
            message: `Unmatched parentheses in expression`,
            description: depth > 0
              ? `Expression has ${depth} unclosed opening parenthesis(es).`
              : `Expression has extra closing parenthesis(es).`,
            fixable: false,
          });
        }
      }
    }

    return issues;
  }
}
