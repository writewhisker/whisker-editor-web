import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryPlayer } from './StoryPlayer';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';
import { Variable } from '../models/Variable';

describe('StoryPlayer', () => {
  let player: StoryPlayer;
  let story: Story;
  let startPassage: Passage;
  let secondPassage: Passage;

  beforeEach(() => {
    player = new StoryPlayer();

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

    // Get start passage
    startPassage = story.getPassage(story.startPassage!)!;
    startPassage.title = 'Start';
    startPassage.content = 'Welcome to the test story.';

    // Create second passage
    secondPassage = new Passage({
      title: 'Second Passage',
      content: 'You are in the second passage.',
    });
    story.addPassage(secondPassage);

    // Add choice to start passage
    const choice = new Choice({
      text: 'Go to second passage',
      target: secondPassage.id,
    });
    startPassage.addChoice(choice);

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
  });

  describe('initialization', () => {
    it('should create a player instance', () => {
      expect(player).toBeDefined();
      expect(player.getCurrentPassage()).toBeNull();
    });

    it('should load a story', () => {
      player.loadStory(story);
      expect(player.getCurrentPassage()).toBeNull(); // Not started yet
    });
  });

  describe('story playback', () => {
    beforeEach(() => {
      player.loadStory(story);
    });

    it('should start from the beginning', () => {
      player.start();

      const currentPassage = player.getCurrentPassage();
      expect(currentPassage).toBeDefined();
      expect(currentPassage?.id).toBe(startPassage.id);
    });

    it('should start from a specific passage', () => {
      player.start(secondPassage.id);

      const currentPassage = player.getCurrentPassage();
      expect(currentPassage?.id).toBe(secondPassage.id);
    });

    it('should throw error if no start passage defined', () => {
      story.startPassage = null as any;
      player.loadStory(story);

      expect(() => player.start()).toThrow('No start passage defined');
    });

    it('should initialize variables on start', () => {
      player.start();

      expect(player.getVariable('health')).toBe(100);
      expect(player.getVariable('has_key')).toBe(false);
    });
  });

  describe('choice selection', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should make a choice and advance to target passage', () => {
      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      const currentPassage = player.getCurrentPassage();
      expect(currentPassage?.id).toBe(secondPassage.id);
    });

    it('should throw error for invalid choice', () => {
      expect(() => player.makeChoice('invalid-id')).toThrow();
    });

    it('should add choice to history', () => {
      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      const history = player.getHistory();
      expect(history.length).toBe(2); // Start + second passage
      expect(history[1].passageId).toBe(secondPassage.id);
      expect(history[1].choiceText).toBe(choice.text);
    });
  });

  describe('conditional choices', () => {
    beforeEach(() => {
      player.loadStory(story);

      // Add conditional choice
      const conditionalChoice = new Choice({
        text: 'Use key',
        target: secondPassage.id,
        condition: 'has_key === true',
      });
      startPassage.addChoice(conditionalChoice);

      player.start();
    });

    it('should evaluate choice condition correctly (false)', () => {
      const choices = player.getAvailableChoices();
      expect(choices.length).toBe(1); // Only the unconditional choice
    });

    it('should evaluate choice condition correctly (true)', () => {
      player.setVariable('has_key', true);

      const choices = player.getAvailableChoices();
      expect(choices.length).toBe(2); // Both choices available
    });

    it('should allow making choice when condition is met', () => {
      player.setVariable('has_key', true);
      const conditionalChoice = startPassage.choices[1];

      expect(player.canMakeChoice(conditionalChoice.id)).toBe(true);

      player.makeChoice(conditionalChoice.id);
      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);
    });

    it('should not allow making choice when condition is not met', () => {
      const conditionalChoice = startPassage.choices[1];

      expect(player.canMakeChoice(conditionalChoice.id)).toBe(false);
    });
  });

  describe('variables', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should get variable value', () => {
      expect(player.getVariable('health')).toBe(100);
    });

    it('should set variable value', () => {
      player.setVariable('health', 50);
      expect(player.getVariable('health')).toBe(50);
    });

    it('should return all variables', () => {
      const allVars = player.getAllVariables();
      expect(allVars.size).toBe(2);
      expect(allVars.get('health')).toBe(100);
      expect(allVars.get('has_key')).toBe(false);
    });

    it('should emit variableChanged event', () => {
      const callback = vi.fn();
      player.on('variableChanged', callback);

      player.setVariable('health', 75);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'health',
          oldValue: 100,
          newValue: 75,
        })
      );
    });
  });

  describe('history and undo', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should track passage history', () => {
      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      const history = player.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].passageId).toBe(startPassage.id);
      expect(history[1].passageId).toBe(secondPassage.id);
    });

    it('should undo last choice', () => {
      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);

      const undone = player.undo();
      expect(undone).toBe(true);
      expect(player.getCurrentPassage()?.id).toBe(startPassage.id);
    });

    it('should not undo when at start', () => {
      const undone = player.undo();
      expect(undone).toBe(false);
    });

    it('should restore variables on undo', () => {
      // Variables are saved when entering passages, not on every change
      const choice = startPassage.choices[0];

      // Make a choice to go to second passage
      player.makeChoice(choice.id);
      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);

      // Change variable in second passage
      player.setVariable('health', 25);
      expect(player.getVariable('health')).toBe(25);

      // Undo back to first passage
      // Variables should be restored to state when entering first passage
      player.undo();
      expect(player.getVariable('health')).toBe(100); // Initial value when entered start passage
    });
  });

  describe('visit tracking', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should track passage visits', () => {
      expect(player.getVisitCount(startPassage.id)).toBe(1);
      expect(player.getVisitCount(secondPassage.id)).toBe(0);

      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      expect(player.getVisitCount(secondPassage.id)).toBe(1);
    });

    it('should increment visit count on repeated visits', () => {
      // Add a loop-back choice
      const loopChoice = new Choice({
        text: 'Go back to start',
        target: startPassage.id,
      });
      secondPassage.addChoice(loopChoice);

      // Visit second passage
      player.makeChoice(startPassage.choices[0].id);
      expect(player.getVisitCount(startPassage.id)).toBe(1);

      // Loop back to start
      player.makeChoice(loopChoice.id);
      expect(player.getVisitCount(startPassage.id)).toBe(2);
    });
  });

  describe('breakpoints', () => {
    beforeEach(() => {
      player.loadStory(story);
    });

    it('should toggle breakpoint', () => {
      expect(player.hasBreakpoint(secondPassage.id)).toBe(false);

      player.toggleBreakpoint(secondPassage.id);
      expect(player.hasBreakpoint(secondPassage.id)).toBe(true);

      player.toggleBreakpoint(secondPassage.id);
      expect(player.hasBreakpoint(secondPassage.id)).toBe(false);
    });

    it('should pause when hitting breakpoint', () => {
      player.toggleBreakpoint(secondPassage.id);
      player.start();

      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      expect(player.isPaused()).toBe(true);
      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);
    });

    it('should get all breakpoints', () => {
      player.toggleBreakpoint(startPassage.id);
      player.toggleBreakpoint(secondPassage.id);

      const breakpoints = player.getBreakpoints();
      expect(breakpoints.size).toBe(2);
      expect(breakpoints.has(startPassage.id)).toBe(true);
      expect(breakpoints.has(secondPassage.id)).toBe(true);
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should pause playback', () => {
      player.pause();
      expect(player.isPaused()).toBe(true);
    });

    it('should resume playback', () => {
      player.pause();
      player.resume();
      expect(player.isPaused()).toBe(false);
    });

    it('should not make choices when paused', () => {
      player.pause();

      const choice = startPassage.choices[0];
      player.makeChoice(choice.id);

      // Should still be at start passage
      expect(player.getCurrentPassage()?.id).toBe(startPassage.id);
    });
  });

  describe('state management', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should get current state snapshot', () => {
      const state = player.getState();

      expect(state.currentPassageId).toBe(startPassage.id);
      expect(state.variables).toEqual({
        health: 100,
        has_key: false,
      });
      expect(state.history.length).toBe(1);
    });

    it('should restore state from snapshot', () => {
      // Make some changes
      player.setVariable('health', 50);
      player.makeChoice(startPassage.choices[0].id);

      const state = player.getState();

      // Reset and restore
      player.reset();
      player.loadStory(story);
      player.restoreState(state);

      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);
      expect(player.getVariable('health')).toBe(50);
      expect(player.getHistory().length).toBe(2);
    });
  });

  describe('reset and restart', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should reset to initial state', () => {
      player.setVariable('health', 50);
      player.makeChoice(startPassage.choices[0].id);

      player.reset();

      expect(player.getCurrentPassage()).toBeNull();
      expect(player.getHistory().length).toBe(0);
    });

    it('should restart from beginning', () => {
      player.makeChoice(startPassage.choices[0].id);
      expect(player.getCurrentPassage()?.id).toBe(secondPassage.id);

      player.restart();

      expect(player.getCurrentPassage()?.id).toBe(startPassage.id);
      expect(player.getHistory().length).toBe(1);
    });
  });

  describe('playthrough recording', () => {
    beforeEach(() => {
      player.loadStory(story);
      player.start();
    });

    it('should export playthrough recording', () => {
      player.makeChoice(startPassage.choices[0].id);

      const recording = player.getPlaythrough();

      expect(recording.metadata.storyTitle).toBe('Test Story');
      expect(recording.steps.length).toBe(2);
      expect(recording.finalState.variables).toEqual({
        health: 100,
        has_key: false,
      });
      expect(recording.finalState.passagesVisited).toContain(startPassage.id);
      expect(recording.finalState.passagesVisited).toContain(secondPassage.id);
    });

    it('should track duration', () => {
      const duration1 = player.getDuration();
      expect(duration1).toBeGreaterThanOrEqual(0);

      // Wait a bit
      const waitMs = 10;
      const start = Date.now();
      while (Date.now() - start < waitMs) {
        // Busy wait
      }

      const duration2 = player.getDuration();
      expect(duration2).toBeGreaterThan(duration1);
    });

    it('should mark playthrough as completed when at dead end', () => {
      player.makeChoice(startPassage.choices[0].id);
      // Second passage has no choices (dead end)

      const recording = player.getPlaythrough();
      expect(recording.metadata.completed).toBe(true);
    });
  });

  describe('event system', () => {
    beforeEach(() => {
      player.loadStory(story);
    });

    it('should emit passageEntered event', () => {
      const callback = vi.fn();
      player.on('passageEntered', callback);

      player.start();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          passage: expect.any(Object),
          visitCount: 1,
        })
      );
    });

    it('should emit choiceSelected event', () => {
      const callback = vi.fn();
      player.on('choiceSelected', callback);

      player.start();
      player.makeChoice(startPassage.choices[0].id);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          choice: expect.any(Object),
          passage: expect.any(Object),
        })
      );
    });

    it('should emit stateChanged event', () => {
      const callback = vi.fn();
      player.on('stateChanged', callback);

      player.start();

      expect(callback).toHaveBeenCalled();
    });

    it('should remove event listener', () => {
      const callback = vi.fn();
      player.on('passageEntered', callback);
      player.off('passageEntered', callback);

      player.start();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when no story loaded', () => {
      expect(() => player.start()).toThrow('No story loaded');
    });

    it('should emit error event for invalid passage', () => {
      const callback = vi.fn();
      player.on('error', callback);

      player.loadStory(story);
      player.start('invalid-passage-id');

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('complex conditions', () => {
    beforeEach(() => {
      player.loadStory(story);

      // Add choices with complex conditions
      startPassage.addChoice(new Choice({
        text: 'Enter if healthy',
        target: secondPassage.id,
        condition: 'health > 50',
      }));

      startPassage.addChoice(new Choice({
        text: 'Enter with key',
        target: secondPassage.id,
        condition: 'has_key === true && health > 0',
      }));

      player.start();
    });

    it('should evaluate numeric comparison', () => {
      player.setVariable('health', 75);

      const choice = startPassage.choices.find(c => c.text === 'Enter if healthy');
      expect(player.canMakeChoice(choice!.id)).toBe(true);

      player.setVariable('health', 25);
      expect(player.canMakeChoice(choice!.id)).toBe(false);
    });

    it('should evaluate compound conditions', () => {
      const choice = startPassage.choices.find(c => c.text === 'Enter with key');

      // Both conditions false
      expect(player.canMakeChoice(choice!.id)).toBe(false);

      // One condition true
      player.setVariable('has_key', true);
      player.setVariable('health', 0);
      expect(player.canMakeChoice(choice!.id)).toBe(false);

      // Both conditions true
      player.setVariable('health', 100);
      expect(player.canMakeChoice(choice!.id)).toBe(true);
    });
  });
});
