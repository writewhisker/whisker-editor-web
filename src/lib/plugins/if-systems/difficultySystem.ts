import type { EditorPlugin } from '../types';

/**
 * Difficulty System Plugin
 *
 * Dynamic difficulty adjustment with:
 * - Difficulty levels (easy, normal, hard, custom)
 * - Difficulty modifiers for stats/combat/resources
 * - Player performance tracking
 * - Adaptive difficulty adjustment
 * - Difficulty-based rewards
 * - Custom difficulty parameters
 */

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'brutal' | 'custom';

export interface DifficultyModifiers {
  damageTaken: number; // Multiplier for damage player takes
  damageDealt: number; // Multiplier for damage player deals
  resourceGain: number; // Multiplier for resources gained
  enemyHealth: number; // Multiplier for enemy health
  enemyDamage: number; // Multiplier for enemy damage
  xpGain: number; // Multiplier for XP earned
  itemDropRate: number; // Multiplier for item drops
  saveSlots?: number; // Number of save slots available
  permadeath?: boolean; // Enable permadeath
}

export interface PerformanceMetrics {
  deaths: number;
  combatsWon: number;
  combatsLost: number;
  averageHealth: number;
  resourcesCollected: number;
  questsCompleted: number;
  playtime: number;
  lastUpdated: number;
}

export interface DifficultyState {
  currentLevel: DifficultyLevel;
  modifiers: DifficultyModifiers;
  performance: PerformanceMetrics;
  adaptiveEnabled: boolean;
  customModifiers?: Partial<DifficultyModifiers>;
}

const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyModifiers> = {
  easy: {
    damageTaken: 0.7,
    damageDealt: 1.3,
    resourceGain: 1.5,
    enemyHealth: 0.8,
    enemyDamage: 0.7,
    xpGain: 1.2,
    itemDropRate: 1.3,
    saveSlots: 10,
  },
  normal: {
    damageTaken: 1.0,
    damageDealt: 1.0,
    resourceGain: 1.0,
    enemyHealth: 1.0,
    enemyDamage: 1.0,
    xpGain: 1.0,
    itemDropRate: 1.0,
    saveSlots: 5,
  },
  hard: {
    damageTaken: 1.3,
    damageDealt: 0.8,
    resourceGain: 0.7,
    enemyHealth: 1.3,
    enemyDamage: 1.2,
    xpGain: 1.5,
    itemDropRate: 1.2,
    saveSlots: 3,
  },
  brutal: {
    damageTaken: 1.5,
    damageDealt: 0.7,
    resourceGain: 0.5,
    enemyHealth: 1.5,
    enemyDamage: 1.5,
    xpGain: 2.0,
    itemDropRate: 1.5,
    saveSlots: 1,
    permadeath: true,
  },
  custom: {
    damageTaken: 1.0,
    damageDealt: 1.0,
    resourceGain: 1.0,
    enemyHealth: 1.0,
    enemyDamage: 1.0,
    xpGain: 1.0,
    itemDropRate: 1.0,
    saveSlots: 5,
  },
};

export const difficultySystem: EditorPlugin = {
  name: 'difficulty-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Dynamic difficulty adjustment and management system',

  // Difficulty actions
  actions: [
    {
      type: 'difficulty.set',
      label: 'Set Difficulty',
      description: 'Set the current difficulty level',
      execute: async (context, params: { level: DifficultyLevel }) => {
        if (!context.storyState.difficulty) {
          context.storyState.difficulty = {
            currentLevel: 'normal',
            modifiers: DIFFICULTY_PRESETS.normal,
            performance: {
              deaths: 0,
              combatsWon: 0,
              combatsLost: 0,
              averageHealth: 100,
              resourcesCollected: 0,
              questsCompleted: 0,
              playtime: 0,
              lastUpdated: Date.now(),
            },
            adaptiveEnabled: false,
          };
        }

        const difficulty = context.storyState.difficulty;
        difficulty.currentLevel = params.level;
        difficulty.modifiers = { ...DIFFICULTY_PRESETS[params.level] };

        // Apply custom modifiers if they exist and level is custom
        if (params.level === 'custom' && difficulty.customModifiers) {
          Object.assign(difficulty.modifiers, difficulty.customModifiers);
        }

        context.variables.set('difficulty', params.level);
        context.variables.set('difficulty_damage_multiplier', difficulty.modifiers.damageDealt);

        console.log(`[Difficulty] Set to ${params.level}`);
      },
    },
    {
      type: 'difficulty.setCustomModifier',
      label: 'Set Custom Modifier',
      description: 'Set a custom difficulty modifier',
      execute: async (
        context,
        params: { modifier: keyof DifficultyModifiers; value: number | boolean }
      ) => {
        const difficulty = context.storyState.difficulty;
        if (!difficulty) {
          console.warn('[Difficulty] Difficulty system not initialized');
          return;
        }

        if (!difficulty.customModifiers) {
          difficulty.customModifiers = {};
        }

        difficulty.customModifiers[params.modifier] = params.value as any;

        // If currently on custom difficulty, apply immediately
        if (difficulty.currentLevel === 'custom') {
          difficulty.modifiers[params.modifier] = params.value as any;
        }

        console.log(`[Difficulty] Custom modifier ${params.modifier}: ${params.value}`);
      },
    },
    {
      type: 'difficulty.recordPerformance',
      label: 'Record Performance',
      description: 'Record player performance metric',
      execute: async (
        context,
        params: {
          metric: keyof PerformanceMetrics;
          value: number;
          mode?: 'set' | 'increment';
        }
      ) => {
        const difficulty = context.storyState.difficulty;
        if (!difficulty) return;

        const mode = params.mode || 'increment';
        if (mode === 'increment') {
          difficulty.performance[params.metric] = (difficulty.performance[params.metric] as number) + params.value;
        } else {
          difficulty.performance[params.metric] = params.value as any;
        }

        difficulty.performance.lastUpdated = Date.now();

        console.log(`[Difficulty] Performance ${params.metric}: ${params.value}`);
      },
    },
    {
      type: 'difficulty.enableAdaptive',
      label: 'Enable Adaptive Difficulty',
      description: 'Enable/disable adaptive difficulty',
      execute: async (context, params: { enabled: boolean }) => {
        const difficulty = context.storyState.difficulty;
        if (!difficulty) return;

        difficulty.adaptiveEnabled = params.enabled;
        context.variables.set('adaptive_difficulty', params.enabled);

        console.log(`[Difficulty] Adaptive difficulty: ${params.enabled}`);
      },
    },
    {
      type: 'difficulty.adjustAdaptive',
      label: 'Adjust Adaptive Difficulty',
      description: 'Automatically adjust difficulty based on performance',
      execute: async (context) => {
        const difficulty = context.storyState.difficulty;
        if (!difficulty || !difficulty.adaptiveEnabled) return;

        const perf = difficulty.performance;

        // Calculate performance score (0-100)
        const combatWinRate =
          perf.combatsWon + perf.combatsLost > 0
            ? perf.combatsWon / (perf.combatsWon + perf.combatsLost)
            : 0.5;
        const deathPenalty = Math.min(perf.deaths * 10, 30);
        const performanceScore = combatWinRate * 100 - deathPenalty;

        // Adjust difficulty based on performance
        if (performanceScore < 30 && difficulty.currentLevel !== 'easy') {
          // Struggling - make easier
          difficulty.modifiers.damageTaken *= 0.9;
          difficulty.modifiers.damageDealt *= 1.1;
          console.log('[Difficulty] Adaptive: Making easier');
        } else if (performanceScore > 80 && difficulty.currentLevel !== 'brutal') {
          // Doing too well - make harder
          difficulty.modifiers.damageTaken *= 1.1;
          difficulty.modifiers.damageDealt *= 0.9;
          console.log('[Difficulty] Adaptive: Making harder');
        }

        console.log(`[Difficulty] Adaptive adjustment (score: ${performanceScore.toFixed(1)})`);
      },
    },
    {
      type: 'difficulty.getModifier',
      label: 'Get Modifier Value',
      description: 'Get current value of a difficulty modifier',
      execute: async (context, params: { modifier: keyof DifficultyModifiers; varName?: string }) => {
        const difficulty = context.storyState.difficulty;
        if (!difficulty) return;

        const value = difficulty.modifiers[params.modifier];
        const varName = params.varName || `difficulty_${params.modifier}`;
        context.variables.set(varName, value);

        console.log(`[Difficulty] Got modifier ${params.modifier}: ${value}`);
      },
    },
  ],

  // Difficulty conditions
  conditions: [
    {
      type: 'difficulty.level',
      label: 'Difficulty Level',
      description: 'Check current difficulty level',
      evaluate: (context, params: { level: DifficultyLevel }) => {
        return context.storyState.difficulty?.currentLevel === params.level;
      },
    },
    {
      type: 'difficulty.modifierCompare',
      label: 'Compare Modifier',
      description: 'Compare difficulty modifier value',
      evaluate: (
        context,
        params: {
          modifier: keyof DifficultyModifiers;
          operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
          value: number;
        }
      ) => {
        const modValue = context.storyState.difficulty?.modifiers[params.modifier] as number;
        if (modValue === undefined) return false;

        switch (params.operator) {
          case 'gt':
            return modValue > params.value;
          case 'lt':
            return modValue < params.value;
          case 'gte':
            return modValue >= params.value;
          case 'lte':
            return modValue <= params.value;
          case 'eq':
            return modValue === params.value;
          default:
            return false;
        }
      },
    },
    {
      type: 'difficulty.performanceCheck',
      label: 'Performance Check',
      description: 'Check performance metric',
      evaluate: (
        context,
        params: {
          metric: keyof PerformanceMetrics;
          operator: 'gt' | 'lt' | 'gte' | 'lte';
          value: number;
        }
      ) => {
        const metricValue = context.storyState.difficulty?.performance[params.metric] as number;
        if (metricValue === undefined) return false;

        switch (params.operator) {
          case 'gt':
            return metricValue > params.value;
          case 'lt':
            return metricValue < params.value;
          case 'gte':
            return metricValue >= params.value;
          case 'lte':
            return metricValue <= params.value;
          default:
            return false;
        }
      },
    },
    {
      type: 'difficulty.adaptiveEnabled',
      label: 'Adaptive Enabled',
      description: 'Check if adaptive difficulty is enabled',
      evaluate: (context) => {
        return context.storyState.difficulty?.adaptiveEnabled || false;
      },
    },
    {
      type: 'difficulty.permadeath',
      label: 'Permadeath Active',
      description: 'Check if permadeath is enabled',
      evaluate: (context) => {
        return context.storyState.difficulty?.modifiers.permadeath || false;
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.difficulty) {
        context.storyState.difficulty = {
          currentLevel: 'normal',
          modifiers: { ...DIFFICULTY_PRESETS.normal },
          performance: {
            deaths: 0,
            combatsWon: 0,
            combatsLost: 0,
            averageHealth: 100,
            resourcesCollected: 0,
            questsCompleted: 0,
            playtime: 0,
            lastUpdated: Date.now(),
          },
          adaptiveEnabled: false,
        };
      }

      console.log('[Difficulty System] Initialized at normal difficulty');
    },

    onStoryLoad: (context) => {
      const difficulty = context.storyState.difficulty;
      if (difficulty) {
        console.log(
          `[Difficulty System] Story loaded: ${difficulty.currentLevel} (adaptive: ${difficulty.adaptiveEnabled})`
        );
      }
    },
  },

  onRegister: () => {
    console.log('[Difficulty System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Difficulty System] Plugin unregistered');
  },
};
