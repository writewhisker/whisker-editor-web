/**
 * @writewhisker/validation
 * Story validation CLI and programmatic API
 */

// Re-export core validation from @writewhisker/core-ts
export {
  StoryValidator,
  createDefaultValidator,
  AutoFixer,
  createAutoFixer,
  QualityAnalyzer,
  createQualityAnalyzer,
} from '@writewhisker/core-ts';

// Re-export types
export type {
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '@writewhisker/core-ts';

// Export reporters
export {
  Reporter,
  ConsoleReporter,
  JSONReporter,
  JUnitReporter,
  HTMLReporter,
  createReporter,
  type ReporterFormat,
} from './reporters/index.js';

// Convenience function for validating stories
import { createDefaultValidator, Story, type StoryData, type ValidationResult } from '@writewhisker/core-ts';

/**
 * Validate a story and return the result
 */
export function validateStory(story: StoryData): ValidationResult {
  const validator = createDefaultValidator();
  const storyInstance = new Story(story);
  return validator.validate(storyInstance);
}

/**
 * Validate a story and throw if invalid
 */
export function validateStoryOrThrow(story: StoryData): void {
  const result = validateStory(story);
  if (!result.valid) {
    const errorMessages = result.issues
      .filter(i => i.severity === 'error')
      .map(e => e.message)
      .join('\n');
    throw new Error(`Story validation failed:\n${errorMessages}`);
  }
}
