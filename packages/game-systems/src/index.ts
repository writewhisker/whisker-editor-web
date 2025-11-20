/**
 * @writewhisker/game-systems
 *
 * Built-in game systems for interactive fiction:
 * - Inventory management
 * - Character statistics with modifiers
 * - Quest tracking
 * - Achievement system
 *
 * Features:
 * - Event-driven architecture for all systems
 * - Export/import for save/load functionality
 * - Macro integration for use in templates
 * - TypeScript strict mode support
 */

// Core systems
export { InventorySystem } from './InventorySystem';
export { StatsSystem } from './StatsSystem';
export { QuestSystem } from './QuestSystem';
export { AchievementSystem } from './AchievementSystem';

// Types
export type {
  Item,
  Stat,
  StatModifier,
  Quest,
  QuestObjective,
  QuestReward,
  Achievement,
  GameState,
  GameSystemEvent,
  EventHandler,
  SerializedGameState,
} from './types';

// Macro integration
export {
  createGameSystemMacros,
  registerGameSystemMacros,
  exportGameSystems,
  importGameSystems,
} from './macroIntegration';

export type { GameSystemsContext } from './macroIntegration';
