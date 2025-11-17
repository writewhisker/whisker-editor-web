/**
 * Tests for StorySimulator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StorySimulator } from './StorySimulator';
import { Story, Passage, Choice, Variable } from '@writewhisker/core-ts';

describe('StorySimulator', () => {
  let linearStory: Story;
  let branchingStory: Story;
  let complexStory: Story;

  beforeEach(() => {
    // Create a simple linear story
    linearStory = new Story({ metadata: { title: 'Linear Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
    const p1 = new Passage({ title: 'Start' });
    const p2 = new Passage({ title: 'Middle' });
    const p3 = new Passage({ title: 'End' });

    p1.addChoice(new Choice({ text: 'Next', target: p2.id }));
    p2.addChoice(new Choice({ text: 'Finish', target: p3.id }));

    linearStory.addPassage(p1);
    linearStory.addPassage(p2);
    linearStory.addPassage(p3);
    linearStory.startPassage = p1.id;

    // Create a branching story
    branchingStory = new Story({ metadata: { title: 'Branching Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
    const start = new Passage({ title: 'Start' });
    const left = new Passage({ title: 'Left Path' });
    const right = new Passage({ title: 'Right Path' });
    const end = new Passage({ title: 'End' });

    start.addChoice(new Choice({ text: 'Go Left', target: left.id }));
    start.addChoice(new Choice({ text: 'Go Right', target: right.id }));
    left.addChoice(new Choice({ text: 'Continue', target: end.id }));
    right.addChoice(new Choice({ text: 'Continue', target: end.id }));

    branchingStory.addPassage(start);
    branchingStory.addPassage(left);
    branchingStory.addPassage(right);
    branchingStory.addPassage(end);
    branchingStory.startPassage = start.id;

    // Create a complex story with loops and dead ends
    complexStory = new Story({ metadata: { title: 'Complex Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
    const hub = new Passage({ title: 'Hub' });
    const shop = new Passage({ title: 'Shop' });
    const quest = new Passage({ title: 'Quest' });
    const deadEnd = new Passage({ title: 'Dead End' });
    const ending = new Passage({ title: 'Ending' });

    hub.addChoice(new Choice({ text: 'Visit Shop', target: shop.id }));
    hub.addChoice(new Choice({ text: 'Start Quest', target: quest.id }));
    hub.addChoice(new Choice({ text: 'Dead End', target: deadEnd.id }));
    shop.addChoice(new Choice({ text: 'Back to Hub', target: hub.id }));
    quest.addChoice(new Choice({ text: 'Finish', target: ending.id }));
    // deadEnd has no choices

    complexStory.addPassage(hub);
    complexStory.addPassage(shop);
    complexStory.addPassage(quest);
    complexStory.addPassage(deadEnd);
    complexStory.addPassage(ending);
    complexStory.startPassage = hub.id;
  });

  describe('Linear Story Simulation', () => {
    it('should simulate linear story with high coverage', async () => {
      const simulator = new StorySimulator(linearStory, 42);
      const result = await simulator.simulate({ maxSimulations: 10, strategy: 'random' });

      expect(result.totalSimulations).toBeLessThanOrEqual(10);
      expect(result.coverage).toBeGreaterThanOrEqual(0.75); // High coverage
      // May have some unreachable passages depending on simulation
    });

    it('should have consistent path length in linear story', async () => {
      const simulator = new StorySimulator(linearStory, 42);
      const result = await simulator.simulate({ maxSimulations: 10 });

      // All paths should be the same length (3 passages)
      expect(result.averagePathLength).toBe(3);
      expect(result.paths.every(p => p.length === 3)).toBe(true);
    });

    it('should detect dead end in linear story', async () => {
      const simulator = new StorySimulator(linearStory);
      const result = await simulator.simulate({ maxSimulations: 10 });

      // Should find at least one dead end
      expect(result.deadEnds.length).toBeGreaterThanOrEqual(1);
    });

    it('should have low player agency in linear story', async () => {
      const simulator = new StorySimulator(linearStory, 42);
      const result = await simulator.simulate({ maxSimulations: 20 });

      // Linear story should have very low agency (all paths the same)
      expect(result.playerAgency).toBeLessThan(0.2);
    });
  });

  describe('Branching Story Simulation', () => {
    it('should explore both branches', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 20, strategy: 'random' });

      // Should visit most passages
      expect(result.passageVisits.size).toBeGreaterThanOrEqual(3);
      expect(result.coverage).toBeGreaterThanOrEqual(0.75);
    });

    it('should find multiple unique paths', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 20 });

      // Should have at least 2 unique paths (left and right)
      const uniquePaths = new Set(result.paths.map(p => p.join('->')));
      expect(uniquePaths.size).toBeGreaterThanOrEqual(2);
    });

    it('should have some player agency', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 30 });

      // Branching story should have some agency
      expect(result.playerAgency).toBeGreaterThan(0.1);
      expect(result.playerAgency).toBeLessThan(0.8);
    });

    it('should calculate branching factor correctly', async () => {
      const simulator = new StorySimulator(branchingStory);
      const result = await simulator.simulate({ maxSimulations: 10 });

      // Start has 2 choices, left and right have 1 each, end has 0
      // Average: (2 + 1 + 1) / 3 = 1.33
      expect(result.branchingFactor).toBeCloseTo(1.33, 1);
    });
  });

  describe('Complex Story Simulation', () => {
    it('should detect dead ends', async () => {
      const simulator = new StorySimulator(complexStory);
      const result = await simulator.simulate({ maxSimulations: 50 });

      // Should find at least 2 dead ends (Dead End passage and Ending)
      expect(result.deadEnds.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle loops without infinite recursion', async () => {
      const simulator = new StorySimulator(complexStory, 42);

      // This should complete without hanging (hub <-> shop loop)
      const result = await simulator.simulate({ maxSimulations: 20, maxDepth: 50 });

      expect(result.totalSimulations).toBe(20);
    });

    it('should limit path depth', async () => {
      const simulator = new StorySimulator(complexStory, 42);
      const result = await simulator.simulate({ maxSimulations: 10, maxDepth: 5 });

      // No path should exceed max depth
      expect(result.paths.every(p => p.length <= 5)).toBe(true);
    });

    it('should use breadth-first strategy', async () => {
      const simulator = new StorySimulator(complexStory, 42);
      const result = await simulator.simulate({
        maxSimulations: 30,
        strategy: 'breadth-first'
      });

      // BFS should achieve good coverage
      expect(result.coverage).toBeGreaterThan(0.6);
    });

    it('should use depth-first strategy', async () => {
      const simulator = new StorySimulator(complexStory, 42);
      const result = await simulator.simulate({
        maxSimulations: 10,
        strategy: 'depth-first'
      });

      // DFS might not cover everything but should complete
      expect(result.totalSimulations).toBe(10);
    });

    it('should use least-visited strategy', async () => {
      const simulator = new StorySimulator(complexStory, 42);
      const result = await simulator.simulate({
        maxSimulations: 50,
        strategy: 'least-visited'
      });

      // Least-visited should achieve better coverage
      expect(result.coverage).toBeGreaterThan(0.8);
    });
  });

  describe('Reproducibility', () => {
    it('should produce same results with same seed', async () => {
      const sim1 = new StorySimulator(branchingStory, 12345);
      const sim2 = new StorySimulator(branchingStory, 12345);

      const result1 = await sim1.simulate({ maxSimulations: 20 });
      const result2 = await sim2.simulate({ maxSimulations: 20 });

      // Should have identical results
      expect(result1.totalSimulations).toBe(result2.totalSimulations);
      expect(result1.averagePathLength).toBe(result2.averagePathLength);
      expect(result1.paths).toEqual(result2.paths);
    });

    it('should produce different results with different seeds', async () => {
      const sim1 = new StorySimulator(branchingStory, 111);
      const sim2 = new StorySimulator(branchingStory, 222);

      const result1 = await sim1.simulate({ maxSimulations: 20 });
      const result2 = await sim2.simulate({ maxSimulations: 20 });

      // Paths should differ (very high probability)
      expect(result1.paths).not.toEqual(result2.paths);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty story', async () => {
      const emptyStory = new Story({ metadata: { title: 'Empty', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
      const simulator = new StorySimulator(emptyStory);

      const result = await simulator.simulate({ maxSimulations: 10 });

      expect(result.totalSimulations).toBeGreaterThan(0); // May stop early
      // Empty story behavior may vary
    });

    it('should handle single passage story', async () => {
      const singleStory = new Story({ metadata: { title: 'Single', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
      const passage = new Passage({ title: 'Only' });
      singleStory.addPassage(passage);
      singleStory.startPassage = passage.id;

      const simulator = new StorySimulator(singleStory);
      const result = await simulator.simulate({ maxSimulations: 5 });

      expect(result.coverage).toBeGreaterThan(0); // Should visit the passage
      expect(result.averagePathLength).toBe(1);
    });

    it('should complete simulations', async () => {
      const simulator = new StorySimulator(linearStory, 42);
      const result = await simulator.simulate({ maxSimulations: 100 });

      // Should complete requested simulations or stop early if coverage achieved
      expect(result.totalSimulations).toBeGreaterThan(0);
      expect(result.totalSimulations).toBeLessThanOrEqual(100);
    });
  });

  describe('PlaythroughData Conversion', () => {
    it('should convert simulation result to PlaythroughData', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 30 });

      const playthroughData = StorySimulator.toPlaythroughData(result, branchingStory);

      expect(playthroughData.totalSimulations).toBe(result.totalSimulations);
      expect(playthroughData.averagePathLength).toBe(result.averagePathLength);
      expect(playthroughData.branchingFactor).toBe(result.branchingFactor);
      expect(playthroughData.playerAgency).toBe(result.playerAgency);
      expect(playthroughData.mostVisitedPassages.length).toBeGreaterThan(0);
      expect(playthroughData.criticalPath.length).toBeGreaterThan(0);
    });

    it('should identify most visited passages', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 30 });

      const playthroughData = StorySimulator.toPlaythroughData(result, branchingStory);

      // Start and End should be most visited (100% of paths)
      const startPassage = playthroughData.mostVisitedPassages.find(
        p => p.passageName === 'Start'
      );
      const endPassage = playthroughData.mostVisitedPassages.find(
        p => p.passageName === 'End'
      );

      expect(startPassage).toBeDefined();
      expect(endPassage).toBeDefined();
      expect(startPassage?.percentage).toBe(100);
      expect(endPassage?.percentage).toBe(100);
    });

    it('should calculate critical path', async () => {
      const simulator = new StorySimulator(linearStory, 42);
      const result = await simulator.simulate({ maxSimulations: 20 });

      const playthroughData = StorySimulator.toPlaythroughData(result, linearStory);

      // Critical path should be the entire story (all paths are the same)
      expect(playthroughData.criticalPath.length).toBe(3);
    });
  });

  describe('Visit Statistics', () => {
    it('should track passage visit counts', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 20 });

      // Start should be visited 20 times
      const startId = branchingStory.startPassage!;
      expect(result.passageVisits.get(startId)).toBe(20);
    });

    it('should calculate visit percentages correctly', async () => {
      const simulator = new StorySimulator(branchingStory, 42);
      const result = await simulator.simulate({ maxSimulations: 100 });

      const playthroughData = StorySimulator.toPlaythroughData(result, branchingStory);

      // All percentages should be <= 100
      playthroughData.mostVisitedPassages.forEach(p => {
        expect(p.percentage).toBeLessThanOrEqual(100);
        expect(p.percentage).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
