/**
 * Achievement System Store
 *
 * Manages achievements/trophies for interactive fiction:
 * - Achievement definition and management
 * - Trigger conditions (passage visit, variable value, choice made)
 * - Rarity tiers and point values
 * - Progress tracking
 * - Code generation for achievement unlocking
 */

import { writable, derived } from 'svelte/store';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type TriggerType = 'passage_visit' | 'variable_value' | 'choice_made' | 'passage_count' | 'ending_reached';

export interface AchievementTrigger {
  type: TriggerType;
  passageId?: string;
  variableName?: string;
  variableValue?: any;
  variableCondition?: 'equals' | 'greater' | 'less' | 'contains';
  choiceId?: string;
  count?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  points: number;
  hidden: boolean; // Hidden until unlocked
  trigger: AchievementTrigger;
  category?: string;
}

export interface AchievementStoreState {
  achievements: Achievement[];
  categories: string[];
}

const DEFAULT_STATE: AchievementStoreState = {
  achievements: [],
  categories: ['Story', 'Exploration', 'Secrets', 'Completion'],
};

// Rarity point values
const RARITY_POINTS: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

// Generate achievement tracking code
function generateAchievementCode(achievements: Achievement[]): {
  types: string;
  checkFunction: string;
  unlockFunction: string;
  storageCode: string;
} {
  const types = `
export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export interface AchievementProgress {
  unlocked: UnlockedAchievement[];
  totalPoints: number;
}
`.trim();

  const checkFunction = `
/**
 * Check and unlock achievements based on game state
 */
export function checkAchievements(gameState: {
  currentPassageId: string;
  variables: Record<string, any>;
  lastChoiceId?: string;
  passagesVisited: string[];
  endingId?: string;
}): string[] {
  const newlyUnlocked: string[] = [];
  const progress = loadAchievementProgress();

${achievements.map(ach => {
  const alreadyUnlocked = `progress.unlocked.some(u => u.id === '${ach.id}')`;

  let condition = '';
  switch (ach.trigger.type) {
    case 'passage_visit':
      condition = `gameState.currentPassageId === '${ach.trigger.passageId}'`;
      break;
    case 'variable_value':
      const varCond = ach.trigger.variableCondition || 'equals';
      const value = JSON.stringify(ach.trigger.variableValue);
      if (varCond === 'equals') {
        condition = `gameState.variables['${ach.trigger.variableName}'] === ${value}`;
      } else if (varCond === 'greater') {
        condition = `gameState.variables['${ach.trigger.variableName}'] > ${value}`;
      } else if (varCond === 'less') {
        condition = `gameState.variables['${ach.trigger.variableName}'] < ${value}`;
      } else if (varCond === 'contains') {
        condition = `gameState.variables['${ach.trigger.variableName}']?.includes(${value})`;
      }
      break;
    case 'choice_made':
      condition = `gameState.lastChoiceId === '${ach.trigger.choiceId}'`;
      break;
    case 'passage_count':
      condition = `gameState.passagesVisited.length >= ${ach.trigger.count}`;
      break;
    case 'ending_reached':
      condition = `gameState.endingId === '${ach.trigger.passageId}'`;
      break;
  }

  return `
  // ${ach.title}
  if (!${alreadyUnlocked} && ${condition}) {
    unlockAchievement('${ach.id}');
    newlyUnlocked.push('${ach.id}');
  }`;
}).join('\n')}

  return newlyUnlocked;
}
`.trim();

  const unlockFunction = `
/**
 * Unlock an achievement
 */
function unlockAchievement(achievementId: string): void {
  const progress = loadAchievementProgress();

  if (progress.unlocked.some(u => u.id === achievementId)) {
    return; // Already unlocked
  }

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return;

  progress.unlocked.push({
    id: achievementId,
    unlockedAt: new Date().toISOString(),
  });

  progress.totalPoints += achievement.points;

  saveAchievementProgress(progress);

  // Show achievement notification
  showAchievementNotification(achievement);
}

/**
 * Show achievement notification (implement based on your UI framework)
 */
function showAchievementNotification(achievement: any): void {
  console.log(\`Achievement Unlocked: \${achievement.title}\`);
  // TODO: Show UI notification
}
`.trim();

  const storageCode = `
// Achievement definitions
const ACHIEVEMENTS = ${JSON.stringify(achievements.map(a => ({
  id: a.id,
  title: a.title,
  description: a.description,
  icon: a.icon,
  rarity: a.rarity,
  points: a.points,
  hidden: a.hidden,
  category: a.category,
})), null, 2)};

/**
 * Load achievement progress from storage
 */
function loadAchievementProgress(): AchievementProgress {
  const saved = localStorage.getItem('achievement_progress');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load achievement progress:', e);
    }
  }
  return { unlocked: [], totalPoints: 0 };
}

/**
 * Save achievement progress to storage
 */
function saveAchievementProgress(progress: AchievementProgress): void {
  localStorage.setItem('achievement_progress', JSON.stringify(progress));
}

/**
 * Get all achievements
 */
export function getAchievements(): typeof ACHIEVEMENTS {
  return ACHIEVEMENTS;
}

/**
 * Get unlocked achievements
 */
export function getUnlockedAchievements(): UnlockedAchievement[] {
  return loadAchievementProgress().unlocked;
}

/**
 * Get achievement progress stats
 */
export function getAchievementStats(): {
  unlockedCount: number;
  totalCount: number;
  totalPoints: number;
  maxPoints: number;
  completionRate: number;
} {
  const progress = loadAchievementProgress();
  const maxPoints = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);

  return {
    unlockedCount: progress.unlocked.length,
    totalCount: ACHIEVEMENTS.length,
    totalPoints: progress.totalPoints,
    maxPoints,
    completionRate: (progress.unlocked.length / ACHIEVEMENTS.length) * 100,
  };
}
`.trim();

  return { types, checkFunction, unlockFunction, storageCode };
}

// Create achievement store
const createAchievementStore = () => {
  const { subscribe, set, update } = writable<AchievementStoreState>(DEFAULT_STATE);

  return {
    subscribe,

    /**
     * Add achievement
     */
    addAchievement: (achievement: Omit<Achievement, 'id'>) => {
      const id = `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      update(state => ({
        ...state,
        achievements: [...state.achievements, { ...achievement, id }],
      }));
    },

    /**
     * Update achievement
     */
    updateAchievement: (id: string, updates: Partial<Achievement>) => {
      update(state => ({
        ...state,
        achievements: state.achievements.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
      }));
    },

    /**
     * Delete achievement
     */
    deleteAchievement: (id: string) => {
      update(state => ({
        ...state,
        achievements: state.achievements.filter(a => a.id !== id),
      }));
    },

    /**
     * Add category
     */
    addCategory: (category: string) => {
      update(state => ({
        ...state,
        categories: [...state.categories, category],
      }));
    },

    /**
     * Generate code
     */
    generateCode: (): ReturnType<typeof generateAchievementCode> => {
      let achievements: Achievement[] = [];
      const unsubscribe = subscribe(state => { achievements = state.achievements; });
      unsubscribe();
      return generateAchievementCode(achievements);
    },

    /**
     * Get rarity points
     */
    getRarityPoints: (rarity: AchievementRarity): number => {
      return RARITY_POINTS[rarity];
    },
  };
};

export const achievementStore = createAchievementStore();

// Derived stores
export const achievements = derived(achievementStore, $store => $store.achievements);
export const categories = derived(achievementStore, $store => $store.categories);
export const achievementCount = derived(achievements, $achievements => $achievements.length);
export const totalPoints = derived(achievements, $achievements =>
  $achievements.reduce((sum, a) => sum + a.points, 0)
);
