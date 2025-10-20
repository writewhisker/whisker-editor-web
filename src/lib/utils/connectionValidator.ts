import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';

export interface ConnectionIssue {
  type: 'orphaned' | 'broken' | 'dead-end' | 'unreachable' | 'circular';
  passageId: string;
  passageTitle: string;
  choiceId?: string;
  choiceText?: string;
  targetId?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ConnectionIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Validates all connections in a story
 */
export function validateConnections(story: Story): ValidationResult {
  const issues: ConnectionIssue[] = [];

  // Check each passage for various issues
  story.passages.forEach((passage) => {
    // Check for broken connections (target doesn't exist)
    passage.choices.forEach((choice) => {
      if (choice.target && !story.getPassage(choice.target)) {
        issues.push({
          type: 'broken',
          passageId: passage.id,
          passageTitle: passage.title,
          choiceId: choice.id,
          choiceText: choice.text,
          targetId: choice.target,
          severity: 'error',
          message: `Choice "${choice.text}" points to non-existent passage`,
        });
      }
    });

    // Check for dead ends (no outgoing connections and not an ending)
    if (passage.choices.length === 0 && passage.id !== story.startPassage) {
      // This might be intentional for endings, so it's a warning
      issues.push({
        type: 'dead-end',
        passageId: passage.id,
        passageTitle: passage.title,
        severity: 'warning',
        message: 'Passage has no choices (dead end)',
      });
    }

    // Check for unreachable passages (no incoming connections and not start)
    if (passage.id !== story.startPassage && !hasIncomingConnections(story, passage.id)) {
      issues.push({
        type: 'unreachable',
        passageId: passage.id,
        passageTitle: passage.title,
        severity: 'warning',
        message: 'Passage is unreachable from start',
      });
    }
  });

  // Check for circular references (infinite loops)
  const circularPaths = findCircularReferences(story);
  circularPaths.forEach((path) => {
    issues.push({
      type: 'circular',
      passageId: path[0],
      passageTitle: story.getPassage(path[0])?.title || 'Unknown',
      severity: 'info',
      message: `Circular path detected: ${path.map(id => story.getPassage(id)?.title).join(' → ')}`,
    });
  });

  // Count issues by severity
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
  };
}

/**
 * Check if a passage has any incoming connections
 */
function hasIncomingConnections(story: Story, passageId: string): boolean {
  for (const passage of story.passages.values()) {
    if (passage.choices.some(choice => choice.target === passageId)) {
      return true;
    }
  }
  return false;
}

/**
 * Find circular references in the story graph
 * Returns an array of circular paths (each path is an array of passage IDs)
 */
function findCircularReferences(story: Story): string[][] {
  const circularPaths: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(passageId: string): boolean {
    if (recursionStack.has(passageId)) {
      // Found a cycle
      const cycleStart = currentPath.indexOf(passageId);
      if (cycleStart >= 0) {
        const cycle = currentPath.slice(cycleStart).concat(passageId);
        // Check if we already found this cycle (in any rotation)
        const cycleKey = cycle.sort().join('-');
        if (!circularPaths.some(p => p.sort().join('-') === cycleKey)) {
          circularPaths.push(cycle);
        }
      }
      return true;
    }

    if (visited.has(passageId)) {
      return false;
    }

    visited.add(passageId);
    recursionStack.add(passageId);
    currentPath.push(passageId);

    const passage = story.getPassage(passageId);
    if (passage) {
      for (const choice of passage.choices) {
        if (choice.target) {
          dfs(choice.target);
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(passageId);

    return false;
  }

  // Start DFS from each passage to find all cycles
  if (story.startPassage) {
    dfs(story.startPassage);
  }

  return circularPaths;
}

/**
 * Get all orphaned passages (unreachable from start)
 */
export function getOrphanedPassages(story: Story): Passage[] {
  const orphans: Passage[] = [];

  story.passages.forEach((passage) => {
    if (passage.id !== story.startPassage && !hasIncomingConnections(story, passage.id)) {
      orphans.push(passage);
    }
  });

  return orphans;
}

/**
 * Get all dead-end passages (no outgoing connections)
 */
export function getDeadEndPassages(story: Story): Passage[] {
  const deadEnds: Passage[] = [];

  story.passages.forEach((passage) => {
    if (passage.choices.length === 0) {
      deadEnds.push(passage);
    }
  });

  return deadEnds;
}

/**
 * Get all broken connections (pointing to non-existent passages)
 */
export function getBrokenConnections(story: Story): Array<{
  passage: Passage;
  choiceId: string;
  choiceText: string;
  targetId: string;
}> {
  const broken: Array<{
    passage: Passage;
    choiceId: string;
    choiceText: string;
    targetId: string;
  }> = [];

  story.passages.forEach((passage) => {
    passage.choices.forEach((choice) => {
      if (choice.target && !story.getPassage(choice.target)) {
        broken.push({
          passage,
          choiceId: choice.id,
          choiceText: choice.text,
          targetId: choice.target,
        });
      }
    });
  });

  return broken;
}

/**
 * Clean up broken connections from a passage
 * Returns the number of connections removed
 */
export function cleanupBrokenConnections(story: Story, passageId: string): number {
  const passage = story.getPassage(passageId);
  if (!passage) return 0;

  const initialCount = passage.choices.length;
  passage.choices = passage.choices.filter(choice => {
    if (!choice.target) return true;
    return story.getPassage(choice.target) !== undefined;
  });

  return initialCount - passage.choices.length;
}

/**
 * Clean up all broken connections in the story
 * Returns the total number of connections removed
 */
export function cleanupAllBrokenConnections(story: Story): number {
  let totalRemoved = 0;

  story.passages.forEach((passage) => {
    const removed = cleanupBrokenConnections(story, passage.id);
    totalRemoved += removed;
  });

  return totalRemoved;
}

/**
 * Remove all connections to a specific passage
 * Useful when deleting a passage
 * Returns the number of connections removed
 */
export function removeConnectionsToPassage(story: Story, targetPassageId: string): number {
  let totalRemoved = 0;

  story.passages.forEach((passage) => {
    const initialCount = passage.choices.length;
    passage.choices = passage.choices.filter(choice => choice.target !== targetPassageId);
    totalRemoved += (initialCount - passage.choices.length);
  });

  return totalRemoved;
}
