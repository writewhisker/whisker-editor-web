import { describe, it, expect, beforeEach } from 'vitest';
import { QualityAnalyzer } from './QualityAnalyzer';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';
import { Variable } from '../models/Variable';

describe('QualityAnalyzer', () => {
  let analyzer: QualityAnalyzer;
  let story: Story;

  beforeEach(() => {
    analyzer = new QualityAnalyzer();
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  describe('basic metrics', () => {
    it('should analyze empty story', () => {
      const metrics = analyzer.analyze(story);

      expect(metrics.totalPassages).toBeGreaterThanOrEqual(1); // At least start passage
      expect(metrics.totalChoices).toBe(0);
      expect(metrics.totalVariables).toBe(0);
      expect(metrics.totalWords).toBeGreaterThanOrEqual(0);
    });

    it('should count passages correctly', () => {
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      story.addPassage(p1);
      story.addPassage(p2);

      const metrics = analyzer.analyze(story);

      expect(metrics.totalPassages).toBe(3); // Start + 2
    });

    it('should count choices correctly', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const second = new Passage({ title: 'Second' });
      story.addPassage(second);

      startPassage.addChoice(new Choice({ text: 'C1', target: second.id }));
      startPassage.addChoice(new Choice({ text: 'C2', target: second.id }));
      second.addChoice(new Choice({ text: 'C3', target: startPassage.id }));

      const metrics = analyzer.analyze(story);

      expect(metrics.totalChoices).toBe(3);
    });

    it('should count variables correctly', () => {
      story.addVariable(new Variable({ name: 'v1', type: 'number', initial: 0 }));
      story.addVariable(new Variable({ name: 'v2', type: 'string', initial: '' }));

      const metrics = analyzer.analyze(story);

      expect(metrics.totalVariables).toBe(2);
    });

    it('should count words correctly', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.content = 'This is a test with ten words in it.'; // 9 words (counted correctly)

      const metrics = analyzer.analyze(story);

      expect(metrics.totalWords).toBe(9);
      expect(metrics.avgWordsPerPassage).toBeGreaterThan(0);
    });

    it('should calculate average words per passage', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.content = 'Ten words here in this passage for testing purposes.'; // 9 words

      const second = new Passage({ title: 'Second' });
      second.content = 'Three words only'; // 3 words
      story.addPassage(second);

      const metrics = analyzer.analyze(story);

      expect(metrics.totalWords).toBe(12);
      expect(metrics.avgWordsPerPassage).toBe(6);
    });
  });

  describe('structure metrics', () => {
    it('should calculate depth for linear story', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      const p3 = new Passage({ title: 'P3' });
      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(p3);

      startPassage.addChoice(new Choice({ text: 'Next', target: p1.id }));
      p1.addChoice(new Choice({ text: 'Next', target: p2.id }));
      p2.addChoice(new Choice({ text: 'Next', target: p3.id }));
      // p3 has no choices - terminal

      const metrics = analyzer.analyze(story);

      expect(metrics.depth).toBe(3); // 0 -> p1 -> p2 -> p3
    });

    it('should calculate depth for branching story', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const shortPath = new Passage({ title: 'Short' });
      const longPath1 = new Passage({ title: 'Long1' });
      const longPath2 = new Passage({ title: 'Long2' });
      story.addPassage(shortPath);
      story.addPassage(longPath1);
      story.addPassage(longPath2);

      startPassage.addChoice(new Choice({ text: 'Short', target: shortPath.id }));
      startPassage.addChoice(new Choice({ text: 'Long', target: longPath1.id }));
      longPath1.addChoice(new Choice({ text: 'Continue', target: longPath2.id }));

      const metrics = analyzer.analyze(story);

      expect(metrics.depth).toBe(2); // Longest path: start -> long1 -> long2
    });

    it('should calculate branching factor', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      story.addPassage(p1);
      story.addPassage(p2);

      startPassage.addChoice(new Choice({ text: 'C1', target: p1.id }));
      startPassage.addChoice(new Choice({ text: 'C2', target: p2.id }));
      p1.addChoice(new Choice({ text: 'C3', target: p2.id }));
      // p2 has no choices

      const metrics = analyzer.analyze(story);

      // 3 choices / 3 passages = 1.0
      expect(metrics.branchingFactor).toBeCloseTo(1.0);
    });

    it('should calculate density', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const p1 = new Passage({ title: 'P1' });
      story.addPassage(p1);

      startPassage.addChoice(new Choice({ text: 'Go', target: p1.id }));

      const metrics = analyzer.analyze(story);

      // 1 connection out of 2 possible (2 * 1) = 0.5
      expect(metrics.density).toBeGreaterThan(0);
      expect(metrics.density).toBeLessThan(1);
    });
  });

  describe('complexity metrics', () => {
    it('should count unique endings', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const ending1 = new Passage({ title: 'Ending1' });
      const ending2 = new Passage({ title: 'Ending2' });
      const middle = new Passage({ title: 'Middle' });
      story.addPassage(ending1);
      story.addPassage(ending2);
      story.addPassage(middle);

      startPassage.addChoice(new Choice({ text: 'Go', target: middle.id }));
      middle.addChoice(new Choice({ text: 'E1', target: ending1.id }));
      middle.addChoice(new Choice({ text: 'E2', target: ending2.id }));

      const metrics = analyzer.analyze(story);

      expect(metrics.uniqueEndings).toBe(2);
    });

    it('should calculate reachability score', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const reachable = new Passage({ title: 'Reachable' });
      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(reachable);
      story.addPassage(unreachable);

      startPassage.addChoice(new Choice({ text: 'Go', target: reachable.id }));

      const metrics = analyzer.analyze(story);

      // 2 reachable out of 3 total = 66.67%
      expect(metrics.reachabilityScore).toBeCloseTo(66.67, 0);
    });

    it('should calculate conditional complexity', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const p1 = new Passage({ title: 'P1' });
      story.addPassage(p1);

      startPassage.addChoice(new Choice({ text: 'C1', target: p1.id, condition: 'x > 5' }));
      startPassage.addChoice(new Choice({ text: 'C2', target: p1.id }));

      const metrics = analyzer.analyze(story);

      // 1 conditional out of 2 = 50%
      expect(metrics.conditionalComplexity).toBe(50);
    });

    it('should calculate variable complexity', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.onEnterScript = 'x = 10; y = 20';

      const p1 = new Passage({ title: 'P1' });
      p1.addChoice(new Choice({ text: 'C', condition: 'x > 5' }));
      story.addPassage(p1);

      const metrics = analyzer.analyze(story);

      // Should detect variable references
      expect(metrics.variableComplexity).toBeGreaterThan(0);
    });
  });

  describe('estimated metrics', () => {
    it('should estimate play time based on word count', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      // 150 words = 1 minute at 150 wpm
      startPassage.content = Array(150).fill('word').join(' ');

      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPlayTime).toBe(1);
    });

    it('should estimate play time for longer stories', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      // 450 words = 3 minutes
      startPassage.content = Array(450).fill('word').join(' ');

      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPlayTime).toBe(3);
    });

    it('should estimate paths for linear story', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const p1 = new Passage({ title: 'P1' });
      story.addPassage(p1);

      startPassage.addChoice(new Choice({ text: 'Next', target: p1.id }));

      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPaths).toBe(1);
    });

    it('should estimate paths for branching story', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const end1 = new Passage({ title: 'End1' });
      const end2 = new Passage({ title: 'End2' });
      story.addPassage(end1);
      story.addPassage(end2);

      startPassage.addChoice(new Choice({ text: 'E1', target: end1.id }));
      startPassage.addChoice(new Choice({ text: 'E2', target: end2.id }));

      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPaths).toBe(2);
    });

    it('should cap estimated paths at 10000', () => {
      // Create a highly branching story that would overflow
      const startPassage = story.getPassage(story.startPassage!)!;

      // This creates exponential paths, should be capped
      for (let i = 0; i < 20; i++) {
        const p = new Passage({ title: `P${i}` });
        story.addPassage(p);
        if (i === 0) {
          startPassage.addChoice(new Choice({ text: `C${i}`, target: p.id }));
        }
      }

      const metrics = analyzer.analyze(story);

      expect(metrics.estimatedPaths).toBeLessThanOrEqual(10000);
    });
  });
});
