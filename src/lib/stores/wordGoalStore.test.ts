import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  wordGoalStore,
  goals,
  sessions,
  selectedGoalId,
  selectedGoal,
  currentSessionId,
  isSessionActive,
  goalCounts,
  activeGoals,
  type WordGoal,
  type GoalType,
} from './wordGoalStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('wordGoalStore', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    wordGoalStore.clear();
  });

  afterEach(() => {
    wordGoalStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with empty goals', () => {
      expect(get(goals)).toEqual([]);
    });

    it('should initialize with empty sessions', () => {
      expect(get(sessions)).toEqual([]);
    });

    it('should initialize with no selection', () => {
      expect(get(selectedGoalId)).toBeNull();
      expect(get(selectedGoal)).toBeNull();
    });

    it('should initialize with no active session', () => {
      expect(get(currentSessionId)).toBeNull();
      expect(get(isSessionActive)).toBe(false);
    });
  });

  describe('addGoal', () => {
    it('should add daily goal', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const allGoals = get(goals);
      expect(allGoals).toHaveLength(1);
      expect(allGoals[0].type).toBe('daily');
      expect(allGoals[0].target).toBe(1000);
    });

    it('should add weekly goal', () => {
      wordGoalStore.addGoal({
        type: 'weekly',
        target: 5000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const allGoals = get(goals);
      expect(allGoals[0].type).toBe('weekly');
    });

    it('should add monthly goal', () => {
      wordGoalStore.addGoal({
        type: 'monthly',
        target: 20000,
        startDate: new Date().toISOString(),
      });

      const allGoals = get(goals);
      expect(allGoals[0].type).toBe('monthly');
    });

    it('should add total goal', () => {
      wordGoalStore.addGoal({
        type: 'total',
        target: 50000,
        startDate: new Date().toISOString(),
      });

      const allGoals = get(goals);
      expect(allGoals[0].type).toBe('total');
    });

    it('should generate unique ID for goal', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const allGoals = get(goals);
      expect(allGoals[0].id).not.toBe(allGoals[1].id);
    });

    it('should initialize current to 0', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      expect(get(goals)[0].current).toBe(0);
    });

    it('should auto-select newly added goal', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      expect(get(selectedGoalId)).toBe(goalId);
    });
  });

  describe('updateGoal', () => {
    it('should update goal target', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      wordGoalStore.updateGoal(goalId, { target: 1500 });

      expect(get(goals)[0].target).toBe(1500);
    });

    it('should update goal type', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      wordGoalStore.updateGoal(goalId, { type: 'weekly' });

      expect(get(goals)[0].type).toBe('weekly');
    });

    it('should update modified timestamp', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      const originalModified = get(goals)[0].modified;

      wordGoalStore.updateGoal(goalId, { target: 1500 });

      expect(get(goals)[0].modified).not.toBe(originalModified);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal by ID', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      wordGoalStore.deleteGoal(goalId);

      expect(get(goals)).toEqual([]);
    });

    it('should clear selection if deleted goal was selected', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      wordGoalStore.deleteGoal(goalId);

      expect(get(selectedGoalId)).toBeNull();
    });
  });

  describe('selectGoal', () => {
    it('should select goal by ID', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const goalId = get(goals)[0].id;
      wordGoalStore.selectGoal(goalId);

      expect(get(selectedGoalId)).toBe(goalId);
      expect(get(selectedGoal)?.id).toBe(goalId);
    });

    it('should allow deselection with null', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      wordGoalStore.selectGoal(null);

      expect(get(selectedGoalId)).toBeNull();
      expect(get(selectedGoal)).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should update goal progress based on story word count', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      const passage = new Passage({ title: 'Test' });
      passage.content = 'This is a test passage with some words in it.';
      story.addPassage(passage);

      wordGoalStore.updateProgress(story);

      expect(get(goals)[0].current).toBeGreaterThan(0);
    });

    it('should not update inactive goals', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: futureDate,
      });

      const passage = new Passage({ title: 'Test' });
      passage.content = 'Test content';
      story.addPassage(passage);

      wordGoalStore.updateProgress(story);

      expect(get(goals)[0].current).toBe(0);
    });
  });

  describe('sessions', () => {
    it('should start writing session', () => {
      wordGoalStore.startSession();

      expect(get(isSessionActive)).toBe(true);
      expect(get(currentSessionId)).not.toBeNull();
    });

    it('should end writing session', () => {
      wordGoalStore.startSession();
      expect(get(isSessionActive)).toBe(true);

      wordGoalStore.endSession(story);

      expect(get(isSessionActive)).toBe(false);
      expect(get(currentSessionId)).toBeNull();
      expect(get(sessions)).toHaveLength(1);
    });

    it('should record session start time', () => {
      wordGoalStore.startSession();
      wordGoalStore.endSession(story);

      const session = get(sessions)[0];
      expect(session.startTime).toBeDefined();
    });

    it('should record session end time', () => {
      wordGoalStore.startSession();
      wordGoalStore.endSession(story);

      const session = get(sessions)[0];
      expect(session.endTime).toBeDefined();
    });

    it('should not create session if none active', () => {
      wordGoalStore.endSession(story);
      expect(get(sessions)).toEqual([]);
    });
  });

  describe('getGoalStatus', () => {
    it('should return not_started for zero progress', () => {
      const goal: WordGoal = {
        id: 'test',
        type: 'daily',
        target: 1000,
        current: 0,
        startDate: new Date().toISOString(),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      const status = wordGoalStore.getGoalStatus(goal);
      expect(status).toBe('not_started');
    });

    it('should return in_progress for partial progress', () => {
      const goal: WordGoal = {
        id: 'test',
        type: 'daily',
        target: 1000,
        current: 500,
        startDate: new Date().toISOString(),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      const status = wordGoalStore.getGoalStatus(goal);
      expect(status).toBe('in_progress');
    });

    it('should return completed for exact target', () => {
      const goal: WordGoal = {
        id: 'test',
        type: 'daily',
        target: 1000,
        current: 1000,
        startDate: new Date().toISOString(),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      const status = wordGoalStore.getGoalStatus(goal);
      expect(status).toBe('completed');
    });

    it('should return exceeded for over target', () => {
      const goal: WordGoal = {
        id: 'test',
        type: 'daily',
        target: 1000,
        current: 1500,
        startDate: new Date().toISOString(),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      const status = wordGoalStore.getGoalStatus(goal);
      expect(status).toBe('exceeded');
    });
  });

  describe('derived stores', () => {
    it('should count goals by type', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      wordGoalStore.addGoal({
        type: 'weekly',
        target: 5000,
        startDate: new Date().toISOString(),
      });

      const counts = get(goalCounts);
      expect(counts.daily).toBe(1);
      expect(counts.weekly).toBe(1);
      expect(counts.totalGoals).toBe(2);
    });

    it('should filter active goals', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
      });

      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: tomorrow.toISOString(),
      });

      const active = get(activeGoals);
      expect(active).toHaveLength(1);
    });
  });

  describe('loadGoals and saveGoals', () => {
    it('should load goals from story metadata', () => {
      const testGoals: WordGoal[] = [
        {
          id: 'g1',
          type: 'daily',
          target: 1000,
          current: 500,
          startDate: new Date().toISOString(),
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      ];

      story.settings.wordGoals = testGoals;
      wordGoalStore.loadGoals(story);

      expect(get(goals)).toEqual(testGoals);
    });

    it('should save goals to story metadata', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      wordGoalStore.saveGoals(story);

      const saved = story.settings.wordGoals;
      expect(saved).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all goals and sessions', () => {
      wordGoalStore.addGoal({
        type: 'daily',
        target: 1000,
        startDate: new Date().toISOString(),
      });

      wordGoalStore.startSession();
      wordGoalStore.endSession(story);

      wordGoalStore.clear();

      expect(get(goals)).toEqual([]);
      expect(get(sessions)).toEqual([]);
      expect(get(selectedGoalId)).toBeNull();
      expect(get(currentSessionId)).toBeNull();
    });
  });
});
