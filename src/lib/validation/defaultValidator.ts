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
  ValidateIFIDValidator,
  ValidateStylesheetsValidator,
  ValidateScriptsValidator,
  ValidateAssetsValidator,
  ValidatePassageMetadataValidator,
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
  validator.registerValidator(new ValidateIFIDValidator());
  validator.registerValidator(new ValidateStylesheetsValidator());
  validator.registerValidator(new ValidateScriptsValidator());
  validator.registerValidator(new ValidateAssetsValidator());
  validator.registerValidator(new ValidatePassageMetadataValidator());

  return validator;
}
