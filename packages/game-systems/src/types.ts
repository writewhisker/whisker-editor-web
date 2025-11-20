/**
 * Game Systems Types
 *
 * Type definitions for built-in game systems:
 * - Inventory management
 * - Character statistics
 * - Quest tracking
 * - Achievement system
 */

/**
 * Item in player inventory
 */
export interface Item {
  /** Unique item identifier */
  id: string;

  /** Item name */
  name: string;

  /** Item description */
  description?: string;

  /** Item category (weapon, potion, key, etc.) */
  category?: string;

  /** Item quantity (stackable items) */
  quantity: number;

  /** Item properties (damage, healing, etc.) */
  properties?: Record<string, any>;

  /** Item metadata */
  metadata?: Record<string, any>;

  /** Is item stackable? */
  stackable?: boolean;

  /** Maximum stack size */
  maxStack?: number;

  /** Item icon/image URL */
  icon?: string;

  /** Item rarity (common, uncommon, rare, etc.) */
  rarity?: string;

  /** Item value/price */
  value?: number;
}

/**
 * Character statistic
 */
export interface Stat {
  /** Stat name (health, mana, strength, etc.) */
  name: string;

  /** Current value */
  value: number;

  /** Maximum value (if applicable) */
  maxValue?: number;

  /** Minimum value (if applicable) */
  minValue?: number;

  /** Base value (before modifiers) */
  baseValue?: number;

  /** Active modifiers */
  modifiers?: StatModifier[];

  /** Stat metadata */
  metadata?: Record<string, any>;
}

/**
 * Stat modifier (buffs/debuffs)
 */
export interface StatModifier {
  /** Modifier ID */
  id: string;

  /** Modifier name */
  name: string;

  /** Modifier type */
  type: 'add' | 'multiply' | 'set';

  /** Modifier value */
  value: number;

  /** Duration in turns/time (-1 = permanent) */
  duration?: number;

  /** Source of modifier */
  source?: string;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Quest objective
 */
export interface QuestObjective {
  /** Objective ID */
  id: string;

  /** Objective description */
  description: string;

  /** Is objective completed? */
  completed: boolean;

  /** Current progress */
  progress?: number;

  /** Target progress */
  target?: number;

  /** Objective type */
  type?: string;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Quest definition
 */
export interface Quest {
  /** Quest ID */
  id: string;

  /** Quest title */
  title: string;

  /** Quest description */
  description: string;

  /** Quest status */
  status: 'available' | 'active' | 'completed' | 'failed';

  /** Quest objectives */
  objectives: QuestObjective[];

  /** Quest rewards */
  rewards?: QuestReward[];

  /** Quest giver */
  giver?: string;

  /** Quest category */
  category?: string;

  /** Is quest main story? */
  mainQuest?: boolean;

  /** Required level/stats */
  requirements?: Record<string, any>;

  /** Quest metadata */
  metadata?: Record<string, any>;
}

/**
 * Quest reward
 */
export interface QuestReward {
  /** Reward type (item, xp, stat, etc.) */
  type: 'item' | 'xp' | 'stat' | 'currency' | 'custom';

  /** Item ID (for item rewards) */
  itemId?: string;

  /** Quantity */
  quantity?: number;

  /** Stat name (for stat rewards) */
  statName?: string;

  /** Stat value change */
  statValue?: number;

  /** Custom reward data */
  data?: any;
}

/**
 * Achievement definition
 */
export interface Achievement {
  /** Achievement ID */
  id: string;

  /** Achievement name */
  name: string;

  /** Achievement description */
  description: string;

  /** Is achievement unlocked? */
  unlocked: boolean;

  /** Unlock timestamp */
  unlockedAt?: number;

  /** Achievement icon */
  icon?: string;

  /** Achievement category */
  category?: string;

  /** Achievement rarity */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

  /** Points awarded */
  points?: number;

  /** Hidden achievement? */
  hidden?: boolean;

  /** Unlock requirements */
  requirements?: Record<string, any>;

  /** Progress toward unlock */
  progress?: number;

  /** Target progress */
  target?: number;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Game state snapshot
 */
export interface GameState {
  /** Inventory items */
  inventory: Item[];

  /** Character stats */
  stats: Map<string, Stat>;

  /** Active quests */
  quests: Quest[];

  /** Unlocked achievements */
  achievements: Achievement[];

  /** Custom game data */
  customData?: Record<string, any>;

  /** Timestamp */
  timestamp: number;
}

/**
 * Event emitted by game systems
 */
export interface GameSystemEvent {
  /** Event type */
  type: string;

  /** Event data */
  data: any;

  /** Timestamp */
  timestamp: number;

  /** Source system */
  source: string;
}

/**
 * Event handler function
 */
export type EventHandler = (event: GameSystemEvent) => void;

/**
 * Serialized game state for save/load
 */
export interface SerializedGameState {
  /** Format version */
  version: string;

  /** Serialized inventory */
  inventory: Item[];

  /** Serialized stats */
  stats: Record<string, Stat>;

  /** Serialized quests */
  quests: Quest[];

  /** Serialized achievements */
  achievements: Achievement[];

  /** Custom data */
  customData?: Record<string, any>;

  /** Timestamp */
  timestamp: number;
}
