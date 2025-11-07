import { describe, it, expect, beforeEach } from 'vitest';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';
import { TestScenario, TestStep, TestStepHelpers } from './TestScenario';
import { TestRunner } from './TestRunner';

describe('TestScenario', () => {
  it('should create a test scenario', () => {
    const scenario = new TestScenario({
      name: 'Test Path 1',
      description: 'Test the left path',
      storyId: 'story-1',
    });

    expect(scenario.name).toBe('Test Path 1');
    expect(scenario.description).toBe('Test the left path');
    expect(scenario.storyId).toBe('story-1');
    expect(scenario.enabled).toBe(true);
    expect(scenario.steps).toEqual([]);
  });

  it('should add steps', () => {
    const scenario = new TestScenario();

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0));

    expect(scenario.steps).toHaveLength(2);
    expect(scenario.steps[0].type).toBe('start');
    expect(scenario.steps[1].type).toBe('choice');
  });

  it('should remove steps', () => {
    const scenario = new TestScenario();

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0));
    scenario.addStep(TestStepHelpers.chooseByIndex(1));

    scenario.removeStep(1);

    expect(scenario.steps).toHaveLength(2);
    expect(scenario.steps[0].type).toBe('start');
    expect(scenario.steps[1].type).toBe('choice');
    expect(scenario.steps[1].choiceIndex).toBe(1);
  });

  it('should move steps', () => {
    const scenario = new TestScenario();

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0));
    scenario.addStep(TestStepHelpers.chooseByIndex(1));

    scenario.moveStep(2, 1);

    expect(scenario.steps[1].choiceIndex).toBe(1);
    expect(scenario.steps[2].choiceIndex).toBe(0);
  });

  it('should clone scenario', () => {
    const original = new TestScenario({
      name: 'Original',
      storyId: 'story-1',
    });

    original.addStep(TestStepHelpers.start());

    const cloned = original.clone();

    expect(cloned.id).not.toBe(original.id);
    expect(cloned.name).toBe('Original (Copy)');
    expect(cloned.steps).toHaveLength(1);
  });

  it('should serialize/deserialize', () => {
    const original = new TestScenario({
      name: 'Test',
      storyId: 'story-1',
    });

    original.addStep(TestStepHelpers.start());
    original.addStep(TestStepHelpers.chooseByIndex(0));

    const serialized = original.serialize();
    const deserialized = TestScenario.deserialize(serialized);

    expect(deserialized.id).toBe(original.id);
    expect(deserialized.name).toBe(original.name);
    expect(deserialized.steps).toHaveLength(2);
  });
});

describe('TestRunner', () => {
  let story: Story;
  let passage1: Passage;
  let passage2: Passage;
  let passage3: Passage;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
      },
    });

    // Remove default start passage
    story.passages.clear();

    // Create test passages
    passage1 = new Passage({
      id: 'p1',
      title: 'Start',
      content: 'You are at the start.',
      position: { x: 0, y: 0 },
    });

    passage1.choices.push(new Choice({
      text: 'Go left',
      target: 'p2',
    }));

    passage1.choices.push(new Choice({
      text: 'Go right',
      target: 'p3',
    }));

    passage2 = new Passage({
      id: 'p2',
      title: 'Left',
      content: 'You went left.',
      position: { x: -100, y: 100 },
    });

    passage3 = new Passage({
      id: 'p3',
      title: 'Right',
      content: 'You went right.',
      position: { x: 100, y: 100 },
    });

    story.passages.set('p1', passage1);
    story.passages.set('p2', passage2);
    story.passages.set('p3', passage3);
    story.startPassage = 'p1';

    // Add a test variable
    story.addVariable(new Variable({
      name: 'health',
      type: 'number',
      initial: 100,
    }));
  });

  it('should run a successful test', async () => {
    const scenario = new TestScenario({
      name: 'Test Left Path',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0)); // Go left
    scenario.addStep(TestStepHelpers.expectPassage('p2', 'Left'));

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.passed).toBe(true);
    expect(result.passedSteps).toBe(3);
    expect(result.failedSteps).toBe(0);
  });

  it('should fail on wrong passage', async () => {
    const scenario = new TestScenario({
      name: 'Test Wrong Path',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0)); // Go left
    scenario.addStep(TestStepHelpers.expectPassage('p3', 'Right')); // Wrong!

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.passed).toBe(false);
    expect(result.passedSteps).toBe(2);
    expect(result.failedSteps).toBe(1);
  });

  it('should test choice by text', async () => {
    const scenario = new TestScenario({
      name: 'Test By Text',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByText('Go right'));
    scenario.addStep(TestStepHelpers.expectPassage('p3', 'Right'));

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.passed).toBe(true);
  });

  it('should test text content', async () => {
    const scenario = new TestScenario({
      name: 'Test Content',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.expectText('at the start'));

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.passed).toBe(true);
  });

  it('should test variable values', async () => {
    const scenario = new TestScenario({
      name: 'Test Variable',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.expectVariable('health', 100));

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.passed).toBe(true);
  });

  it('should run multiple tests', async () => {
    const scenario1 = new TestScenario({
      name: 'Test Left',
      storyId: story.metadata.id || 'test',
    });
    scenario1.addStep(TestStepHelpers.start());
    scenario1.addStep(TestStepHelpers.chooseByIndex(0));

    const scenario2 = new TestScenario({
      name: 'Test Right',
      storyId: story.metadata.id || 'test',
    });
    scenario2.addStep(TestStepHelpers.start());
    scenario2.addStep(TestStepHelpers.chooseByIndex(1));

    const runner = new TestRunner(story);
    const results = await runner.runTests([scenario1, scenario2]);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
  });

  it('should skip disabled tests', async () => {
    const scenario = new TestScenario({
      name: 'Disabled Test',
      storyId: story.metadata.id || 'test',
      enabled: false,
    });
    scenario.addStep(TestStepHelpers.start());

    const runner = new TestRunner(story);
    const results = await runner.runTests([scenario]);

    expect(results).toHaveLength(0);
  });

  it('should record playthrough during test', async () => {
    const scenario = new TestScenario({
      name: 'Record Test',
      storyId: story.metadata.id || 'test',
    });

    scenario.addStep(TestStepHelpers.start());
    scenario.addStep(TestStepHelpers.chooseByIndex(0));

    const runner = new TestRunner(story);
    const result = await runner.runTest(scenario);

    expect(result.playthrough).toBeDefined();
    expect(result.playthrough?.steps.length).toBeGreaterThan(0);
  });
});
