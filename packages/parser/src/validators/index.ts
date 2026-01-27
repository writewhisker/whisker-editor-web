/**
 * WLS Validators
 *
 * Validation functions for analyzing WLS stories for errors,
 * warnings, and best practice violations.
 *
 * Validators cover all WLS error code categories:
 * - links: LNK-001 to LNK-005, STR-005
 * - flow: FLW-001 to FLW-011
 * - variables: VAR-001 to VAR-008
 * - expressions: EXP-001 to EXP-007
 * - quality: QUA-001 to QUA-005
 * - assets: AST-001 to AST-007
 * - metadata: META-001 to META-005
 * - scripts: SCR-001 to SCR-004
 * - collections: COL-001 to COL-010
 */

export {
  validateLinks,
  validateLinksAsErrors,
  type LinkValidationResult,
  type ValidationDiagnostic,
} from './links';

export {
  detectDeadEnds,
  detectBottlenecks,
  detectCycles,
  analyzeFlow,
  checkAccessibility,
  type FlowMetrics,
  type FlowAnalysisResult,
  type AccessibilityResult,
} from './flow';

export {
  trackVariables,
  validateVariables,
  type VariableValidationResult,
} from './variables';

export {
  validateExpressions,
  type ExpressionValidationResult,
} from './expressions';

export {
  validateQuality,
  type QualityValidationResult,
  type QualityMetrics,
  type QualityThresholds,
} from './quality';

export {
  validateAssets,
  getSupportedExtensions,
  type AssetValidationResult,
  type AssetInfo,
} from './assets';

export {
  validateMetadata,
  generateIFID,
  type MetadataValidationResult,
} from './metadata';

export {
  validateScripts,
  getUnsafeFunctions,
  type ScriptValidationResult,
  type ScriptStats,
  type ScriptSizeLimits,
} from './scripts';

export {
  validateCollections,
  type CollectionValidationResult,
  type CollectionInfo,
} from './collections';

export {
  validatePresentation,
  type PresentationValidationResult,
  CSS_CLASS_PATTERN,
  RESERVED_CLASS_PREFIXES,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  KNOWN_CSS_PROPERTIES,
  KNOWN_THEMES,
} from './presentation';

// Re-export validation diagnostic type for convenience
import type { ValidationDiagnostic } from './links';
import type { StoryNode } from '../ast';

/**
 * Run all validators on a story
 */
export function validateAll(story: StoryNode): {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
} {
  const { validateLinks } = require('./links');
  const { validateVariables } = require('./variables');
  const { analyzeFlow } = require('./flow');
  const { validateExpressions } = require('./expressions');
  const { validateQuality } = require('./quality');
  const { validateAssets } = require('./assets');
  const { validateMetadata } = require('./metadata');
  const { validateScripts } = require('./scripts');
  const { validateCollections } = require('./collections');
  const { validatePresentation } = require('./presentation');

  const allDiagnostics: ValidationDiagnostic[] = [];

  // Run all validators
  const linkResult = validateLinks(story);
  allDiagnostics.push(...linkResult.diagnostics);

  const varResult = validateVariables(story);
  allDiagnostics.push(...varResult.diagnostics);

  const flowResult = analyzeFlow(story);
  allDiagnostics.push(...flowResult.diagnostics);

  const exprResult = validateExpressions(story);
  allDiagnostics.push(...exprResult.diagnostics);

  const qualityResult = validateQuality(story);
  allDiagnostics.push(...qualityResult.diagnostics);

  const assetResult = validateAssets(story);
  allDiagnostics.push(...assetResult.diagnostics);

  const metaResult = validateMetadata(story);
  allDiagnostics.push(...metaResult.diagnostics);

  const scriptResult = validateScripts(story);
  allDiagnostics.push(...scriptResult.diagnostics);

  const collResult = validateCollections(story);
  allDiagnostics.push(...collResult.diagnostics);

  const presResult = validatePresentation(story);
  allDiagnostics.push(...presResult.diagnostics);

  return {
    valid: allDiagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics: allDiagnostics,
  };
}
