/**
 * Link Validation for WLS Stories
 *
 * Validates all link-related aspects of a story:
 * - Dead links (WLS-LNK-001)
 * - Self-links without state change (WLS-LNK-002)
 * - Special target case sensitivity (WLS-LNK-003)
 * - BACK on start passage (WLS-LNK-004)
 * - Empty choice targets (WLS-LNK-005)
 * - Orphan passages (WLS-STR-005)
 */

import type {
  StoryNode,
  ChoiceNode,
  ContentNode,
  ConditionalNode,
  ConditionalBranchNode,
  ParseError,
  WLSErrorCode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';

/** Special navigation targets */
const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'] as const;
type SpecialTarget = typeof SPECIAL_TARGETS[number];

/**
 * Validation diagnostic with severity and location
 */
export interface ValidationDiagnostic {
  code: WLSErrorCode;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: SourceSpan;
  passageId?: string;
  target?: string;
  suggestion?: string;
}

/**
 * Result of link validation
 */
export interface LinkValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}

/**
 * Check if a target is a special navigation target
 */
function isSpecialTarget(target: string): target is SpecialTarget {
  return SPECIAL_TARGETS.includes(target.toUpperCase() as SpecialTarget);
}

/**
 * Check if special target has correct case
 */
function hasCorrectCase(target: string): boolean {
  return SPECIAL_TARGETS.includes(target as SpecialTarget);
}

/**
 * Get the correct case for a special target
 */
function getCorrectCase(target: string): SpecialTarget {
  return target.toUpperCase() as SpecialTarget;
}

/**
 * Extract all link targets from passage content
 */
function extractLinkTargets(content: ContentNode[]): Array<{ target: string; location?: SourceSpan }> {
  const targets: Array<{ target: string; location?: SourceSpan }> = [];

  for (const node of content) {
    if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.target) {
        targets.push({ target: choice.target, location: choice.location });
      }
    } else if (node.type === 'conditional') {
      // Check nested content in conditionals
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        targets.push(...extractLinkTargets(conditional.consequent));
      }
      if (conditional.alternatives) {
        for (const alt of conditional.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) {
            targets.push(...extractLinkTargets(branch.content));
          }
        }
      }
      if (conditional.alternate) {
        targets.push(...extractLinkTargets(conditional.alternate));
      }
    }
  }

  return targets;
}

/**
 * Check if a choice has a state-changing action
 */
function hasStateChange(choice: ChoiceNode): boolean {
  // Choice has action that modifies state
  if (choice.action && choice.action.length > 0) {
    return true;
  }
  return false;
}

/**
 * Validate all links in a story
 */
export function validateLinks(story: StoryNode): LinkValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  // Build set of passage names
  const passageNames = new Set<string>();
  for (const passage of story.passages) {
    passageNames.add(passage.name);
  }

  // Track referenced passages for orphan detection
  const referencedPassages = new Set<string>();
  const startPassage = story.passages[0]?.name;
  if (startPassage) {
    referencedPassages.add(startPassage);
  }

  // Validate each passage
  for (const passage of story.passages) {
    // Extract all link targets from content
    const linkTargets = extractLinkTargets(passage.content);

    for (const { target, location } of linkTargets) {
      // Track referenced passage
      if (!isSpecialTarget(target)) {
        referencedPassages.add(target);
      }

      // Check for empty target (WLS-LNK-005)
      if (!target || target.trim() === '') {
        diagnostics.push({
          code: WLS_ERROR_CODES.EMPTY_CHOICE_TARGET,
          message: `Empty choice target in passage "${passage.name}"`,
          severity: 'error',
          location,
          passageId: passage.name,
          suggestion: 'Add a target passage name or use END/BACK/RESTART',
        });
        continue;
      }

      // Check for special target case (WLS-LNK-003)
      if (isSpecialTarget(target) && !hasCorrectCase(target)) {
        const correct = getCorrectCase(target);
        diagnostics.push({
          code: WLS_ERROR_CODES.SPECIAL_TARGET_CASE,
          message: `Special target "${target}" should be "${correct}"`,
          severity: 'warning',
          location,
          passageId: passage.name,
          target,
          suggestion: `Use "${correct}" instead of "${target}"`,
        });
      }

      // Check for BACK on start passage (WLS-LNK-004)
      if (target.toUpperCase() === 'BACK' && passage.name === startPassage) {
        diagnostics.push({
          code: WLS_ERROR_CODES.BACK_ON_START,
          message: `BACK target on start passage "${passage.name}" will have no effect`,
          severity: 'warning',
          location,
          passageId: passage.name,
          target,
          suggestion: 'Remove BACK from start passage or use a different navigation',
        });
      }

      // Check for dead links (WLS-LNK-001)
      if (!isSpecialTarget(target) && !passageNames.has(target)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.DEAD_LINK,
          message: `Dead link: passage "${target}" does not exist`,
          severity: 'error',
          location,
          passageId: passage.name,
          target,
          suggestion: `Create passage "${target}" or fix the target name`,
        });
      }
    }

    // Check for self-links without state change (WLS-LNK-002)
    for (const node of passage.content) {
      if (node.type === 'choice') {
        const choice = node as ChoiceNode;
        if (choice.target === passage.name && !hasStateChange(choice)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.SELF_LINK_NO_CHANGE,
            message: `Self-link in passage "${passage.name}" without state change creates infinite loop`,
            severity: 'warning',
            location: choice.location,
            passageId: passage.name,
            target: choice.target,
            suggestion: 'Add an action to modify state or change the target',
          });
        }
      }
    }
  }

  // Check for orphan passages (WLS-STR-005)
  for (const passage of story.passages) {
    if (passage.name !== startPassage && !referencedPassages.has(passage.name)) {
      diagnostics.push({
        code: WLS_ERROR_CODES.ORPHAN_PASSAGE,
        message: `Orphan passage "${passage.name}" is never referenced`,
        severity: 'warning',
        location: passage.location,
        passageId: passage.name,
        suggestion: 'Add a link to this passage or remove it',
      });
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
  };
}

/**
 * Validate links and return ParseError format for compatibility
 */
export function validateLinksAsErrors(story: StoryNode): ParseError[] {
  const result = validateLinks(story);
  return result.diagnostics.map(d => ({
    message: d.message,
    location: d.location || {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
    code: d.code,
    suggestion: d.suggestion,
    // ParseError only supports 'error' | 'warning', convert 'info' to 'warning'
    severity: d.severity === 'info' ? 'warning' : d.severity,
  }));
}
