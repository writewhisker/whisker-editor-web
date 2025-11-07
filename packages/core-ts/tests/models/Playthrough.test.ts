import { describe, it, expect, beforeEach } from 'vitest';
import { Playthrough, PlaythroughStep } from '../../src/../src/models/Playthrough';

describe('PlaythroughStep', () => {
  it('should create a step with required fields', () => {
    const step = new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(step.passageId).toBe('p1');
    expect(step.passageTitle).toBe('Start');
    expect(step.timestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(step.variables).toEqual({});
    expect(step.timeSpent).toBe(0);
  });

  it('should create a step with optional fields', () => {
    const step = new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
      choiceIndex: 0,
      choiceText: 'Go left',
      variables: { health: 100 },
      timeSpent: 5000,
    });

    expect(step.choiceIndex).toBe(0);
    expect(step.choiceText).toBe('Go left');
    expect(step.variables).toEqual({ health: 100 });
    expect(step.timeSpent).toBe(5000);
  });

  it('should serialize correctly', () => {
    const step = new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
      choiceIndex: 1,
      choiceText: 'Go right',
      variables: { health: 90 },
      timeSpent: 3000,
    });

    const serialized = step.serialize();

    expect(serialized).toEqual({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
      choiceIndex: 1,
      choiceText: 'Go right',
      variables: { health: 90 },
      timeSpent: 3000,
    });
  });

  it('should round-trip serialize/deserialize', () => {
    const original = new PlaythroughStep({
      passageId: 'p2',
      passageTitle: 'Middle',
      timestamp: '2024-01-01T00:05:00.000Z',
      variables: { health: 80, gold: 50 },
      timeSpent: 10000,
    });

    const deserialized = PlaythroughStep.deserialize(original.serialize());

    expect(deserialized.passageId).toBe(original.passageId);
    expect(deserialized.passageTitle).toBe(original.passageTitle);
    expect(deserialized.timestamp).toBe(original.timestamp);
    expect(deserialized.variables).toEqual(original.variables);
    expect(deserialized.timeSpent).toBe(original.timeSpent);
  });
});

describe('Playthrough', () => {
  let playthrough: Playthrough;

  beforeEach(() => {
    playthrough = new Playthrough({
      storyId: 'story-1',
      storyTitle: 'Test Story',
    });
  });

  it('should create a playthrough with defaults', () => {
    expect(playthrough.id).toBeTruthy();
    expect(playthrough.storyId).toBe('story-1');
    expect(playthrough.storyTitle).toBe('Test Story');
    expect(playthrough.completed).toBe(false);
    expect(playthrough.steps).toEqual([]);
    expect(playthrough.finalVariables).toEqual({});
    expect(playthrough.metadata).toEqual({});
  });

  it('should add steps', () => {
    const step1 = new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    const step2 = new PlaythroughStep({
      passageId: 'p2',
      passageTitle: 'Middle',
      timestamp: '2024-01-01T00:01:00.000Z',
    });

    playthrough.addStep(step1);
    playthrough.addStep(step2);

    expect(playthrough.steps).toHaveLength(2);
    expect(playthrough.steps[0].passageId).toBe('p1');
    expect(playthrough.steps[1].passageId).toBe('p2');
  });

  it('should complete playthrough', () => {
    playthrough.complete({ health: 100, gold: 200 });

    expect(playthrough.completed).toBe(true);
    expect(playthrough.endTime).toBeTruthy();
    expect(playthrough.finalVariables).toEqual({ health: 100, gold: 200 });
  });

  it('should calculate duration', () => {
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2024-01-01T00:05:00.000Z');

    const pt = new Playthrough({
      storyId: 'story-1',
      storyTitle: 'Test',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    expect(pt.getDuration()).toBe(5 * 60 * 1000); // 5 minutes
  });

  it('should get path', () => {
    playthrough.addStep(new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
    }));

    playthrough.addStep(new PlaythroughStep({
      passageId: 'p2',
      passageTitle: 'Middle',
      timestamp: '2024-01-01T00:01:00.000Z',
    }));

    playthrough.addStep(new PlaythroughStep({
      passageId: 'p3',
      passageTitle: 'End',
      timestamp: '2024-01-01T00:02:00.000Z',
    }));

    expect(playthrough.getPath()).toEqual(['Start', 'Middle', 'End']);
  });

  it('should get unique passages', () => {
    playthrough.addStep(new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
    }));

    playthrough.addStep(new PlaythroughStep({
      passageId: 'p2',
      passageTitle: 'Middle',
      timestamp: '2024-01-01T00:01:00.000Z',
    }));

    playthrough.addStep(new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:02:00.000Z',
    }));

    const unique = playthrough.getUniquePassages();
    expect(unique).toHaveLength(2);
    expect(unique).toContain('p1');
    expect(unique).toContain('p2');
  });

  it('should get choices', () => {
    playthrough.addStep(new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
      choiceIndex: 0,
      choiceText: 'Go left',
    }));

    playthrough.addStep(new PlaythroughStep({
      passageId: 'p2',
      passageTitle: 'Middle',
      timestamp: '2024-01-01T00:01:00.000Z',
      choiceIndex: 1,
      choiceText: 'Go right',
    }));

    const choices = playthrough.getChoices();

    expect(choices).toHaveLength(2);
    expect(choices[0]).toEqual({
      passageTitle: 'Start',
      choiceText: 'Go left',
      choiceIndex: 0,
    });
    expect(choices[1]).toEqual({
      passageTitle: 'Middle',
      choiceText: 'Go right',
      choiceIndex: 1,
    });
  });

  it('should serialize/deserialize', () => {
    playthrough.addStep(new PlaythroughStep({
      passageId: 'p1',
      passageTitle: 'Start',
      timestamp: '2024-01-01T00:00:00.000Z',
    }));

    playthrough.complete({ health: 50 });

    const serialized = playthrough.serialize();
    const deserialized = Playthrough.deserialize(serialized);

    expect(deserialized.id).toBe(playthrough.id);
    expect(deserialized.storyId).toBe(playthrough.storyId);
    expect(deserialized.completed).toBe(true);
    expect(deserialized.steps).toHaveLength(1);
    expect(deserialized.finalVariables).toEqual({ health: 50 });
  });
});
