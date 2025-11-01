/**
 * Story Pacing Analyzer Store
 *
 * Analyzes story pacing including:
 * - Passage length distribution
 * - Choice density (branching factor)
 * - Dead ends detection
 * - Path length analysis
 * - Reading time estimation
 * - Narrative flow visualization
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';

export interface PassagePacingData {
  id: string;
  title: string;
  wordCount: number;
  choiceCount: number;
  incomingLinks: number;
  outgoingLinks: number;
  depth: number;              // Distance from start passage
  estimatedReadTime: number;  // Seconds
  hasDeadEnd: boolean;
  hasOrphan: boolean;        // No incoming links (except start)
  tags: string[];
}

export interface PathData {
  passages: string[];         // Passage IDs in order
  totalWords: number;
  totalReadTime: number;      // Seconds
  choicePoints: number;
  avgChoicesPerPoint: number;
}

export interface PacingMetrics {
  totalPassages: number;
  totalWords: number;
  avgWordsPerPassage: number;
  minWords: number;
  maxWords: number;
  totalChoices: number;
  avgChoicesPerPassage: number;
  branchingFactor: number;    // Avg outgoing links per passage
  deadEnds: number;           // Passages with no outgoing links
  orphans: number;            // Passages with no incoming links (except start)
  maxDepth: number;           // Longest path from start
  estimatedPlaytime: {
    min: number;              // Shortest path (seconds)
    max: number;              // Longest path (seconds)
    avg: number;              // Average path (seconds)
  };
}

export interface PacingIssue {
  type: 'dead_end' | 'orphan' | 'too_short' | 'too_long' | 'no_choices' | 'too_many_choices';
  severity: 'low' | 'medium' | 'high';
  passageId: string;
  passageTitle: string;
  message: string;
  suggestion?: string;
}

export interface PacingStoreState {
  passages: PassagePacingData[];
  metrics: PacingMetrics | null;
  issues: PacingIssue[];
  shortestPath: PathData | null;
  longestPath: PathData | null;
  lastAnalyzed: string | null;
}

const WORDS_PER_MINUTE = 200; // Average reading speed

// Calculate word count
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Calculate reading time in seconds
function calculateReadTime(wordCount: number): number {
  return Math.ceil((wordCount / WORDS_PER_MINUTE) * 60);
}

// Build passage pacing data
function analyzePassage(
  passage: Passage,
  story: Story,
  incomingLinks: Map<string, number>,
  depths: Map<string, number>
): PassagePacingData {
  const wordCount = countWords(passage.content);
  const choiceCount = passage.choices.length;
  const outgoingLinks = passage.choices.filter(c => c.target).length;
  const incoming = incomingLinks.get(passage.id) || 0;
  const depth = depths.get(passage.id) || 0;
  const hasDeadEnd = outgoingLinks === 0 && passage.id !== story.startPassage;
  const hasOrphan = incoming === 0 && passage.id !== story.startPassage;

  return {
    id: passage.id,
    title: passage.title,
    wordCount,
    choiceCount,
    incomingLinks: incoming,
    outgoingLinks,
    depth,
    estimatedReadTime: calculateReadTime(wordCount),
    hasDeadEnd,
    hasOrphan,
    tags: passage.tags || [],
  };
}

// Calculate passage depths (BFS from start)
function calculateDepths(story: Story): Map<string, number> {
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  const queue: [string, number][] = [[story.startPassage, 0]];

  while (queue.length > 0) {
    const [passageId, depth] = queue.shift()!;

    if (visited.has(passageId)) continue;
    visited.add(passageId);
    depths.set(passageId, depth);

    const passage = story.passages.get(passageId);
    if (!passage) continue;

    for (const choice of passage.choices) {
      if (choice.target && !visited.has(choice.target)) {
        queue.push([choice.target, depth + 1]);
      }
    }
  }

  return depths;
}

// Count incoming links for each passage
function countIncomingLinks(story: Story): Map<string, number> {
  const incoming = new Map<string, number>();

  for (const passage of story.passages.values()) {
    for (const choice of passage.choices) {
      if (choice.target) {
        incoming.set(choice.target, (incoming.get(choice.target) || 0) + 1);
      }
    }
  }

  return incoming;
}

// Find shortest path from start to any ending
function findShortestPath(story: Story, passages: PassagePacingData[]): PathData | null {
  const passageMap = new Map(passages.map(p => [p.id, p]));
  const visited = new Set<string>();
  const queue: { path: string[]; words: number; time: number; choices: number }[] = [
    { path: [story.startPassage], words: 0, time: 0, choices: 0 }
  ];

  let shortest: PathData | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const lastId = current.path[current.path.length - 1];

    if (visited.has(lastId)) continue;
    visited.add(lastId);

    const passage = story.passages.get(lastId);
    const pacingData = passageMap.get(lastId);
    if (!passage || !pacingData) continue;

    const newWords = current.words + pacingData.wordCount;
    const newTime = current.time + pacingData.estimatedReadTime;
    const newChoices = current.choices + (pacingData.choiceCount > 0 ? 1 : 0);

    // Dead end found
    if (pacingData.hasDeadEnd) {
      if (!shortest || newWords < shortest.totalWords) {
        shortest = {
          passages: current.path,
          totalWords: newWords,
          totalReadTime: newTime,
          choicePoints: newChoices,
          avgChoicesPerPoint: newChoices > 0 ? pacingData.choiceCount / newChoices : 0,
        };
      }
      continue;
    }

    // Add choices to queue
    for (const choice of passage.choices) {
      if (choice.target && !visited.has(choice.target)) {
        queue.push({
          path: [...current.path, choice.target],
          words: newWords,
          time: newTime,
          choices: newChoices,
        });
      }
    }
  }

  return shortest;
}

// Find longest path (DFS with memoization)
function findLongestPath(story: Story, passages: PassagePacingData[]): PathData | null {
  const passageMap = new Map(passages.map(p => [p.id, p]));
  let longest: PathData | null = null;

  function dfs(
    passageId: string,
    path: string[],
    words: number,
    time: number,
    choices: number,
    visited: Set<string>
  ): void {
    if (visited.has(passageId)) return;

    const passage = story.passages.get(passageId);
    const pacingData = passageMap.get(passageId);
    if (!passage || !pacingData) return;

    const newPath = [...path, passageId];
    const newWords = words + pacingData.wordCount;
    const newTime = time + pacingData.estimatedReadTime;
    const newChoices = choices + (pacingData.choiceCount > 0 ? 1 : 0);

    visited.add(passageId);

    // Dead end or no more choices
    if (pacingData.hasDeadEnd || passage.choices.length === 0) {
      if (!longest || newWords > longest.totalWords) {
        longest = {
          passages: newPath,
          totalWords: newWords,
          totalReadTime: newTime,
          choicePoints: newChoices,
          avgChoicesPerPoint: newChoices > 0 ? passage.choices.length / newChoices : 0,
        };
      }
    } else {
      // Continue exploring
      for (const choice of passage.choices) {
        if (choice.target) {
          dfs(choice.target, newPath, newWords, newTime, newChoices, new Set(visited));
        }
      }
    }

    visited.delete(passageId);
  }

  dfs(story.startPassage, [], 0, 0, 0, new Set());
  return longest;
}

// Detect pacing issues
function detectIssues(passages: PassagePacingData[], metrics: PacingMetrics): PacingIssue[] {
  const issues: PacingIssue[] = [];

  for (const passage of passages) {
    // Dead ends
    if (passage.hasDeadEnd) {
      issues.push({
        type: 'dead_end',
        severity: 'medium',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" has no outgoing choices (dead end)`,
        suggestion: 'Add choices to continue the story or mark as an ending passage',
      });
    }

    // Orphans
    if (passage.hasOrphan) {
      issues.push({
        type: 'orphan',
        severity: 'high',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" is unreachable from the start passage`,
        suggestion: 'Add a choice from another passage linking to this one',
      });
    }

    // Too short
    if (passage.wordCount < 50 && passage.wordCount > 0) {
      issues.push({
        type: 'too_short',
        severity: 'low',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" is very short (${passage.wordCount} words)`,
        suggestion: 'Consider adding more content or merging with another passage',
      });
    }

    // Too long
    if (passage.wordCount > 500) {
      issues.push({
        type: 'too_long',
        severity: 'low',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" is very long (${passage.wordCount} words)`,
        suggestion: 'Consider breaking into smaller passages for better pacing',
      });
    }

    // No choices (but not dead end - has content but no choices defined)
    if (passage.choiceCount === 0 && !passage.hasDeadEnd && passage.wordCount > 0) {
      issues.push({
        type: 'no_choices',
        severity: 'medium',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" has content but no choices defined`,
        suggestion: 'Add choices to continue the narrative',
      });
    }

    // Too many choices
    if (passage.choiceCount > 6) {
      issues.push({
        type: 'too_many_choices',
        severity: 'low',
        passageId: passage.id,
        passageTitle: passage.title,
        message: `"${passage.title}" has many choices (${passage.choiceCount})`,
        suggestion: 'Consider grouping related choices or splitting the passage',
      });
    }
  }

  return issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// Create pacing store
const createPacingStore = () => {
  const { subscribe, set, update } = writable<PacingStoreState>({
    passages: [],
    metrics: null,
    issues: [],
    shortestPath: null,
    longestPath: null,
    lastAnalyzed: null,
  });

  return {
    subscribe,

    /**
     * Analyze story pacing
     */
    analyze: (story: Story) => {
      const incomingLinks = countIncomingLinks(story);
      const depths = calculateDepths(story);

      // Analyze all passages
      const passages = Array.from(story.passages.values()).map(p =>
        analyzePassage(p, story, incomingLinks, depths)
      );

      // Calculate metrics
      const totalWords = passages.reduce((sum, p) => sum + p.wordCount, 0);
      const totalChoices = passages.reduce((sum, p) => sum + p.choiceCount, 0);
      const wordCounts = passages.map(p => p.wordCount);
      const deadEnds = passages.filter(p => p.hasDeadEnd).length;
      const orphans = passages.filter(p => p.hasOrphan).length;
      const maxDepth = Math.max(...passages.map(p => p.depth), 0);

      const shortestPath = findShortestPath(story, passages);
      const longestPath = findLongestPath(story, passages);

      const metrics: PacingMetrics = {
        totalPassages: passages.length,
        totalWords,
        avgWordsPerPassage: passages.length > 0 ? totalWords / passages.length : 0,
        minWords: Math.min(...wordCounts, 0),
        maxWords: Math.max(...wordCounts, 0),
        totalChoices,
        avgChoicesPerPassage: passages.length > 0 ? totalChoices / passages.length : 0,
        branchingFactor: passages.length > 0
          ? passages.reduce((sum, p) => sum + p.outgoingLinks, 0) / passages.length
          : 0,
        deadEnds,
        orphans,
        maxDepth,
        estimatedPlaytime: {
          min: shortestPath?.totalReadTime || 0,
          max: longestPath?.totalReadTime || 0,
          avg: passages.length > 0
            ? passages.reduce((sum, p) => sum + p.estimatedReadTime, 0) / passages.length
            : 0,
        },
      };

      const issues = detectIssues(passages, metrics);

      set({
        passages,
        metrics,
        issues,
        shortestPath,
        longestPath,
        lastAnalyzed: new Date().toISOString(),
      });
    },

    /**
     * Clear analysis
     */
    clear: () => {
      set({
        passages: [],
        metrics: null,
        issues: [],
        shortestPath: null,
        longestPath: null,
        lastAnalyzed: null,
      });
    },
  };
};

export const pacingStore = createPacingStore();

// Derived stores
export const pacingMetrics = derived(pacingStore, $store => $store.metrics);
export const pacingIssues = derived(pacingStore, $store => $store.issues);
export const hasIssues = derived(pacingIssues, $issues => $issues.length > 0);
export const highSeverityIssues = derived(
  pacingIssues,
  $issues => $issues.filter(i => i.severity === 'high')
);
export const shortestPath = derived(pacingStore, $store => $store.shortestPath);
export const longestPath = derived(pacingStore, $store => $store.longestPath);
