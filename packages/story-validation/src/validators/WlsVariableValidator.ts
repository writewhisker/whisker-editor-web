/**
 * Variable Validator
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

      // WLS-VAR-004: Check for reserved prefixes
      if (this.hasReservedPrefix(variable.name)) {
        issues.push({
          id: `wls_var_reserved_prefix_${variable.name}`,
          code: 'WLS-VAR-004',
          severity: 'warning',
          category: 'variables',
          message: `Reserved variable prefix: "${variable.name}"`,
          description: `Variable names starting with "whisker_" or "__" are reserved for internal use.`,
          variableName: variable.name,
          context: { variableName: variable.name },
          fixable: false,
        });
      }
    }

    // Collect story variable names for shadowing check
    const storyVarNames = new Set<string>();
    for (const variable of story.variables.values()) {
      storyVarNames.add(variable.name);
    }

    // Track temp variable definitions per passage for cross-passage check
    const tempDefinedIn = new Map<string, string>(); // tempName -> passageId

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

      // WLS-VAR-005: Check for temp variables shadowing story variables
      const shadowingIssues = this.findShadowingVariables(passage.content, storyVarNames, passage.id);
      for (const issue of shadowingIssues) {
        issues.push({
          ...issue,
          passageId: passage.id,
          passageTitle: passage.title,
        });
      }

      // WLS-VAR-008: Track temp variable definitions for cross-passage check
      this.trackTempDefinitions(passage.content, passage.id, tempDefinedIn);

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

          // Track temp definitions in choice actions
          this.trackTempDefinitions(choice.action, passage.id, tempDefinedIn);
        }
      }
    }

    // WLS-VAR-008: Check for temp variables used across passages
    for (const passage of allPassages) {
      const crossPassageIssues = this.findCrossPassageTempUsage(
        passage.content,
        passage.id,
        tempDefinedIn
      );
      for (const issue of crossPassageIssues) {
        issues.push({
          ...issue,
          passageId: passage.id,
          passageTitle: passage.title,
        });
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

  /**
   * Check if a variable name has a reserved prefix (WLS-VAR-004)
   */
  private hasReservedPrefix(name: string): boolean {
    return name.startsWith('whisker_') || name.startsWith('__');
  }

  /**
   * Find temp variables that shadow story variables (WLS-VAR-005)
   */
  private findShadowingVariables(
    text: string,
    storyVarNames: Set<string>,
    passageId: string
  ): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Find _varname patterns (temp variables)
    const tempVarPattern = /_([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = tempVarPattern.exec(text)) !== null) {
      const tempName = match[1];
      if (storyVarNames.has(tempName)) {
        issues.push({
          id: `wls_var_shadow_${tempName}_${passageId}`,
          code: 'WLS-VAR-005',
          severity: 'warning',
          category: 'variables',
          message: `Temp variable "_${tempName}" shadows story variable "${tempName}"`,
          description: `Using "_${tempName}" as a temp variable shadows the story-level variable "${tempName}". This may cause confusion.`,
          variableName: tempName,
          context: { variableName: tempName },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Track where temp variables are defined (WLS-VAR-008)
   */
  private trackTempDefinitions(
    text: string,
    passageId: string,
    tempDefinedIn: Map<string, string>
  ): void {
    // Look for temp variable assignments: _varname =
    const tempAssignPattern = /_([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
    let match;

    while ((match = tempAssignPattern.exec(text)) !== null) {
      const tempName = match[1];
      if (!tempDefinedIn.has(tempName)) {
        tempDefinedIn.set(tempName, passageId);
      }
    }
  }

  /**
   * Find temp variables used in a different passage than where defined (WLS-VAR-008)
   */
  private findCrossPassageTempUsage(
    text: string,
    passageId: string,
    tempDefinedIn: Map<string, string>
  ): Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] {
    const issues: Omit<ValidationIssue, 'passageId' | 'passageTitle'>[] = [];

    // Find _varname usage (not assignment)
    const tempUsagePattern = /_([a-zA-Z_][a-zA-Z0-9_]*)(?!\s*=)/g;
    let match;

    while ((match = tempUsagePattern.exec(text)) !== null) {
      const tempName = match[1];
      const definedIn = tempDefinedIn.get(tempName);

      // Check if this is a usage (not assignment) in a different passage
      if (definedIn && definedIn !== passageId) {
        // Verify it's not an assignment in this passage
        const assignPattern = new RegExp(`_${tempName}\\s*=`);
        if (!assignPattern.test(text)) {
          issues.push({
            id: `wls_var_cross_passage_${tempName}_${passageId}`,
            code: 'WLS-VAR-008',
            severity: 'warning',
            category: 'variables',
            message: `Temp variable "_${tempName}" used across passages`,
            description: `Temp variable "_${tempName}" is defined in another passage and used here. Temp variables are passage-scoped; use a story variable instead.`,
            variableName: `_${tempName}`,
            context: { variableName: `_${tempName}`, definedIn },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }
}
