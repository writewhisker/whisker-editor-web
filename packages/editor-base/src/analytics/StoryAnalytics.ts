/**
 * Story Analytics
 *
 * Analyzes story structure and generates metrics.
 */

import type { Story } from '@whisker/core-ts';
import type { Passage } from '@whisker/core-ts';
import type { StoryMetrics, AnalyticsIssue } from './types';

export class StoryAnalytics {
  /**
   * Analyze story and generate comprehensive metrics
   */
  static analyze(story: Story): StoryMetrics {
    const passages = Array.from(story.passages.values());
    const variables = story.variables;

    // Basic counts
    const totalPassages = passages.length;
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const totalVariables = variables.size;

    // Structure metrics
    const avgChoicesPerPassage = totalPassages > 0 ? totalChoices / totalPassages : 0;
    const { maxDepth, maxBreadth } = this.analyzeStructure(story);

    // Reachability analysis
    const reachable = this.findReachablePassages(story);
    const reachablePassages = reachable.size;
    const unreachablePassages = totalPassages - reachablePassages;

    // Dead-end detection
    const deadEnds = passages.filter(p => p.choices.length === 0 && p.id !== story.startPassage).length;

    // Complexity calculation
    const complexityScore = this.calculateComplexity(story);

    // Estimated reading time (words per passage * avg reading speed)
    const totalWords = passages.reduce((sum, p) => {
      const words = p.content.split(/\s+/).length;
      return sum + words;
    }, 0);
    const estimatedReadingTime = Math.ceil(totalWords / 200); // 200 words per minute

    // Issues
    const issues = this.detectIssues(story, reachable);

    return {
      totalPassages,
      totalChoices,
      totalVariables,
      avgChoicesPerPassage: Math.round(avgChoicesPerPassage * 10) / 10,
      maxDepth,
      maxBreadth,
      complexityScore,
      estimatedReadingTime,
      reachablePassages,
      unreachablePassages,
      deadEnds,
      issues,
    };
  }

  /**
   * Analyze story structure (depth and breadth)
   */
  private static analyzeStructure(story: Story): { maxDepth: number; maxBreadth: number } {
    const visited = new Set<string>();
    let maxDepth = 0;
    let maxBreadth = 0;

    const traverse = (passageId: string, depth: number) => {
      if (visited.has(passageId)) return;
      visited.add(passageId);

      maxDepth = Math.max(maxDepth, depth);

      const passage = story.passages.get(passageId);
      if (!passage) return;

      maxBreadth = Math.max(maxBreadth, passage.choices.length);

      for (const choice of passage.choices) {
        traverse(choice.target, depth + 1);
      }
    };

    if (story.startPassage) {
      traverse(story.startPassage, 0);
    }

    return { maxDepth, maxBreadth };
  }

  /**
   * Find all reachable passages from start
   */
  private static findReachablePassages(story: Story): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    if (story.startPassage) {
      queue.push(story.startPassage);
    }

    while (queue.length > 0) {
      const passageId = queue.shift()!;
      if (reachable.has(passageId)) continue;

      reachable.add(passageId);

      const passage = story.passages.get(passageId);
      if (passage) {
        for (const choice of passage.choices) {
          if (!reachable.has(choice.target)) {
            queue.push(choice.target);
          }
        }
      }
    }

    return reachable;
  }

  /**
   * Calculate complexity score (0-100)
   */
  private static calculateComplexity(story: Story): number {
    const passages = Array.from(story.passages.values());
    const totalPassages = passages.length;
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const totalVariables = story.variables.size;

    // Factors contributing to complexity
    const passageScore = Math.min(totalPassages / 10, 25); // Max 25 points
    const choiceScore = Math.min(totalChoices / 20, 25); // Max 25 points
    const variableScore = Math.min(totalVariables / 10, 25); // Max 25 points

    // Branching complexity
    const avgBranching = totalPassages > 0 ? totalChoices / totalPassages : 0;
    const branchingScore = Math.min(avgBranching * 5, 25); // Max 25 points

    return Math.round(passageScore + choiceScore + variableScore + branchingScore);
  }

  /**
   * Detect issues in the story
   */
  private static detectIssues(story: Story, reachable: Set<string>): AnalyticsIssue[] {
    const issues: AnalyticsIssue[] = [];
    const passages = Array.from(story.passages.values());

    // Unreachable passages
    for (const passage of passages) {
      if (!reachable.has(passage.id) && passage.id !== story.startPassage) {
        issues.push({
          severity: 'warning',
          type: 'unreachable',
          passageId: passage.id,
          passageName: passage.title,
          message: `Passage "${passage.title}" is unreachable from the start`,
          suggestion: 'Add a choice leading to this passage or remove it',
        });
      }
    }

    // Dead-ends (passages with no choices, excluding intentional endings)
    for (const passage of passages) {
      if (passage.choices.length === 0 && passage.id !== story.startPassage) {
        // Check if this looks intentional (has "end", "finish", "conclusion" in title/content)
        const isIntentionalEnding = /end|finish|conclusion|final/i.test(
          passage.title + ' ' + passage.content
        );

        if (!isIntentionalEnding) {
          issues.push({
            severity: 'info',
            type: 'dead-end',
            passageId: passage.id,
            passageName: passage.title,
            message: `Passage "${passage.title}" has no choices`,
            suggestion: 'Add choices or mark as an ending',
          });
        }
      }
    }

    // Broken links
    for (const passage of passages) {
      for (const choice of passage.choices) {
        if (!story.passages.has(choice.target)) {
          issues.push({
            severity: 'error',
            type: 'broken-link',
            passageId: passage.id,
            passageName: passage.title,
            message: `Choice "${choice.text}" points to non-existent passage`,
            suggestion: 'Fix or remove this choice',
          });
        }
      }
    }

    // Circular references (passages that only loop to themselves)
    for (const passage of passages) {
      const allChoicesLoopBack = passage.choices.length > 0 &&
        passage.choices.every(c => c.target === passage.id);

      if (allChoicesLoopBack) {
        issues.push({
          severity: 'warning',
          type: 'circular',
          passageId: passage.id,
          passageName: passage.title,
          message: `Passage "${passage.title}" only loops back to itself`,
          suggestion: 'Add choices leading to other passages',
        });
      }
    }

    return issues;
  }
}
