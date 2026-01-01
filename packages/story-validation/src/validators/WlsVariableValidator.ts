/**
 * WLS 1.0 Variable Validator
 *
 * Validates WLS variable naming conventions and usage patterns.
 * - Story-scope variables use $var syntax
 * - Temp-scope variables use $_var syntax
 */

import type { Story } from '@writewhisker/story-models';
import { parse } from '@writewhisker/parser';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class WlsVariableValidator implements Validator {
  name = 'wls_variables';
  category = 'variables' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check declared variables for invalid names
    for (const variable of story.variables.values()) {
      if (!this.isValidVariableName(variable.name)) {
        issues.push({
          id: `wls_var_invalid_name_${variable.name}`,
          code: 'WLS-VAR-003',
          severity: 'error',
          category: 'variables',
          message: `Invalid variable name: "${variable.name}"`,
          description: `Variable names must start with a letter or underscore, not a number.`,
          variableName: variable.name,
          context: { variableName: variable.name },
          fixable: false,
        });
      }
    }

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Build and parse WLS content to validate variable syntax
      const wlsContent = this.buildWlsContent(passage);
      // Note: Parse result could be used for future syntax validation
      parse(wlsContent);

      // Check for malformed variable interpolations in passage content
      const malformedVars = this.findMalformedVariables(passage.content);
      for (const issue of malformedVars) {
        issues.push({
          ...issue,
          passageId: passage.id,
          passageTitle: passage.title,
        });
      }

      // Check for variable issues in choice conditions/actions
      for (const choice of passage.choices) {
        if (choice.condition) {
          const conditionIssues = this.findMalformedVariables(choice.condition);
          for (const issue of conditionIssues) {
            issues.push({
              ...issue,
              passageId: passage.id,
              passageTitle: passage.title,
              choiceId: choice.id,
            });
          }
        }

        if (choice.action) {
          const actionIssues = this.findMalformedVariables(choice.action);
          for (const issue of actionIssues) {
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
   * Check if a variable name is valid (starts with letter or underscore)
   */
  private isValidVariableName(name: string): boolean {
    if (!name || name.length === 0) return false;
    // Valid names start with letter or underscore, followed by alphanumerics or underscores
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Build WLS content from a passage for parsing
   */
  private buildWlsContent(passage: { id: string; title: string; content: string; choices: Array<{ text: string; target?: string }> }): string {
    let wlsContent = `:: ${passage.title}\n`;
    wlsContent += passage.content;

    for (const choice of passage.choices) {
      wlsContent += `\n+ [${choice.text}]`;
      if (choice.target) {
        wlsContent += ` -> ${choice.target}`;
      }
    }

    return wlsContent;
  }

  /**
   * Find malformed variable patterns in text
   */
  private findMalformedVariables(text: string): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Check for $ not followed by valid variable name or { for expression
    // Valid: $name, $_name, ${expr}
    // Invalid: $ alone, $123, $-name
    const invalidVarPattern = /\$(?![a-zA-Z_{\d])/g;
    let match;
    while ((match = invalidVarPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_var_invalid_${match.index}`,
        code: 'WLS-VAR-006',
        severity: 'warning',
        category: 'variables',
        message: `Lone $ character`,
        description: `A $ character should be followed by a variable name ($var) or expression (${'{expr}'}).`,
        fixable: false,
      });
    }

    // Check for unclosed expression interpolation
    const unclosedExprPattern = /\$\{[^}]*$/gm;
    while ((match = unclosedExprPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_var_unclosed_expr_${match.index}`,
        code: 'WLS-VAR-007',
        severity: 'error',
        category: 'variables',
        message: `Unclosed expression interpolation`,
        description: `Expression interpolation started with ${'${'} but missing closing }.`,
        fixable: false,
      });
    }

    // Check for variables starting with numbers (invalid)
    const numberStartVarPattern = /\$(\d+[a-zA-Z_]\w*)/g;
    while ((match = numberStartVarPattern.exec(text)) !== null) {
      issues.push({
        id: `wls_var_number_start_${match.index}`,
        code: 'WLS-VAR-003',
        severity: 'error',
        category: 'variables',
        message: `Invalid variable name: $${match[1]}`,
        description: `Variable names cannot start with a number. Use a letter or underscore as the first character.`,
        variableName: match[1],
        context: { variableName: match[1] },
        fixable: false,
      });
    }

    return issues;
  }
}
