/**
 * Flow Analysis for WLS Stories
 *
 * Analyzes story flow and structure:
 * - Dead-end detection (WLS-FLW-001)
 * - Bottleneck detection (WLS-FLW-002)
 * - Cycle detection (WLS-FLW-003)
 * - Flow metrics (complexity, depth, branches)
 * - Accessibility checks
 */

import type {
  StoryNode,
  ChoiceNode,
  ContentNode,
  ConditionalNode,
  ConditionalBranchNode,
  WLSErrorCode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';
import type { ValidationDiagnostic } from './links';

/** Special navigation targets that terminate or loop */
const TERMINAL_TARGETS = ['END', 'BACK', 'RESTART'] as const;

/**
 * Flow metrics for a story
 */
export interface FlowMetrics {
  /** Number of passages */
  passageCount: number;
  /** Number of choices */
  choiceCount: number;
  /** Maximum depth from start passage */
  maxDepth: number;
  /** Average branching factor (choices per passage) */
  avgBranching: number;
  /** Cyclomatic complexity estimate */
  complexity: number;
  /** Number of terminal passages (END targets) */
  terminalCount: number;
  /** Number of passages that loop back (BACK/RESTART) */
  loopBackCount: number;
}

/**
 * Result of flow analysis
 */
export interface FlowAnalysisResult {
  metrics: FlowMetrics;
  diagnostics: ValidationDiagnostic[];
  /** Passages that are dead ends (no outgoing links) */
  deadEnds: string[];
  /** Passages that are bottlenecks (single entry point for many passages) */
  bottlenecks: string[];
  /** Cycles detected in the story graph */
  cycles: string[][];
}

/**
 * Check if a target is a terminal target (END, BACK, RESTART)
 */
function isTerminalTarget(target: string): boolean {
  return TERMINAL_TARGETS.includes(target.toUpperCase() as typeof TERMINAL_TARGETS[number]);
}

/**
 * Extract all link targets from passage content
 */
function extractTargets(content: ContentNode[]): string[] {
  const targets: string[] = [];

  for (const node of content) {
    if (node.type === 'choice') {
      const choice = node as ChoiceNode;
      if (choice.target) {
        targets.push(choice.target);
      }
    } else if (node.type === 'conditional') {
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        targets.push(...extractTargets(conditional.consequent));
      }
      if (conditional.alternatives) {
        for (const alt of conditional.alternatives) {
          const branch = alt as ConditionalBranchNode;
          if (branch.content) {
            targets.push(...extractTargets(branch.content));
          }
        }
      }
      if (conditional.alternate) {
        targets.push(...extractTargets(conditional.alternate));
      }
    }
  }

  return targets;
}

/**
 * Build adjacency list from story
 */
function buildGraph(story: StoryNode): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const passage of story.passages) {
    const targets = extractTargets(passage.content)
      .filter(t => !isTerminalTarget(t));
    graph.set(passage.name, targets);
  }

  return graph;
}

/**
 * Detect dead ends - passages with no outgoing links to other passages
 */
export function detectDeadEnds(story: StoryNode): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const passageNames = new Set(story.passages.map(p => p.name));

  for (const passage of story.passages) {
    const targets = extractTargets(passage.content);

    // Check if all targets are terminal or the passage has no targets
    const hasNonTerminalTarget = targets.some(t =>
      !isTerminalTarget(t) && passageNames.has(t)
    );
    const hasTerminalTarget = targets.some(t => isTerminalTarget(t));

    // A dead end is a passage with no outgoing links AND no terminal targets
    if (targets.length === 0) {
      diagnostics.push({
        code: WLS_ERROR_CODES.DEAD_END,
        message: `Dead end: passage "${passage.name}" has no outgoing links`,
        severity: 'warning',
        location: passage.location,
        passageId: passage.name,
        suggestion: 'Add a choice with a target or use END to mark as intentional ending',
      });
    } else if (!hasNonTerminalTarget && !hasTerminalTarget) {
      // All targets are dead links (non-existent passages)
      diagnostics.push({
        code: WLS_ERROR_CODES.DEAD_END,
        message: `Dead end: passage "${passage.name}" has no valid outgoing links`,
        severity: 'warning',
        location: passage.location,
        passageId: passage.name,
        suggestion: 'Ensure targets point to existing passages or use END',
      });
    }
  }

  return diagnostics;
}

/**
 * Detect bottlenecks - passages that are the only path to many other passages
 */
export function detectBottlenecks(story: StoryNode): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const graph = buildGraph(story);
  const passageNames = new Set(story.passages.map(p => p.name));

  // Count incoming edges for each passage
  const incomingCount = new Map<string, number>();
  for (const name of passageNames) {
    incomingCount.set(name, 0);
  }

  for (const [, targets] of graph) {
    for (const target of targets) {
      if (passageNames.has(target)) {
        incomingCount.set(target, (incomingCount.get(target) || 0) + 1);
      }
    }
  }

  // A bottleneck is a passage that:
  // 1. Has only one incoming edge (except start)
  // 2. Has multiple outgoing edges to passages that also have only one incoming edge
  const startPassage = story.passages[0]?.name;

  for (const passage of story.passages) {
    if (passage.name === startPassage) continue;

    const incoming = incomingCount.get(passage.name) || 0;
    const outgoing = graph.get(passage.name) || [];

    // Check if this passage is a single entry point
    if (incoming === 1 && outgoing.length > 2) {
      const singleEntryTargets = outgoing.filter(t =>
        passageNames.has(t) && (incomingCount.get(t) || 0) === 1
      );

      if (singleEntryTargets.length >= 2) {
        diagnostics.push({
          code: WLS_ERROR_CODES.BOTTLENECK,
          message: `Potential bottleneck: passage "${passage.name}" is the only path to ${singleEntryTargets.length} passages`,
          severity: 'info',
          location: passage.location,
          passageId: passage.name,
          suggestion: 'Consider adding alternative paths for better story flow',
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Detect cycles in the story graph using DFS
 */
export function detectCycles(story: StoryNode): string[][] {
  const graph = buildGraph(story);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  // Start DFS from each unvisited node
  for (const [node] of graph) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Calculate maximum depth from start passage using BFS
 */
function calculateMaxDepth(story: StoryNode): number {
  if (story.passages.length === 0) return 0;

  const graph = buildGraph(story);
  const startPassage = story.passages[0].name;
  const visited = new Set<string>();
  const queue: Array<{ node: string; depth: number }> = [{ node: startPassage, depth: 0 }];
  let maxDepth = 0;

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node)) continue;
    visited.add(node);
    maxDepth = Math.max(maxDepth, depth);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && graph.has(neighbor)) {
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }

  return maxDepth;
}

/**
 * Analyze story flow and compute metrics
 */
export function analyzeFlow(story: StoryNode): FlowAnalysisResult {
  const diagnostics: ValidationDiagnostic[] = [];

  // Basic counts
  const passageCount = story.passages.length;
  let choiceCount = 0;
  let terminalCount = 0;
  let loopBackCount = 0;

  for (const passage of story.passages) {
    const targets = extractTargets(passage.content);
    choiceCount += targets.length;

    for (const target of targets) {
      if (target.toUpperCase() === 'END') {
        terminalCount++;
      } else if (['BACK', 'RESTART'].includes(target.toUpperCase())) {
        loopBackCount++;
      }
    }
  }

  // Calculate metrics
  const maxDepth = calculateMaxDepth(story);
  const avgBranching = passageCount > 0 ? choiceCount / passageCount : 0;

  // Cyclomatic complexity: E - N + 2P where E=edges, N=nodes, P=connected components
  // Simplified: choices - passages + 2
  const complexity = Math.max(1, choiceCount - passageCount + 2);

  // Detect issues
  const deadEndDiagnostics = detectDeadEnds(story);
  const bottleneckDiagnostics = detectBottlenecks(story);
  const cycles = detectCycles(story);

  diagnostics.push(...deadEndDiagnostics);
  diagnostics.push(...bottleneckDiagnostics);

  // Add cycle warnings
  for (const cycle of cycles) {
    // Only warn about cycles that don't involve state changes
    // This is a simplified check - real implementation would check for state-changing actions
    if (cycle.length > 1) {
      diagnostics.push({
        code: WLS_ERROR_CODES.CYCLE_DETECTED,
        message: `Cycle detected: ${cycle.join(' -> ')}`,
        severity: 'info',
        passageId: cycle[0],
        suggestion: 'Ensure cycle has state-changing actions to avoid infinite loops',
      });
    }
  }

  // Get dead end passage names
  const deadEnds = deadEndDiagnostics.map(d => d.passageId!).filter(Boolean);

  // Get bottleneck passage names
  const bottlenecks = bottleneckDiagnostics.map(d => d.passageId!).filter(Boolean);

  return {
    metrics: {
      passageCount,
      choiceCount,
      maxDepth,
      avgBranching: Math.round(avgBranching * 100) / 100,
      complexity,
      terminalCount,
      loopBackCount,
    },
    diagnostics,
    deadEnds,
    bottlenecks,
    cycles,
  };
}

/**
 * Accessibility check result
 */
export interface AccessibilityResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}

/**
 * Check accessibility issues in story
 */
export function checkAccessibility(story: StoryNode): AccessibilityResult {
  const diagnostics: ValidationDiagnostic[] = [];

  for (const passage of story.passages) {
    // Check for images without alt text
    for (const node of passage.content) {
      if (node.type === 'image') {
        const img = node as { alt?: string; location?: SourceSpan };
        if (!img.alt || img.alt.trim() === '') {
          diagnostics.push({
            code: 'WLS-A11Y-001' as WLSErrorCode,
            message: `Image in passage "${passage.name}" is missing alt text`,
            severity: 'warning',
            location: img.location,
            passageId: passage.name,
            suggestion: 'Add descriptive alt text for screen readers',
          });
        }
      }

      // Check for very long passages (cognitive load)
      if (node.type === 'text') {
        const text = node as { value: string };
        if (text.value.length > 2000) {
          diagnostics.push({
            code: 'WLS-A11Y-002' as WLSErrorCode,
            message: `Passage "${passage.name}" has very long text (${text.value.length} chars)`,
            severity: 'info',
            location: passage.location,
            passageId: passage.name,
            suggestion: 'Consider breaking into smaller passages for readability',
          });
        }
      }
    }

    // Check for too many choices (decision fatigue)
    const choices = passage.content.filter(n => n.type === 'choice');
    if (choices.length > 7) {
      diagnostics.push({
        code: 'WLS-A11Y-003' as WLSErrorCode,
        message: `Passage "${passage.name}" has ${choices.length} choices (recommended: 7 or fewer)`,
        severity: 'info',
        location: passage.location,
        passageId: passage.name,
        suggestion: 'Consider reducing choices or grouping related options',
      });
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
  };
}
