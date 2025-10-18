import { writable, derived, get } from 'svelte/store';
import type { StoryData } from '../models/types';

interface HistoryState {
  past: StoryData[];
  present: StoryData | null;
  future: StoryData[];
}

const MAX_HISTORY = 50;

const initialState: HistoryState = {
  past: [],
  present: null,
  future: [],
};

export const history = writable<HistoryState>(initialState);

// Derived stores
export const canUndo = derived(history, ($history) => $history.past.length > 0);
export const canRedo = derived(history, ($history) => $history.future.length > 0);
export const historyCount = derived(history, ($history) => $history.past.length);

// Actions
export const historyActions = {
  // Push a new state (called when user makes a change)
  pushState(state: StoryData) {
    history.update((h) => {
      const newPast = [...h.past, h.present].filter((s): s is StoryData => s !== null);

      // Limit history size
      const limitedPast = newPast.slice(-MAX_HISTORY);

      return {
        past: limitedPast,
        present: state,
        future: [], // Clear future when new action is performed
      };
    });
  },

  // Set initial state (when loading a project)
  setPresent(state: StoryData) {
    history.set({
      past: [],
      present: state,
      future: [],
    });
  },

  // Undo to previous state
  undo(): StoryData | null {
    const currentHistory = get(history);
    if (currentHistory.past.length === 0) return null;

    const previous = currentHistory.past[currentHistory.past.length - 1];
    const newPast = currentHistory.past.slice(0, -1);

    history.set({
      past: newPast,
      present: previous,
      future: currentHistory.present
        ? [currentHistory.present, ...currentHistory.future]
        : currentHistory.future,
    });

    return previous;
  },

  // Redo to next state
  redo(): StoryData | null {
    const currentHistory = get(history);
    if (currentHistory.future.length === 0) return null;

    const next = currentHistory.future[0];
    const newFuture = currentHistory.future.slice(1);

    history.set({
      past: currentHistory.present
        ? [...currentHistory.past, currentHistory.present]
        : currentHistory.past,
      present: next,
      future: newFuture,
    });

    return next;
  },

  // Clear all history
  clear() {
    history.set(initialState);
  },
};
