import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  playerActions,
  isPlayerActive,
  isPlayerPaused,
  currentPreviewPassage,
  availableChoices,
  playerVariables,
  playthroughHistory,
  visitedPassages,
  breakpoints,
  debugMode,
  playerErrors,
  playthroughDuration,
  hasHistory,
  canUndo,
  uniquePassagesVisited,
} from './playerStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';
import { Variable } from '../models/Variable';

describe('playerStore', () => {
  let story: Story;
  let startPassage: Passage;
  let secondPassage: Passage;
  let thirdPassage: Passage;

  beforeEach(() => {
    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Setup passages
    startPassage = story.getPassage(story.startPassage!)!;
    startPassage.title = 'Start';
    startPassage.content = 'Welcome to the test story.';

    secondPassage = new Passage({
      title: 'Second Passage',
      content: 'You are in the second passage.',
    });
    story.addPassage(secondPassage);

    thirdPassage = new Passage({
      title: 'Third Passage',
      content: 'You are in the third passage.',
    });
    story.addPassage(thirdPassage);

    // Add choices
    startPassage.addChoice(new Choice({
      text: 'Go to second',
      target: secondPassage.id,
    }));

    secondPassage.addChoice(new Choice({
      text: 'Go to third',
      target: thirdPassage.id,
    }));

    secondPassage.addChoice(new Choice({
      text: 'Go back to start',
      target: startPassage.id,
    }));

    // Add variables
    story.addVariable(new Variable({
      name: 'health',
      type: 'number',
      initial: 100,
    }));
    story.addVariable(new Variable({
      name: 'has_key',
      type: 'boolean',
      initial: false,
    }));
    story.addVariable(new Variable({
      name: 'player_name',
      type: 'string',
      initial: 'Hero',
    }));

    // Load story and reset all stores
    playerActions.loadStory(story);
    playerActions.stop();
  });

  afterEach(() => {
    // Clean up
    playerActions.stop();
  });

  describe('initialization', () => {
    it('should initialize with inactive state', () => {
      expect(get(isPlayerActive)).toBe(false);
      expect(get(isPlayerPaused)).toBe(false);
      expect(get(currentPreviewPassage)).toBeNull();
      expect(get(availableChoices)).toEqual([]);
      expect(get(playthroughHistory)).toEqual([]);
    });

    it('should load story', () => {
      playerActions.loadStory(story);
      expect(get(isPlayerActive)).toBe(false);
      expect(get(currentPreviewPassage)).toBeNull();
    });
  });

  describe('playerActions.start', () => {
    it('should start from beginning', () => {
      playerActions.start();

      expect(get(isPlayerActive)).toBe(true);
      expect(get(isPlayerPaused)).toBe(false);
      expect(get(currentPreviewPassage)?.id).toBe(startPassage.id);
      expect(get(playthroughHistory).length).toBe(1);
    });

    it('should start from specific passage', () => {
      playerActions.start(secondPassage.id);

      expect(get(isPlayerActive)).toBe(true);
      expect(get(currentPreviewPassage)?.id).toBe(secondPassage.id);
    });

    it('should initialize variables', () => {
      playerActions.start();

      const vars = get(playerVariables);
      expect(vars.get('health')).toBe(100);
      expect(vars.get('has_key')).toBe(false);
      expect(vars.get('player_name')).toBe('Hero');
    });

    it('should update available choices', () => {
      playerActions.start();

      const choices = get(availableChoices);
      expect(choices.length).toBe(1);
      expect(choices[0].text).toBe('Go to second');
    });

    it('should clear errors on start', () => {
      playerActions.start();
      expect(get(playerErrors)).toEqual([]);
    });

    it('should start duration timer', async () => {
      playerActions.start();

      const duration1 = get(playthroughDuration);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 150));

      const duration2 = get(playthroughDuration);
      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  describe('playerActions.stop', () => {
    beforeEach(() => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);
    });

    it('should stop playback', () => {
      playerActions.stop();

      expect(get(isPlayerActive)).toBe(false);
      expect(get(isPlayerPaused)).toBe(false);
      expect(get(currentPreviewPassage)).toBeNull();
    });

    it('should clear history', () => {
      playerActions.stop();
      expect(get(playthroughHistory)).toEqual([]);
    });

    it('should reset duration', () => {
      playerActions.stop();
      expect(get(playthroughDuration)).toBe(0);
    });

    it('should clear available choices', () => {
      playerActions.stop();
      expect(get(availableChoices)).toEqual([]);
    });
  });

  describe('playerActions.restart', () => {
    beforeEach(() => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);
    });

    it('should restart from beginning', () => {
      playerActions.restart();

      expect(get(isPlayerActive)).toBe(true);
      expect(get(currentPreviewPassage)?.id).toBe(startPassage.id);
      expect(get(playthroughHistory).length).toBe(1);
    });

    it('should reset variables', () => {
      playerActions.setVariable('health', 50);
      playerActions.restart();

      expect(get(playerVariables).get('health')).toBe(100);
    });
  });

  describe('playerActions.pause and resume', () => {
    beforeEach(() => {
      playerActions.start();
    });

    it('should pause playback', () => {
      playerActions.pause();
      expect(get(isPlayerPaused)).toBe(true);
    });

    it('should resume playback', () => {
      playerActions.pause();
      playerActions.resume();
      expect(get(isPlayerPaused)).toBe(false);
    });

    it('should toggle pause', () => {
      expect(get(isPlayerPaused)).toBe(false);

      playerActions.togglePause();
      expect(get(isPlayerPaused)).toBe(true);

      playerActions.togglePause();
      expect(get(isPlayerPaused)).toBe(false);
    });

    it('should stop duration timer when paused', async () => {
      playerActions.pause();

      const duration1 = get(playthroughDuration);
      await new Promise(resolve => setTimeout(resolve, 150));
      const duration2 = get(playthroughDuration);

      // Duration should not increase while paused
      expect(duration2).toBe(duration1);
    });

    it('should resume duration timer when resumed', async () => {
      playerActions.pause();
      await new Promise(resolve => setTimeout(resolve, 100));

      playerActions.resume();
      const duration1 = get(playthroughDuration);

      await new Promise(resolve => setTimeout(resolve, 150));
      const duration2 = get(playthroughDuration);

      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  describe('playerActions.makeChoice', () => {
    beforeEach(() => {
      playerActions.start();
    });

    it('should make choice and advance passage', () => {
      const choice = startPassage.choices[0];
      playerActions.makeChoice(choice.id);

      expect(get(currentPreviewPassage)?.id).toBe(secondPassage.id);
    });

    it('should update history', () => {
      const choice = startPassage.choices[0];
      playerActions.makeChoice(choice.id);

      const history = get(playthroughHistory);
      expect(history.length).toBe(2);
      expect(history[1].passageId).toBe(secondPassage.id);
      expect(history[1].choiceText).toBe(choice.text);
    });

    it('should update available choices', () => {
      playerActions.makeChoice(startPassage.choices[0].id);

      const choices = get(availableChoices);
      expect(choices.length).toBe(2); // Second passage has 2 choices
    });

    it('should update visited passages', () => {
      playerActions.makeChoice(startPassage.choices[0].id);

      const visited = get(visitedPassages);
      expect(visited.get(startPassage.id)).toBe(1);
      expect(visited.get(secondPassage.id)).toBe(1);
    });

    it('should handle errors gracefully', () => {
      // Try to make invalid choice
      playerActions.makeChoice('invalid-choice-id');

      // Should add error but not crash
      expect(get(playerErrors).length).toBeGreaterThan(0);
    });
  });

  describe('playerActions.undo', () => {
    beforeEach(() => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);
    });

    it('should undo last choice', () => {
      const success = playerActions.undo();

      expect(success).toBe(true);
      expect(get(currentPreviewPassage)?.id).toBe(startPassage.id);
    });

    it('should update history', () => {
      playerActions.undo();

      const history = get(playthroughHistory);
      expect(history.length).toBe(1);
      expect(history[0].passageId).toBe(startPassage.id);
    });

    it('should update available choices', () => {
      playerActions.undo();

      const choices = get(availableChoices);
      expect(choices.length).toBe(1);
      expect(choices[0].text).toBe('Go to second');
    });

    it('should not undo when at start', () => {
      playerActions.undo(); // Back to start
      const success = playerActions.undo(); // Try to undo again

      expect(success).toBe(false);
      expect(get(playthroughHistory).length).toBe(1);
    });
  });

  describe('playerActions.setVariable', () => {
    beforeEach(() => {
      playerActions.start();
    });

    it('should set variable value', () => {
      playerActions.setVariable('health', 75);
      expect(get(playerVariables).get('health')).toBe(75);
    });

    it('should set boolean variable', () => {
      playerActions.setVariable('has_key', true);
      expect(get(playerVariables).get('has_key')).toBe(true);
    });

    it('should set string variable', () => {
      playerActions.setVariable('player_name', 'Warrior');
      expect(get(playerVariables).get('player_name')).toBe('Warrior');
    });
  });

  describe('playerActions.getVariable', () => {
    beforeEach(() => {
      playerActions.start();
    });

    it('should get variable value', () => {
      expect(playerActions.getVariable('health')).toBe(100);
    });

    it('should return undefined for non-existent variable', () => {
      expect(playerActions.getVariable('invalid_var')).toBeUndefined();
    });
  });

  describe('breakpoint management', () => {
    it('should toggle breakpoint', () => {
      playerActions.toggleBreakpoint(secondPassage.id);

      expect(get(breakpoints).has(secondPassage.id)).toBe(true);
    });

    it('should remove breakpoint on second toggle', () => {
      playerActions.toggleBreakpoint(secondPassage.id);
      playerActions.toggleBreakpoint(secondPassage.id);

      expect(get(breakpoints).has(secondPassage.id)).toBe(false);
    });

    it('should check if passage has breakpoint', () => {
      playerActions.toggleBreakpoint(secondPassage.id);

      expect(playerActions.hasBreakpoint(secondPassage.id)).toBe(true);
      expect(playerActions.hasBreakpoint(thirdPassage.id)).toBe(false);
    });

    it('should pause when hitting breakpoint', () => {
      playerActions.toggleBreakpoint(secondPassage.id);
      playerActions.start();

      playerActions.makeChoice(startPassage.choices[0].id);

      expect(get(isPlayerPaused)).toBe(true);
      expect(get(currentPreviewPassage)?.id).toBe(secondPassage.id);
    });
  });

  describe('playerActions.jumpToStep', () => {
    beforeEach(() => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);
      playerActions.makeChoice(secondPassage.choices[0].id);
    });

    it('should jump to specific history step', () => {
      const success = playerActions.jumpToStep(1);

      expect(success).toBe(true);
      expect(get(currentPreviewPassage)?.id).toBe(secondPassage.id);
      expect(get(playthroughHistory).length).toBe(2);
    });

    it('should jump to start', () => {
      playerActions.jumpToStep(0);
      expect(get(currentPreviewPassage)?.id).toBe(startPassage.id);
    });

    it('should not jump to invalid index', () => {
      const success = playerActions.jumpToStep(999);
      expect(success).toBe(false);
    });

    it('should not jump to negative index', () => {
      const success = playerActions.jumpToStep(-1);
      expect(success).toBe(false);
    });

    it('should restore variables at that step', () => {
      playerActions.setVariable('health', 50);
      playerActions.jumpToStep(0);

      // Should restore to initial state
      expect(get(playerVariables).get('health')).toBe(100);
    });
  });

  describe('playthrough recording', () => {
    beforeEach(() => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);
    });

    it('should get playthrough recording', () => {
      const recording = playerActions.getPlaythrough();

      expect(recording.metadata.storyTitle).toBe('Test Story');
      expect(recording.steps.length).toBe(2);
      expect(recording.finalState.passagesVisited).toContain(startPassage.id);
      expect(recording.finalState.passagesVisited).toContain(secondPassage.id);
    });

    it('should export playthrough as JSON', () => {
      const json = playerActions.exportPlaythrough();
      const parsed = JSON.parse(json);

      expect(parsed.metadata.storyTitle).toBe('Test Story');
      expect(parsed.steps).toHaveLength(2);
    });
  });

  describe('debug mode', () => {
    it('should toggle debug mode', () => {
      expect(get(debugMode)).toBe(false);

      playerActions.toggleDebugMode();
      expect(get(debugMode)).toBe(true);

      playerActions.toggleDebugMode();
      expect(get(debugMode)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should clear errors', () => {
      playerActions.start();
      playerActions.makeChoice('invalid-choice'); // Create error

      expect(get(playerErrors).length).toBeGreaterThan(0);

      playerActions.clearErrors();
      expect(get(playerErrors)).toEqual([]);
    });
  });

  describe('derived stores', () => {
    beforeEach(() => {
      playerActions.start();
    });

    it('should compute hasHistory', () => {
      expect(get(hasHistory)).toBe(false);

      playerActions.makeChoice(startPassage.choices[0].id);
      expect(get(hasHistory)).toBe(true);
    });

    it('should compute canUndo', () => {
      expect(get(canUndo)).toBe(false);

      playerActions.makeChoice(startPassage.choices[0].id);
      expect(get(canUndo)).toBe(true);
    });

    it('should compute uniquePassagesVisited', () => {
      expect(get(uniquePassagesVisited)).toBe(1);

      playerActions.makeChoice(startPassage.choices[0].id);
      expect(get(uniquePassagesVisited)).toBe(2);

      // Go back to start (revisit)
      playerActions.makeChoice(secondPassage.choices[1].id);
      expect(get(uniquePassagesVisited)).toBe(2); // Still only 2 unique passages
    });
  });

  describe('complex playthrough scenarios', () => {
    it('should handle loops correctly', () => {
      playerActions.start();

      // Start -> Second
      playerActions.makeChoice(startPassage.choices[0].id);
      expect(get(visitedPassages).get(secondPassage.id)).toBe(1);

      // Second -> Start (loop back)
      playerActions.makeChoice(secondPassage.choices[1].id);
      expect(get(visitedPassages).get(startPassage.id)).toBe(2);

      // Start -> Second again
      playerActions.makeChoice(startPassage.choices[0].id);
      expect(get(visitedPassages).get(secondPassage.id)).toBe(2);
    });

    it('should handle multiple variable changes', () => {
      playerActions.start();

      playerActions.setVariable('health', 90);
      playerActions.setVariable('has_key', true);
      playerActions.setVariable('player_name', 'Warrior');

      expect(get(playerVariables).get('health')).toBe(90);
      expect(get(playerVariables).get('has_key')).toBe(true);
      expect(get(playerVariables).get('player_name')).toBe('Warrior');
    });

    it('should preserve state across pause/resume', () => {
      playerActions.start();
      playerActions.makeChoice(startPassage.choices[0].id);

      const passageBeforePause = get(currentPreviewPassage);
      const historyBeforePause = get(playthroughHistory).length;

      playerActions.pause();
      playerActions.resume();

      expect(get(currentPreviewPassage)).toBe(passageBeforePause);
      expect(get(playthroughHistory).length).toBe(historyBeforePause);
    });

    it('should handle restart with modified variables', () => {
      playerActions.start();
      playerActions.setVariable('health', 50);

      playerActions.restart();

      expect(get(playerVariables).get('health')).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle stop when not active', () => {
      expect(() => playerActions.stop()).not.toThrow();
      expect(get(isPlayerActive)).toBe(false);
    });

    it('should handle pause when not active', () => {
      expect(() => playerActions.pause()).not.toThrow();
    });

    it('should handle undo when not active', () => {
      const result = playerActions.undo();
      expect(result).toBe(false);
    });

    it('should handle multiple rapid starts', () => {
      playerActions.start();
      playerActions.start();
      playerActions.start();

      expect(get(isPlayerActive)).toBe(true);
      expect(get(playthroughHistory).length).toBe(1);
    });
  });
});
