/**
 * StorySimulator - Simulates story playthroughs for analytics
 *
 * Runs automated simulations through story graphs to analyze
 * reachability, path distributions, and player agency.
 */

import type { PassageVisitData, PlaythroughData } from './types';

/**
 * Story structure for simulation (minimal interface)
 */
export interface SimulatableStory {
  id?: string;
  startPassage?: string;
  passages: Map<string, SimulatablePassage> | SimulatablePassage[];
  getPassage?(id: string): SimulatablePassage | undefined;
}

/**
 * Passage structure for simulation
 */
export interface SimulatablePassage {
  id: string;
  title?: string;
  content?: string;
  choices?: SimulatableChoice[];
}

/**
 * Choice structure for simulation
 */
export interface SimulatableChoice {
  text?: string;
  targetPassageId?: string;
  condition?: string;
}

/**
 * Simulation options
 */
export interface SimulationOptions {
  /** Number of random playthroughs to simulate */
  simulations?: number;
  /** Maximum steps per simulation (prevents infinite loops) */
  maxSteps?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Whether to track full paths (memory intensive for many simulations) */
  trackPaths?: boolean;
  /** Callback for progress updates */
  onProgress?: (progress: number) => void;
}

/**
 * Single simulation run result
 */
export interface SimulationRun {
  path: string[];
  steps: number;
  completed: boolean;
  endPassageId?: string;
}

/**
 * Full simulation results
 */
export interface SimulationResult {
  totalSimulations: number;
  completedSimulations: number;
  completionRate: number;
  averagePathLength: number;
  minPathLength: number;
  maxPathLength: number;
  passageVisits: PassageVisitData[];
  mostVisitedPassages: PassageVisitData[];
  leastVisitedPassages: PassageVisitData[];
  criticalPath: string[];
  branchingFactor: number;
  playerAgency: number;
  runs?: SimulationRun[];
}

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * StorySimulator class
 */
export class StorySimulator {
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
   * Run simulations
   */
  simulate(options: SimulationOptions = {}): SimulationResult {
    const simCount = options.simulations ?? 100;
    const maxSteps = options.maxSteps ?? 1000;
    const trackPaths = options.trackPaths ?? false;
    const rng = new SeededRandom(options.seed ?? Date.now());

    const visitCounts = new Map<string, number>();
    const pathLengths: number[] = [];
    const runs: SimulationRun[] = [];
    let completedCount = 0;
    const allPaths = new Map<string, number>(); // path key -> count

    const startId = this.story.startPassage || this.findStartPassage();
    if (!startId) {
      return this.emptyResult();
    }

    // Run simulations
    for (let i = 0; i < simCount; i++) {
      const run = this.runSingleSimulation(startId, maxSteps, rng);

      // Track visits
      for (const passageId of run.path) {
        visitCounts.set(passageId, (visitCounts.get(passageId) || 0) + 1);
      }

      pathLengths.push(run.steps);
      if (run.completed) {
        completedCount++;
      }

      if (trackPaths) {
        runs.push(run);
        const pathKey = run.path.join('->');
        allPaths.set(pathKey, (allPaths.get(pathKey) || 0) + 1);
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress((i + 1) / simCount);
      }
    }

    // Calculate results
    const passageVisits = this.calculatePassageVisits(visitCounts, simCount);
    const sortedByVisits = [...passageVisits].sort(
      (a, b) => b.visitCount - a.visitCount
    );

    const avgPathLength =
      pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;

    // Calculate critical path (most common path through hotspots)
    const criticalPath = this.findCriticalPath(visitCounts, startId);

    // Calculate branching factor
    const branchingFactor = this.calculateBranchingFactor();

    // Calculate player agency (variance in paths / max possible variance)
    const playerAgency = this.calculatePlayerAgency(pathLengths, allPaths, simCount);

    return {
      totalSimulations: simCount,
      completedSimulations: completedCount,
      completionRate: completedCount / simCount,
      averagePathLength: avgPathLength,
      minPathLength: Math.min(...pathLengths),
      maxPathLength: Math.max(...pathLengths),
      passageVisits,
      mostVisitedPassages: sortedByVisits.slice(0, 5),
      leastVisitedPassages: sortedByVisits
        .filter(p => p.visitCount > 0)
        .slice(-5)
        .reverse(),
      criticalPath,
      branchingFactor,
      playerAgency,
      runs: trackPaths ? runs : undefined,
    };
  }

  /**
   * Run a single simulation
   */
  private runSingleSimulation(
    startId: string,
    maxSteps: number,
    rng: SeededRandom
  ): SimulationRun {
    const path: string[] = [];
    let currentId: string | undefined = startId;
    let completed = false;

    while (currentId && path.length < maxSteps) {
      path.push(currentId);

      const passage = this.getPassage(currentId);
      if (!passage) {
        break;
      }

      const choices = passage.choices || [];
      const validChoices = choices.filter(c => c.targetPassageId);

      if (validChoices.length === 0) {
        // End of story (no more choices)
        completed = true;
        break;
      }

      // Random choice selection
      const choiceIndex = rng.nextInt(validChoices.length);
      currentId = validChoices[choiceIndex].targetPassageId;
    }

    return {
      path,
      steps: path.length,
      completed,
      endPassageId: path[path.length - 1],
    };
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

    // Return first passage
    return passages[0].id;
  }

  /**
   * Calculate passage visit statistics
   */
  private calculatePassageVisits(
    visitCounts: Map<string, number>,
    totalSims: number
  ): PassageVisitData[] {
    const results: PassageVisitData[] = [];

    for (const [passageId, count] of visitCounts) {
      const passage = this.getPassage(passageId);
      results.push({
        passageId,
        passageName: passage?.title || passageId,
        visitCount: count,
        percentage: count / totalSims,
      });
    }

    return results;
  }

  /**
   * Find critical path through story
   */
  private findCriticalPath(
    visitCounts: Map<string, number>,
    startId: string
  ): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = startId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      path.push(currentId);

      const passage = this.getPassage(currentId);
      if (!passage || !passage.choices || passage.choices.length === 0) {
        break;
      }

      // Find most visited next passage
      let maxVisits = 0;
      let nextId: string | undefined;

      for (const choice of passage.choices) {
        if (choice.targetPassageId) {
          const visits = visitCounts.get(choice.targetPassageId) || 0;
          if (visits > maxVisits) {
            maxVisits = visits;
            nextId = choice.targetPassageId;
          }
        }
      }

      currentId = nextId;
    }

    return path;
  }

  /**
   * Calculate average branching factor
   */
  private calculateBranchingFactor(): number {
    let totalChoices = 0;
    let passagesWithChoices = 0;

    for (const passage of this.passageMap.values()) {
      const choiceCount = (passage.choices || []).filter(
        c => c.targetPassageId
      ).length;
      if (choiceCount > 0) {
        totalChoices += choiceCount;
        passagesWithChoices++;
      }
    }

    return passagesWithChoices > 0 ? totalChoices / passagesWithChoices : 0;
  }

  /**
   * Calculate player agency score
   */
  private calculatePlayerAgency(
    pathLengths: number[],
    allPaths: Map<string, number>,
    simCount: number
  ): number {
    if (simCount === 0) return 0;

    // Agency based on path diversity
    const uniquePaths = allPaths.size;
    const pathDiversity = uniquePaths / simCount;

    // Agency based on path length variance
    const avgLength =
      pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    const variance =
      pathLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
      pathLengths.length;
    const lengthVariance = Math.min(variance / (avgLength * avgLength), 1);

    // Combined agency score (0-1)
    return (pathDiversity + lengthVariance) / 2;
  }

  /**
   * Return empty result
   */
  private emptyResult(): SimulationResult {
    return {
      totalSimulations: 0,
      completedSimulations: 0,
      completionRate: 0,
      averagePathLength: 0,
      minPathLength: 0,
      maxPathLength: 0,
      passageVisits: [],
      mostVisitedPassages: [],
      leastVisitedPassages: [],
      criticalPath: [],
      branchingFactor: 0,
      playerAgency: 0,
    };
  }

  /**
   * Convert to PlaythroughData format
   */
  toPlaythroughData(result: SimulationResult): PlaythroughData {
    return {
      totalSimulations: result.totalSimulations,
      averagePathLength: result.averagePathLength,
      mostVisitedPassages: result.mostVisitedPassages,
      leastVisitedPassages: result.leastVisitedPassages,
      criticalPath: result.criticalPath,
      branchingFactor: result.branchingFactor,
      playerAgency: result.playerAgency,
    };
  }

  /**
   * Factory method
   */
  static create(story: SimulatableStory): StorySimulator {
    return new StorySimulator(story);
  }
}
