/**
 * WLS Validators
 *
 * Validation functions for analyzing WLS stories for errors,
 * warnings, and best practice violations.
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
