import type { EditorPlugin } from '../types';

/**
 * Example Plugin: Custom Actions & Conditions
 *
 * Demonstrates how to add custom actions and conditions to the editor
 */
export const customActionsPlugin: EditorPlugin = {
  name: 'custom-actions',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Adds custom actions and conditions for interactive stories',

  actions: [
    {
      type: 'give-item',
      label: 'Give Item',
      description: 'Give an item to the player',
      execute: async (context, params: { itemId: string; itemName: string }) => {
        console.log(`[Action] Giving item: ${params.itemName} (${params.itemId})`);

        // Add to story state
        if (!context.storyState.inventory) {
          context.storyState.inventory = [];
        }
        context.storyState.inventory.push(params.itemId);

        // Set variable
        context.variables.set(`has_${params.itemId}`, true);

        console.log('[Action] Item given successfully');
      },
    },
    {
      type: 'remove-item',
      label: 'Remove Item',
      description: 'Remove an item from the player',
      execute: async (context, params: { itemId: string }) => {
        console.log(`[Action] Removing item: ${params.itemId}`);

        if (context.storyState.inventory) {
          const index = context.storyState.inventory.indexOf(params.itemId);
          if (index > -1) {
            context.storyState.inventory.splice(index, 1);
          }
        }

        context.variables.set(`has_${params.itemId}`, false);

        console.log('[Action] Item removed successfully');
      },
    },
    {
      type: 'modify-stat',
      label: 'Modify Stat',
      description: 'Modify a player stat',
      execute: async (context, params: { stat: string; amount: number }) => {
        console.log(`[Action] Modifying stat: ${params.stat} by ${params.amount}`);

        const currentValue = context.variables.get(params.stat) || 0;
        const newValue = currentValue + params.amount;

        context.variables.set(params.stat, newValue);

        console.log(`[Action] Stat modified: ${params.stat} = ${newValue}`);
      },
    },
    {
      type: 'set-flag',
      label: 'Set Flag',
      description: 'Set a story flag',
      execute: async (context, params: { flag: string; value: boolean }) => {
        console.log(`[Action] Setting flag: ${params.flag} = ${params.value}`);
        context.variables.set(params.flag, params.value);
      },
    },
  ],

  conditions: [
    {
      type: 'has-item',
      label: 'Has Item',
      description: 'Check if player has an item',
      evaluate: (context, params: { itemId: string }) => {
        const inventory = context.storyState.inventory || [];
        return inventory.includes(params.itemId);
      },
    },
    {
      type: 'stat-compare',
      label: 'Compare Stat',
      description: 'Compare a stat to a value',
      evaluate: (
        context,
        params: { stat: string; operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'; value: number }
      ) => {
        const statValue = context.variables.get(params.stat) || 0;

        switch (params.operator) {
          case 'gt':
            return statValue > params.value;
          case 'lt':
            return statValue < params.value;
          case 'eq':
            return statValue === params.value;
          case 'gte':
            return statValue >= params.value;
          case 'lte':
            return statValue <= params.value;
          default:
            return false;
        }
      },
    },
    {
      type: 'flag-is-set',
      label: 'Flag Is Set',
      description: 'Check if a flag is set to true',
      evaluate: (context, params: { flag: string }) => {
        return context.variables.get(params.flag) === true;
      },
    },
    {
      type: 'visited-passage',
      label: 'Visited Passage',
      description: 'Check if a passage has been visited',
      evaluate: (context, params: { passageId: string }) => {
        return context.history.includes(params.passageId);
      },
    },
  ],

  onRegister: () => {
    console.log('Custom Actions & Conditions plugin registered');
  },

  onUnregister: () => {
    console.log('Custom Actions & Conditions plugin unregistered');
  },
};
