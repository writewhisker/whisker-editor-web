import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  history,
  canUndo,
  canRedo,
  historyCount,
  historyActions,
} from './historyStore';
import type { StoryData } from '../models/types';

describe('historyStore', () => {
  // Mock story data helper
  const createMockStoryData = (id: string): StoryData => ({
    metadata: {
      title: `Story ${id}`,
      author: 'Test Author',
      version: '1.0.0',
      created: '2024-01-01',
      modified: '2024-01-02',
    },
    passages: {},
    variables: {},
    startPassage: '',
  });

  beforeEach(() => {
    // Clear history before each test
    historyActions.clear();
  });

  describe('initial state', () => {
    it('should have empty past array', () => {
      const state = get(history);
      expect(state.past).toEqual([]);
    });

    it('should have null present', () => {
      const state = get(history);
      expect(state.present).toBeNull();
    });

    it('should have empty future array', () => {
      const state = get(history);
      expect(state.future).toEqual([]);
    });

    it('should have canUndo as false', () => {
      expect(get(canUndo)).toBe(false);
    });

    it('should have canRedo as false', () => {
      expect(get(canRedo)).toBe(false);
    });

    it('should have historyCount as 0', () => {
      expect(get(historyCount)).toBe(0);
    });
  });

  describe('setPresent', () => {
    it('should set initial state correctly', () => {
      const state1 = createMockStoryData('1');
      historyActions.setPresent(state1);

      const historyState = get(history);
      expect(historyState.past).toEqual([]);
      expect(historyState.present).toEqual(state1);
      expect(historyState.future).toEqual([]);
    });

    it('should clear past when setting present', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.setPresent(state1);
      historyActions.pushState(state2);

      // Now set a new present, should clear past
      const state3 = createMockStoryData('3');
      historyActions.setPresent(state3);

      const historyState = get(history);
      expect(historyState.past).toEqual([]);
      expect(historyState.present).toEqual(state3);
    });

    it('should clear future when setting present', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.setPresent(state1);
      historyActions.pushState(state2);
      historyActions.undo();

      // Now set a new present, should clear future
      const state3 = createMockStoryData('3');
      historyActions.setPresent(state3);

      const historyState = get(history);
      expect(historyState.future).toEqual([]);
    });
  });

  describe('pushState', () => {
    it('should add state to history', () => {
      const state1 = createMockStoryData('1');
      historyActions.pushState(state1);

      const historyState = get(history);
      expect(historyState.present).toEqual(state1);
      expect(historyState.past).toEqual([]);
    });

    it('should move present to past when pushing new state', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      const historyState = get(history);
      expect(historyState.past).toEqual([state1]);
      expect(historyState.present).toEqual(state2);
    });

    it('should clear future when pushing new state', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo(); // Creates future

      const historyState1 = get(history);
      expect(historyState1.future).toHaveLength(1);

      historyActions.pushState(state3);

      const historyState2 = get(history);
      expect(historyState2.future).toEqual([]);
    });

    it('should limit history to MAX_HISTORY (50) states', () => {
      // Push 52 states (should keep only last 50 in past + 1 in present)
      for (let i = 1; i <= 52; i++) {
        historyActions.pushState(createMockStoryData(`state-${i}`));
      }

      const historyState = get(history);
      expect(historyState.past).toHaveLength(50);
      expect(historyState.present?.metadata.title).toBe('Story state-52');

      // First state should be state-2 (only state-1 was dropped)
      expect(historyState.past[0].metadata.title).toBe('Story state-2');
    });

    it('should handle pushing state when present is null', () => {
      const state1 = createMockStoryData('1');

      // Ensure present is null (initial state)
      const initialState = get(history);
      expect(initialState.present).toBeNull();

      historyActions.pushState(state1);

      const historyState = get(history);
      expect(historyState.past).toEqual([]);
      expect(historyState.present).toEqual(state1);
    });
  });

  describe('undo', () => {
    it('should return null when past is empty', () => {
      const result = historyActions.undo();
      expect(result).toBeNull();
    });

    it('should move to previous state', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      const result = historyActions.undo();

      expect(result).toEqual(state1);
      const historyState = get(history);
      expect(historyState.present).toEqual(state1);
    });

    it('should move current state to future', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      historyActions.undo();

      const historyState = get(history);
      expect(historyState.future).toEqual([state2]);
    });

    it('should remove state from past', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);

      historyActions.undo();

      const historyState = get(history);
      expect(historyState.past).toEqual([state1]);
    });

    it('should handle multiple undos', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);

      historyActions.undo(); // Back to state2
      historyActions.undo(); // Back to state1

      const historyState = get(history);
      expect(historyState.present).toEqual(state1);
      expect(historyState.past).toEqual([]);
      expect(historyState.future).toEqual([state2, state3]);
    });

    it('should handle undo when present is null', () => {
      const state1 = createMockStoryData('1');

      // Manually set history with null present
      historyActions.pushState(state1);
      historyActions.undo();

      // Past is now empty, present is state1
      historyActions.undo(); // Should return null

      const result = historyActions.undo();
      expect(result).toBeNull();
    });

    it('should update canUndo derived store', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      expect(get(canUndo)).toBe(false);

      historyActions.pushState(state1);
      expect(get(canUndo)).toBe(false); // No past yet

      historyActions.pushState(state2);
      expect(get(canUndo)).toBe(true); // Now we have past

      historyActions.undo();
      expect(get(canUndo)).toBe(false); // Past is empty again
    });
  });

  describe('redo', () => {
    it('should return null when future is empty', () => {
      const result = historyActions.redo();
      expect(result).toBeNull();
    });

    it('should move to next state', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo();

      const result = historyActions.redo();

      expect(result).toEqual(state2);
      const historyState = get(history);
      expect(historyState.present).toEqual(state2);
    });

    it('should move current state to past', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo();

      historyActions.redo();

      const historyState = get(history);
      expect(historyState.past).toEqual([state1]);
      expect(historyState.present).toEqual(state2);
    });

    it('should remove state from future', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);
      historyActions.undo();
      historyActions.undo();

      historyActions.redo();

      const historyState = get(history);
      expect(historyState.future).toEqual([state3]);
    });

    it('should handle multiple redos', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);
      historyActions.undo();
      historyActions.undo();

      historyActions.redo();
      historyActions.redo();

      const historyState = get(history);
      expect(historyState.present).toEqual(state3);
      expect(historyState.past).toEqual([state1, state2]);
      expect(historyState.future).toEqual([]);
    });

    it('should handle redo when present is null', () => {
      // Clear to get null present
      historyActions.clear();

      const result = historyActions.redo();
      expect(result).toBeNull();
    });

    it('should update canRedo derived store', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      expect(get(canRedo)).toBe(false);

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      expect(get(canRedo)).toBe(false); // No future yet

      historyActions.undo();
      expect(get(canRedo)).toBe(true); // Now we have future

      historyActions.redo();
      expect(get(canRedo)).toBe(false); // Future is empty again
    });
  });

  describe('clear', () => {
    it('should reset to initial state', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      historyActions.clear();

      const historyState = get(history);
      expect(historyState.past).toEqual([]);
      expect(historyState.present).toBeNull();
      expect(historyState.future).toEqual([]);
    });

    it('should reset derived stores', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      expect(get(canUndo)).toBe(true);
      expect(get(historyCount)).toBeGreaterThan(0);

      historyActions.clear();

      expect(get(canUndo)).toBe(false);
      expect(get(canRedo)).toBe(false);
      expect(get(historyCount)).toBe(0);
    });
  });

  describe('derived stores', () => {
    it('canUndo should be true when past has items', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);

      expect(get(canUndo)).toBe(true);
    });

    it('canUndo should be false when past is empty', () => {
      const state1 = createMockStoryData('1');
      historyActions.pushState(state1);

      expect(get(canUndo)).toBe(false);
    });

    it('canRedo should be true when future has items', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo();

      expect(get(canRedo)).toBe(true);
    });

    it('canRedo should be false when future is empty', () => {
      const state1 = createMockStoryData('1');
      historyActions.pushState(state1);

      expect(get(canRedo)).toBe(false);
    });

    it('historyCount should reflect past length', () => {
      expect(get(historyCount)).toBe(0);

      const state1 = createMockStoryData('1');
      historyActions.pushState(state1);
      expect(get(historyCount)).toBe(0);

      const state2 = createMockStoryData('2');
      historyActions.pushState(state2);
      expect(get(historyCount)).toBe(1);

      const state3 = createMockStoryData('3');
      historyActions.pushState(state3);
      expect(get(historyCount)).toBe(2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle push -> undo -> redo -> push (clears future)', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo();
      historyActions.redo();

      // At this point: past=[state1, state2], present=state2, future=[]
      historyActions.pushState(state3);

      const historyState = get(history);
      expect(historyState.past).toEqual([state1, state2]);
      expect(historyState.present).toEqual(state3);
      expect(historyState.future).toEqual([]);
    });

    it('should handle undo -> redo -> undo sequence', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);

      historyActions.undo(); // Back to state2
      historyActions.redo(); // Forward to state3
      historyActions.undo(); // Back to state2 again

      const historyState = get(history);
      expect(historyState.present).toEqual(state2);
      expect(historyState.past).toEqual([state1]);
      expect(historyState.future).toEqual([state3]);
    });

    it('should handle complete undo -> push (creates new timeline)', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');
      const state3 = createMockStoryData('3');
      const state4 = createMockStoryData('4');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.pushState(state3);
      historyActions.undo();
      historyActions.undo();

      // Now push a new state, should clear future
      historyActions.pushState(state4);

      const historyState = get(history);
      expect(historyState.past).toEqual([state1]);
      expect(historyState.present).toEqual(state4);
      expect(historyState.future).toEqual([]);
    });

    it('should maintain state integrity through complex operations', () => {
      const states = Array.from({ length: 10 }, (_, i) => createMockStoryData(`${i + 1}`));

      // Push 10 states
      states.forEach((state) => historyActions.pushState(state));

      // Undo 5 times
      for (let i = 0; i < 5; i++) {
        historyActions.undo();
      }

      // Redo 3 times
      for (let i = 0; i < 3; i++) {
        historyActions.redo();
      }

      const historyState = get(history);
      expect(historyState.present).toEqual(states[7]); // state-8
      expect(historyState.past).toHaveLength(7);
      expect(historyState.future).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty state data', () => {
      const emptyState: StoryData = {
        metadata: {
          title: '',
          author: '',
          version: '',
          created: '',
          modified: '',
        },
        passages: {},
        variables: {},
        startPassage: '',
      };

      historyActions.pushState(emptyState);

      const historyState = get(history);
      expect(historyState.present).toEqual(emptyState);
    });

    it('should handle rapid successive pushes', () => {
      for (let i = 0; i < 5; i++) {
        historyActions.pushState(createMockStoryData(`${i}`));
      }

      const historyState = get(history);
      expect(historyState.past).toHaveLength(4);
      expect(historyState.present?.metadata.title).toBe('Story 4');
    });

    it('should handle undo when only one state exists', () => {
      const state1 = createMockStoryData('1');
      historyActions.pushState(state1);

      const result = historyActions.undo();

      expect(result).toBeNull();
    });

    it('should handle redo when only one future state exists', () => {
      const state1 = createMockStoryData('1');
      const state2 = createMockStoryData('2');

      historyActions.pushState(state1);
      historyActions.pushState(state2);
      historyActions.undo();

      historyActions.redo();

      const historyState = get(history);
      expect(historyState.future).toEqual([]);
    });
  });
});
