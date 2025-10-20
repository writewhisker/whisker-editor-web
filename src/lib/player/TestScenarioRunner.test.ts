import { describe, it, expect, beforeEach } from 'vitest';
import { StoryPlayer } from './StoryPlayer';
import { TestScenarioRunner } from './TestScenarioRunner';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';
import { Variable } from '../models/Variable';
import type { TestScenario } from './testScenarioTypes';

describe('TestScenarioRunner', () => {
  let story: Story;
  let player: StoryPlayer;
  let runner: TestScenarioRunner;
  let startPassage: Passage;
  let secondPassage: Passage;
  let thirdPassage: Passage;

  beforeEach(() => {
    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Add variable
    story.addVariable(
      new Variable({
        name: 'score',
        type: 'number',
        initial: 0,
      })
    );

    // Create passages
    startPassage = story.getPassage(story.startPassage!)!;
    startPassage.title = 'Start';
    startPassage.content = 'This is the start.';

    secondPassage = new Passage({ title: 'Second Passage' });
    secondPassage.content = 'You chose correctly!';
    story.addPassage(secondPassage);

    thirdPassage = new Passage({ title: 'Third Passage' });
    thirdPassage.content = 'The end.';
    story.addPassage(thirdPassage);

    // Add choices
    startPassage.addChoice(
      new Choice({
        text: 'Go to second',
        target: secondPassage.id,
      })
    );

    startPassage.addChoice(
      new Choice({
        text: 'Go directly to third',
        target: thirdPassage.id,
      })
    );

    secondPassage.addChoice(
      new Choice({
        text: 'Go to third',
        target: thirdPassage.id,
      })
    );

    // Initialize player and runner
    player = new StoryPlayer();
    player.loadStory(story);
    runner = new TestScenarioRunner(player);
  });

  describe('execute', () => {
    it('should execute a simple passing scenario', async () => {
      const scenario: TestScenario = {
        id: 'test1',
        name: 'Happy path',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Start',
            choiceText: 'Go to second',
          },
          {
            passageTitle: 'Second Passage',
            choiceText: 'Go to third',
          },
          {
            passageTitle: 'Third Passage',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stepResults).toHaveLength(3);
      expect(result.stepResults.every((s) => s.passed)).toBe(true);
      expect(result.finalPassageTitle).toBe('Third Passage');
    });

    it('should fail when passage title does not match', async () => {
      const scenario: TestScenario = {
        id: 'test2',
        name: 'Wrong passage',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Wrong Title',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stepResults[0].passed).toBe(false);
    });

    it('should validate variable assertions', async () => {
      const scenario: TestScenario = {
        id: 'test3',
        name: 'Variable check',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        initialVariables: {
          score: 10,
        },
        steps: [
          {
            passageTitle: 'Start',
            expectedVariables: [
              {
                variableName: 'score',
                expectedValue: 10,
                operator: 'equals',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(true);
      expect(result.finalVariables?.score).toBe(10);
    });

    it('should fail when variable assertion fails', async () => {
      const scenario: TestScenario = {
        id: 'test4',
        name: 'Variable mismatch',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Start',
            expectedVariables: [
              {
                variableName: 'score',
                expectedValue: 100,
                operator: 'equals',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('score'))).toBe(true);
    });

    it('should fail when choice is not found', async () => {
      const scenario: TestScenario = {
        id: 'test5',
        name: 'Invalid choice',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Start',
            choiceText: 'Nonexistent choice',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
    });

    it('should validate final passage ID', async () => {
      const scenario: TestScenario = {
        id: 'test6',
        name: 'Final passage check',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        expectedFinalPassageId: secondPassage.id,
        steps: [
          {
            choiceText: 'Go to second',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(true);
      expect(result.finalPassageTitle).toBe('Second Passage');
    });

    it('should fail when final passage does not match', async () => {
      const scenario: TestScenario = {
        id: 'test7',
        name: 'Wrong final passage',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        expectedFinalPassageId: thirdPassage.id,
        steps: [
          {
            choiceText: 'Go to second',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected to end at'))).toBe(true);
    });

    it('should stop on first error when configured', async () => {
      const scenario: TestScenario = {
        id: 'test8',
        name: 'Stop on error',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Wrong Title',
          },
          {
            passageTitle: 'Another Wrong Title',
          },
        ],
      };

      const result = await runner.execute(scenario, { stopOnFirstError: true });

      expect(result.passed).toBe(false);
      expect(result.stepResults).toHaveLength(1); // Stopped after first error
    });

    it('should start from specified passage', async () => {
      const scenario: TestScenario = {
        id: 'test9',
        name: 'Custom start',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        startPassageId: secondPassage.id,
        steps: [
          {
            passageTitle: 'Second Passage',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.passed).toBe(true);
      expect(result.stepResults[0].actualPassageTitle).toBe('Second Passage');
    });
  });

  describe('variable operators', () => {
    it('should validate greaterThan operator', async () => {
      const scenario: TestScenario = {
        id: 'test10',
        name: 'Greater than',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        initialVariables: { score: 50 },
        steps: [
          {
            expectedVariables: [
              {
                variableName: 'score',
                expectedValue: 10,
                operator: 'greaterThan',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);
      expect(result.passed).toBe(true);
    });

    it('should validate lessThan operator', async () => {
      const scenario: TestScenario = {
        id: 'test11',
        name: 'Less than',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        initialVariables: { score: 5 },
        steps: [
          {
            expectedVariables: [
              {
                variableName: 'score',
                expectedValue: 10,
                operator: 'lessThan',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);
      expect(result.passed).toBe(true);
    });

    it('should validate exists operator', async () => {
      const scenario: TestScenario = {
        id: 'test12',
        name: 'Variable exists',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            expectedVariables: [
              {
                variableName: 'score',
                expectedValue: null,
                operator: 'exists',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);
      expect(result.passed).toBe(true);
    });

    it('should fail exists operator for undefined variable', async () => {
      const scenario: TestScenario = {
        id: 'test13',
        name: 'Variable missing',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            expectedVariables: [
              {
                variableName: 'nonexistent',
                expectedValue: null,
                operator: 'exists',
              },
            ],
          },
        ],
      };

      const result = await runner.execute(scenario);
      expect(result.passed).toBe(false);
    });
  });

  describe('performance', () => {
    it('should record execution duration', async () => {
      const scenario: TestScenario = {
        id: 'test14',
        name: 'Duration test',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        steps: [
          {
            passageTitle: 'Start',
          },
        ],
      };

      const result = await runner.execute(scenario);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.startTime).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(0);
    });
  });
});
