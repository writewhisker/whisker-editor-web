# @writewhisker/game-systems

Built-in game systems for interactive fiction, including inventory management, character statistics, quest tracking, and achievements.

## Features

- **Inventory System**: Item management with stacking, capacity limits, and categorization
- **Stats System**: Character attributes with modifiers (buffs/debuffs) and min/max clamping
- **Quest System**: Quest and objective tracking with progress monitoring
- **Achievement System**: Achievement unlocks with progress tracking and hidden achievements
- **Event-Driven**: All systems emit events for state changes
- **Save/Load**: Export and import functionality for all systems
- **Macro Integration**: Direct integration with `@writewhisker/macros` for use in templates
- **TypeScript**: Full type safety with strict mode

## Installation

```bash
npm install @writewhisker/game-systems
```

## Quick Start

### Inventory System

```typescript
import { InventorySystem } from '@writewhisker/game-systems';

const inventory = new InventorySystem(20); // Capacity of 20 slots

// Add items
inventory.addItem({
  id: 'health_potion',
  name: 'Health Potion',
  description: 'Restores 50 HP',
  quantity: 5,
  category: 'potion',
  value: 25,
});

// Check if player has item
if (inventory.hasItemByName('Health Potion', 1)) {
  inventory.removeItemByName('Health Potion', 1);
  console.log('Used health potion!');
}

// Search inventory
const potions = inventory.getItemsByCategory('potion');
console.log(`You have ${potions.length} types of potions`);
```

### Stats System

```typescript
import { StatsSystem } from '@writewhisker/game-systems';

const stats = new StatsSystem();

// Set base stats
stats.setStat('health', 100, 100, 0); // value, max, min
stats.setStat('attack', 25);
stats.setStat('defense', 15);

// Modify stats
stats.modifyStat('health', -20); // Take damage
console.log(`Health: ${stats.getStat('health')}/100`);

// Add temporary buff
const buffId = stats.addModifier('attack', {
  name: 'Strength Potion',
  type: 'multiply',
  value: 1.5,
  duration: 5, // 5 turns
});

console.log(`Attack: ${stats.getStat('attack')}`); // 37.5 (25 * 1.5)

// Update durations each turn
stats.updateDurations();

// Compare stats
if (stats.compare('health', '<', 30)) {
  console.log('Low health warning!');
}
```

### Quest System

```typescript
import { QuestSystem } from '@writewhisker/game-systems';

const quests = new QuestSystem();

// Add a quest
const questId = quests.addQuest({
  title: 'The Lost Sword',
  description: 'Find the legendary sword in the ancient ruins',
  category: 'main',
  mainQuest: true,
  objectives: [
    {
      id: 'find_ruins',
      description: 'Locate the ancient ruins',
      completed: false,
    },
    {
      id: 'defeat_guardian',
      description: 'Defeat the guardian',
      completed: false,
    },
    {
      id: 'claim_sword',
      description: 'Claim the sword',
      completed: false,
    },
  ],
  rewards: [
    { type: 'item', itemId: 'legendary_sword', quantity: 1 },
    { type: 'xp', quantity: 1000 },
  ],
});

// Start the quest
quests.startQuest(questId);

// Complete objectives
quests.completeObjective(questId, 'find_ruins');
quests.completeObjective(questId, 'defeat_guardian');

// Check progress
console.log(`Progress: ${quests.getQuestProgress(questId) * 100}%`); // 66.67%

// Complete final objective (auto-completes quest)
quests.completeObjective(questId, 'claim_sword');
console.log(`Quest completed: ${quests.isQuestCompleted(questId)}`); // true
```

### Quest with Progress Tracking

```typescript
const questId = quests.addQuest({
  title: 'Goblin Slayer',
  description: 'Defeat 20 goblins',
  objectives: [
    {
      id: 'kill_goblins',
      description: 'Kill goblins',
      completed: false,
      progress: 0,
      target: 20,
    },
  ],
});

// Track progress
quests.updateObjectiveProgress(questId, 'kill_goblins', 5); // 5 goblins killed
quests.updateObjectiveProgress(questId, 'kill_goblins', 12); // 12 total
quests.updateObjectiveProgress(questId, 'kill_goblins', 20); // Auto-completes!
```

### Achievement System

```typescript
import { AchievementSystem } from '@writewhisker/game-systems';

const achievements = new AchievementSystem();

// Add achievements
const achievementId = achievements.addAchievement({
  name: 'Monster Hunter',
  description: 'Defeat 100 monsters',
  category: 'combat',
  rarity: 'rare',
  points: 50,
  progress: 0,
  target: 100,
});

// Hidden achievement
achievements.addAchievement({
  name: 'Secret Discovery',
  description: 'Find the secret room',
  hidden: true, // Shows as "???" until unlocked
  points: 100,
});

// Track progress
achievements.incrementProgress(achievementId, 1); // Kill a monster
achievements.updateProgress(achievementId, 50); // Set progress directly

// Check progress
console.log(`Progress: ${achievements.getProgress(achievementId) * 100}%`);

// Manual unlock
achievements.unlock(achievementId);

// Get statistics
console.log(`Total points: ${achievements.getTotalPoints()}`);
console.log(`Unlock rate: ${achievements.getUnlockPercentage()}%`);
```

## Event System

All game systems emit events when state changes occur:

```typescript
import { InventorySystem, StatsSystem, QuestSystem, AchievementSystem } from '@writewhisker/game-systems';

const inventory = new InventorySystem();

// Listen to specific events
inventory.on('itemAdded', (event) => {
  console.log(`Added: ${event.data.item.name}`);
});

inventory.on('itemRemoved', (event) => {
  console.log(`Removed: ${event.data.item.name}`);
});

// Listen to all events
inventory.on('*', (event) => {
  console.log(`Event: ${event.type}`, event.data);
});

// Stats events
const stats = new StatsSystem();

stats.on('statModified', (event) => {
  const { stat, delta, oldValue, newValue } = event.data;
  console.log(`${stat.name}: ${oldValue} -> ${newValue} (${delta > 0 ? '+' : ''}${delta})`);
});

stats.on('modifierExpired', (event) => {
  console.log(`Buff expired: ${event.data.modifier.name}`);
});

// Quest events
const quests = new QuestSystem();

quests.on('questCompleted', (event) => {
  console.log(`Quest completed: ${event.data.quest.title}`);
  // Award rewards, show UI, etc.
});

quests.on('objectiveCompleted', (event) => {
  console.log(`Objective completed: ${event.data.objective.description}`);
});

// Achievement events
const achievements = new AchievementSystem();

achievements.on('achievementUnlocked', (event) => {
  const { achievement } = event.data;
  console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
  console.log(`   ${achievement.description}`);
  if (achievement.points) {
    console.log(`   +${achievement.points} points`);
  }
});
```

## Save and Load

All systems support export/import for save/load functionality:

```typescript
import { exportGameSystems, importGameSystems } from '@writewhisker/game-systems';

// Create systems
const inventory = new InventorySystem();
const stats = new StatsSystem();
const quests = new QuestSystem();
const achievements = new AchievementSystem();

// ... game logic ...

// Save game state
const saveData = exportGameSystems({ inventory, stats, quests, achievements });
localStorage.setItem('savegame', JSON.stringify(saveData));

// Load game state
const loadData = JSON.parse(localStorage.getItem('savegame')!);
importGameSystems({ inventory, stats, quests, achievements }, loadData);
```

Individual system export/import:

```typescript
// Export individual systems
const inventoryData = inventory.export();
const statsData = stats.export();
const questsData = quests.export();
const achievementsData = achievements.export();

// Import individual systems
inventory.import(inventoryData);
stats.import(statsData);
quests.import(questsData);
achievements.import(achievementsData);
```

## Macro Integration

Use game systems directly in template strings with `@writewhisker/macros`:

```typescript
import { MacroProcessor } from '@writewhisker/macros';
import { InventorySystem, StatsSystem, registerGameSystemMacros } from '@writewhisker/game-systems';

const inventory = new InventorySystem();
const stats = new StatsSystem();

// Setup
inventory.addItem({ id: '1', name: 'Health Potion', quantity: 3 });
stats.setStat('health', 75, 100);

// Create macro context
const context = {
  variables: new Map(),
  functions: new Map(),
  customMacros: new Map(),
};

// Register game system macros
registerGameSystemMacros(context, { inventory, stats });

// Use in templates
const processor = new MacroProcessor();

const template = `
{{if call(stats.compare, "health", "<", 30)}}
⚠️ Low health!
{{end}}

Health: {{call(stats.get, "health")}}/{{call(stats.max, "health")}}

{{if call(inventory.has, "Health Potion")}}
You have {{call(inventory.count, "Health Potion")}} health potions.
{{end}}
`;

const result = await processor.process(template, context);
console.log(result.output);
```

### Available Macro Functions

**Inventory:**
- `inventory.has(itemName, [quantity])` - Check if item exists
- `inventory.count(itemName)` - Get item quantity
- `inventory.get(itemName)` - Get item object
- `inventory.list([category])` - List all items or by category
- `inventory.totalValue()` - Get total inventory value
- `inventory.isFull()` - Check if inventory is full

**Stats:**
- `stats.get(statName)` - Get stat value (with modifiers)
- `stats.has(statName)` - Check if stat exists
- `stats.compare(statName, operator, value)` - Compare stat value
- `stats.max(statName)` - Get max value
- `stats.min(statName)` - Get min value
- `stats.percent(statName)` - Get percentage (value/max * 100)

**Quests:**
- `quest.get(questId)` - Get quest object
- `quest.progress(questId)` - Get progress (0-1)
- `quest.isCompleted(questId)` - Check if completed
- `quest.list([status])` - List quests by status
- `quest.active()` - Get active quests
- `quest.available()` - Get available quests

**Achievements:**
- `achievement.get(achievementId)` - Get achievement object
- `achievement.isUnlocked(achievementId)` - Check if unlocked
- `achievement.list([category])` - List achievements
- `achievement.unlocked()` - Get unlocked achievements
- `achievement.progress(achievementId)` - Get progress (0-1)
- `achievement.totalPoints()` - Get total points earned

## API Reference

### InventorySystem

```typescript
class InventorySystem {
  constructor(capacity?: number); // -1 = unlimited

  // Item management
  addItem(item: Item): boolean;
  removeItem(itemId: string, quantity?: number): boolean;
  removeItemByName(name: string, quantity?: number): boolean;

  // Queries
  hasItem(itemId: string): boolean;
  hasItemByName(name: string, quantity?: number): boolean;
  getItem(itemId: string): Item | undefined;
  findItemByName(name: string): Item | undefined;
  getItems(): Item[];
  getItemsByCategory(category: string): Item[];
  searchItems(query: string): Item[];

  // Sorting
  sortItems(property: keyof Item, ascending?: boolean): Item[];

  // Capacity
  isFull(): boolean;
  getRemainingCapacity(): number;
  getItemCount(): number;
  getTotalQuantity(): number;

  // Value
  getTotalValue(): number;

  // State management
  clear(): void;
  export(): Item[];
  import(items: Item[]): void;

  // Events
  on(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void;
}
```

### StatsSystem

```typescript
class StatsSystem {
  // Stat management
  setStat(name: string, value: number, maxValue?: number, minValue?: number): void;
  getStat(name: string): number;
  getStatObject(name: string): Stat | undefined;
  modifyStat(name: string, delta: number): number;
  setBaseStat(name: string, baseValue: number): void;

  // Modifiers
  addModifier(statName: string, modifier: Omit<StatModifier, 'id'>): string;
  removeModifier(statName: string, modifierId: string): boolean;
  clearModifiers(statName: string): void;
  getModifiers(statName: string): StatModifier[];
  updateDurations(): void; // Call each turn/tick

  // Queries
  hasStat(name: string): boolean;
  getStatNames(): string[];
  getAllStats(): Map<string, Stat>;
  compare(name: string, operator: '>' | '>=' | '<' | '<=' | '==' | '!=', value: number): boolean;

  // State management
  removeStat(name: string): boolean;
  clear(): void;
  export(): Record<string, Stat>;
  import(stats: Record<string, Stat>): void;

  // Events
  on(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void;
}
```

### QuestSystem

```typescript
class QuestSystem {
  // Quest management
  addQuest(quest: Omit<Quest, 'id' | 'status'> & { id?: string; status?: Quest['status'] }): string;
  getQuest(questId: string): Quest | undefined;
  getAllQuests(): Quest[];
  getQuestsByStatus(status: Quest['status']): Quest[];
  removeQuest(questId: string): boolean;

  // Quest state
  startQuest(questId: string): boolean;
  completeQuest(questId: string): boolean;
  failQuest(questId: string): boolean;
  resetQuest(questId: string): boolean;

  // Objectives
  completeObjective(questId: string, objectiveId: string): boolean;
  updateObjectiveProgress(questId: string, objectiveId: string, progress: number): boolean;

  // Progress
  getQuestProgress(questId: string): number; // 0-1
  isQuestCompleted(questId: string): boolean;

  // State management
  clear(): void;
  export(): Quest[];
  import(quests: Quest[]): void;

  // Events
  on(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void;
}
```

### AchievementSystem

```typescript
class AchievementSystem {
  // Achievement management
  addAchievement(achievement: Omit<Achievement, 'id' | 'unlocked'> & { id?: string }): string;
  getAchievement(achievementId: string): Achievement | undefined;
  getAllAchievements(): Achievement[];
  getAchievementsByCategory(category: string): Achievement[];
  getAchievementsByRarity(rarity: Achievement['rarity']): Achievement[];
  removeAchievement(achievementId: string): boolean;

  // Unlocking
  unlock(achievementId: string): boolean;
  isUnlocked(achievementId: string): boolean;
  resetAchievement(achievementId: string): boolean;

  // Progress
  updateProgress(achievementId: string, progress: number): boolean;
  incrementProgress(achievementId: string, delta?: number): boolean;
  getProgress(achievementId: string): number; // 0-1

  // Filtering
  getUnlockedAchievements(): Achievement[];
  getLockedAchievements(): Achievement[];

  // Statistics
  getTotalPoints(): number;
  getMaxPoints(): number;
  getUnlockPercentage(): number;

  // State management
  clear(): void;
  export(): Achievement[];
  import(achievements: Achievement[]): void;

  // Events
  on(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void;
}
```

## Types

```typescript
interface Item {
  id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  properties?: Record<string, any>;
  metadata?: Record<string, any>;
  stackable?: boolean;
  maxStack?: number;
  icon?: string;
  rarity?: string;
  value?: number;
}

interface Stat {
  name: string;
  value: number;
  maxValue?: number;
  minValue?: number;
  baseValue?: number;
  modifiers?: StatModifier[];
  metadata?: Record<string, any>;
}

interface StatModifier {
  id: string;
  name: string;
  type: 'add' | 'multiply' | 'set';
  value: number;
  duration?: number; // -1 or undefined = permanent
  source?: string;
  metadata?: Record<string, any>;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'active' | 'completed' | 'failed';
  objectives: QuestObjective[];
  rewards?: QuestReward[];
  giver?: string;
  category?: string;
  mainQuest?: boolean;
  requirements?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  progress?: number;
  target?: number;
  type?: string;
  metadata?: Record<string, any>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
  icon?: string;
  category?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points?: number;
  hidden?: boolean;
  requirements?: Record<string, any>;
  progress?: number;
  target?: number;
  metadata?: Record<string, any>;
}
```

## License

MIT
