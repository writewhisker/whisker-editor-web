/**
 * Scripts Validator
 *
 * Validates Lua/JavaScript code blocks for basic syntax errors.
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ValidateScriptsValidator implements Validator {
  name = 'validate_scripts';
  category = 'content' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.scripts || story.scripts.length === 0) {
      return issues; // No scripts to validate
    }

    story.scripts.forEach((script, index) => {
      // Check for empty script
      if (script.trim().length === 0) {
        issues.push({
          id: `script_${index}_empty`,
          code: 'WLS-SCR-001',
          severity: 'info',
          category: 'content',
          message: `Script ${index + 1}: Empty`,
          description: 'This script is empty and can be removed.',
          fixable: true,
          fixDescription: 'Remove empty script',
          fixAction: () => {
            story.removeScript(index);
          }
        });
        return;
      }

      // Basic Lua validation: check for common syntax errors
      const luaErrors = this.checkLuaSyntax(script);
      luaErrors.forEach(error => {
        issues.push({
          id: `script_${index}_${error.type}`,
          code: 'WLS-SCR-002',
          severity: 'error',
          category: 'content',
          message: `Script ${index + 1}: ${error.message}`,
          description: error.description,
          fixable: false,
        });
      });

      // Warn about very long scripts (potential performance issue)
      if (script.length > 50000) {
        issues.push({
          id: `script_${index}_too_large`,
          code: 'WLS-SCR-004',
          severity: 'warning',
          category: 'content',
          message: `Script ${index + 1}: Very large`,
          description: `Script is ${(script.length / 1024).toFixed(1)}KB. Consider splitting into smaller files or optimizing.`,
          context: { size: `${(script.length / 1024).toFixed(1)}KB` },
          fixable: false,
        });
      }

      // Check for potentially dangerous functions
      const dangerousFunctions = ['os.execute', 'io.open', 'loadfile', 'dofile', 'require'];
      dangerousFunctions.forEach(func => {
        if (script.includes(func)) {
          issues.push({
            id: `script_${index}_dangerous_${func}`,
            code: 'WLS-SCR-003',
            severity: 'warning',
            category: 'content',
            message: `Script ${index + 1}: Potentially unsafe function "${func}"`,
            description: `The function "${func}" may not be available in sandboxed execution environments.`,
            context: { function: func },
            fixable: false,
          });
        }
      });
    });

    return issues;
  }

  /**
   * Basic Lua syntax checking
   */
  private checkLuaSyntax(script: string): Array<{ type: string; message: string; description: string }> {
    const errors: Array<{ type: string; message: string; description: string }> = [];

    // Check for matching keywords
    const functionKeywords = (script.match(/\bfunction\b/g) || []).length;
    const endKeywords = (script.match(/\bend\b/g) || []).length;
    const ifKeywords = (script.match(/\bif\b/g) || []).length;
    const thenKeywords = (script.match(/\bthen\b/g) || []).length;
    // const doKeywords = (script.match(/\bdo\b/g) || []).length;

    if (functionKeywords > endKeywords) {
      errors.push({
        type: 'unmatched_function',
        message: 'Unmatched function/end',
        description: `Found ${functionKeywords} 'function' keywords but only ${endKeywords} 'end' keywords.`
      });
    }

    if (ifKeywords !== thenKeywords) {
      errors.push({
        type: 'unmatched_if_then',
        message: 'Unmatched if/then',
        description: `Found ${ifKeywords} 'if' keywords but ${thenKeywords} 'then' keywords.`
      });
    }

    // Check for common typos
    if (script.match(/\bfucntion\b/)) {
      errors.push({
        type: 'typo_function',
        message: 'Typo: "fucntion"',
        description: 'Did you mean "function"?'
      });
    }

    return errors;
  }
}
