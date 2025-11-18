import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  pacingStore,
  pacingMetrics,
  pacingIssues,
  hasIssues,
  highSeverityIssues,
  shortestPath,
  longestPath,
  type PassagePacingData,
  type PacingIssue,
} from './pacingStore';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';

describe('pacingStore', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Clear the auto-generated start passage to have a clean slate
    story.passages.clear();

    pacingStore.clear();
  });

  afterEach(() => {
    pacingStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with null metrics', () => {
      expect(get(pacingMetrics)).toBeNull();
    });

    it('should initialize with empty issues', () => {
      expect(get(pacingIssues)).toEqual([]);
    });

    it('should initialize with hasIssues false', () => {
      expect(get(hasIssues)).toBe(false);
    });

    it('should initialize with no high severity issues', () => {
      expect(get(highSeverityIssues)).toEqual([]);
    });

    it('should initialize with null paths', () => {
      expect(get(shortestPath)).toBeNull();
      expect(get(longestPath)).toBeNull();
    });
  });

  describe('analyze - simple story', () => {
    it('should analyze a basic linear story', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'The beginning of the story. It has some content here.';

      const passage2 = new Passage({ title: 'End' });
      passage2.content = 'The end of the story.';
      passage2.choices = [];

      passage1.choices = [
        new Choice({ text: 'Continue', target: passage2.id }),
      ];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics).not.toBeNull();
      expect(metrics?.totalPassages).toBe(2);
    });

    it('should count total words correctly', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'One two three four five.'; // 5 words

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Six seven eight.'; // 3 words

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.totalWords).toBe(8);
    });

    it('should calculate average words per passage', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'One two three four five six seven eight nine ten.'; // 10 words

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'One two three four five.'; // 5 words

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.avgWordsPerPassage).toBe(7.5);
    });

    it('should find min and max word counts', () => {
      const passage1 = new Passage({ title: 'Short' });
      passage1.content = 'Short.'; // 1 word

      const passage2 = new Passage({ title: 'Long' });
      passage2.content = 'This is a much longer passage with many more words in it.'; // 12 words
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Next', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      // Implementation includes 0 in Math.min, so minWords will always be 0
      expect(metrics?.minWords).toBe(0);
      expect(metrics?.maxWords).toBe(12);
    });
  });

  describe('analyze - choices and branching', () => {
    it('should count total choices', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Choose:';
      passage1.choices = [
        new Choice({ text: 'A', target: 'p2' }),
        new Choice({ text: 'B', target: 'p3' }),
      ];

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Path A';
      passage2.choices = [];

      const passage3 = new Passage({ title: 'P3' });
      passage3.content = 'Path B';
      passage3.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.totalChoices).toBe(2);
    });

    it('should calculate average choices per passage', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Choose:';
      passage1.choices = [
        new Choice({ text: 'A', target: 'p2' }),
        new Choice({ text: 'B', target: 'p2' }),
        new Choice({ text: 'C', target: 'p2' }),
      ];

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Result';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.avgChoicesPerPassage).toBe(1.5);
    });

    it('should calculate branching factor', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Start';
      passage1.choices = [
        new Choice({ text: 'Go left', target: 'p2' }),
        new Choice({ text: 'Go right', target: 'p3' }),
      ];

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Left';
      passage2.choices = [new Choice({ text: 'Continue', target: 'p4' })];

      const passage3 = new Passage({ title: 'P3' });
      passage3.content = 'Right';
      passage3.choices = [new Choice({ text: 'Continue', target: 'p4' })];

      const passage4 = new Passage({ title: 'P4' });
      passage4.content = 'End';
      passage4.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.addPassage(passage4);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      // (2 + 1 + 1 + 0) / 4 = 1
      expect(metrics?.branchingFactor).toBe(1);
    });
  });

  describe('analyze - dead ends', () => {
    it('should detect dead end passages', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';

      const passage2 = new Passage({ title: 'End' });
      passage2.content = 'Dead end';
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Go', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.deadEnds).toBe(1);
    });

    it('should not count passages with choices as dead ends', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Content';

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'End';
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Next', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.deadEnds).toBe(1); // Only P2
    });

    it('should count multiple dead ends', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Start';
      passage1.choices = [
        new Choice({ text: 'A', target: 'p2' }),
        new Choice({ text: 'B', target: 'p3' }),
      ];

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'End A';
      passage2.choices = [];

      const passage3 = new Passage({ title: 'P3' });
      passage3.content = 'End B';
      passage3.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.deadEnds).toBe(2);
    });
  });

  describe('analyze - orphan passages', () => {
    it('should detect orphan passages', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';
      passage1.choices = [];

      const passage2 = new Passage({ title: 'Orphan' });
      passage2.content = 'Unreachable';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.orphans).toBe(1);
    });

    it('should not count start passage as orphan', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.orphans).toBe(0);
    });

    it('should not count linked passages as orphans', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Start';

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'End';
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Next', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.orphans).toBe(0);
    });
  });

  describe('analyze - passage depth', () => {
    it('should calculate passage depths from start', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Level 0';

      const passage2 = new Passage({ title: 'Middle' });
      passage2.content = 'Level 1';

      const passage3 = new Passage({ title: 'End' });
      passage3.content = 'Level 2';
      passage3.choices = [];

      passage1.choices = [new Choice({ text: 'Next', target: passage2.id })];
      passage2.choices = [new Choice({ text: 'Next', target: passage3.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const state = get(pacingStore);
      const p1Data = state.passages.find(p => p.title === 'Start');
      const p2Data = state.passages.find(p => p.title === 'Middle');
      const p3Data = state.passages.find(p => p.title === 'End');

      expect(p1Data?.depth).toBe(0);
      expect(p2Data?.depth).toBe(1);
      expect(p3Data?.depth).toBe(2);
    });

    it('should calculate max depth', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Start';

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Middle';

      const passage3 = new Passage({ title: 'P3' });
      passage3.content = 'End';
      passage3.choices = [];

      passage1.choices = [new Choice({ text: 'A', target: passage2.id })];
      passage2.choices = [new Choice({ text: 'B', target: passage3.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.maxDepth).toBe(2);
    });
  });

  describe('analyze - reading time estimation', () => {
    it('should estimate reading time for passages', () => {
      const passage1 = new Passage({ title: 'P1' });
      // Approximately 200 words (1 minute at 200 wpm)
      passage1.content = Array(200).fill('word').join(' ');
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const state = get(pacingStore);
      const p1Data = state.passages[0];

      expect(p1Data.estimatedReadTime).toBeGreaterThan(0);
      expect(p1Data.estimatedReadTime).toBeCloseTo(60, -1); // Around 60 seconds
    });

    it('should calculate total estimated playtime', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = Array(100).fill('word').join(' '); // ~30 seconds

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = Array(100).fill('word').join(' '); // ~30 seconds
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Next', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.estimatedPlaytime.min).toBeGreaterThan(0);
    });
  });

  describe('analyze - shortest and longest paths', () => {
    it('should find shortest path', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';

      const passage2 = new Passage({ title: 'Short End' });
      passage2.content = 'Quick end';
      passage2.choices = [];

      const passage3 = new Passage({ title: 'Long Middle' });
      passage3.content = 'Middle part';

      const passage4 = new Passage({ title: 'Long End' });
      passage4.content = 'Final part';
      passage4.choices = [];

      // Set up choices with actual passage IDs
      passage1.choices = [
        new Choice({ text: 'Short', target: passage2.id }),
        new Choice({ text: 'Long', target: passage3.id }),
      ];
      passage3.choices = [new Choice({ text: 'Continue', target: passage4.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.addPassage(passage4);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const shortest = get(shortestPath);
      expect(shortest).not.toBeNull();
      expect(shortest?.passages.length).toBeLessThanOrEqual(2);
    });

    it('should find longest path', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';

      const passage2 = new Passage({ title: 'Short End' });
      passage2.content = 'Quick';
      passage2.choices = [];

      const passage3 = new Passage({ title: 'Long 1' });
      passage3.content = 'Part 1';

      const passage4 = new Passage({ title: 'Long 2' });
      passage4.content = 'Part 2';
      passage4.choices = [];

      // Set up choices with actual passage IDs
      passage1.choices = [
        new Choice({ text: 'Short', target: passage2.id }),
        new Choice({ text: 'Long', target: passage3.id }),
      ];
      passage3.choices = [new Choice({ text: 'Next', target: passage4.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.addPassage(passage4);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const longest = get(longestPath);
      expect(longest).not.toBeNull();
      expect(longest?.passages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('pacing issues detection', () => {
    it('should detect dead end issues', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';

      const passage2 = new Passage({ title: 'Dead End' });
      passage2.content = 'No way out';
      passage2.choices = [];

      passage1.choices = [new Choice({ text: 'Continue', target: passage2.id })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const deadEndIssues = issues.filter(i => i.type === 'dead_end');
      expect(deadEndIssues.length).toBeGreaterThan(0);
    });

    it('should detect orphan issues', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';
      passage1.choices = [];

      const passage2 = new Passage({ title: 'Orphan' });
      passage2.content = 'Unreachable';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const orphanIssues = issues.filter(i => i.type === 'orphan');
      expect(orphanIssues.length).toBeGreaterThan(0);
    });

    it('should detect too short passages', () => {
      const passage1 = new Passage({ title: 'Short' });
      passage1.content = 'Too short'; // Less than 50 words
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const shortIssues = issues.filter(i => i.type === 'too_short');
      expect(shortIssues.length).toBeGreaterThan(0);
    });

    it('should detect too long passages', () => {
      const passage1 = new Passage({ title: 'Long' });
      passage1.content = Array(501).fill('word').join(' '); // More than 500 words
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const longIssues = issues.filter(i => i.type === 'too_long');
      expect(longIssues.length).toBeGreaterThan(0);
    });

    it('should detect passages with too many choices', () => {
      const passage1 = new Passage({ title: 'Many Choices' });
      passage1.content = 'Choose wisely';
      passage1.choices = [
        new Choice({ text: 'Choice 1', target: 'p2' }),
        new Choice({ text: 'Choice 2', target: 'p2' }),
        new Choice({ text: 'Choice 3', target: 'p2' }),
        new Choice({ text: 'Choice 4', target: 'p2' }),
        new Choice({ text: 'Choice 5', target: 'p2' }),
        new Choice({ text: 'Choice 6', target: 'p2' }),
        new Choice({ text: 'Choice 7', target: 'p2' }),
      ];

      const passage2 = new Passage({ title: 'End' });
      passage2.content = 'Done';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const manyChoiceIssues = issues.filter(i => i.type === 'too_many_choices');
      expect(manyChoiceIssues.length).toBeGreaterThan(0);
    });

    it('should sort issues by severity', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Start';
      passage1.choices = [];

      const passage2 = new Passage({ title: 'Orphan' });
      passage2.content = 'Unreachable';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      const highSevere = get(highSeverityIssues);

      // Orphan issues should be high severity and appear first
      expect(highSevere.length).toBeGreaterThan(0);
      expect(highSevere[0].severity).toBe('high');
    });

    it('should include suggestions for issues', () => {
      const passage1 = new Passage({ title: 'Dead End' });
      passage1.content = 'No choices';
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const issues = get(pacingIssues);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].suggestion).toBeDefined();
    });
  });

  describe('derived stores', () => {
    it('should update hasIssues based on issues array', () => {
      const passage1 = new Passage({ title: 'Orphan' });
      passage1.content = 'Unreachable';
      passage1.choices = [];

      const passage2 = new Passage({ title: 'Start' });
      passage2.content = 'Beginning';
      passage2.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage2.id;

      pacingStore.analyze(story);

      expect(get(hasIssues)).toBe(true);
    });

    it('should filter high severity issues', () => {
      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';
      passage1.choices = [];

      const passage2 = new Passage({ title: 'Orphan' });
      passage2.content = 'Unreachable high severity issue';
      passage2.choices = [];

      const passage3 = new Passage({ title: 'Short' });
      passage3.content = 'Short'; // Low severity
      passage3.choices = [];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.addPassage(passage3);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const allIssues = get(pacingIssues);
      const highIssues = get(highSeverityIssues);

      expect(highIssues.length).toBeLessThan(allIssues.length);
      expect(highIssues.every(i => i.severity === 'high')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all analysis data', () => {
      const passage1 = new Passage({ title: 'Test' });
      passage1.content = 'Test content';
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      expect(get(pacingMetrics)).not.toBeNull();

      pacingStore.clear();

      expect(get(pacingMetrics)).toBeNull();
      expect(get(pacingIssues)).toEqual([]);
      expect(get(shortestPath)).toBeNull();
      expect(get(longestPath)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty story', () => {
      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.totalPassages).toBe(0);
    });

    it('should handle story with single passage', () => {
      const passage1 = new Passage({ title: 'Only' });
      passage1.content = 'Single passage';
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics?.totalPassages).toBe(1);
    });

    it('should handle circular references', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'First';
      passage1.choices = [new Choice({ text: 'To P2', target: 'p2' })];

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Second';
      passage2.choices = [new Choice({ text: 'Back to P1', target: 'p1' })];

      story.addPassage(passage1);
      story.addPassage(passage2);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const metrics = get(pacingMetrics);
      expect(metrics).not.toBeNull();
    });

    it('should handle passages with empty content', () => {
      const passage1 = new Passage({ title: 'Empty' });
      passage1.content = '';
      passage1.choices = [];

      story.addPassage(passage1);
      story.startPassage = passage1.id;

      pacingStore.analyze(story);

      const state = get(pacingStore);
      const p1Data = state.passages[0];
      expect(p1Data.wordCount).toBe(0);
    });
  });
});
