import { writable, derived, get } from 'svelte/store';
import { currentStory } from './projectStore';
import type { Passage } from '@writewhisker/core-ts';

export type SortOrder = 'custom' | 'title-asc' | 'title-desc' | 'modified' | 'created';

interface PassageOrderState {
  sortOrder: SortOrder;
  customOrder: string[]; // Array of passage IDs in custom order
}

// Load initial state from story settings or localStorage
function loadInitialState(): PassageOrderState {
  const story = get(currentStory);

  if (story) {
    // Try to load from story settings first
    const savedOrder = story.getSetting('passageOrder.sortOrder') as SortOrder;
    const savedCustomOrder = story.getSetting('passageOrder.customOrder') as string[];

    if (savedOrder && savedCustomOrder) {
      return {
        sortOrder: savedOrder,
        customOrder: savedCustomOrder
      };
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('passageOrder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // Default state
  return {
    sortOrder: 'custom',
    customOrder: []
  };
}

// Create the store
export const passageOrderState = writable<PassageOrderState>(loadInitialState());

// Save to both story settings and localStorage
function saveState(state: PassageOrderState) {
  const story = get(currentStory);

  if (story) {
    story.setSetting('passageOrder.sortOrder', state.sortOrder);
    story.setSetting('passageOrder.customOrder', state.customOrder);
    story.updateModified();
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('passageOrder', JSON.stringify(state));
  }
}

// Actions
export const passageOrderActions = {
  setSortOrder(order: SortOrder) {
    passageOrderState.update(state => {
      const newState = { ...state, sortOrder: order };
      saveState(newState);
      return newState;
    });
  },

  setCustomOrder(passageIds: string[]) {
    passageOrderState.update(state => {
      const newState = { ...state, customOrder: passageIds };
      saveState(newState);
      return newState;
    });
  },

  movePassage(fromIndex: number, toIndex: number, passages: Passage[]) {
    passageOrderState.update(state => {
      // Get current custom order, or create one from current passages
      let customOrder = state.customOrder.length > 0
        ? [...state.customOrder]
        : passages.map(p => p.id);

      // Remove any IDs that no longer exist
      const validIds = new Set(passages.map(p => p.id));
      customOrder = customOrder.filter(id => validIds.has(id));

      // Add any new passages that aren't in the order yet
      passages.forEach(p => {
        if (!customOrder.includes(p.id)) {
          customOrder.push(p.id);
        }
      });

      // Move the passage
      const [removed] = customOrder.splice(fromIndex, 1);
      customOrder.splice(toIndex, 0, removed);

      const newState = {
        ...state,
        customOrder,
        sortOrder: 'custom' as SortOrder // Switch to custom order when dragging
      };
      saveState(newState);
      return newState;
    });
  },

  initializeCustomOrder(passages: Passage[]) {
    passageOrderState.update(state => {
      // Only initialize if we don't have a custom order yet
      if (state.customOrder.length === 0) {
        const newState = {
          ...state,
          customOrder: passages.map(p => p.id)
        };
        saveState(newState);
        return newState;
      }
      return state;
    });
  },

  // Reload from story settings when story changes
  reloadFromStory() {
    const story = get(currentStory);
    if (story) {
      const savedOrder = story.getSetting('passageOrder.sortOrder') as SortOrder;
      const savedCustomOrder = story.getSetting('passageOrder.customOrder') as string[];

      if (savedOrder || savedCustomOrder) {
        passageOrderState.set({
          sortOrder: savedOrder || 'custom',
          customOrder: savedCustomOrder || []
        });
        return;
      }
    }

    // If no saved order in story, use default
    passageOrderState.set({
      sortOrder: 'custom',
      customOrder: []
    });
  }
};

// Helper function to sort passages based on the current sort order
export function sortPassages(passages: Passage[], state: PassageOrderState): Passage[] {
  switch (state.sortOrder) {
    case 'custom':
      return sortByCustomOrder(passages, state.customOrder);
    case 'title-asc':
      return [...passages].sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return [...passages].sort((a, b) => b.title.localeCompare(a.title));
    case 'modified':
      return [...passages].sort((a, b) => {
        const aTime = new Date(a.modified || 0).getTime();
        const bTime = new Date(b.modified || 0).getTime();
        return bTime - aTime; // Most recent first
      });
    case 'created':
      return [...passages].sort((a, b) => {
        const aTime = new Date(a.created || 0).getTime();
        const bTime = new Date(b.created || 0).getTime();
        return aTime - bTime; // Oldest first
      });
    default:
      return passages;
  }
}

function sortByCustomOrder(passages: Passage[], customOrder: string[]): Passage[] {
  if (customOrder.length === 0) {
    return passages;
  }

  // Create a map of passage ID to passage
  const passageMap = new Map(passages.map(p => [p.id, p]));

  // Build the sorted array based on custom order
  const sorted: Passage[] = [];
  const usedIds = new Set<string>();

  // First, add passages in custom order
  customOrder.forEach(id => {
    const passage = passageMap.get(id);
    if (passage) {
      sorted.push(passage);
      usedIds.add(id);
    }
  });

  // Then add any new passages that aren't in the custom order yet
  passages.forEach(passage => {
    if (!usedIds.has(passage.id)) {
      sorted.push(passage);
    }
  });

  return sorted;
}

// Derived store for sorted passages
export const sortedPassageList = derived(
  [passageOrderState],
  ([$state]) => {
    return (passages: Passage[]) => sortPassages(passages, $state);
  }
);
