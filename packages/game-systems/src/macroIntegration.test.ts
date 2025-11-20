import { describe, it, expect, beforeEach } from 'vitest';
import { InventorySystem } from './InventorySystem';
import { StatsSystem } from './StatsSystem';
import { QuestSystem } from './QuestSystem';
import { AchievementSystem } from './AchievementSystem';
import {
  createGameSystemMacros,
  registerGameSystemMacros,
  exportGameSystems,
  importGameSystems,
} from './macroIntegration';

describe('Macro Integration', () => {
  let inventory: InventorySystem;
  let stats: StatsSystem;
  let quests: QuestSystem;
  let achievements: AchievementSystem;

  beforeEach(() => {
    inventory = new InventorySystem();
    stats = new StatsSystem();
    quests = new QuestSystem();
    achievements = new AchievementSystem();
  });

  describe('createGameSystemMacros', () => {
    it('should create inventory macros', () => {
      inventory.addItem({ id: '1', name: 'Health Potion', quantity: 5 });

      const macros = createGameSystemMacros({ inventory });

      expect(macros['inventory.has']('Health Potion', 3)).toBe(true);
      expect(macros['inventory.count']('Health Potion')).toBe(5);
      expect(macros['inventory.get']('Health Potion')).toBeDefined();
    });

    it('should create stats macros', () => {
      stats.setStat('health', 80, 100);

      const macros = createGameSystemMacros({ stats });

      expect(macros['stats.get']('health')).toBe(80);
      expect(macros['stats.has']('health')).toBe(true);
      expect(macros['stats.compare']('health', '>', 50)).toBe(true);
      expect(macros['stats.max']('health')).toBe(100);
      expect(macros['stats.percent']('health')).toBe(80);
    });

    it('should create quest macros', () => {
      const questId = quests.addQuest({
        title: 'Test Quest',
        description: 'Test',
        objectives: [
          { id: 'obj1', description: 'Task 1', completed: true },
          { id: 'obj2', description: 'Task 2', completed: false },
        ],
      });

      const macros = createGameSystemMacros({ quests });

      expect(macros['quest.get'](questId)).toBeDefined();
      expect(macros['quest.progress'](questId)).toBe(0.5);
      expect(macros['quest.isCompleted'](questId)).toBe(false);
    });

    it('should create achievement macros', () => {
      const achId1 = achievements.addAchievement({
        name: 'Achievement 1',
        description: 'Test',
        points: 10,
      });
      const achId2 = achievements.addAchievement({
        name: 'Achievement 2',
        description: 'Test',
        points: 20,
      });

      achievements.unlock(achId1);

      const macros = createGameSystemMacros({ achievements });

      expect(macros['achievement.get'](achId1)).toBeDefined();
      expect(macros['achievement.isUnlocked'](achId1)).toBe(true);
      expect(macros['achievement.isUnlocked'](achId2)).toBe(false);
      expect(macros['achievement.unlocked']()).toHaveLength(1);
      expect(macros['achievement.totalPoints']()).toBe(10);
    });
  });

  describe('registerGameSystemMacros', () => {
    it('should register macros in context', () => {
      const context = {
        functions: new Map<string, (...args: any[]) => any>(),
      };

      inventory.addItem({ id: '1', name: 'Sword', quantity: 1 });
      stats.setStat('strength', 25);

      registerGameSystemMacros(context, { inventory, stats });

      expect(context.functions.has('inventory.has')).toBe(true);
      expect(context.functions.has('stats.get')).toBe(true);

      const inventoryHas = context.functions.get('inventory.has');
      const statsGet = context.functions.get('stats.get');

      expect(inventoryHas?.('Sword')).toBe(true);
      expect(statsGet?.('strength')).toBe(25);
    });
  });

  describe('inventory macro functions', () => {
    beforeEach(() => {
      inventory.addItem({ id: '1', name: 'Gold', quantity: 100, value: 1 });
      inventory.addItem({ id: '2', name: 'Potion', quantity: 5, value: 10, category: 'consumable' });
    });

    it('should check inventory.has with quantity', () => {
      const macros = createGameSystemMacros({ inventory });

      expect(macros['inventory.has']('Gold', 50)).toBe(true);
      expect(macros['inventory.has']('Gold', 150)).toBe(false);
    });

    it('should count items with inventory.count', () => {
      const macros = createGameSystemMacros({ inventory });

      expect(macros['inventory.count']('Gold')).toBe(100);
      expect(macros['inventory.count']('Nonexistent')).toBe(0);
    });

    it('should list items with inventory.list', () => {
      const macros = createGameSystemMacros({ inventory });

      const all = macros['inventory.list']();
      expect(all).toHaveLength(2);

      const consumables = macros['inventory.list']('consumable');
      expect(consumables).toHaveLength(1);
      expect(consumables[0].name).toBe('Potion');
    });

    it('should calculate total value', () => {
      const macros = createGameSystemMacros({ inventory });

      // 100 * 1 + 5 * 10 = 150
      expect(macros['inventory.totalValue']()).toBe(150);
    });

    it('should check if inventory is full', () => {
      const limitedInventory = new InventorySystem(2);
      limitedInventory.addItem({ id: '1', name: 'Item 1', quantity: 1, stackable: false });
      limitedInventory.addItem({ id: '2', name: 'Item 2', quantity: 1, stackable: false });

      const macros = createGameSystemMacros({ inventory: limitedInventory });

      expect(macros['inventory.isFull']()).toBe(true);
    });
  });

  describe('stats macro functions', () => {
    beforeEach(() => {
      stats.setStat('health', 75, 100, 0);
      stats.setStat('mana', 50, 50, 0);
    });

    it('should get stat min/max values', () => {
      const macros = createGameSystemMacros({ stats });

      expect(macros['stats.max']('health')).toBe(100);
      expect(macros['stats.min']('health')).toBe(0);
    });

    it('should calculate stat percentage', () => {
      const macros = createGameSystemMacros({ stats });

      expect(macros['stats.percent']('health')).toBe(75);
      expect(macros['stats.percent']('mana')).toBe(100);
    });

    it('should handle stats without max value', () => {
      stats.setStat('score', 9999);
      const macros = createGameSystemMacros({ stats });

      expect(macros['stats.percent']('score')).toBe(0);
    });
  });

  describe('quest macro functions', () => {
    let questId: string;

    beforeEach(() => {
      questId = quests.addQuest({
        title: 'Main Quest',
        description: 'Complete the story',
        objectives: [
          { id: 'obj1', description: 'Task 1', completed: true },
          { id: 'obj2', description: 'Task 2', completed: false },
        ],
      });
    });

    it('should get quest by ID', () => {
      const macros = createGameSystemMacros({ quests });

      const quest = macros['quest.get'](questId);
      expect(quest?.title).toBe('Main Quest');
    });

    it('should calculate quest progress', () => {
      const macros = createGameSystemMacros({ quests });

      expect(macros['quest.progress'](questId)).toBe(0.5);
    });

    it('should check if quest is completed', () => {
      const macros = createGameSystemMacros({ quests });

      expect(macros['quest.isCompleted'](questId)).toBe(false);

      quests.completeQuest(questId);
      expect(macros['quest.isCompleted'](questId)).toBe(true);
    });

    it('should list quests by status', () => {
      const activeId = quests.addQuest({
        title: 'Active Quest',
        description: 'Test',
        objectives: [],
        status: 'active',
      });

      const macros = createGameSystemMacros({ quests });

      const active = macros['quest.active']();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(activeId);

      const available = macros['quest.available']();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(questId);
    });
  });

  describe('achievement macro functions', () => {
    let achId: string;

    beforeEach(() => {
      achId = achievements.addAchievement({
        name: 'Collector',
        description: 'Collect 100 items',
        category: 'collection',
        progress: 50,
        target: 100,
        points: 10,
      });
    });

    it('should get achievement by ID', () => {
      const macros = createGameSystemMacros({ achievements });

      const ach = macros['achievement.get'](achId);
      expect(ach?.name).toBe('Collector');
    });

    it('should calculate achievement progress', () => {
      const macros = createGameSystemMacros({ achievements });

      expect(macros['achievement.progress'](achId)).toBe(0.5);
    });

    it('should list achievements by category', () => {
      achievements.addAchievement({
        name: 'Other',
        description: 'Test',
        category: 'other',
      });

      const macros = createGameSystemMacros({ achievements });

      const collection = macros['achievement.list']('collection');
      expect(collection).toHaveLength(1);
      expect(collection[0].name).toBe('Collector');
    });

    it('should get unlocked achievements', () => {
      const achId2 = achievements.addAchievement({
        name: 'Winner',
        description: 'Win the game',
        points: 50,
      });

      achievements.unlock(achId2);

      const macros = createGameSystemMacros({ achievements });

      const unlocked = macros['achievement.unlocked']();
      expect(unlocked).toHaveLength(1);
      expect(unlocked[0].id).toBe(achId2);
    });

    it('should calculate total points', () => {
      const achId2 = achievements.addAchievement({
        name: 'Master',
        description: 'Master all skills',
        points: 100,
      });

      achievements.unlock(achId);
      achievements.unlock(achId2);

      const macros = createGameSystemMacros({ achievements });

      expect(macros['achievement.totalPoints']()).toBe(110); // 10 + 100
    });
  });

  describe('exportGameSystems and importGameSystems', () => {
    it('should export all game systems', () => {
      inventory.addItem({ id: '1', name: 'Item', quantity: 1 });
      stats.setStat('health', 100);
      quests.addQuest({ title: 'Quest', description: 'Test', objectives: [] });
      achievements.addAchievement({ name: 'Achievement', description: 'Test' });

      const exported = exportGameSystems({ inventory, stats, quests, achievements });

      expect(exported.inventory).toHaveLength(1);
      expect(exported.stats).toBeDefined();
      expect(exported.quests).toHaveLength(1);
      expect(exported.achievements).toHaveLength(1);
      expect(exported.timestamp).toBeDefined();
    });

    it('should import game systems', () => {
      const data = {
        inventory: [{ id: '1', name: 'Imported Item', quantity: 5 }],
        stats: { health: { name: 'health', value: 80, baseValue: 80, modifiers: [] } },
        quests: [{
          id: 'q1',
          title: 'Imported Quest',
          description: 'Test',
          status: 'active' as const,
          objectives: [],
        }],
        achievements: [{
          id: 'a1',
          name: 'Imported Achievement',
          description: 'Test',
          unlocked: false,
        }],
      };

      importGameSystems({ inventory, stats, quests, achievements }, data);

      expect(inventory.getItemCount()).toBe(1);
      expect(stats.getStat('health')).toBe(80);
      expect(quests.getAllQuests()).toHaveLength(1);
      expect(achievements.getAllAchievements()).toHaveLength(1);
    });

    it('should handle partial imports', () => {
      const data = {
        inventory: [{ id: '1', name: 'Item', quantity: 1 }],
      };

      importGameSystems({ inventory }, data);

      expect(inventory.getItemCount()).toBe(1);
    });
  });
});
