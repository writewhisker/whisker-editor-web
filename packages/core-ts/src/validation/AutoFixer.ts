/**
 * Auto Fixer
 *
 * Automatically fixes validation issues where possible.
 */

import type { Story } from '../models';
import type { ValidationIssue, AutoFixResult } from './types';

export class AutoFixer {
  /**
   * Attempt to fix all fixable issues
   */
  fix(story: Story, issues: ValidationIssue[]): AutoFixResult {
    const result: AutoFixResult = {
      success: true,
      issuesFixed: 0,
      issuesFailed: 0,
      errors: [],
      passagesDeleted: [],
      passagesCreated: [],
      choicesDeleted: [],
      variablesAdded: [],
      variablesDeleted: [],
    };

    // Only process fixable issues
    const fixableIssues = issues.filter(i => i.fixable);

    for (const issue of fixableIssues) {
      try {
        const fixed = this.fixIssue(story, issue, result);
        if (fixed) {
          result.issuesFixed++;
        } else {
          result.issuesFailed++;
          result.errors.push(`Failed to fix: ${issue.message}`);
        }
      } catch (error) {
        result.issuesFailed++;
        result.errors.push(
          `Error fixing "${issue.message}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    result.success = result.issuesFailed === 0;
    return result;
  }

  /**
   * Fix a single issue
   */
  private fixIssue(story: Story, issue: ValidationIssue, result: AutoFixResult): boolean {
    // Unreachable passages - delete them
    if (issue.id.startsWith('unreachable_') && issue.passageId) {
      return this.deletePassage(story, issue.passageId, result);
    }

    // Dead links - remove the choice
    if (issue.id.startsWith('dead_link_') && issue.passageId && issue.choiceId) {
      return this.removeChoice(story, issue.passageId, issue.choiceId, result);
    }

    // Undefined variables - add them
    if (issue.id.startsWith('undefined_var_') && issue.variableName) {
      return this.addVariable(story, issue.variableName, result);
    }

    // Unused variables - delete them
    if (issue.id.startsWith('unused_var_') && issue.variableName) {
      return this.deleteVariable(story, issue.variableName, result);
    }

    return false;
  }

  /**
   * Delete a passage
   */
  private deletePassage(story: Story, passageId: string, result: AutoFixResult): boolean {
    const passage = story.getPassage(passageId);
    if (!passage) return false;

    // Don't delete the start passage
    if (story.startPassage === passageId) {
      return false;
    }

    story.removePassage(passageId);
    result.passagesDeleted!.push(passageId);
    return true;
  }

  /**
   * Remove a choice from a passage
   */
  private removeChoice(story: Story, passageId: string, choiceId: string, result: AutoFixResult): boolean {
    const passage = story.getPassage(passageId);
    if (!passage) return false;

    const choiceIndex = passage.choices.findIndex(c => c.id === choiceId);
    if (choiceIndex === -1) return false;

    passage.removeChoice(choiceId);
    result.choicesDeleted!.push(choiceId);
    return true;
  }

  /**
   * Add a variable to the story
   */
  private addVariable(story: Story, variableName: string, result: AutoFixResult): boolean {
    // Check if variable already exists
    if (story.variables.has(variableName)) {
      return true; // Already exists, consider it fixed
    }

    // Infer type and default value
    // For now, we'll create a generic variable with nil initial value
    const variable = {
      name: variableName,
      type: 'any' as const,
      initial: null,
      description: `Auto-generated variable for ${variableName}`,
    };

    // Create a Variable instance (we'll need to import and use the Variable class)
    // For now, just add to the variables map directly
    story.variables.set(variableName, variable as any);
    result.variablesAdded!.push(variableName);
    return true;
  }

  /**
   * Delete a variable from the story
   */
  private deleteVariable(story: Story, variableName: string, result: AutoFixResult): boolean {
    if (!story.variables.has(variableName)) {
      return true; // Already gone, consider it fixed
    }

    story.variables.delete(variableName);
    result.variablesDeleted!.push(variableName);
    return true;
  }

  /**
   * Check if an issue is fixable
   */
  canFix(issue: ValidationIssue): boolean {
    return issue.fixable && (
      issue.id.startsWith('unreachable_') ||
      issue.id.startsWith('dead_link_') ||
      issue.id.startsWith('undefined_var_') ||
      issue.id.startsWith('unused_var_')
    );
  }

  /**
   * Get a description of what will be fixed
   */
  getFixDescription(issues: ValidationIssue[]): string {
    const fixableIssues = issues.filter(i => i.fixable);
    const counts = {
      unreachable: 0,
      deadLinks: 0,
      undefinedVars: 0,
      unusedVars: 0,
    };

    for (const issue of fixableIssues) {
      if (issue.id.startsWith('unreachable_')) counts.unreachable++;
      else if (issue.id.startsWith('dead_link_')) counts.deadLinks++;
      else if (issue.id.startsWith('undefined_var_')) counts.undefinedVars++;
      else if (issue.id.startsWith('unused_var_')) counts.unusedVars++;
    }

    const parts: string[] = [];
    if (counts.unreachable > 0) parts.push(`${counts.unreachable} unreachable passage(s)`);
    if (counts.deadLinks > 0) parts.push(`${counts.deadLinks} dead link(s)`);
    if (counts.undefinedVars > 0) parts.push(`${counts.undefinedVars} undefined variable(s)`);
    if (counts.unusedVars > 0) parts.push(`${counts.unusedVars} unused variable(s)`);

    if (parts.length === 0) return 'No fixable issues';
    return `Will fix: ${parts.join(', ')}`;
  }
}

/**
 * Create a default auto-fixer instance
 */
export function createAutoFixer(): AutoFixer {
  return new AutoFixer();
}
