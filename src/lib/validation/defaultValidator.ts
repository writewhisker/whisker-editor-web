/**
 * Default Validator Factory
 *
 * Creates a validator instance with all standard validators registered.
 */

import { StoryValidator } from './StoryValidator';
import {
  MissingStartPassageValidator,
  UnreachablePassagesValidator,
  DeadLinksValidator,
  UndefinedVariablesValidator,
  UnusedVariablesValidator,
  EmptyPassagesValidator,
} from './validators';

/**
 * Create a validator instance with all standard validators registered
 */
export function createDefaultValidator(): StoryValidator {
  const validator = new StoryValidator();

  // Register all standard validators
  validator.registerValidator(new MissingStartPassageValidator());
  validator.registerValidator(new UnreachablePassagesValidator());
  validator.registerValidator(new DeadLinksValidator());
  validator.registerValidator(new UndefinedVariablesValidator());
  validator.registerValidator(new UnusedVariablesValidator());
  validator.registerValidator(new EmptyPassagesValidator());

  return validator;
}
