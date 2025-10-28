/**
 * Analytics Types
 *
 * Type definitions for story analytics and metrics.
 */

export interface StoryMetrics {
  // Basic counts
  totalPassages: number;
  totalChoices: number;
  totalVariables: number;

  // Structure metrics
  avgChoicesPerPassage: number;
  maxDepth: number; // Longest path from start
  maxBreadth: number; // Maximum branching factor

  // Complexity
  complexityScore: number; // 0-100
  estimatedReadingTime: number; // minutes

  // Reachability
  reachablePassages: number;
  unreachablePassages: number;
  deadEnds: number;

  // Warnings
  issues: AnalyticsIssue[];
}

export interface AnalyticsIssue {
  severity: 'error' | 'warning' | 'info';
  type: 'dead-end' | 'unreachable' | 'circular' | 'missing-choice' | 'broken-link';
  passageId?: string;
  passageName?: string;
  message: string;
  suggestion?: string;
}

export interface PassageVisitData {
  passageId: string;
  passageName: string;
  visitCount: number;
  percentage: number; // % of simulations that visited
}

export interface PlaythroughData {
  totalSimulations: number;
  averagePathLength: number;
  mostVisitedPassages: PassageVisitData[];
  leastVisitedPassages: PassageVisitData[];
  criticalPath: string[]; // Passage IDs on critical path
  branchingFactor: number;
  playerAgency: number; // 0-1, how much choice matters
}

export interface AnalyticsReport {
  storyId: string;
  storyTitle: string;
  generatedAt: number;
  metrics: StoryMetrics;
  playthrough?: PlaythroughData;
}
