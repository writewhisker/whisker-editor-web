/**
 * WLS Compliance Test Suite
 *
 * Comprehensive testing framework for validating WLS specification compliance.
 *
 * Reference: WLS Chapter 14 - Phase 13 Deterministic Verification
 */

// Core test runner
export {
  runComplianceTests,
  runSingleTest,
  formatResults,
  type ExpectedOutput,
  type ExpectedPassage,
  type ExpectedChoice,
  type ExpectedError,
  type ExpectedVariable,
  type TestResult,
  type ComplianceResults,
} from './runner';

// Cross-platform verification
export {
  canonicalize,
  getPlatformInfo,
  saveSnapshot,
  loadSnapshot,
  compareWithSnapshot,
  verifyTest,
  generateVerificationReport,
  formatCIOutput,
  getCIExitCode,
  type CanonicalOutput,
  type CanonicalPassage,
  type CanonicalError,
  type PlatformInfo,
  type VerificationReport,
} from './platform';

// Certification
export {
  certify,
  formatReportMarkdown,
  formatReportJSON,
  generateBadgeURL,
  generateBadgeMarkdown,
  runCertification,
  CERTIFICATION_LEVELS,
  type CertificationLevel,
  type ChapterCoverage,
  type CertificationReport,
} from './certification';
