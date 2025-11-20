/**
 * Macro Integration
 *
 * Provides helper functions and macro definitions for integrating game systems
 * with the @writewhisker/macros package.
 *
 * This allows game systems to be used directly in template strings:
 * - {{inventory.has "health_potion"}}
 * - {{stats.get "health"}}
 * - {{quest.progress "main_quest"}}
 */

import type { InventorySystem } from './InventorySystem';
import type { StatsSystem } from './StatsSystem';
import type { QuestSystem } from './QuestSystem';
import type { AchievementSystem } from './AchievementSystem';

/**
 * Game systems container for macro context
 */
export interface GameSystemsContext {
  inventory?: InventorySystem;
  stats?: StatsSystem;
  quests?: QuestSystem;
  achievements?: AchievementSystem;
}

/**
 * Create macro helper functions for game systems
 * These functions can be registered in the macro context.functions map
 */
export function createGameSystemMacros(systems: GameSystemsContext) {
  const macros: Record<string, (...args: any[]) => any> = {};

  // Inventory macros
  if (systems.inventory) {
    const inv = systems.inventory;

    macros['inventory.has'] = (itemName: string, quantity?: number) => {
      return inv.hasItemByName(itemName, quantity);
    };

    macros['inventory.count'] = (itemName: string) => {
      const item = inv.findItemByName(itemName);
      return item?.quantity || 0;
    };

    macros['inventory.get'] = (itemName: string) => {
      return inv.findItemByName(itemName);
    };

    macros['inventory.list'] = (category?: string) => {
      return category ? inv.getItemsByCategory(category) : inv.getItems();
    };

    macros['inventory.totalValue'] = () => {
      return inv.getTotalValue();
    };

    macros['inventory.isFull'] = () => {
      return inv.isFull();
    };
  }

  // Stats macros
  if (systems.stats) {
    const stats = systems.stats;

    macros['stats.get'] = (statName: string) => {
      return stats.getStat(statName);
    };

    macros['stats.has'] = (statName: string) => {
      return stats.hasStat(statName);
    };

    macros['stats.compare'] = (statName: string, operator: '>' | '>=' | '<' | '<=' | '==' | '!=', value: number) => {
      return stats.compare(statName, operator, value);
    };

    macros['stats.max'] = (statName: string) => {
      const stat = stats.getStatObject(statName);
      return stat?.maxValue;
    };

    macros['stats.min'] = (statName: string) => {
      const stat = stats.getStatObject(statName);
      return stat?.minValue;
    };

    macros['stats.percent'] = (statName: string) => {
      const stat = stats.getStatObject(statName);
      if (!stat || !stat.maxValue) {
        return 0;
      }
      return (stats.getStat(statName) / stat.maxValue) * 100;
    };
  }

  // Quest macros
  if (systems.quests) {
    const quests = systems.quests;

    macros['quest.get'] = (questId: string) => {
      return quests.getQuest(questId);
    };

    macros['quest.progress'] = (questId: string) => {
      return quests.getQuestProgress(questId);
    };

    macros['quest.isCompleted'] = (questId: string) => {
      return quests.isQuestCompleted(questId);
    };

    macros['quest.list'] = (status?: 'available' | 'active' | 'completed' | 'failed') => {
      return status ? quests.getQuestsByStatus(status) : quests.getAllQuests();
    };

    macros['quest.active'] = () => {
      return quests.getQuestsByStatus('active');
    };

    macros['quest.available'] = () => {
      return quests.getQuestsByStatus('available');
    };
  }

  // Achievement macros
  if (systems.achievements) {
    const achievements = systems.achievements;

    macros['achievement.get'] = (achievementId: string) => {
      return achievements.getAchievement(achievementId);
    };

    macros['achievement.isUnlocked'] = (achievementId: string) => {
      return achievements.isUnlocked(achievementId);
    };

    macros['achievement.list'] = (category?: string) => {
      return category ? achievements.getAchievementsByCategory(category) : achievements.getAllAchievements();
    };

    macros['achievement.unlocked'] = () => {
      return achievements.getUnlockedAchievements();
    };

    macros['achievement.progress'] = (achievementId: string) => {
      const achievement = achievements.getAchievement(achievementId);
      if (!achievement || !achievement.target) {
        return 0;
      }
      return (achievement.progress || 0) / achievement.target;
    };

    macros['achievement.totalPoints'] = () => {
      return achievements.getTotalPoints();
    };
  }

  return macros;
}

/**
 * Register game system macros with a macro context
 *
 * Example usage:
 * ```typescript
 * import { MacroProcessor } from '@writewhisker/macros';
 * import { InventorySystem, StatsSystem } from '@writewhisker/game-systems';
 *
 * const inventory = new InventorySystem();
 * const stats = new StatsSystem();
 *
 * const context = {
 *   variables: new Map(),
 *   functions: new Map(),
 *   customMacros: new Map(),
 * };
 *
 * // Register game system macros
 * registerGameSystemMacros(context, { inventory, stats });
 *
 * // Now you can use them in templates
 * const template = '{{if call(stats.get, "health") > 50}}Healthy{{end}}';
 * const result = await processor.process(template, context);
 * ```
 */
export function registerGameSystemMacros(
  context: { functions: Map<string, (...args: any[]) => any> },
  systems: GameSystemsContext
): void {
  const macros = createGameSystemMacros(systems);

  for (const [name, fn] of Object.entries(macros)) {
    context.functions.set(name, fn);
  }
}

/**
 * Create a complete game systems state object for saving/loading
 */
export function exportGameSystems(systems: GameSystemsContext) {
  return {
    inventory: systems.inventory?.export(),
    stats: systems.stats?.export(),
    quests: systems.quests?.export(),
    achievements: systems.achievements?.export(),
    timestamp: Date.now(),
  };
}

/**
 * Import game systems state
 */
export function importGameSystems(
  systems: GameSystemsContext,
  data: {
    inventory?: any[];
    stats?: any;
    quests?: any[];
    achievements?: any[];
  }
): void {
  if (data.inventory && systems.inventory) {
    systems.inventory.import(data.inventory);
  }

  if (data.stats && systems.stats) {
    systems.stats.import(data.stats);
  }

  if (data.quests && systems.quests) {
    systems.quests.import(data.quests);
  }

  if (data.achievements && systems.achievements) {
    systems.achievements.import(data.achievements);
  }
}
