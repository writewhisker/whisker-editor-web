import type { EditorPlugin } from '../types';

/**
 * Achievement System Plugin
 *
 * Track player accomplishments with:
 * - Achievement definitions with metadata
 * - Unlock conditions and tracking
 * - Progress tracking for incremental achievements
 * - Achievement notifications
 * - Statistics (total unlocked, completion percentage)
 * - Hidden/secret achievements
 * - Categories and tiers
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  hidden?: boolean;
  icon?: string;
  points?: number;
  requirement?: {
    type: 'stat' | 'count' | 'flag' | 'custom';
    target?: string;
    value?: number;
  };
}

export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface AchievementState {
  definitions: Record<string, Achievement>;
  progress: Record<string, AchievementProgress>;
  totalPoints: number;
  recentUnlocks: string[];
}

export const achievementSystem: EditorPlugin = {
  name: 'achievement-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Achievement tracking and unlocking system',

  // Achievement actions
  actions: [
    {
      type: 'achievement.define',
      label: 'Define Achievement',
      description: 'Register a new achievement',
      execute: async (context, params: Achievement) => {
        if (!context.storyState.achievements) {
          context.storyState.achievements = {
            definitions: {},
            progress: {},
            totalPoints: 0,
            recentUnlocks: [],
          };
        }

        const achievements = context.storyState.achievements;
        achievements.definitions[params.id] = { ...params };

        // Initialize progress
        if (!achievements.progress[params.id]) {
          achievements.progress[params.id] = {
            id: params.id,
            unlocked: false,
            progress: 0,
            maxProgress: params.requirement?.value || 1,
          };
        }

        console.log(`[Achievements] Defined achievement: ${params.name}`);
      },
    },
    {
      type: 'achievement.unlock',
      label: 'Unlock Achievement',
      description: 'Unlock a specific achievement',
      execute: async (context, params: { id: string }) => {
        const achievements = context.storyState.achievements;
        if (!achievements?.progress[params.id]) {
          console.warn(`[Achievements] Achievement ${params.id} not found`);
          return;
        }

        const progress = achievements.progress[params.id];
        if (progress.unlocked) {
          console.log(`[Achievements] Achievement ${params.id} already unlocked`);
          return;
        }

        progress.unlocked = true;
        progress.unlockedAt = Date.now();
        progress.progress = progress.maxProgress || 1;

        // Update points
        const achievement = achievements.definitions[params.id];
        if (achievement?.points) {
          achievements.totalPoints += achievement.points;
        }

        // Add to recent unlocks
        achievements.recentUnlocks.unshift(params.id);
        if (achievements.recentUnlocks.length > 5) {
          achievements.recentUnlocks.pop();
        }

        context.variables.set(`achievement_${params.id}`, true);
        context.variables.set('achievement_unlocked', params.id);
        context.variables.set('total_achievement_points', achievements.totalPoints);

        console.log(`[Achievements] Unlocked: ${achievement?.name}`);
      },
    },
    {
      type: 'achievement.progress',
      label: 'Update Achievement Progress',
      description: 'Increment or set achievement progress',
      execute: async (
        context,
        params: { id: string; amount: number; mode?: 'set' | 'increment' }
      ) => {
        const achievements = context.storyState.achievements;
        if (!achievements?.progress[params.id]) {
          console.warn(`[Achievements] Achievement ${params.id} not found`);
          return;
        }

        const progress = achievements.progress[params.id];
        if (progress.unlocked) return;

        const mode = params.mode || 'increment';
        if (mode === 'increment') {
          progress.progress = (progress.progress || 0) + params.amount;
        } else {
          progress.progress = params.amount;
        }

        // Auto-unlock if progress reaches max
        if (progress.progress && progress.maxProgress && progress.progress >= progress.maxProgress) {
          const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
          await unlockAction.execute(context, { id: params.id });
        }

        context.variables.set(`achievement_${params.id}_progress`, progress.progress);

        console.log(
          `[Achievements] Progress ${params.id}: ${progress.progress}/${progress.maxProgress}`
        );
      },
    },
    {
      type: 'achievement.reset',
      label: 'Reset Achievement',
      description: 'Reset achievement progress (for testing)',
      execute: async (context, params: { id: string }) => {
        const achievements = context.storyState.achievements;
        if (!achievements?.progress[params.id]) return;

        const progress = achievements.progress[params.id];
        const achievement = achievements.definitions[params.id];

        // Remove points
        if (progress.unlocked && achievement?.points) {
          achievements.totalPoints -= achievement.points;
        }

        progress.unlocked = false;
        progress.unlockedAt = undefined;
        progress.progress = 0;

        context.variables.set(`achievement_${params.id}`, false);
        context.variables.set('total_achievement_points', achievements.totalPoints);

        console.log(`[Achievements] Reset ${params.id}`);
      },
    },
    {
      type: 'achievement.resetAll',
      label: 'Reset All Achievements',
      description: 'Reset all achievement progress',
      execute: async (context) => {
        const achievements = context.storyState.achievements;
        if (!achievements) return;

        for (const id in achievements.progress) {
          achievements.progress[id] = {
            id,
            unlocked: false,
            progress: 0,
            maxProgress: achievements.progress[id].maxProgress,
          };
          context.variables.set(`achievement_${id}`, false);
        }

        achievements.totalPoints = 0;
        achievements.recentUnlocks = [];
        context.variables.set('total_achievement_points', 0);

        console.log('[Achievements] Reset all achievements');
      },
    },
  ],

  // Achievement conditions
  conditions: [
    {
      type: 'achievement.unlocked',
      label: 'Achievement Unlocked',
      description: 'Check if achievement is unlocked',
      evaluate: (context, params: { id: string }) => {
        return context.storyState.achievements?.progress[params.id]?.unlocked || false;
      },
    },
    {
      type: 'achievement.progress',
      label: 'Achievement Progress',
      description: 'Check achievement progress',
      evaluate: (
        context,
        params: { id: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: number }
      ) => {
        const progress = context.storyState.achievements?.progress[params.id]?.progress || 0;

        switch (params.operator) {
          case 'gt':
            return progress > params.value;
          case 'lt':
            return progress < params.value;
          case 'gte':
            return progress >= params.value;
          case 'lte':
            return progress <= params.value;
          case 'eq':
            return progress === params.value;
          default:
            return false;
        }
      },
    },
    {
      type: 'achievement.categoryComplete',
      label: 'Category Complete',
      description: 'Check if all achievements in category are unlocked',
      evaluate: (context, params: { category: string }) => {
        const achievements = context.storyState.achievements;
        if (!achievements) return false;

        const categoryAchievements = Object.values(achievements.definitions).filter(
          (a: Achievement) => a.category === params.category
        );

        if (categoryAchievements.length === 0) return false;

        return categoryAchievements.every(
          (a: Achievement) => achievements.progress[a.id]?.unlocked === true
        );
      },
    },
    {
      type: 'achievement.completionPercent',
      label: 'Completion Percentage',
      description: 'Check overall completion percentage',
      evaluate: (
        context,
        params: { operator: 'gt' | 'lt' | 'gte' | 'lte'; percent: number }
      ) => {
        const achievements = context.storyState.achievements;
        if (!achievements) return false;

        const total = Object.keys(achievements.definitions).length;
        if (total === 0) return false;

        const unlocked = Object.values(achievements.progress).filter((p: AchievementProgress) => p.unlocked).length;
        const completionPercent = (unlocked / total) * 100;

        switch (params.operator) {
          case 'gt':
            return completionPercent > params.percent;
          case 'lt':
            return completionPercent < params.percent;
          case 'gte':
            return completionPercent >= params.percent;
          case 'lte':
            return completionPercent <= params.percent;
          default:
            return false;
        }
      },
    },
    {
      type: 'achievement.pointsThreshold',
      label: 'Points Threshold',
      description: 'Check if total points meets threshold',
      evaluate: (
        context,
        params: { operator: 'gt' | 'lt' | 'gte' | 'lte'; points: number }
      ) => {
        const totalPoints = context.storyState.achievements?.totalPoints || 0;

        switch (params.operator) {
          case 'gt':
            return totalPoints > params.points;
          case 'lt':
            return totalPoints < params.points;
          case 'gte':
            return totalPoints >= params.points;
          case 'lte':
            return totalPoints <= params.points;
          default:
            return false;
        }
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.achievements) {
        context.storyState.achievements = {
          definitions: {},
          progress: {},
          totalPoints: 0,
          recentUnlocks: [],
        };
      }

      console.log('[Achievement System] Initialized');
    },

    onStoryLoad: (context) => {
      const achievements = context.storyState.achievements;
      if (achievements) {
        const total = Object.keys(achievements.definitions).length;
        const unlocked = Object.values(achievements.progress).filter((p: AchievementProgress) => p.unlocked).length;
        console.log(
          `[Achievement System] Story loaded: ${unlocked}/${total} achievements unlocked`
        );
      }
    },
  },

  onRegister: () => {
    console.log('[Achievement System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Achievement System] Plugin unregistered');
  },
};
