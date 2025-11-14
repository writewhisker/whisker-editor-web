/**
 * StorySimulator - Automated story testing and path exploration
 *
 * Simulates player playthroughs to:
 * - Find all reachable passages
 * - Detect dead ends
 * - Calculate path coverage
 * - Identify orphaned content
 * - Measure branching complexity
 */

import type { Story, Passage } from '@whisker/core-ts';
import { Playthrough, PlaythroughStep } from '@whisker/core-ts';
import type { PlaythroughData, PassageVisitData } from './types';

export interface SimulationOptions {
  /** Maximum number of simulations to run */
  maxSimulations?: number;

  /** Maximum depth (passages) per simulation */
  maxDepth?: number;

  /** Strategy for choosing paths */
  strategy?: 'random' | 'breadth-first' | 'depth-first' | 'least-visited';

  /** Random seed for reproducible results */
  seed?: number;
}

export interface SimulationResult {
  /** Total simulations completed */
  totalSimulations: number;

  /** Passages visited across all simulations */
  passageVisits: Map<string, number>;

  /** All unique paths taken */
  paths: string[][];

  /** Average path length */
  averagePathLength: number;

  /** Coverage percentage (0-1) */
  coverage: number;

  /** Dead ends found */
  deadEnds: string[];

  /** Unreachable passages */
  unreachablePassages: string[];

  /** Player agency score (0-1) */
  playerAgency: number;

  /** Branching factor */
  branchingFactor: number;
}

export class StorySimulator {
  private story: Story;
  private random: () => number;

  constructor(story: Story, seed?: number) {
    this.story = story;

    // Simple LCG random number generator for reproducibility
    if (seed !== undefined) {
      let state = seed;
      this.random = () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    } else {
      this.random = Math.random;
    }
  }

  /**
   * Run automated simulations of the story
   */
  async simulate(options: SimulationOptions = {}): Promise<SimulationResult> {
    const {
      maxSimulations = 100,
      maxDepth = 100,
      strategy = 'random'
    } = options;

    const passageVisits = new Map<string, number>();
    const paths: string[][] = [];
    let totalSteps = 0;

    // Run simulations
    for (let i = 0; i < maxSimulations; i++) {
      const path = await this.runSingleSimulation(maxDepth, strategy, passageVisits);
      paths.push(path);
      totalSteps += path.length;

      // Early exit if we've covered everything (after sufficient simulations)
      if (i >= 5 && passageVisits.size === this.story.passages.size) {
        break;
      }
    }

    const totalSimulations = paths.length;
    const averagePathLength = totalSteps / totalSimulations;
    const coverage = passageVisits.size / this.story.passages.size;

    // Find dead ends (passages with no outgoing choices)
    const deadEnds = this.findDeadEnds();

    // Find unreachable passages
    const unreachablePassages = this.findUnreachablePassages(passageVisits);

    // Calculate player agency
    const playerAgency = this.calculatePlayerAgency(paths);

    // Calculate branching factor
    const branchingFactor = this.calculateBranchingFactor();

    return {
      totalSimulations,
      passageVisits,
      paths,
      averagePathLength,
      coverage,
      deadEnds,
      unreachablePassages,
      playerAgency,
      branchingFactor
    };
  }

  /**
   * Run a single simulation from start to end
   */
  private async runSingleSimulation(
    maxDepth: number,
    strategy: SimulationOptions['strategy'],
    visitCounts: Map<string, number>
  ): Promise<string[]> {
    const path: string[] = [];
    const visited = new Set<string>();

    // Start at the story's start passage
    let currentPassageId = this.story.startPassage;
    if (!currentPassageId) {
      // Find first passage if no start passage set
      currentPassageId = Array.from(this.story.passages.keys())[0];
    }

    if (!currentPassageId) {
      return path; // Empty story
    }

    // Traverse story
    for (let depth = 0; depth < maxDepth; depth++) {
      path.push(currentPassageId);

      // Track visits
      visitCounts.set(currentPassageId, (visitCounts.get(currentPassageId) || 0) + 1);
      visited.add(currentPassageId);

      const passage = this.story.passages.get(currentPassageId);
      if (!passage) {
        break; // Invalid passage
      }

      // Get available choices
      const choices = passage.choices.filter(choice => {
        // TODO: Evaluate choice conditions
        return true;
      });

      if (choices.length === 0) {
        break; // Dead end
      }

      // Choose next passage based on strategy
      let choiceIndex: number;

      switch (strategy) {
        case 'breadth-first':
          // Prefer unvisited passages
          choiceIndex = this.chooseBreadthFirst(choices, visited);
          break;

        case 'depth-first':
          // Always go deep
          choiceIndex = 0;
          break;

        case 'least-visited':
          // Choose least visited target
          choiceIndex = this.chooseLeastVisited(choices, visitCounts);
          break;

        case 'random':
        default:
          // Random choice
          choiceIndex = Math.floor(this.random() * choices.length);
          break;
      }

      const nextPassageId = choices[choiceIndex].target;
      if (!nextPassageId) {
        break; // No target
      }

      // Detect cycles (infinite loops)
      if (path.filter(p => p === nextPassageId).length >= 3) {
        break; // Been here too many times
      }

      currentPassageId = nextPassageId;
    }

    return path;
  }

  /**
   * Choose unvisited passage first (breadth-first)
   */
  private chooseBreadthFirst(
    choices: Array<{ target: string }>,
    visited: Set<string>
  ): number {
    // Try to find an unvisited passage
    for (let i = 0; i < choices.length; i++) {
      if (!visited.has(choices[i].target)) {
        return i;
      }
    }

    // All visited, choose randomly
    return Math.floor(this.random() * choices.length);
  }

  /**
   * Choose the least visited passage
   */
  private chooseLeastVisited(
    choices: Array<{ target: string }>,
    visitCounts: Map<string, number>
  ): number {
    let minVisits = Infinity;
    let minIndex = 0;

    for (let i = 0; i < choices.length; i++) {
      const visits = visitCounts.get(choices[i].target) || 0;
      if (visits < minVisits) {
        minVisits = visits;
        minIndex = i;
      }
    }

    return minIndex;
  }

  /**
   * Find passages with no outgoing choices
   */
  private findDeadEnds(): string[] {
    const deadEnds: string[] = [];

    for (const [id, passage] of this.story.passages) {
      if (passage.choices.length === 0) {
        deadEnds.push(id);
      }
    }

    return deadEnds;
  }

  /**
   * Find passages that were never visited in simulations
   */
  private findUnreachablePassages(visitCounts: Map<string, number>): string[] {
    const unreachable: string[] = [];

    for (const [id] of this.story.passages) {
      if (!visitCounts.has(id)) {
        unreachable.push(id);
      }
    }

    return unreachable;
  }

  /**
   * Calculate player agency (how much choices matter)
   *
   * Higher score = more branching and unique paths
   * Lower score = more linear story
   */
  private calculatePlayerAgency(paths: string[][]): number {
    if (paths.length === 0) {
      return 0;
    }

    // Count unique paths
    const uniquePaths = new Set(paths.map(p => p.join('->')));
    const uniqueRatio = uniquePaths.size / paths.length;

    // Calculate path divergence
    const divergence = this.calculatePathDivergence(paths);

    // Combine metrics (0-1 scale)
    return (uniqueRatio * 0.5) + (divergence * 0.5);
  }

  /**
   * Calculate how quickly paths diverge
   */
  private calculatePathDivergence(paths: string[][]): number {
    if (paths.length < 2) {
      return 0;
    }

    let totalDivergence = 0;
    const comparisons = Math.min(100, paths.length * (paths.length - 1) / 2);
    let count = 0;

    for (let i = 0; i < paths.length && count < comparisons; i++) {
      for (let j = i + 1; j < paths.length && count < comparisons; j++) {
        const divergencePoint = this.findDivergencePoint(paths[i], paths[j]);
        const maxLength = Math.max(paths[i].length, paths[j].length);

        if (maxLength > 0) {
          totalDivergence += (maxLength - divergencePoint) / maxLength;
          count++;
        }
      }
    }

    return count > 0 ? totalDivergence / count : 0;
  }

  /**
   * Find where two paths diverge
   */
  private findDivergencePoint(path1: string[], path2: string[]): number {
    const minLength = Math.min(path1.length, path2.length);

    for (let i = 0; i < minLength; i++) {
      if (path1[i] !== path2[i]) {
        return i;
      }
    }

    return minLength;
  }

  /**
   * Calculate average branching factor
   */
  private calculateBranchingFactor(): number {
    let totalChoices = 0;
    let passagesWithChoices = 0;

    for (const passage of this.story.passages.values()) {
      if (passage.choices.length > 0) {
        totalChoices += passage.choices.length;
        passagesWithChoices++;
      }
    }

    return passagesWithChoices > 0 ? totalChoices / passagesWithChoices : 0;
  }

  /**
   * Convert simulation result to PlaythroughData format
   */
  static toPlaythroughData(
    result: SimulationResult,
    story: Story
  ): PlaythroughData {
    // Sort passages by visit count
    const sortedVisits = Array.from(result.passageVisits.entries())
      .sort((a, b) => b[1] - a[1]);

    const totalVisits = Array.from(result.passageVisits.values())
      .reduce((sum, count) => sum + count, 0);

    // Most visited
    const mostVisited: PassageVisitData[] = sortedVisits.slice(0, 10).map(([id, count]) => {
      const passage = story.passages.get(id);
      return {
        passageId: id,
        passageName: passage?.title || 'Unknown',
        visitCount: count,
        percentage: (count / result.totalSimulations) * 100
      };
    });

    // Least visited (but not unreachable)
    const leastVisited: PassageVisitData[] = sortedVisits
      .slice(-10)
      .reverse()
      .map(([id, count]) => {
        const passage = story.passages.get(id);
        return {
          passageId: id,
          passageName: passage?.title || 'Unknown',
          visitCount: count,
          percentage: (count / result.totalSimulations) * 100
        };
      });

    // Find critical path (most common path)
    const criticalPath = StorySimulator.findMostCommonPath(result.paths);

    return {
      totalSimulations: result.totalSimulations,
      averagePathLength: result.averagePathLength,
      mostVisitedPassages: mostVisited,
      leastVisitedPassages: leastVisited,
      criticalPath,
      branchingFactor: result.branchingFactor,
      playerAgency: result.playerAgency
    };
  }

  /**
   * Find the most common path taken
   */
  private static findMostCommonPath(paths: string[][]): string[] {
    if (paths.length === 0) {
      return [];
    }

    // Find longest common prefix among all paths
    const firstPath = paths[0];
    const criticalPath: string[] = [];

    const minLength = Math.min(...paths.map(p => p.length));

    for (let i = 0; i < minLength; i++) {
      const passage = firstPath[i];
      const allMatch = paths.every(p => p.length > i && p[i] === passage);

      if (allMatch) {
        criticalPath.push(passage);
      } else {
        break;
      }
    }

    return criticalPath;
  }
}
