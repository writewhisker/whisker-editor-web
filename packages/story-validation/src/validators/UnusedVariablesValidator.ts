/**
 * Unused Variables Validator
 *
 * Finds variables that are defined but never referenced in the story.
 * Error code: WLS-VAR-002
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class UnusedVariablesValidator implements Validator {
  name = 'unused_variables';
  category = 'variables' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get all defined variables
    const definedVariables = new Map(
      Array.from(story.variables.entries())
    );

    // Track which variables are referenced
    const referencedVariables = new Set<string>();

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Check passage content for $variable references
      if (passage.content) {
        this.extractContentVariables(passage.content).forEach(varName => {
          referencedVariables.add(varName);
        });
      }

      // Check passage scripts
      if (passage.onEnterScript) {
        this.extractVariables(passage.onEnterScript).forEach(varName => {
          referencedVariables.add(varName);
        });
      }

      // Check choice conditions and scripts
      for (const choice of passage.choices) {
        if (choice.condition) {
          this.extractVariables(choice.condition).forEach(varName => {
            referencedVariables.add(varName);
          });
        }

        if (choice.action) {
          this.extractVariables(choice.action).forEach(varName => {
            referencedVariables.add(varName);
          });
        }
      }
    }

    // Find unused variables
    for (const [varName] of definedVariables) {
      // Skip invalid variable names - they'll be caught by WLS-VAR-003
      if (!this.isValidVariableName(varName)) {
        continue;
      }

      if (!referencedVariables.has(varName)) {
        issues.push({
          id: `unused_var_${varName}`,
          code: 'WLS-VAR-002',
          severity: 'warning',
          category: 'variables',
          message: `Unused variable: "${varName}"`,
          description: `Variable "${varName}" is defined but never used in any passage, condition, or script.`,
          variableName: varName,
          context: { variableName: varName },
          fixable: true,
          fixDescription: `Remove variable "${varName}" from story definitions`,
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
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Extract variable names from a script or condition
   * Simple extraction - looks for word patterns
   */
  private extractVariables(code: string): Set<string> {
    const variables = new Set<string>();

    // Match variable-like patterns (alphanumeric + underscore)
    // Exclude Lua keywords
    const luaKeywords = new Set([
      'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
      'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
      'true', 'until', 'while',
    ]);

    const pattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = pattern.exec(code)) !== null) {
      const varName = match[1];
      if (!luaKeywords.has(varName)) {
        variables.add(varName);
      }
    }

    return variables;
  }

  /**
   * Extract variable names from content text ($variable syntax)
   */
  private extractContentVariables(content: string): Set<string> {
    const variables = new Set<string>();

    // Match $variable patterns
    const pattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return variables;
  }
}
