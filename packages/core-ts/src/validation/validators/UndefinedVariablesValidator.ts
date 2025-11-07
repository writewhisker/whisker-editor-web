/**
 * Undefined Variables Validator
 *
 * Finds variable references in conditions/scripts that are not defined in the story.
 */

import type { Story } from '../../models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class UndefinedVariablesValidator implements Validator {
  name = 'undefined_variables';
  category = 'variables' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get all defined variables
    const definedVariables = new Set(
      Array.from(story.variables.values()).map(v => v.name)
    );

    // Track which variables are referenced
    const referencedVariables = new Map<string, { passageId: string; passageTitle: string; context: string }[]>();

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Check passage scripts
      if (passage.onEnterScript) {
        this.extractVariables(passage.onEnterScript).forEach(varName => {
          if (!referencedVariables.has(varName)) {
            referencedVariables.set(varName, []);
          }
          referencedVariables.get(varName)!.push({
            passageId: passage.id,
            passageTitle: passage.title,
            context: 'passage onEnter script',
          });
        });
      }

      // Check choice conditions and scripts
      for (const choice of passage.choices) {
        if (choice.condition) {
          this.extractVariables(choice.condition).forEach(varName => {
            if (!referencedVariables.has(varName)) {
              referencedVariables.set(varName, []);
            }
            referencedVariables.get(varName)!.push({
              passageId: passage.id,
              passageTitle: passage.title,
              context: `choice "${choice.text}" condition`,
            });
          });
        }

        if (choice.action) {
          this.extractVariables(choice.action).forEach(varName => {
            if (!referencedVariables.has(varName)) {
              referencedVariables.set(varName, []);
            }
            referencedVariables.get(varName)!.push({
              passageId: passage.id,
              passageTitle: passage.title,
              context: `choice "${choice.text}" action script`,
            });
          });
        }
      }
    }

    // Find undefined variables
    for (const [varName, references] of referencedVariables.entries()) {
      if (!definedVariables.has(varName)) {
        // Create one issue per unique passage
        const uniquePassages = new Map<string, typeof references[0]>();
        for (const ref of references) {
          if (!uniquePassages.has(ref.passageId)) {
            uniquePassages.set(ref.passageId, ref);
          }
        }

        for (const ref of uniquePassages.values()) {
          issues.push({
            id: `undefined_var_${varName}_${ref.passageId}`,
            severity: 'error',
            category: 'variables',
            message: `Undefined variable: ${varName}`,
            description: `Variable "${varName}" is used in ${ref.context} but is not defined in the story.`,
            passageId: ref.passageId,
            passageTitle: ref.passageTitle,
            variableName: varName,
            fixable: true,
            fixDescription: `Add variable "${varName}" to story definitions`,
          });
        }
      }
    }

    return issues;
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
}
