/**
 * Change Tracking Store
 * Track changes to the story for undo/redo and version history
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '@writewhisker/core-ts';

export interface ChangeRecord {
  id: string;
  timestamp: number;
  description: string;
  storySnapshot?: any;
  user?: string;
  changeType?: string;
  entityType?: string;
  entityName?: string;
  oldValue?: any;
  newValue?: any;
  getFormattedTime?: () => string;
}

export interface ChangeTrackingState {
  changes: ChangeRecord[];
  currentIndex: number;
  hasUnsavedChanges: boolean;
}

const defaultState: ChangeTrackingState = {
  changes: [],
  currentIndex: -1,
  hasUnsavedChanges: false,
};

function createChangeTrackingStore() {
  const { subscribe, set, update } = writable<ChangeTrackingState>(defaultState);

  return {
    subscribe,
    set,
    update,
    recordChange: (description: string, story?: Story) =>
      update((state) => {
        const change: ChangeRecord = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          description,
          storySnapshot: story ? JSON.parse(JSON.stringify(story)) : undefined,
        };

        // Remove any changes after current index (when undoing then making new changes)
        const changes = state.changes.slice(0, state.currentIndex + 1);
        changes.push(change);

        return {
          changes,
          currentIndex: changes.length - 1,
          hasUnsavedChanges: true,
        };
      }),
    markSaved: () => update((state) => ({ ...state, hasUnsavedChanges: false })),
    clear: () => set(defaultState),
  };
}

export const changeTrackingStore = createChangeTrackingStore();

export const canUndo = derived(
  changeTrackingStore,
  ($tracking) => $tracking.currentIndex > 0
);

export const canRedo = derived(
  changeTrackingStore,
  ($tracking) => $tracking.currentIndex < $tracking.changes.length - 1
);

export const hasUnsavedChanges = derived(
  changeTrackingStore,
  ($tracking) => $tracking.hasUnsavedChanges
);

// Additional exports for compatibility
export const recentChanges = derived(changeTrackingStore, ($tracking) =>
  $tracking.changes.slice(-10)
);

export const isTrackingEnabled = writable(true);

export const changeTrackingActions = {
  recordChange: changeTrackingStore.recordChange,
  markSaved: changeTrackingStore.markSaved,
  clear: changeTrackingStore.clear,
  clearAll: changeTrackingStore.clear,
  setTracking: (enabled: boolean) => {
    // No-op for now
  },
};
