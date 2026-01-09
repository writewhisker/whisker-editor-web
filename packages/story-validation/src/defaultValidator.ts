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
  DuplicatePassagesValidator,
  SelfLinkValidator,
  EmptyChoiceTargetValidator,
  OrphanPassagesValidator,
  NoTerminalValidator,
  BottleneckValidator,
  CycleDetectorValidator,
  InfiniteLoopValidator,
  ConditionAnalysisValidator,
  WlsSyntaxValidator,
  WlsSpecialTargetsValidator,
  WlsVariableValidator,
  WlsExpressionValidator,
  WlsCollectionValidator,
  WlsModuleValidator,
  WlsPresentationValidator,
} from './validators';

/**
 * Create a validator instance with all standard validators registered
 */
export function createDefaultValidator(): StoryValidator {
  const validator = new StoryValidator();

  // Register structural validators
  validator.registerValidator(new MissingStartPassageValidator());
  validator.registerValidator(new UnreachablePassagesValidator());
  validator.registerValidator(new DuplicatePassagesValidator());
  validator.registerValidator(new EmptyPassagesValidator());
  validator.registerValidator(new OrphanPassagesValidator());
  validator.registerValidator(new NoTerminalValidator());
  validator.registerValidator(new BottleneckValidator());
  validator.registerValidator(new CycleDetectorValidator());
  validator.registerValidator(new InfiniteLoopValidator());
  validator.registerValidator(new ConditionAnalysisValidator());

  // Register link validators
  validator.registerValidator(new DeadLinksValidator());
  validator.registerValidator(new SelfLinkValidator());
  validator.registerValidator(new EmptyChoiceTargetValidator());
  validator.registerValidator(new WlsSpecialTargetsValidator());

  // Register variable validators
  validator.registerValidator(new UndefinedVariablesValidator());
  validator.registerValidator(new UnusedVariablesValidator());
  validator.registerValidator(new WlsVariableValidator());

  // Register expression validators
  validator.registerValidator(new WlsExpressionValidator());

  // Register syntax validators
  validator.registerValidator(new WlsSyntaxValidator());

  // Register metadata validators
  validator.registerValidator(new ValidateIFIDValidator());
  validator.registerValidator(new ValidatePassageMetadataValidator());

  // Register content validators
  validator.registerValidator(new ValidateStylesheetsValidator());
  validator.registerValidator(new ValidateScriptsValidator());
  validator.registerValidator(new ValidateAssetsValidator());

  // Register collection validators
  validator.registerValidator(new WlsCollectionValidator());

  // Register module validators
  validator.registerValidator(new WlsModuleValidator());

  // Register presentation validators
  validator.registerValidator(new WlsPresentationValidator());

  return validator;
}
