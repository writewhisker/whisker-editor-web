import type { EditorPlugin } from '../types';

/**
 * Save/Load System Plugin
 *
 * Game state persistence with:
 * - Multiple save slots
 * - Auto-save functionality
 * - Save/load/delete operations
 * - Save metadata (timestamp, location, playtime)
 * - Quick save/load
 */

export interface SaveSlot {
  id: string;
  timestamp: number;
  location?: string;
  playtime?: number;
  stats?: Record<string, any>;
  inventory?: any;
  variables?: Record<string, any>;
  data: any; // Full game state
}

export interface SaveSystem {
  slots: Record<string, SaveSlot>;
  autoSave?: SaveSlot;
  quickSave?: SaveSlot;
}

export const saveLoadSystem: EditorPlugin = {
  name: 'saveload-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Game state persistence with multiple save slots',

  // Save actions
  actions: [
    {
      type: 'save.save',
      label: 'Save Game',
      description: 'Save game state to a slot',
      execute: async (context, params: { slotId: string; location?: string }) => {
        if (!context.storyState.saveSystem) {
          context.storyState.saveSystem = { slots: {} };
        }

        // Capture current state
        const saveData: SaveSlot = {
          id: params.slotId,
          timestamp: Date.now(),
          location: params.location || context.currentPassage?.title,
          playtime: context.storyState.playtime || 0,
          stats: context.storyState.stats,
          inventory: context.storyState.inventory,
          variables: Object.fromEntries(context.variables),
          data: JSON.parse(JSON.stringify(context.storyState)), // Deep clone
        };

        context.storyState.saveSystem.slots[params.slotId] = saveData;
        context.variables.set(`save_${params.slotId}_exists`, true);

        console.log(`[Save/Load] Saved game to slot ${params.slotId}`);
      },
    },
    {
      type: 'save.load',
      label: 'Load Game',
      description: 'Load game state from a slot',
      execute: async (context, params: { slotId: string }) => {
        const saveData = context.storyState.saveSystem?.slots[params.slotId];
        if (!saveData) {
          console.warn(`[Save/Load] Save slot ${params.slotId} not found`);
          context.variables.set('load_failed', true);
          return;
        }

        // Restore state
        Object.assign(context.storyState, saveData.data);

        // Restore variables
        if (saveData.variables) {
          for (const [key, value] of Object.entries(saveData.variables)) {
            context.variables.set(key, value);
          }
        }

        context.variables.set('load_success', true);
        context.variables.set('loaded_from_slot', params.slotId);

        console.log(`[Save/Load] Loaded game from slot ${params.slotId}`);
      },
    },
    {
      type: 'save.delete',
      label: 'Delete Save',
      description: 'Delete a save slot',
      execute: async (context, params: { slotId: string }) => {
        if (context.storyState.saveSystem?.slots[params.slotId]) {
          delete context.storyState.saveSystem.slots[params.slotId];
          context.variables.set(`save_${params.slotId}_exists`, false);

          console.log(`[Save/Load] Deleted save slot ${params.slotId}`);
        }
      },
    },
    {
      type: 'save.autoSave',
      label: 'Auto Save',
      description: 'Save to auto-save slot',
      execute: async (context, params: { location?: string }) => {
        if (!context.storyState.saveSystem) {
          context.storyState.saveSystem = { slots: {} };
        }

        const saveData: SaveSlot = {
          id: 'autosave',
          timestamp: Date.now(),
          location: params.location || context.currentPassage?.title,
          playtime: context.storyState.playtime || 0,
          stats: context.storyState.stats,
          inventory: context.storyState.inventory,
          variables: Object.fromEntries(context.variables),
          data: JSON.parse(JSON.stringify(context.storyState)),
        };

        context.storyState.saveSystem.autoSave = saveData;
        context.variables.set('autosave_exists', true);

        console.log('[Save/Load] Auto-saved game');
      },
    },
    {
      type: 'save.quickSave',
      label: 'Quick Save',
      description: 'Save to quick save slot',
      execute: async (context, params: { location?: string }) => {
        if (!context.storyState.saveSystem) {
          context.storyState.saveSystem = { slots: {} };
        }

        const saveData: SaveSlot = {
          id: 'quicksave',
          timestamp: Date.now(),
          location: params.location || context.currentPassage?.title,
          playtime: context.storyState.playtime || 0,
          stats: context.storyState.stats,
          inventory: context.storyState.inventory,
          variables: Object.fromEntries(context.variables),
          data: JSON.parse(JSON.stringify(context.storyState)),
        };

        context.storyState.saveSystem.quickSave = saveData;
        context.variables.set('quicksave_exists', true);

        console.log('[Save/Load] Quick-saved game');
      },
    },
    {
      type: 'save.quickLoad',
      label: 'Quick Load',
      description: 'Load from quick save slot',
      execute: async (context) => {
        const saveData = context.storyState.saveSystem?.quickSave;
        if (!saveData) {
          console.warn('[Save/Load] Quick save not found');
          context.variables.set('load_failed', true);
          return;
        }

        Object.assign(context.storyState, saveData.data);

        if (saveData.variables) {
          for (const [key, value] of Object.entries(saveData.variables)) {
            context.variables.set(key, value);
          }
        }

        context.variables.set('load_success', true);

        console.log('[Save/Load] Quick-loaded game');
      },
    },
  ],

  // Save conditions
  conditions: [
    {
      type: 'save.exists',
      label: 'Save Exists',
      description: 'Check if a save slot exists',
      evaluate: (context, params: { slotId: string }) => {
        return !!context.storyState.saveSystem?.slots[params.slotId];
      },
    },
    {
      type: 'save.autoSaveExists',
      label: 'Auto Save Exists',
      description: 'Check if auto-save exists',
      evaluate: (context) => {
        return !!context.storyState.saveSystem?.autoSave;
      },
    },
    {
      type: 'save.quickSaveExists',
      label: 'Quick Save Exists',
      description: 'Check if quick save exists',
      evaluate: (context) => {
        return !!context.storyState.saveSystem?.quickSave;
      },
    },
    {
      type: 'save.hasSaves',
      label: 'Has Any Saves',
      description: 'Check if any saves exist',
      evaluate: (context) => {
        const slots = context.storyState.saveSystem?.slots || {};
        return Object.keys(slots).length > 0;
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.saveSystem) {
        context.storyState.saveSystem = {
          slots: {},
        };
      }

      if (!context.storyState.playtime) {
        context.storyState.playtime = 0;
      }

      console.log('[Save/Load System] Initialized');
    },

    onPassageEnter: (passage, context) => {
      // Increment playtime (assuming each passage = 1 minute)
      if (context.storyState.playtime !== undefined) {
        context.storyState.playtime += 1;
        context.variables.set('playtime', context.storyState.playtime);
      }
    },
  },

  onRegister: () => {
    console.log('[Save/Load System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Save/Load System] Plugin unregistered');
  },
};
