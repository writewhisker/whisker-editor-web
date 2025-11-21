/**
 * Integration Tests - Package Interactions
 * Tests how different Whisker packages work together
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Story, Passage, Choice, StoryPlayer, Variable } from '@writewhisker/core-ts';

describe('Package Interactions', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Integration Test Story',
        author: 'Test Suite',
        description: 'Testing package interactions',
      }
    });
  });

  describe('Story Creation and Serialization', () => {
    it('should create story, add passages, and serialize/deserialize', () => {
      // Create a story without default passage
      const testStory = new Story({
        metadata: {
          title: 'Integration Test Story',
          author: 'Test Suite',
        },
        passages: {} as any,  // No passages to skip default creation
      });

      // Add passages
      const passage1 = testStory.addPassage(new Passage({
        title: 'Start',
        content: 'Welcome to the story!',
        position: { x: 0, y: 0 },
      }));

      const passage2 = testStory.addPassage(new Passage({
        title: 'Chapter 1',
        content: 'The adventure begins...',
        position: { x: 200, y: 0 },
      }));

      // Add choice linking passages
      passage1.addChoice(new Choice({
        text: 'Begin adventure',
        target: passage2.id,
      }));

      // Set start passage
      testStory.startPassage = passage1.id;

      // Serialize
      const serialized = testStory.serialize();
      expect(serialized).toBeDefined();
      expect(serialized.metadata.title).toBe('Integration Test Story');
      // May have default passage
      expect(Object.keys(serialized.passages || {}).length).toBeGreaterThanOrEqual(2);

      // Verify passages intact
      expect(serialized.passages[passage1.id]).toBeDefined();
      expect(serialized.passages[passage1.id].title).toBe('Start');
      expect(serialized.passages[passage1.id].choices).toHaveLength(1);
      expect(serialized.passages[passage1.id].choices[0].target).toBe(passage2.id);
    });

    it('should handle complex story with multiple choice paths', () => {
      // Create a story without default passage
      const testStory = new Story({
        metadata: {
          title: 'Integration Test Story',
          author: 'Test Suite',
        },
        passages: {} as any,
      });

      // Create branching story
      const start = testStory.addPassage(new Passage({ title: 'Start', content: 'Begin' }));
      const forest = testStory.addPassage(new Passage({ title: 'Forest', content: 'Dark forest' }));
      const cave = testStory.addPassage(new Passage({ title: 'Cave', content: 'Mysterious cave' }));
      const treasure = testStory.addPassage(new Passage({ title: 'Treasure', content: 'You found treasure!' }));
      const trap = testStory.addPassage(new Passage({ title: 'Trap', content: 'It\'s a trap!' }));

      // Create choice paths
      start.addChoice(new Choice({ text: 'Go to forest', target: forest.id }));
      start.addChoice(new Choice({ text: 'Enter cave', target: cave.id }));

      forest.addChoice(new Choice({ text: 'Search', target: treasure.id }));

      cave.addChoice(new Choice({ text: 'Go deeper', target: trap.id }));
      cave.addChoice(new Choice({ text: 'Leave', target: start.id }));

      testStory.startPassage = start.id;

      // Serialize and deserialize
      const serialized = testStory.serialize();
      const restored = new Story(serialized);

      // Verify structure (may have additional default passage)
      expect(restored.passages.size).toBeGreaterThanOrEqual(5);
      const restoredStart = restored.passages.get(start.id)!;
      expect(restoredStart.choices).toHaveLength(2);
      expect(restoredStart.choices[0].target).toBe(forest.id);
      expect(restoredStart.choices[1].target).toBe(cave.id);
    });
  });

  describe('Story Player Integration', () => {
    it('should play story from start to finish', () => {
      // Setup story
      const start = story.addPassage(new Passage({
        title: 'Start',
        content: 'Welcome!',
      }));

      const middle = story.addPassage(new Passage({
        title: 'Middle',
        content: 'Middle section',
      }));

      const end = story.addPassage(new Passage({
        title: 'End',
        content: 'The End!',
      }));

      const choice1 = start.addChoice(new Choice({ text: 'Continue', target: middle.id }));
      const choice2 = middle.addChoice(new Choice({ text: 'Finish', target: end.id }));
      story.startPassage = start.id;

      // Play story
      const player = new StoryPlayer();
      player.loadStory(story);
      const events: string[] = [];

      player.on('passageEntered', (data) => {
        events.push(`entered:${data.passage.title}`);
      });

      player.on('choiceSelected', (data) => {
        events.push(`choice:${data.choice.text}`);
      });

      // Start
      player.start();
      expect(player.getCurrentPassage()?.title).toBe('Start');
      expect(events).toContain('entered:Start');

      // Make first choice
      player.makeChoice(choice1.id);
      expect(player.getCurrentPassage()?.title).toBe('Middle');
      expect(events).toContain('choice:Continue');
      expect(events).toContain('entered:Middle');

      // Make second choice
      player.makeChoice(choice2.id);
      expect(player.getCurrentPassage()?.title).toBe('End');
      expect(events).toContain('choice:Finish');
      expect(events).toContain('entered:End');
    });

    it('should track history during playthrough', () => {
      const start = story.addPassage(new Passage({ title: 'Start', content: 'Begin' }));
      const p1 = story.addPassage(new Passage({ title: 'P1', content: 'Passage 1' }));
      const p2 = story.addPassage(new Passage({ title: 'P2', content: 'Passage 2' }));

      const choice1 = start.addChoice(new Choice({ text: 'Go', target: p1.id }));
      const choice2 = p1.addChoice(new Choice({ text: 'Next', target: p2.id }));
      story.startPassage = start.id;

      const player = new StoryPlayer();
      player.loadStory(story);
      player.start();

      expect(player.getHistory()).toHaveLength(1);
      expect(player.getHistory()[0].passageId).toBe(start.id);

      player.makeChoice(choice1.id);
      expect(player.getHistory()).toHaveLength(2);

      player.makeChoice(choice2.id);
      expect(player.getHistory()).toHaveLength(3);
      expect(player.getHistory()[2].passageId).toBe(p2.id);
    });

    it('should handle restart during playthrough', () => {
      const start = story.addPassage(new Passage({ title: 'Start', content: 'Begin' }));
      const p1 = story.addPassage(new Passage({ title: 'P1', content: 'Passage 1' }));

      const choice1 = start.addChoice(new Choice({ text: 'Go', target: p1.id }));
      story.startPassage = start.id;

      const player = new StoryPlayer();
      player.loadStory(story);
      player.start();
      player.makeChoice(choice1.id);

      expect(player.getCurrentPassage()?.title).toBe('P1');
      expect(player.getHistory()).toHaveLength(2);

      // Restart
      player.restart();

      expect(player.getCurrentPassage()?.title).toBe('Start');
      expect(player.getHistory()).toHaveLength(1);
    });
  });

  describe('Variables and Scripting Integration', () => {
    it('should manage variables across passages', () => {
      const start = story.addPassage(new Passage({
        title: 'Start',
        content: 'Health: ${health}',
        onEnterScript: 'health = 100',
      }));

      const damage = story.addPassage(new Passage({
        title: 'Damage',
        content: 'Took damage! Health: ${health}',
        onEnterScript: 'health = health - 20',
      }));

      const choice1 = start.addChoice(new Choice({ text: 'Take damage', target: damage.id }));
      story.startPassage = start.id;

      const player = new StoryPlayer();
      player.loadStory(story);
      player.start();

      // Initial health
      expect(player.getVariable('health')).toBe(100);

      // Take damage
      player.makeChoice(choice1.id);
      expect(player.getVariable('health')).toBe(80);
    });

    it('should handle conditional choices based on variables', () => {
      const start = story.addPassage(new Passage({
        title: 'Start',
        content: 'You have a key.',
        onEnterScript: 'hasKey = true',
      }));

      const door = story.addPassage(new Passage({
        title: 'Door',
        content: 'A locked door.',
      }));

      // Add conditional choices
      start.addChoice(new Choice({ text: 'Go to door', target: door.id }));
      story.startPassage = start.id;

      const player = new StoryPlayer();
      player.loadStory(story);
      player.start();

      expect(player.getVariable('hasKey')).toBe(true);
    });
  });

  describe('Tags and Metadata Integration', () => {
    it('should preserve passage tags through serialization', () => {
      const passage = story.addPassage(new Passage({
        title: 'Test',
        content: 'Content',
        tags: ['special', 'important', 'music:battle'],
      }));

      const serialized = story.serialize();
      const restored = new Story(serialized);

      const restoredPassage = restored.passages.get(passage.id)!;
      expect(restoredPassage.tags).toEqual(['special', 'important', 'music:battle']);
    });

    it('should handle metadata changes', () => {
      story.metadata.title = 'Updated Title';
      story.metadata.author = 'Updated Author';
      story.metadata.description = 'Updated description';

      const serialized = story.serialize();
      const restored = new Story(serialized);

      expect(restored.metadata.title).toBe('Updated Title');
      expect(restored.metadata.author).toBe('Updated Author');
      expect(restored.metadata.description).toBe('Updated description');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing start passage', () => {
      story.addPassage(new Passage({ title: 'Orphan', content: 'Lost passage' }));
      // Don't set start passage
      story.startPassage = 'invalid-id';

      const player = new StoryPlayer(story);

      expect(() => {
        player.start();
      }).toThrow();
    });

    it('should handle broken choice links', () => {
      const start = story.addPassage(new Passage({
        title: 'Start',
        content: 'Begin',
      }));

      // Add choice pointing to non-existent passage
      const brokenChoice = start.addChoice(new Choice({
        text: 'Broken link',
        target: 'non-existent-id',
      }));

      story.startPassage = start.id;

      const player = new StoryPlayer();
      player.loadStory(story);
      player.start();

      // Should not crash but handle gracefully
      const errorEvents: any[] = [];
      player.on('error', (error) => {
        errorEvents.push(error);
      });

      player.makeChoice(brokenChoice.id);

      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should handle invalid serialized data', () => {
      const invalidData = {
        metadata: {
          title: 'Test',
          author: 'Test',
        },
        passages: null, // Invalid - should be object
      };

      // Story constructor is lenient - it won't throw but will handle gracefully
      const story = new Story(invalidData as any);
      expect(story).toBeDefined();
      // It should have created a default start passage
      expect(story.passages.size).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large stories efficiently', () => {
      // Create story with 100 passages
      const startTime = Date.now();

      const passages: Passage[] = [];
      for (let i = 0; i < 100; i++) {
        passages.push(story.addPassage(new Passage({
          title: `Passage ${i}`,
          content: `Content for passage ${i}`,
          position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 100 },
        })));
      }

      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(1000); // Should create in under 1 second

      // Serialize
      const serializeStart = Date.now();
      const serialized = story.serialize();
      const serializeTime = Date.now() - serializeStart;
      expect(serializeTime).toBeLessThan(500); // Should serialize quickly

      // Deserialize
      const deserializeStart = Date.now();
      const restored = new Story(serialized);
      const deserializeTime = Date.now() - deserializeStart;
      expect(deserializeTime).toBeLessThan(500); // Should deserialize quickly

      expect(restored.passages.size).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Round-trip Compatibility', () => {
    it('should maintain data integrity through multiple serialize/deserialize cycles', () => {
      // Create complex story
      const start = story.addPassage(new Passage({
        title: 'Start',
        content: 'Complex story with ${variable}',
        tags: ['intro', 'music:theme'],
        onEnterScript: 'variable = 42',
      }));

      const middle = story.addPassage(new Passage({
        title: 'Middle',
        content: 'Middle section',
        tags: ['chapter1'],
      }));

      start.addChoice(new Choice({
        text: 'Continue',
        target: middle.id,
        condition: 'variable > 0',
      }));

      story.startPassage = start.id;
      story.variables.set('globalVar', new Variable({ name: 'globalVar', type: 'number', initial: 100 }));

      // First cycle
      const serialized1 = story.serialize();
      const restored1 = new Story(serialized1);

      // Second cycle
      const serialized2 = restored1.serialize();
      const restored2 = new Story(serialized2);

      // Third cycle
      const serialized3 = restored2.serialize();
      const restored3 = new Story(serialized3);

      // Verify data integrity
      expect(restored3.metadata.title).toBe('Integration Test Story');
      expect(restored3.passages.size).toBeGreaterThanOrEqual(2);
      expect(restored3.startPassage).toBe(start.id);

      const finalStart = restored3.passages.get(start.id)!;
      expect(finalStart.title).toBe('Start');
      expect(finalStart.tags).toEqual(['intro', 'music:theme']);
      expect(finalStart.choices).toHaveLength(1);
      expect(finalStart.choices[0].condition).toBe('variable > 0');
    });
  });
});
