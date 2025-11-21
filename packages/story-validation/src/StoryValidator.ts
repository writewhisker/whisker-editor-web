/**
 * Story Validator
 *
 * Core validation engine with plugin architecture for extensible validation.
 */

import type { Story } from '@writewhisker/story-models';

import type {
  ValidationResult,
  ValidationIssue,
  ValidationOptions,
  ValidationCategory,
  ValidationSeverity,
} from './types';

/**
 * Individual validator interface
 */
export interface Validator {
  name: string;
  category: ValidationCategory;
  validate(story: Story): ValidationIssue[];
}

/**
 * Main validation engine
 */
export class StoryValidator {
  private validators: Map<string, Validator> = new Map();

  constructor() {
    // Validators will be registered separately
  }

  /**
   * Register a validator
   */
  registerValidator(validator: Validator): void {
    this.validators.set(validator.name, validator);
  }

  /**
   * Unregister a validator
   */
  unregisterValidator(name: string): void {
    this.validators.delete(name);
  }

  /**
   * Get all registered validators
   */
  getValidators(): Validator[] {
    return Array.from(this.validators.values());
  }

  /**
   * Validate a story
   */
  validate(story: Story, options: ValidationOptions = {}, enabledValidatorNames?: string[]): ValidationResult {
    const startTime = Date.now();

    // Default options
    const opts: Required<ValidationOptions> = {
      includeWarnings: options.includeWarnings ?? true,
      includeInfo: options.includeInfo ?? true,
      skipSlowChecks: options.skipSlowChecks ?? false,
      categories: options.categories ?? ['structure', 'links', 'variables', 'content', 'quality'],
    };

    // Collect all issues
    const allIssues: ValidationIssue[] = [];

    // Run each validator
    for (const validator of this.validators.values()) {
      // Skip if validator is disabled
      if (enabledValidatorNames && !enabledValidatorNames.includes(validator.name)) {
        continue;
      }

      // Skip if category not requested
      if (!opts.categories.includes(validator.category)) {
        continue;
      }

      try {
        const issues = validator.validate(story);
        allIssues.push(...issues);
      } catch (error) {
        console.error(`Validator ${validator.name} failed:`, error);
        // Add error as validation issue
        allIssues.push({
          id: `validator_error_${validator.name}`,
          severity: 'error',
          category: validator.category,
          message: `Validator error: ${validator.name}`,
          description: error instanceof Error ? error.message : String(error),
          fixable: false,
        });
      }
    }

    // Filter by severity
    let filteredIssues = allIssues;
    if (!opts.includeWarnings) {
      filteredIssues = filteredIssues.filter(issue => issue.severity !== 'warning');
    }
    if (!opts.includeInfo) {
      filteredIssues = filteredIssues.filter(issue => issue.severity !== 'info');
    }

    // Count by severity
    const errorCount = filteredIssues.filter(i => i.severity === 'error').length;
    const warningCount = filteredIssues.filter(i => i.severity === 'warning').length;
    const infoCount = filteredIssues.filter(i => i.severity === 'info').length;

    // Calculate stats
    const stats = this.calculateStats(story, filteredIssues);

    const duration = Date.now() - startTime;

    return {
      timestamp: startTime,
      duration,
      valid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      issues: filteredIssues,
      stats,
    };
  }

  /**
   * Calculate validation statistics
   */
  private calculateStats(story: Story, issues: ValidationIssue[]) {
    const passages = Array.from(story.passages.values());
    const totalPassages = passages.length;

    // Calculate reachability
    const reachablePassageIds = this.getReachablePassages(story);
    const reachablePassages = reachablePassageIds.size;
    const unreachablePassages = totalPassages - reachablePassages;

    // Count orphaned passages (no incoming links except start)
    const orphanedPassages = this.countOrphanedPassages(story, reachablePassageIds);

    // Count dead links
    const deadLinks = issues.filter(
      i => i.category === 'links' && i.message.includes('dead link')
    ).length;

    // Count variable issues
    const undefinedVariables = issues.filter(
      i => i.category === 'variables' && i.message.includes('undefined')
    ).length;

    const unusedVariables = issues.filter(
      i => i.category === 'variables' && i.message.includes('unused')
    ).length;

    return {
      totalPassages,
      reachablePassages,
      unreachablePassages,
      orphanedPassages,
      deadLinks,
      undefinedVariables,
      unusedVariables,
    };
  }

  /**
   * Get all passages reachable from start
   */
  private getReachablePassages(story: Story): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    // Start from the start passage
    const startPassageId = story.startPassage;
    if (!startPassageId) {
      return reachable;
    }

    queue.push(startPassageId);
    reachable.add(startPassageId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const passage = story.getPassage(currentId);

      if (!passage) continue;

      // Add all choice targets
      for (const choice of passage.choices) {
        if (choice.target && !reachable.has(choice.target)) {
          reachable.add(choice.target);
          queue.push(choice.target);
        }
      }
    }

    return reachable;
  }

  /**
   * Count passages with no incoming links (except start)
   */
  private countOrphanedPassages(story: Story, reachablePassages: Set<string>): number {
    const passages = Array.from(story.passages.values());
    const passagesWithIncomingLinks = new Set<string>();

    // Add start passage (it has no incoming links but is not orphaned)
    if (story.startPassage) {
      passagesWithIncomingLinks.add(story.startPassage);
    }

    // Find all passages that are targets of choices
    for (const passage of passages) {
      for (const choice of passage.choices) {
        if (choice.target) {
          passagesWithIncomingLinks.add(choice.target);
        }
      }
    }

    // Count passages that are reachable but have no incoming links
    let orphanedCount = 0;
    for (const passageId of reachablePassages) {
      if (!passagesWithIncomingLinks.has(passageId)) {
        orphanedCount++;
      }
    }

    // Subtract 1 for the start passage (which is counted but not orphaned)
    return Math.max(0, orphanedCount - 1);
  }

  /**
   * Quick validation check (just errors)
   */
  quickValidate(story: Story): boolean {
    const result = this.validate(story, {
      includeWarnings: false,
      includeInfo: false,
    });
    return result.valid;
  }

  /**
   * Get validation issues for a specific passage
   */
  getPassageIssues(story: Story, passageId: string): ValidationIssue[] {
    const result = this.validate(story);
    return result.issues.filter(issue => issue.passageId === passageId);
  }

  /**
   * Get issues by category
   */
  getIssuesByCategory(result: ValidationResult, category: ValidationCategory): ValidationIssue[] {
    return result.issues.filter(issue => issue.category === category);
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(result: ValidationResult, severity: ValidationSeverity): ValidationIssue[] {
    return result.issues.filter(issue => issue.severity === severity);
  }

  /**
   * Get fixable issues
   */
  getFixableIssues(result: ValidationResult): ValidationIssue[] {
    return result.issues.filter(issue => issue.fixable);
  }
}

/**
 * Create a default validator instance with all standard validators
 */
export function createDefaultValidator(): StoryValidator {
  // We need to import validators dynamically to avoid circular dependencies
  // For now, validators are registered in the calling code
  const validator = new StoryValidator();
  return validator;
}
