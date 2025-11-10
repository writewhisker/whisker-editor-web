/**
 * Story Flow Analytics
 * Analyze story structure and flow patterns
 */

import type { Story, Passage } from '@whisker/core-ts';

export class StoryFlowAnalyzer {
  static analyze(story: Story): FlowAnalytics {
    return analyzeStoryFlow(story);
  }

  static getSummary(analytics: FlowAnalytics): string[] {
    return getFlowSummary(analytics);
  }
}

export interface FlowAnalytics {
  totalPassages: number;
  totalChoices: number;
  deadEnds: string[];
  unreachablePassages: string[];
  averageChoicesPerPassage: number;
  maxPathDepth: number;
  cyclicPaths: boolean;
  circularPaths?: string[][];
  totalPaths?: number;
  shortestPath?: number | { length: number; path: string[] };
  longestPath?: number | { length: number; path: string[] };
  bottlenecks?: string[] | Array<{
    passageId: string;
    passageTitle?: string;
    bottleneckScore: number;
    incomingCount?: number;
    outgoingCount?: number;
  }>;
}

// Alias for backward compatibility
export type StoryFlowMetrics = FlowAnalytics;

export function analyzeStoryFlow(story: Story): FlowAnalytics {
  const passages = Array.from(story.passages.values()) as Passage[];
  const totalPassages = passages.length;
  const totalChoices = passages.reduce((sum, p) => sum + (p.choices?.length || 0), 0);

  // Find dead ends (passages with no choices)
  const deadEnds = passages
    .filter((p: Passage) => p.choices.length === 0)
    .map((p: Passage) => p.id);

  // Find unreachable passages (simplified - would need graph traversal for accuracy)
  const reachableIds = new Set<string>();
  if (story.startPassage) {
    reachableIds.add(story.startPassage);
    const queue = [story.startPassage];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const passage = story.passages.get(currentId);
      if (passage) {
        passage.choices.forEach((choice) => {
          if (choice.target && !visited.has(choice.target)) {
            reachableIds.add(choice.target);
            queue.push(choice.target);
          }
        });
      }
    }
  }

  const unreachablePassages = passages
    .filter((p: Passage) => !reachableIds.has(p.id))
    .map((p: Passage) => p.id);

  const averageChoicesPerPassage = totalPassages > 0 ? totalChoices / totalPassages : 0;

  // Calculate max path depth (simplified)
  let maxPathDepth = 0;
  if (story.startPassage) {
    const visited = new Set<string>();
    const calculateDepth = (passageId: string, depth: number): number => {
      if (visited.has(passageId)) return depth;
      visited.add(passageId);

      const passage = story.passages.get(passageId);
      if (!passage || passage.choices.length === 0) return depth;

      let maxChildDepth = depth;
      for (const choice of passage.choices) {
        if (choice.target) {
          const childDepth = calculateDepth(choice.target, depth + 1);
          maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
      }
      return maxChildDepth;
    };

    maxPathDepth = calculateDepth(story.startPassage, 1);
  }

  // Detect cyclic paths (simplified)
  const cyclicPaths = passages.some((p: Passage) =>
    p.choices.some(c => c.target === p.id)
  );

  return {
    totalPassages,
    totalChoices,
    deadEnds,
    unreachablePassages,
    averageChoicesPerPassage,
    maxPathDepth,
    cyclicPaths,
  };
}

export function getFlowSummary(analytics: FlowAnalytics): string[] {
  const summary: string[] = [];

  summary.push(`Total passages: ${analytics.totalPassages}`);
  summary.push(`Total choices: ${analytics.totalChoices}`);
  summary.push(`Average choices per passage: ${analytics.averageChoicesPerPassage.toFixed(1)}`);
  summary.push(`Maximum path depth: ${analytics.maxPathDepth}`);

  if (analytics.deadEnds.length > 0) {
    summary.push(`Dead ends: ${analytics.deadEnds.length}`);
  }

  if (analytics.unreachablePassages.length > 0) {
    summary.push(`Unreachable passages: ${analytics.unreachablePassages.length}`);
  }

  if (analytics.cyclicPaths) {
    summary.push('Contains cyclic paths');
  }

  return summary;
}
