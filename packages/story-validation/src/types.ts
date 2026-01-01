/**
 * Validation Types
 *
 * Defines types for story validation results and quality metrics.
 */




/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Category of validation issue
 */
export type ValidationCategory =
  | 'structure'
  | 'links'
  | 'variables'
  | 'content'
  | 'quality'
  | 'syntax'
  | 'expression'
  | 'collections';  // WLS 1.0 Gap 3

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  /** Unique identifier for this issue type */
  id: string;
  /** WLS 1.0 unified error code (e.g., "WLS-LNK-001") */
  code: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  description?: string;

  // Context
  passageId?: string;
  passageTitle?: string;
  choiceId?: string;
  variableName?: string;
  /** Additional context for error message formatting */
  context?: Record<string, unknown>;

  // Auto-fix
  fixable: boolean;
  fixAction?: () => void;
  fixDescription?: string;
}

/**
 * Validation result for a story
 */
export interface ValidationResult {
  timestamp: number;
  duration: number;

  // Overall status
  valid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;

  // Issues by category
  issues: ValidationIssue[];

  // Quick stats
  stats: {
    totalPassages: number;
    reachablePassages: number;
    unreachablePassages: number;
    orphanedPassages: number;
    deadLinks: number;
    undefinedVariables: number;
    unusedVariables: number;
  };
}

/**
 * Story quality metrics
 */
export interface QualityMetrics {
  // Structure metrics
  depth: number; // Max path length from start to end
  branchingFactor: number; // Avg choices per passage
  density: number; // Actual connections / possible connections

  // Content metrics
  totalPassages: number;
  totalChoices: number;
  totalVariables: number;
  totalWords: number;
  avgWordsPerPassage: number;

  // Complexity metrics
  uniqueEndings: number; // Terminal passages
  reachabilityScore: number; // % passages reachable
  conditionalComplexity: number; // % choices with conditions
  variableComplexity: number; // Avg variable refs per passage

  // Estimated metrics
  estimatedPlayTime: number; // Minutes based on word count
  estimatedPaths: number; // Rough estimate of unique paths
}

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  success: boolean;
  issuesFixed: number;
  issuesFailed: number;
  errors: string[];

  // What was changed
  passagesDeleted?: string[];
  passagesCreated?: string[];
  choicesDeleted?: string[];
  variablesAdded?: string[];
  variablesDeleted?: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  includeWarnings?: boolean;
  includeInfo?: boolean;
  skipSlowChecks?: boolean;
  categories?: ValidationCategory[];
}
