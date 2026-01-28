/**
 * StoryAnalytics - Analyzes story structure for quality metrics
 *
 * Provides static analysis of story graphs to find issues like
 * dead ends, unreachable passages, and complexity metrics.
 */

import type {
  StoryMetrics,
  AnalyticsIssue,
  AnalyticsReport,
  PlaythroughData,
} from './types';
import { StorySimulator, type SimulatableStory, type SimulatablePassage } from './StorySimulator';

/**
 * Story analytics options
 */
export interface StoryAnalyticsOptions {
  /** Include playthrough simulation */
  includeSimulation?: boolean;
  /** Number of simulations to run */
  simulationCount?: number;
  /** Max depth for reachability analysis */
  maxDepth?: number;
}

/**
 * StoryAnalytics class
 */
export class StoryAnalytics {
  private story: SimulatableStory;
  private passageMap: Map<string, SimulatablePassage>;

  constructor(story: SimulatableStory) {
    this.story = story;
    this.passageMap = this.buildPassageMap(story);
  }

  /**
   * Build passage map from various story formats
   */
  private buildPassageMap(story: SimulatableStory): Map<string, SimulatablePassage> {
    if (story.passages instanceof Map) {
      return story.passages;
    }

    const map = new Map<string, SimulatablePassage>();
    if (Array.isArray(story.passages)) {
      for (const passage of story.passages) {
        map.set(passage.id, passage);
      }
    }
    return map;
  }

  /**
   * Get a passage by ID
   */
  private getPassage(id: string): SimulatablePassage | undefined {
    if (this.story.getPassage) {
      return this.story.getPassage(id);
    }
    return this.passageMap.get(id);
  }

  /**
   * Analyze story and return full metrics
   */
  analyze(_options: StoryAnalyticsOptions = {}): StoryMetrics {
    const totalPassages = this.passageMap.size;
    const issues: AnalyticsIssue[] = [];

    if (totalPassages === 0) {
      return this.emptyMetrics();
    }

    // Count choices and variables
    let totalChoices = 0;
    const variableRefs = new Set<string>();

    for (const passage of this.passageMap.values()) {
      const choiceCount = (passage.choices || []).length;
      totalChoices += choiceCount;

      // Extract variable references from content (simple pattern)
      const content = passage.content || '';
      const varMatches = content.match(/\$\w+/g) || [];
      for (const v of varMatches) {
        variableRefs.add(v);
      }
    }

    // Calculate reachability
    const startId = this.story.startPassage || this.findStartPassage();
    const reachable = startId ? this.findReachablePassages(startId) : new Set<string>();
    const unreachablePassages = totalPassages - reachable.size;

    // Find dead ends
    const deadEnds = this.findDeadEnds();

    // Calculate depth and breadth
    const { maxDepth, maxBreadth } = this.calculateDepthAndBreadth(startId);

    // Average choices per passage
    const passagesWithChoices = Array.from(this.passageMap.values()).filter(
      p => (p.choices || []).length > 0
    ).length;
    const avgChoicesPerPassage =
      passagesWithChoices > 0 ? totalChoices / passagesWithChoices : 0;

    // Generate issues
    if (unreachablePassages > 0) {
      const unreachableIds = Array.from(this.passageMap.keys()).filter(
        id => !reachable.has(id)
      );
      for (const id of unreachableIds.slice(0, 5)) {
        const passage = this.getPassage(id);
        issues.push({
          severity: 'warning',
          type: 'unreachable',
          passageId: id,
          passageName: passage?.title || id,
          message: `Passage "${passage?.title || id}" is not reachable from the start`,
          suggestion: 'Add a link to this passage or remove it',
        });
      }
    }

    for (const deadEndId of deadEnds.slice(0, 5)) {
      const passage = this.getPassage(deadEndId);
      issues.push({
        severity: 'info',
        type: 'dead-end',
        passageId: deadEndId,
        passageName: passage?.title || deadEndId,
        message: `Passage "${passage?.title || deadEndId}" has no outgoing choices`,
        suggestion: 'This may be intentional if it\'s an ending',
      });
    }

    // Find broken links
    const brokenLinks = this.findBrokenLinks();
    for (const { fromId, toId } of brokenLinks.slice(0, 5)) {
      const passage = this.getPassage(fromId);
      issues.push({
        severity: 'error',
        type: 'broken-link',
        passageId: fromId,
        passageName: passage?.title || fromId,
        message: `Link to non-existent passage "${toId}"`,
        suggestion: 'Fix the target passage ID or create the missing passage',
      });
    }

    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(
      totalPassages,
      totalChoices,
      maxDepth,
      maxBreadth,
      brokenLinks.length
    );

    // Estimate reading time (rough: 200 words per minute, 5 seconds per choice)
    const totalWords = Array.from(this.passageMap.values())
      .map(p => (p.content || '').split(/\s+/).length)
      .reduce((a, b) => a + b, 0);
    const readingMinutes = totalWords / 200;
    const choiceMinutes = (totalChoices * 5) / 60;
    const estimatedReadingTime = readingMinutes + choiceMinutes;

    return {
      totalPassages,
      totalChoices,
      totalVariables: variableRefs.size,
      avgChoicesPerPassage,
      maxDepth,
      maxBreadth,
      complexityScore,
      estimatedReadingTime,
      reachablePassages: reachable.size,
      unreachablePassages,
      deadEnds: deadEnds.length,
      issues,
    };
  }

  /**
   * Generate full analytics report
   */
  generateReport(options: StoryAnalyticsOptions = {}): AnalyticsReport {
    const metrics = this.analyze(options);

    let playthrough: PlaythroughData | undefined;
    if (options.includeSimulation !== false) {
      const simulator = new StorySimulator(this.story);
      const simResult = simulator.simulate({
        simulations: options.simulationCount ?? 100,
      });
      playthrough = simulator.toPlaythroughData(simResult);
    }

    return {
      storyId: this.story.id || 'unknown',
      storyTitle: 'Story Analysis',
      generatedAt: Date.now(),
      metrics,
      playthrough,
    };
  }

  /**
   * Find reachable passages via BFS
   */
  private findReachablePassages(startId: string): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const passage = this.getPassage(current);
      if (passage && passage.choices) {
        for (const choice of passage.choices) {
          if (choice.targetPassageId && !reachable.has(choice.targetPassageId)) {
            queue.push(choice.targetPassageId);
          }
        }
      }
    }

    return reachable;
  }

  /**
   * Find passages with no outgoing choices
   */
  private findDeadEnds(): string[] {
    const deadEnds: string[] = [];

    for (const [id, passage] of this.passageMap) {
      const choices = passage.choices || [];
      const validChoices = choices.filter(c => c.targetPassageId);
      if (validChoices.length === 0) {
        deadEnds.push(id);
      }
    }

    return deadEnds;
  }

  /**
   * Find broken links (choices pointing to non-existent passages)
   */
  private findBrokenLinks(): Array<{ fromId: string; toId: string }> {
    const broken: Array<{ fromId: string; toId: string }> = [];

    for (const [id, passage] of this.passageMap) {
      for (const choice of passage.choices || []) {
        if (choice.targetPassageId && !this.passageMap.has(choice.targetPassageId)) {
          broken.push({ fromId: id, toId: choice.targetPassageId });
        }
      }
    }

    return broken;
  }

  /**
   * Calculate depth and breadth via BFS
   */
  private calculateDepthAndBreadth(
    startId?: string
  ): { maxDepth: number; maxBreadth: number } {
    if (!startId || !this.passageMap.has(startId)) {
      return { maxDepth: 0, maxBreadth: 0 };
    }

    const depths = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    let maxDepth = 0;
    let maxBreadth = 0;

    // Track passages at each depth for breadth calculation
    const depthCounts = new Map<number, number>();

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (depths.has(id)) continue;
      depths.set(id, depth);

      maxDepth = Math.max(maxDepth, depth);
      depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);

      const passage = this.getPassage(id);
      if (passage && passage.choices) {
        const branchCount = passage.choices.filter(c => c.targetPassageId).length;
        maxBreadth = Math.max(maxBreadth, branchCount);

        for (const choice of passage.choices) {
          if (choice.targetPassageId && !depths.has(choice.targetPassageId)) {
            queue.push({ id: choice.targetPassageId, depth: depth + 1 });
          }
        }
      }
    }

    return { maxDepth, maxBreadth };
  }

  /**
   * Calculate complexity score (0-100)
   */
  private calculateComplexityScore(
    passages: number,
    _choices: number,
    depth: number,
    breadth: number,
    brokenLinks: number
  ): number {
    // Base complexity from size
    const sizeScore = Math.min(passages / 100, 1) * 30;

    // Complexity from branching
    const branchScore = Math.min(breadth / 5, 1) * 25;

    // Complexity from depth
    const depthScore = Math.min(depth / 20, 1) * 25;

    // Penalty for issues
    const issuePenalty = Math.min(brokenLinks / 10, 1) * 20;

    const total = sizeScore + branchScore + depthScore - issuePenalty;
    return Math.max(0, Math.min(100, Math.round(total)));
  }

  /**
   * Find start passage if not specified
   */
  private findStartPassage(): string | undefined {
    const passages = Array.from(this.passageMap.values());
    if (passages.length === 0) return undefined;

    // Look for common start names
    const startNames = ['start', 'begin', 'intro', 'introduction'];
    for (const name of startNames) {
      const found = passages.find(
        p =>
          p.id.toLowerCase() === name ||
          p.title?.toLowerCase() === name
      );
      if (found) return found.id;
    }

    return passages[0].id;
  }

  /**
   * Return empty metrics
   */
  private emptyMetrics(): StoryMetrics {
    return {
      totalPassages: 0,
      totalChoices: 0,
      totalVariables: 0,
      avgChoicesPerPassage: 0,
      maxDepth: 0,
      maxBreadth: 0,
      complexityScore: 0,
      estimatedReadingTime: 0,
      reachablePassages: 0,
      unreachablePassages: 0,
      deadEnds: 0,
      issues: [],
    };
  }

  /**
   * Factory method
   */
  static create(story: SimulatableStory): StoryAnalytics {
    return new StoryAnalytics(story);
  }
}
