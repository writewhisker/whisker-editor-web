/**
 * PlaythroughAnalytics - Analyzes playthrough data for insights
 *
 * Provides statistical analysis of player behavior patterns,
 * passage popularity, choice distributions, and path analytics.
 */

import type { Playthrough, PlaythroughStepData } from './PlaythroughRecorder';

/**
 * Passage analytics data
 */
export interface PassageAnalytics {
  passageId: string;
  passageTitle: string;
  visitCount: number;
  uniqueVisitorCount: number;
  averageTimeSpent: number;
  entryRate: number; // % of playthroughs that visited
  exitRate: number; // % that ended here
}

/**
 * Choice analytics data
 */
export interface ChoiceAnalytics {
  passageId: string;
  passageTitle: string;
  choiceIndex: number;
  choiceText: string;
  selectionCount: number;
  selectionRate: number; // % of visitors who chose this
}

/**
 * Path analytics data
 */
export interface PathAnalytics {
  path: string[];
  count: number;
  percentage: number;
  averageDuration: number;
  completed: boolean;
}

/**
 * Complete playthrough analytics data
 */
export interface PlaythroughAnalyticsData {
  totalPlaythroughs: number;
  completedPlaythroughs: number;
  completionRate: number;
  averageDuration: number;
  averageSteps: number;
  averageUniquePassages: number;
  passages: PassageAnalytics[];
  choices: ChoiceAnalytics[];
  commonPaths: PathAnalytics[];
  hotspots: string[]; // Most visited passages
  deadEnds: string[]; // Passages where players frequently stop
}

/**
 * PlaythroughAnalytics class
 */
export class PlaythroughAnalytics {
  private playthroughs: Playthrough[];

  constructor(playthroughs: Playthrough[] = []) {
    this.playthroughs = playthroughs;
  }

  /**
   * Add playthroughs for analysis
   */
  addPlaythroughs(playthroughs: Playthrough[]): void {
    this.playthroughs.push(...playthroughs);
  }

  /**
   * Clear all playthroughs
   */
  clear(): void {
    this.playthroughs = [];
  }

  /**
   * Get full analytics data
   */
  analyze(): PlaythroughAnalyticsData {
    if (this.playthroughs.length === 0) {
      return this.emptyAnalytics();
    }

    const completed = this.playthroughs.filter(p => p.completed);
    const passages = this.analyzePassages();
    const choices = this.analyzeChoices();
    const paths = this.analyzePaths();

    // Calculate averages
    const totalDuration = this.playthroughs.reduce(
      (sum, p) => sum + p.getDuration(),
      0
    );
    const totalSteps = this.playthroughs.reduce(
      (sum, p) => sum + p.steps.length,
      0
    );
    const totalUnique = this.playthroughs.reduce(
      (sum, p) => sum + p.getUniquePassages().length,
      0
    );

    // Find hotspots and dead ends
    const sortedPassages = [...passages].sort(
      (a, b) => b.visitCount - a.visitCount
    );
    const hotspots = sortedPassages.slice(0, 5).map(p => p.passageId);

    const deadEnds = passages
      .filter(p => p.exitRate > 0.3) // 30%+ exit rate
      .sort((a, b) => b.exitRate - a.exitRate)
      .slice(0, 5)
      .map(p => p.passageId);

    return {
      totalPlaythroughs: this.playthroughs.length,
      completedPlaythroughs: completed.length,
      completionRate: completed.length / this.playthroughs.length,
      averageDuration: totalDuration / this.playthroughs.length,
      averageSteps: totalSteps / this.playthroughs.length,
      averageUniquePassages: totalUnique / this.playthroughs.length,
      passages,
      choices,
      commonPaths: paths,
      hotspots,
      deadEnds,
    };
  }

  /**
   * Analyze passage statistics
   */
  analyzePassages(): PassageAnalytics[] {
    const passageMap = new Map<
      string,
      {
        title: string;
        visits: number;
        visitors: Set<string>;
        timeSpent: number[];
        exits: number;
      }
    >();

    for (const playthrough of this.playthroughs) {
      const visitedInPlaythrough = new Set<string>();

      for (let i = 0; i < playthrough.steps.length; i++) {
        const step = playthrough.steps[i];
        const isLast = i === playthrough.steps.length - 1;

        if (!passageMap.has(step.passageId)) {
          passageMap.set(step.passageId, {
            title: step.passageTitle,
            visits: 0,
            visitors: new Set(),
            timeSpent: [],
            exits: 0,
          });
        }

        const data = passageMap.get(step.passageId)!;
        data.visits++;
        data.visitors.add(playthrough.id);

        if (step.timeSpent !== undefined) {
          data.timeSpent.push(step.timeSpent);
        }

        if (isLast && !playthrough.completed) {
          data.exits++;
        }

        visitedInPlaythrough.add(step.passageId);
      }
    }

    const totalPlaythroughs = this.playthroughs.length;

    return Array.from(passageMap.entries()).map(([passageId, data]) => ({
      passageId,
      passageTitle: data.title,
      visitCount: data.visits,
      uniqueVisitorCount: data.visitors.size,
      averageTimeSpent:
        data.timeSpent.length > 0
          ? data.timeSpent.reduce((a, b) => a + b, 0) / data.timeSpent.length
          : 0,
      entryRate: data.visitors.size / totalPlaythroughs,
      exitRate: data.exits / data.visits,
    }));
  }

  /**
   * Analyze choice statistics
   */
  analyzeChoices(): ChoiceAnalytics[] {
    const choiceMap = new Map<
      string,
      {
        passageId: string;
        passageTitle: string;
        choiceIndex: number;
        choiceText: string;
        count: number;
        passageVisits: number;
      }
    >();

    // Count passage visits for rate calculation
    const passageVisits = new Map<string, number>();
    for (const playthrough of this.playthroughs) {
      const visited = new Set<string>();
      for (const step of playthrough.steps) {
        if (!visited.has(step.passageId)) {
          visited.add(step.passageId);
          passageVisits.set(
            step.passageId,
            (passageVisits.get(step.passageId) || 0) + 1
          );
        }
      }
    }

    // Count choices
    for (const playthrough of this.playthroughs) {
      for (const step of playthrough.steps) {
        if (step.choiceIndex !== undefined && step.choiceText) {
          const key = `${step.passageId}:${step.choiceIndex}`;

          if (!choiceMap.has(key)) {
            choiceMap.set(key, {
              passageId: step.passageId,
              passageTitle: step.passageTitle,
              choiceIndex: step.choiceIndex,
              choiceText: step.choiceText,
              count: 0,
              passageVisits: passageVisits.get(step.passageId) || 1,
            });
          }

          choiceMap.get(key)!.count++;
        }
      }
    }

    return Array.from(choiceMap.values()).map(data => ({
      passageId: data.passageId,
      passageTitle: data.passageTitle,
      choiceIndex: data.choiceIndex,
      choiceText: data.choiceText,
      selectionCount: data.count,
      selectionRate: data.count / data.passageVisits,
    }));
  }

  /**
   * Analyze common paths
   */
  analyzePaths(): PathAnalytics[] {
    const pathMap = new Map<
      string,
      {
        path: string[];
        count: number;
        durations: number[];
        completed: boolean;
      }
    >();

    for (const playthrough of this.playthroughs) {
      const path = playthrough.getPath();
      const pathKey = path.join(' -> ');

      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, {
          path,
          count: 0,
          durations: [],
          completed: playthrough.completed,
        });
      }

      const data = pathMap.get(pathKey)!;
      data.count++;
      data.durations.push(playthrough.getDuration());
    }

    const totalPlaythroughs = this.playthroughs.length;

    // Sort by count and take top 10
    return Array.from(pathMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(data => ({
        path: data.path,
        count: data.count,
        percentage: data.count / totalPlaythroughs,
        averageDuration:
          data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
        completed: data.completed,
      }));
  }

  /**
   * Get passage visit heatmap
   */
  getHeatmap(): Map<string, number> {
    const heatmap = new Map<string, number>();

    for (const playthrough of this.playthroughs) {
      for (const step of playthrough.steps) {
        heatmap.set(
          step.passageId,
          (heatmap.get(step.passageId) || 0) + 1
        );
      }
    }

    return heatmap;
  }

  /**
   * Get choice distribution for a passage
   */
  getChoiceDistribution(
    passageId: string
  ): Map<number, { text: string; count: number }> {
    const distribution = new Map<number, { text: string; count: number }>();

    for (const playthrough of this.playthroughs) {
      for (const step of playthrough.steps) {
        if (
          step.passageId === passageId &&
          step.choiceIndex !== undefined &&
          step.choiceText
        ) {
          if (!distribution.has(step.choiceIndex)) {
            distribution.set(step.choiceIndex, {
              text: step.choiceText,
              count: 0,
            });
          }
          distribution.get(step.choiceIndex)!.count++;
        }
      }
    }

    return distribution;
  }

  /**
   * Find bottlenecks (passages with high exit rates)
   */
  findBottlenecks(threshold: number = 0.3): PassageAnalytics[] {
    return this.analyzePassages().filter(p => p.exitRate >= threshold);
  }

  /**
   * Return empty analytics for no data case
   */
  private emptyAnalytics(): PlaythroughAnalyticsData {
    return {
      totalPlaythroughs: 0,
      completedPlaythroughs: 0,
      completionRate: 0,
      averageDuration: 0,
      averageSteps: 0,
      averageUniquePassages: 0,
      passages: [],
      choices: [],
      commonPaths: [],
      hotspots: [],
      deadEnds: [],
    };
  }

  /**
   * Factory method
   */
  static create(playthroughs?: Playthrough[]): PlaythroughAnalytics {
    return new PlaythroughAnalytics(playthroughs);
  }
}
