import type { EditorPlugin } from '../types';

/**
 * Stats/Attributes System Plugin
 *
 * Provides comprehensive character statistics management:
 * - Numeric stats (health, mana, strength, etc.)
 * - Stat modification (add, subtract, set, multiply)
 * - Min/max bounds
 * - Stat regeneration over time
 * - Stat modifiers (buffs/debuffs)
 * - Derived stats (calculated from base stats)
 */

export interface Stat {
  name: string;
  value: number;
  min: number;
  max: number;
  regenRate?: number; // Per turn/tick
  baseValue?: number; // For calculating with modifiers
}

export interface StatModifier {
  id: string;
  stat: string;
  type: 'add' | 'multiply' | 'set';
  value: number;
  duration?: number; // -1 for permanent
  source?: string;
}

export interface StatsState {
  stats: Record<string, Stat>;
  modifiers: StatModifier[];
  lastUpdate?: number;
}

export const statsSystem: EditorPlugin = {
  name: 'stats-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Comprehensive character statistics and attributes system',

  // Stats actions
  actions: [
    {
      type: 'stats.set',
      label: 'Set Stat Value',
      description: 'Set a stat to a specific value',
      execute: async (context, params: { stat: string; value: number }) => {
        if (!context.storyState.stats) {
          context.storyState.stats = { stats: {}, modifiers: [] };
        }

        const stats = context.storyState.stats;

        if (!stats.stats[params.stat]) {
          stats.stats[params.stat] = {
            name: params.stat,
            value: params.value,
            min: 0,
            max: 100,
          };
        } else {
          const stat = stats.stats[params.stat];
          stat.value = Math.max(stat.min, Math.min(stat.max, params.value));
        }

        context.variables.set(params.stat, stats.stats[params.stat].value);
        console.log(`[Stats] Set ${params.stat} to ${stats.stats[params.stat].value}`);
      },
    },
    {
      type: 'stats.modify',
      label: 'Modify Stat',
      description: 'Add or subtract from a stat',
      execute: async (context, params: { stat: string; amount: number }) => {
        if (!context.storyState.stats?.stats[params.stat]) {
          console.warn(`[Stats] Stat ${params.stat} not found`);
          return;
        }

        const stat = context.storyState.stats.stats[params.stat];
        const newValue = Math.max(stat.min, Math.min(stat.max, stat.value + params.amount));
        const actualChange = newValue - stat.value;

        stat.value = newValue;
        context.variables.set(params.stat, newValue);

        console.log(`[Stats] Modified ${params.stat} by ${actualChange} (${stat.value})`);

        // Check for death/critical conditions
        if (params.stat === 'health' && newValue <= 0) {
          context.variables.set('is_dead', true);
        }
      },
    },
    {
      type: 'stats.create',
      label: 'Create Stat',
      description: 'Create a new stat with configuration',
      execute: async (
        context,
        params: {
          name: string;
          value: number;
          min?: number;
          max?: number;
          regenRate?: number;
        }
      ) => {
        if (!context.storyState.stats) {
          context.storyState.stats = { stats: {}, modifiers: [] };
        }

        context.storyState.stats.stats[params.name] = {
          name: params.name,
          value: params.value,
          min: params.min ?? 0,
          max: params.max ?? 100,
          regenRate: params.regenRate,
          baseValue: params.value,
        };

        context.variables.set(params.name, params.value);
        console.log(`[Stats] Created stat ${params.name}`);
      },
    },
    {
      type: 'stats.addModifier',
      label: 'Add Stat Modifier',
      description: 'Add a temporary or permanent modifier to a stat',
      execute: async (
        context,
        params: {
          id: string;
          stat: string;
          type: 'add' | 'multiply' | 'set';
          value: number;
          duration?: number;
          source?: string;
        }
      ) => {
        if (!context.storyState.stats) {
          context.storyState.stats = { stats: {}, modifiers: [] };
        }

        const modifier: StatModifier = {
          id: params.id,
          stat: params.stat,
          type: params.type,
          value: params.value,
          duration: params.duration ?? -1,
          source: params.source,
        };

        context.storyState.stats.modifiers.push(modifier);
        context.variables.set(`modifier_${params.id}`, true);

        console.log(`[Stats] Added modifier ${params.id} to ${params.stat}`);
      },
    },
    {
      type: 'stats.removeModifier',
      label: 'Remove Stat Modifier',
      description: 'Remove a modifier by ID',
      execute: async (context, params: { id: string }) => {
        if (!context.storyState.stats) return;

        const index = context.storyState.stats.modifiers.findIndex(m => m.id === params.id);
        if (index > -1) {
          context.storyState.stats.modifiers.splice(index, 1);
          context.variables.set(`modifier_${params.id}`, false);
          console.log(`[Stats] Removed modifier ${params.id}`);
        }
      },
    },
    {
      type: 'stats.regenerate',
      label: 'Regenerate Stats',
      description: 'Apply regeneration to all stats with regenRate',
      execute: async (context) => {
        if (!context.storyState.stats) return;

        const stats = context.storyState.stats.stats;
        for (const statName in stats) {
          const stat = stats[statName];
          if (stat.regenRate) {
            const newValue = Math.max(stat.min, Math.min(stat.max, stat.value + stat.regenRate));
            stat.value = newValue;
            context.variables.set(statName, newValue);
          }
        }

        console.log('[Stats] Applied regeneration');
      },
    },
    {
      type: 'stats.reset',
      label: 'Reset Stat',
      description: 'Reset stat to base value',
      execute: async (context, params: { stat: string }) => {
        if (!context.storyState.stats?.stats[params.stat]) return;

        const stat = context.storyState.stats.stats[params.stat];
        if (stat.baseValue !== undefined) {
          stat.value = stat.baseValue;
          context.variables.set(params.stat, stat.baseValue);
          console.log(`[Stats] Reset ${params.stat} to ${stat.baseValue}`);
        }
      },
    },
  ],

  // Stats conditions
  conditions: [
    {
      type: 'stats.compare',
      label: 'Compare Stat',
      description: 'Compare a stat to a value',
      evaluate: (
        context,
        params: { stat: string; operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'; value: number }
      ) => {
        const statValue = context.storyState.stats?.stats[params.stat]?.value ?? 0;

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
      type: 'stats.inRange',
      label: 'Stat In Range',
      description: 'Check if stat is within a range',
      evaluate: (context, params: { stat: string; min: number; max: number }) => {
        const statValue = context.storyState.stats?.stats[params.stat]?.value ?? 0;
        return statValue >= params.min && statValue <= params.max;
      },
    },
    {
      type: 'stats.hasModifier',
      label: 'Has Modifier',
      description: 'Check if a stat has a specific modifier',
      evaluate: (context, params: { id: string }) => {
        return (
          context.storyState.stats?.modifiers.some(m => m.id === params.id) ?? false
        );
      },
    },
    {
      type: 'stats.atMax',
      label: 'Stat At Max',
      description: 'Check if stat is at maximum value',
      evaluate: (context, params: { stat: string }) => {
        const stat = context.storyState.stats?.stats[params.stat];
        return stat ? stat.value === stat.max : false;
      },
    },
    {
      type: 'stats.atMin',
      label: 'Stat At Min',
      description: 'Check if stat is at minimum value',
      evaluate: (context, params: { stat: string }) => {
        const stat = context.storyState.stats?.stats[params.stat];
        return stat ? stat.value === stat.min : false;
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.stats) {
        context.storyState.stats = {
          stats: {},
          modifiers: [],
          lastUpdate: Date.now(),
        };

        // Create default stats
        const defaults = {
          health: { value: 100, min: 0, max: 100, regenRate: 1 },
          mana: { value: 50, min: 0, max: 100, regenRate: 2 },
          stamina: { value: 100, min: 0, max: 100, regenRate: 5 },
        };

        for (const [name, config] of Object.entries(defaults)) {
          context.storyState.stats.stats[name] = {
            name,
            ...config,
            baseValue: config.value,
          };
          context.variables.set(name, config.value);
        }
      }

      console.log('[Stats System] Initialized with default stats');
    },

    onStoryLoad: (context) => {
      console.log('[Stats System] Story loaded', {
        statCount: Object.keys(context.storyState.stats?.stats || {}).length,
        modifierCount: context.storyState.stats?.modifiers.length || 0,
      });
    },

    onPassageEnter: (passage, context) => {
      // Update modifier durations
      if (context.storyState.stats?.modifiers) {
        const modifiers = context.storyState.stats.modifiers;
        for (let i = modifiers.length - 1; i >= 0; i--) {
          const modifier = modifiers[i];
          if (modifier.duration !== undefined && modifier.duration > 0) {
            modifier.duration--;
            if (modifier.duration === 0) {
              modifiers.splice(i, 1);
              context.variables.set(`modifier_${modifier.id}`, false);
              console.log(`[Stats] Modifier ${modifier.id} expired`);
            }
          }
        }
      }
    },
  },

  onRegister: () => {
    console.log('[Stats System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Stats System] Plugin unregistered');
  },
};
