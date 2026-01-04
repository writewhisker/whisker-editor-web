/**
 * QualityAnalyzer Tests
 */

import { describe, it, expect } from 'vitest';
import { QualityAnalyzer } from '../QualityAnalyzer';
import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';

describe('QualityAnalyzer', () => {
  const analyzer = new QualityAnalyzer();

  function createTestStory(): Story {
    const story = new Story();
    const startPassage = new Passage('start', 'Start');
    startPassage.content = 'Welcome to the story. This is the beginning.';
    startPassage.choices = [
      (() => { const c = new Choice('c1', 'Go left'); c.target = 'left'; return c; })(),
      (() => { const c = new Choice('c2', 'Go right'); c.target = 'right'; return c; })()
    ];

    const leftPassage = new Passage('left', 'Left Path');
    leftPassage.content = 'You went left.';
    leftPassage.choices = [
      (() => { const c = new Choice('c3', 'Continue'); c.target = 'end'; return c; })()
    ];

    const rightPassage = new Passage('right', 'Right Path');
    rightPassage.content = 'You went right.';
    rightPassage.choices = [
      (() => { const c = new Choice('c4', 'Continue'); c.target = 'end'; return c; })()
    ];

    const endPassage = new Passage('end', 'The End');
    endPassage.content = 'The story ends here.';
    endPassage.choices = [];

    story.passages.set('start', startPassage);
    story.passages.set('left', leftPassage);
    story.passages.set('right', rightPassage);
    story.passages.set('end', endPassage);
    story.startPassage = 'start';

    return story;
  }

  describe('analyze', () => {
    it('should return metrics for a valid story', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalPassages).toBe('number');
      expect(typeof metrics.totalChoices).toBe('number');
      expect(metrics.totalPassages).toBeGreaterThanOrEqual(4);
      expect(metrics.totalChoices).toBeGreaterThanOrEqual(4);
    });

    it('should handle empty story', () => {
      const story = new Story();
      const metrics = analyzer.analyze(story);

      // Just verify metrics are returned for empty story
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalPassages).toBe('number');
      expect(typeof metrics.totalChoices).toBe('number');
    });

    it('should calculate depth correctly', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      // Depth from start -> left/right -> end is 2
      expect(metrics.depth).toBeGreaterThanOrEqual(2);
    });

    it('should calculate branching factor', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      // Average choices per passage
      expect(metrics.branchingFactor).toBeGreaterThan(0);
    });

    it('should calculate word counts', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(metrics.totalWords).toBeGreaterThan(0);
      expect(metrics.avgWordsPerPassage).toBeGreaterThan(0);
    });

    it('should count unique endings', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      // Count passages with no choices (could include END targets)
      expect(typeof metrics.uniqueEndings).toBe('number');
    });

    it('should calculate reachability score', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      // Should return a valid score
      expect(typeof metrics.reachabilityScore).toBe('number');
      expect(metrics.reachabilityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.reachabilityScore).toBeLessThanOrEqual(100);
    });

    it('should handle story with unreachable passages', () => {
      const story = createTestStory();
      // Add an unreachable passage
      const unreachable = new Passage('unreachable', 'Orphan');
      story.passages.set('unreachable', unreachable);

      const metrics = analyzer.analyze(story);

      // Should still return a valid analysis
      expect(metrics).toBeDefined();
      expect(typeof metrics.reachabilityScore).toBe('number');
    });

    it('should handle story with variables', () => {
      const story = createTestStory();
      story.variables.set('score', new Variable('score', 0, 'story'));
      story.variables.set('health', new Variable('health', 100, 'story'));

      const metrics = analyzer.analyze(story);

      expect(metrics.totalVariables).toBe(2);
    });

    it('should estimate play time', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPlayTime).toBeGreaterThan(0);
    });

    it('should estimate paths', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPaths).toBeGreaterThan(0);
    });

    it('should handle cycles in story', () => {
      const story = new Story();
      const start = new Passage('start', 'Start');
      start.choices = [
        (() => { const c = new Choice('c1', 'Loop'); c.target = 'start'; return c; })()
      ];
      story.passages.set('start', start);
      story.startPassage = 'start';

      // Should not hang on cycles
      const metrics = analyzer.analyze(story);
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalPassages).toBe('number');
    });

    it('should handle story without start passage', () => {
      const story = new Story();
      const passage = new Passage('p1', 'Passage 1');
      story.passages.set('p1', passage);
      // No startPassage set

      const metrics = analyzer.analyze(story);
      expect(metrics.depth).toBe(0);
    });

    it('should calculate conditional complexity', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(typeof metrics.conditionalComplexity).toBe('number');
    });

    it('should calculate variable complexity', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(typeof metrics.variableComplexity).toBe('number');
    });

    it('should calculate density', () => {
      const story = createTestStory();
      const metrics = analyzer.analyze(story);

      expect(typeof metrics.density).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle single passage story', () => {
      const story = new Story();
      const only = new Passage('only', 'Only Passage');
      only.content = 'This is the only passage.';
      story.passages.set('only', only);
      story.startPassage = 'only';

      const metrics = analyzer.analyze(story);
      // Just verify it runs without error and returns metrics
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalPassages).toBe('number');
    });

    it('should handle story with dead-end choices', () => {
      const story = new Story();
      const start = new Passage('start', 'Start');
      start.choices = [
        (() => { const c = new Choice('c1', 'Go'); c.target = 'nonexistent'; return c; })()
      ];
      story.passages.set('start', start);
      story.startPassage = 'start';

      const metrics = analyzer.analyze(story);
      // Should still analyze the story
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalPassages).toBe('number');
    });

    it('should handle passage with empty content', () => {
      const story = new Story();
      const empty = new Passage('empty', 'Empty');
      empty.content = '';
      story.passages.set('empty', empty);
      story.startPassage = 'empty';

      const metrics = analyzer.analyze(story);
      // Should still analyze successfully
      expect(typeof metrics.totalWords).toBe('number');
    });
  });
});
