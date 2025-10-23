/**
 * Quality Analyzer
 *
 * Analyzes story structure and content to generate quality metrics.
 */

import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';
import type { QualityMetrics } from './types';

export type { QualityMetrics } from './types';

export class QualityAnalyzer {
  /**
   * Analyze story and generate quality metrics
   */
  analyze(story: Story): QualityMetrics {
    const passages = Array.from(story.passages.values());
    const totalPassages = passages.length;

    // Structure metrics
    const depth = this.calculateDepth(story);
    const branchingFactor = this.calculateBranchingFactor(passages);
    const density = this.calculateDensity(passages);

    // Content metrics
    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const totalVariables = story.variables.size;
    const { totalWords, avgWordsPerPassage } = this.calculateWordCounts(passages);

    // Complexity metrics
    const uniqueEndings = this.countUniqueEndings(passages);
    const reachabilityScore = this.calculateReachabilityScore(story);
    const conditionalComplexity = this.calculateConditionalComplexity(passages);
    const variableComplexity = this.calculateVariableComplexity(passages);

    // Estimated metrics
    const estimatedPlayTime = this.estimatePlayTime(totalWords);
    const estimatedPaths = this.estimatePaths(story);

    return {
      depth,
      branchingFactor,
      density,
      totalPassages,
      totalChoices,
      totalVariables,
      totalWords,
      avgWordsPerPassage,
      uniqueEndings,
      reachabilityScore,
      conditionalComplexity,
      variableComplexity,
      estimatedPlayTime,
      estimatedPaths,
    };
  }

  /**
   * Calculate maximum path length from start to any ending
   */
  private calculateDepth(story: Story): number {
    const startPassageId = story.startPassage;
    if (!startPassageId) return 0;

    let maxDepth = 0;
    const visited = new Set<string>();

    const dfs = (passageId: string, depth: number) => {
      if (visited.has(passageId)) return;
      visited.add(passageId);

      const passage = story.getPassage(passageId);
      if (!passage) return;

      // If no choices, this is an ending
      if (passage.choices.length === 0) {
        maxDepth = Math.max(maxDepth, depth);
        visited.delete(passageId);
        return;
      }

      // Continue to children
      for (const choice of passage.choices) {
        if (choice.target) {
          dfs(choice.target, depth + 1);
        }
      }

      visited.delete(passageId);
    };

    dfs(startPassageId, 0);
    return maxDepth;
  }

  /**
   * Calculate average number of choices per passage
   */
  private calculateBranchingFactor(passages: Passage[]): number {
    if (passages.length === 0) return 0;

    const totalChoices = passages.reduce((sum, p) => sum + p.choices.length, 0);
    return totalChoices / passages.length;
  }

  /**
   * Calculate story density (actual connections / possible connections)
   */
  private calculateDensity(passages: Passage[]): number {
    const n = passages.length;
    if (n <= 1) return 0;

    const actualConnections = passages.reduce((sum, p) => sum + p.choices.length, 0);
    const possibleConnections = n * (n - 1); // Each passage could link to all others

    return actualConnections / possibleConnections;
  }

  /**
   * Calculate word counts
   */
  private calculateWordCounts(passages: Passage[]): { totalWords: number; avgWordsPerPassage: number } {
    let totalWords = 0;

    for (const passage of passages) {
      const content = passage.content || '';
      const words = content.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    }

    const avgWordsPerPassage = passages.length > 0 ? totalWords / passages.length : 0;

    return { totalWords, avgWordsPerPassage };
  }

  /**
   * Count passages with no choices (endings)
   */
  private countUniqueEndings(passages: Passage[]): number {
    return passages.filter(p => p.choices.length === 0).length;
  }

  /**
   * Calculate percentage of passages reachable from start
   */
  private calculateReachabilityScore(story: Story): number {
    const totalPassages = story.passages.size;
    if (totalPassages === 0) return 0;

    const reachable = this.getReachablePassages(story);
    return (reachable.size / totalPassages) * 100;
  }

  /**
   * Get all passages reachable from start
   */
  private getReachablePassages(story: Story): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    const startPassageId = story.startPassage;
    if (!startPassageId) return reachable;

    queue.push(startPassageId);
    reachable.add(startPassageId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const passage = story.getPassage(currentId);

      if (!passage) continue;

      for (const choice of passage.choices) {
        if (choice.target && !reachable.has(choice.target)) {
          reachable.add(choice.target);
          queue.push(choice.target);
        }
      }
    }

    return reachable;
  }

  /**
   * Calculate percentage of choices with conditions
   */
  private calculateConditionalComplexity(passages: Passage[]): number {
    let totalChoices = 0;
    let conditionalChoices = 0;

    for (const passage of passages) {
      for (const choice of passage.choices) {
        totalChoices++;
        if (choice.condition && choice.condition.trim().length > 0) {
          conditionalChoices++;
        }
      }
    }

    if (totalChoices === 0) return 0;
    return (conditionalChoices / totalChoices) * 100;
  }

  /**
   * Calculate average variable references per passage
   */
  private calculateVariableComplexity(passages: Passage[]): number {
    if (passages.length === 0) return 0;

    let totalReferences = 0;

    for (const passage of passages) {
      // Count variable refs in passage scripts
      if (passage.onEnterScript) {
        totalReferences += this.countVariableReferences(passage.onEnterScript);
      }

      // Count in choice conditions and scripts
      for (const choice of passage.choices) {
        if (choice.condition) {
          totalReferences += this.countVariableReferences(choice.condition);
        }
        if (choice.action) {
          totalReferences += this.countVariableReferences(choice.action);
        }
      }
    }

    return totalReferences / passages.length;
  }

  /**
   * Count variable references in code
   */
  private countVariableReferences(code: string): number {
    // Simple heuristic: count alphanumeric sequences (excluding Lua keywords)
    const luaKeywords = new Set([
      'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
      'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then',
      'true', 'until', 'while',
    ]);

    const pattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let count = 0;
    let match;

    while ((match = pattern.exec(code)) !== null) {
      const word = match[1];
      if (!luaKeywords.has(word)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Estimate play time in minutes based on word count
   * Average reading speed: 200-250 words per minute
   * Interactive fiction is slower due to choices, so we use 150 wpm
   */
  private estimatePlayTime(totalWords: number): number {
    const wordsPerMinute = 150;
    return Math.ceil(totalWords / wordsPerMinute);
  }

  /**
   * Estimate number of unique paths through the story
   * This is a rough heuristic based on branching factor and depth
   */
  private estimatePaths(story: Story): number {
    const startPassageId = story.startPassage;
    if (!startPassageId) return 0;

    let pathCount = 0;
    const visited = new Set<string>();

    const dfs = (passageId: string) => {
      if (visited.has(passageId)) return 1; // Cycle detected

      visited.add(passageId);

      const passage = story.getPassage(passageId);
      if (!passage) {
        visited.delete(passageId);
        return 0;
      }

      // If no choices, this is one path
      if (passage.choices.length === 0) {
        visited.delete(passageId);
        return 1;
      }

      // Sum paths from all choices
      let paths = 0;
      for (const choice of passage.choices) {
        if (choice.target) {
          paths += dfs(choice.target);
        }
      }

      visited.delete(passageId);
      return paths;
    };

    pathCount = dfs(startPassageId);

    // Cap at a reasonable number to avoid overflow
    return Math.min(pathCount, 10000);
  }
}

/**
 * Create a default quality analyzer instance
 */
export function createQualityAnalyzer(): QualityAnalyzer {
  return new QualityAnalyzer();
}
