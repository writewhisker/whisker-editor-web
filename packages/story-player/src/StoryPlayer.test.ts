/**
 * StoryPlayer Tests
 *
 * Core player engine tests for story playback and state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoryPlayer } from './StoryPlayer';
import { Story, Passage } from '@writewhisker/story-models';

describe('StoryPlayer', () => {
  let player: StoryPlayer;

  beforeEach(() => {
    player = new StoryPlayer();
  });

  // Helper to create a test story
  function createTestStory(
    passages: Array<{ id: string; title: string; choices: Array<{ id: string; target: string; text?: string }> }>
  ): Story {
    const story = new Story();
    for (const p of passages) {
      const passage = new Passage({
        id: p.id,
        title: p.title,
        choices: p.choices.map(c => ({
          id: c.id,
          text: c.text || `Choice ${c.id}`,
          target: c.target,
        })),
      });
      story.passages.set(p.id, passage);
    }
    if (passages.length > 0) {
      story.startPassage = passages[0].id;
    }
    return story;
  }

  describe('constructor', () => {
    it('should create a new player instance', () => {
      expect(player).toBeDefined();
    });
  });

  describe('loadStory', () => {
    it('should load a story', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      expect(player.getState).toBeDefined();
    });
  });

  describe('start', () => {
    it('should throw if no story is loaded', () => {
      expect(() => player.start()).toThrow('No story loaded');
    });

    it('should work with default story (auto-created start passage)', () => {
      // Story class always creates a default start passage if none provided
      const story = new Story();
      player.loadStory(story);
      player.start();
      const state = player.getState();
      expect(state.currentPassageId).toBe(story.startPassage);
    });

    it('should start from start passage', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();
      const state = player.getState();
      expect(state.currentPassageId).toBe('start');
    });

    it('should start from specific passage', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'other' }] },
        { id: 'other', title: 'Other', choices: [] },
      ]);
      player.loadStory(story);
      player.start('other');
      const state = player.getState();
      expect(state.currentPassageId).toBe('other');
    });

    it('should handle non-existent start passage gracefully', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      story.startPassage = 'nonexistent';
      player.loadStory(story);

      const errorHandler = vi.fn();
      player.on('error', errorHandler);
      player.start();

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset player state', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();
      player.reset();

      const state = player.getState();
      expect(state.currentPassageId).toBeNull();
    });
  });

  describe('restart', () => {
    it('should restart from beginning', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'middle' }] },
        { id: 'middle', title: 'Middle', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');
      player.restart();

      const state = player.getState();
      expect(state.currentPassageId).toBe('start');
    });
  });

  describe('undo', () => {
    it('should return false if not enough history', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(player.undo()).toBe(false);
    });

    it('should undo last choice', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'middle' }] },
        { id: 'middle', title: 'Middle', choices: [{ id: 'c2', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');
      player.makeChoice('c2');

      expect(player.undo()).toBe(true);
      expect(player.getState().currentPassageId).toBe('middle');
    });
  });

  describe('makeChoice', () => {
    it('should throw if no active passage', () => {
      expect(() => player.makeChoice('c1')).toThrow('No active passage');
    });

    it('should throw if choice not found', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      expect(() => player.makeChoice('nonexistent')).toThrow('Choice "nonexistent" not found');
    });

    it('should navigate to choice target', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');

      expect(player.getState().currentPassageId).toBe('end');
    });
  });

  describe('canMakeChoice', () => {
    it('should return false if no active passage', () => {
      expect(player.canMakeChoice('c1')).toBe(false);
    });

    it('should return true for choice without condition', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      expect(player.canMakeChoice('c1')).toBe(true);
    });

    it('should return false for nonexistent choice', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      expect(player.canMakeChoice('nonexistent')).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should register event listener with on()', () => {
      const callback = vi.fn();
      player.on('passageEntered', callback);

      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(callback).toHaveBeenCalled();
    });

    it('should unregister event listener with off()', () => {
      const callback = vi.fn();
      player.on('passageEntered', callback);
      player.off('passageEntered', callback);

      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit choiceSelected event', () => {
      const callback = vi.fn();
      player.on('choiceSelected', callback);

      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');

      expect(callback).toHaveBeenCalled();
    });

    it('should emit stateChanged event', () => {
      const callback = vi.fn();
      player.on('stateChanged', callback);

      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = player.getState();
      expect(state.currentPassageId).toBeNull();
    });

    it('should return state after start', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      const state = player.getState();
      expect(state.currentPassageId).toBe('start');
    });
  });

  describe('getAvailableChoices', () => {
    it('should return empty array if not started', () => {
      expect(player.getAvailableChoices()).toEqual([]);
    });

    it('should return available choices', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'a' }, { id: 'c2', target: 'b' }] },
        { id: 'a', title: 'A', choices: [] },
        { id: 'b', title: 'B', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      const choices = player.getAvailableChoices();
      expect(choices).toHaveLength(2);
    });
  });

  describe('variables', () => {
    it('should get and set variable', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      player.setVariable('test', 42);
      expect(player.getVariable('test')).toBe(42);
    });

    it('should return undefined for non-existent variable', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(player.getVariable('nonexistent')).toBeUndefined();
    });

    it('should emit variableChanged event', () => {
      const callback = vi.fn();
      player.on('variableChanged', callback);

      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();
      player.setVariable('test', 123);

      expect(callback).toHaveBeenCalled();
    });

    it('should get all variables', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      player.setVariable('a', 1);
      player.setVariable('b', 2);

      const allVars = player.getAllVariables();
      expect(allVars.get('a')).toBe(1);
      expect(allVars.get('b')).toBe(2);
    });
  });

  describe('getCurrentPassage', () => {
    it('should return null if not started', () => {
      expect(player.getCurrentPassage()).toBeNull();
    });

    it('should return current passage', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      const passage = player.getCurrentPassage();
      expect(passage?.id).toBe('start');
    });
  });

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      expect(player.getHistory()).toEqual([]);
    });

    it('should track history', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');

      const history = player.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getVisitCount', () => {
    it('should return 0 for unvisited passage', () => {
      expect(player.getVisitCount('unknown')).toBe(0);
    });

    it('should track visit count', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(player.getVisitCount('start')).toBe(1);
    });
  });

  describe('restoreState', () => {
    it('should restore state from snapshot', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'end' }] },
        { id: 'end', title: 'End', choices: [] },
      ]);
      player.loadStory(story);
      player.start();
      player.makeChoice('c1');

      const savedState = player.getState();
      player.restart();

      player.restoreState(savedState);
      expect(player.getState().currentPassageId).toBe('end');
    });
  });

  describe('tunnel calls (WLS 1.0)', () => {
    it('should call tunnel and push to stack', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'helper' }] },
        { id: 'helper', title: 'Helper', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      player.callTunnel('helper', 0);

      expect(player.isInTunnel()).toBe(true);
      expect(player.getTunnelDepth()).toBe(1);
      expect(player.getState().currentPassageId).toBe('helper');
    });

    it('should return from tunnel', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'helper' }] },
        { id: 'helper', title: 'Helper', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      player.callTunnel('helper', 0);
      player.returnFromTunnel();

      expect(player.isInTunnel()).toBe(false);
      expect(player.getState().currentPassageId).toBe('start');
    });

    it('should return false when returning from empty tunnel stack', () => {
      const story = createTestStory([{ id: 'start', title: 'Start', choices: [] }]);
      player.loadStory(story);
      player.start();

      expect(player.returnFromTunnel()).toBe(false);
    });

    it('should throw when calling tunnel with no active passage', () => {
      expect(() => player.callTunnel('helper', 0)).toThrow('No active passage for tunnel call');
    });

    it('should preserve local variables through tunnel', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [{ id: 'c1', target: 'helper' }] },
        { id: 'helper', title: 'Helper', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      player.setVariable('_local', 'preserved');
      player.callTunnel('helper', 0);
      player.setVariable('_local', 'modified');
      player.returnFromTunnel();

      // Local variable should be restored
      expect(player.getVariable('_local')).toBe('preserved');
    });

    it('should support nested tunnels', () => {
      const story = createTestStory([
        { id: 'start', title: 'Start', choices: [] },
        { id: 'helper1', title: 'Helper 1', choices: [] },
        { id: 'helper2', title: 'Helper 2', choices: [] },
      ]);
      player.loadStory(story);
      player.start();

      player.callTunnel('helper1', 0);
      player.callTunnel('helper2', 0);

      expect(player.getTunnelDepth()).toBe(2);

      player.returnFromTunnel();
      expect(player.getTunnelDepth()).toBe(1);
      expect(player.getState().currentPassageId).toBe('helper1');

      player.returnFromTunnel();
      expect(player.getTunnelDepth()).toBe(0);
      expect(player.getState().currentPassageId).toBe('start');
    });
  });
});
