/**
 * PlaythroughAnalytics - Analyzes playthrough data to generate insights
 *
 * Provides statistics and metrics about story playthroughs.
 */

import type { Playthrough } from '../models/Playthrough';
import type { Story } from '../models/Story';

export interface PassageStatistics {
  passageId: string;
  passageTitle: string;
  visitCount: number;
  totalTimeSpent: number;
  averageTimeSpent: number;
  exitPaths: Map<string, number>; // Maps passage ID to count
}

export interface ChoiceStatistics {
  passageId: string;
  passageTitle: string;
  choiceIndex: number;
  choiceText: string;
  chosenCount: number;
  percentage: number;
}

export interface PathStatistics {
  path: string[]; // Sequence of passage IDs
  pathTitles: string[]; // Sequence of passage titles
  count: number;
  percentage: number;
  averageDuration: number;
}

export interface CompletionStatistics {
  totalPlaythroughs: number;
  completedPlaythroughs: number;
  completionRate: number;
  averageDuration: number;
  averageSteps: number;
}

export interface PlaythroughAnalyticsData {
  storyId: string;
  storyTitle: string;
  completion: CompletionStatistics;
  passages: Map<string, PassageStatistics>;
  choices: ChoiceStatistics[];
  popularPaths: PathStatistics[];
  deadEnds: string[]; // Passage IDs where playthroughs commonly end
}

export class PlaythroughAnalytics {
  private playthroughs: Playthrough[];
  private story: Story;

  constructor(story: Story, playthroughs: Playthrough[]) {
    this.story = story;
    this.playthroughs = playthroughs.filter(p => p.storyId === story.metadata.id);
  }

  /**
   * Generate complete analytics for the story
   */
  analyze(): PlaythroughAnalyticsData {
    return {
      storyId: this.story.metadata.id || 'unknown',
      storyTitle: this.story.metadata.title,
      completion: this.analyzeCompletion(),
      passages: this.analyzePassages(),
      choices: this.analyzeChoices(),
      popularPaths: this.analyzePopularPaths(),
      deadEnds: this.findDeadEnds(),
    };
  }

  /**
   * Analyze completion statistics
   */
  private analyzeCompletion(): CompletionStatistics {
    const total = this.playthroughs.length;
    const completed = this.playthroughs.filter(p => p.completed).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const durations = this.playthroughs
      .filter(p => p.completed)
      .map(p => p.getDuration());
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const steps = this.playthroughs.map(p => p.steps.length);
    const averageSteps = steps.length > 0
      ? steps.reduce((a, b) => a + b, 0) / steps.length
      : 0;

    return {
      totalPlaythroughs: total,
      completedPlaythroughs: completed,
      completionRate,
      averageDuration,
      averageSteps,
    };
  }

  /**
   * Analyze passage visit statistics
   */
  private analyzePassages(): Map<string, PassageStatistics> {
    const passageStats = new Map<string, PassageStatistics>();

    // Initialize stats for all passages in the story
    this.story.passages.forEach((passage, id) => {
      passageStats.set(id, {
        passageId: id,
        passageTitle: passage.title,
        visitCount: 0,
        totalTimeSpent: 0,
        averageTimeSpent: 0,
        exitPaths: new Map(),
      });
    });

    // Aggregate data from playthroughs
    this.playthroughs.forEach(playthrough => {
      playthrough.steps.forEach((step, index) => {
        const stats = passageStats.get(step.passageId);
        if (stats) {
          stats.visitCount++;
          stats.totalTimeSpent += step.timeSpent || 0;

          // Track exit paths (where players went next)
          if (index < playthrough.steps.length - 1) {
            const nextPassageId = playthrough.steps[index + 1].passageId;
            const currentCount = stats.exitPaths.get(nextPassageId) || 0;
            stats.exitPaths.set(nextPassageId, currentCount + 1);
          }
        }
      });
    });

    // Calculate averages
    passageStats.forEach(stats => {
      if (stats.visitCount > 0) {
        stats.averageTimeSpent = stats.totalTimeSpent / stats.visitCount;
      }
    });

    return passageStats;
  }

  /**
   * Analyze choice selection statistics
   */
  private analyzeChoices(): ChoiceStatistics[] {
    const choiceMap = new Map<string, ChoiceStatistics>();

    // Count choice selections
    this.playthroughs.forEach(playthrough => {
      playthrough.getChoices().forEach(choice => {
        const key = `${choice.passageTitle}-${choice.choiceIndex}`;

        if (!choiceMap.has(key)) {
          choiceMap.set(key, {
            passageId: '', // Would need to look up from story
            passageTitle: choice.passageTitle,
            choiceIndex: choice.choiceIndex,
            choiceText: choice.choiceText,
            chosenCount: 0,
            percentage: 0,
          });
        }

        const stats = choiceMap.get(key)!;
        stats.chosenCount++;
      });
    });

    // Calculate percentages
    const choices = Array.from(choiceMap.values());

    // Group by passage to calculate percentages
    const byPassage = new Map<string, ChoiceStatistics[]>();
    choices.forEach(choice => {
      if (!byPassage.has(choice.passageTitle)) {
        byPassage.set(choice.passageTitle, []);
      }
      byPassage.get(choice.passageTitle)!.push(choice);
    });

    // Calculate percentages within each passage
    byPassage.forEach(passageChoices => {
      const total = passageChoices.reduce((sum, c) => sum + c.chosenCount, 0);
      passageChoices.forEach(choice => {
        choice.percentage = total > 0 ? (choice.chosenCount / total) * 100 : 0;
      });
    });

    return choices.sort((a, b) => b.chosenCount - a.chosenCount);
  }

  /**
   * Analyze popular paths through the story
   */
  private analyzePopularPaths(topN: number = 10): PathStatistics[] {
    const pathMap = new Map<string, PathStatistics>();

    this.playthroughs.forEach(playthrough => {
      const pathIds = playthrough.steps.map(s => s.passageId);
      const pathTitles = playthrough.steps.map(s => s.passageTitle);
      const pathKey = pathIds.join('->');

      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, {
          path: pathIds,
          pathTitles,
          count: 0,
          percentage: 0,
          averageDuration: 0,
        });
      }

      const stats = pathMap.get(pathKey)!;
      stats.count++;
      stats.averageDuration += playthrough.getDuration();
    });

    // Calculate averages and percentages
    const total = this.playthroughs.length;
    const paths = Array.from(pathMap.values());

    paths.forEach(path => {
      path.percentage = total > 0 ? (path.count / total) * 100 : 0;
      path.averageDuration = path.averageDuration / path.count;
    });

    // Sort by count and return top N
    return paths
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }

  /**
   * Find passages where playthroughs commonly end (dead ends)
   */
  private findDeadEnds(): string[] {
    const endPassages = new Map<string, number>();

    this.playthroughs.forEach(playthrough => {
      if (playthrough.steps.length > 0) {
        const lastStep = playthrough.steps[playthrough.steps.length - 1];
        const count = endPassages.get(lastStep.passageId) || 0;
        endPassages.set(lastStep.passageId, count + 1);
      }
    });

    // Return passages that ended 20% or more of playthroughs
    const threshold = this.playthroughs.length * 0.2;
    return Array.from(endPassages.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([passageId, _]) => passageId);
  }

  /**
   * Get passages that were never visited
   */
  getNeverVisitedPassages(): string[] {
    const visitedPassages = new Set<string>();

    this.playthroughs.forEach(playthrough => {
      playthrough.steps.forEach(step => {
        visitedPassages.add(step.passageId);
      });
    });

    const neverVisited: string[] = [];
    this.story.passages.forEach((_, id) => {
      if (!visitedPassages.has(id)) {
        neverVisited.push(id);
      }
    });

    return neverVisited;
  }

  /**
   * Get the most common starting passages
   */
  getStartingPassages(): Map<string, number> {
    const startPassages = new Map<string, number>();

    this.playthroughs.forEach(playthrough => {
      if (playthrough.steps.length > 0) {
        const firstStep = playthrough.steps[0];
        const count = startPassages.get(firstStep.passageId) || 0;
        startPassages.set(firstStep.passageId, count + 1);
      }
    });

    return startPassages;
  }

  /**
   * Get variable value distributions across playthroughs
   */
  getVariableDistribution(variableName: string): Map<any, number> {
    const distribution = new Map<any, number>();

    this.playthroughs.forEach(playthrough => {
      const value = playthrough.finalVariables[variableName];
      if (value !== undefined) {
        const count = distribution.get(value) || 0;
        distribution.set(value, count + 1);
      }
    });

    return distribution;
  }
}
