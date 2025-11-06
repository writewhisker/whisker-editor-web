import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { inventorySystem, type InventoryItem } from './inventorySystem';

describe('Inventory System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(inventorySystem);
      expect(pluginManager.hasPlugin('inventory-system')).toBe(true);
    });

    it('should provide item passage type', async () => {
      await pluginStoreActions.register(inventorySystem);
      const types = pluginManager.getPassageTypes();
      expect(types.find(t => t.type === 'item')).toBeDefined();
    });

    it('should provide inventory actions', async () => {
      await pluginStoreActions.register(inventorySystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('inventory.add');
      expect(actionTypes).toContain('inventory.remove');
      expect(actionTypes).toContain('inventory.equip');
      expect(actionTypes).toContain('inventory.unequip');
      expect(actionTypes).toContain('inventory.clear');
    });

    it('should provide inventory conditions', async () => {
      await pluginStoreActions.register(inventorySystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('inventory.has');
      expect(conditionTypes).toContain('inventory.equipped');
      expect(conditionTypes).toContain('inventory.capacity');
      expect(conditionTypes).toContain('inventory.category');
    });
  });

  describe('initialization', () => {
    it('should initialize inventory on onInit', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {} as any,
        variables: new Map(),
        currentPassage: null,
        history: [],
      };

      await pluginManager.executeHook('onInit', context);

      expect(context.storyState.inventory).toBeDefined();
      expect(context.storyState.inventory.items).toEqual({});
      expect(context.storyState.inventory.equipped).toEqual([]);
      expect(context.storyState.inventory.capacity).toBe(0);
      expect(context.storyState.inventory.maxCapacity).toBe(100);
    });
  });

  describe('add action', () => {
    it('should add item to inventory', async () => {
      await pluginStoreActions.register(inventorySystem);

      const sword: InventoryItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A basic sword',
        weight: 5,
        value: 100,
      };

      const context = {
        storyState: {
          inventory: { items: {}, equipped: [], capacity: 0, maxCapacity: 100 },
          itemDefinitions: {},
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.add')!;
      await action.execute(context, { itemId: 'sword', quantity: 1, item: sword });

      expect(context.storyState.inventory.items['sword']).toBe(1);
      expect(context.storyState.inventory.capacity).toBe(5);
      expect(context.variables.get('has_sword')).toBe(true);
      expect(context.variables.get('inventory_count_sword')).toBe(1);
    });

    it('should respect stack limits', async () => {
      await pluginStoreActions.register(inventorySystem);

      const potion: InventoryItem = {
        id: 'potion',
        name: 'Health Potion',
        description: 'Restores health',
        stackable: true,
        maxStack: 10,
        weight: 1,
      };

      const context = {
        storyState: {
          inventory: { items: { potion: 8 }, equipped: [], capacity: 8, maxCapacity: 100 },
          itemDefinitions: {},
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.add')!;
      await action.execute(context, { itemId: 'potion', quantity: 5, item: potion });

      // Should only add 2 more (8 + 2 = 10 max)
      expect(context.storyState.inventory.items['potion']).toBe(10);
    });

    it('should not add if over capacity', async () => {
      await pluginStoreActions.register(inventorySystem);

      const boulder: InventoryItem = {
        id: 'boulder',
        name: 'Boulder',
        description: 'Very heavy',
        weight: 150,
      };

      const context = {
        storyState: {
          inventory: { items: {}, equipped: [], capacity: 0, maxCapacity: 100 },
          itemDefinitions: {},
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.add')!;
      await action.execute(context, { itemId: 'boulder', quantity: 1, item: boulder });

      expect(context.storyState.inventory.items['boulder']).toBeUndefined();
      expect(context.variables.get('inventory_full')).toBe(true);
    });
  });

  describe('remove action', () => {
    it('should remove item from inventory', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1 }, equipped: [], capacity: 5, maxCapacity: 100 },
          itemDefinitions: {
            sword: { id: 'sword', name: 'Sword', description: '', weight: 5 },
          },
        } as any,
        variables: new Map([['has_sword', true]]),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.remove')!;
      await action.execute(context, { itemId: 'sword', quantity: 1 });

      expect(context.storyState.inventory.items['sword']).toBeUndefined();
      expect(context.storyState.inventory.capacity).toBe(0);
      expect(context.variables.get('has_sword')).toBe(false);
    });

    it('should reduce quantity for stackable items', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { potion: 5 }, equipped: [], capacity: 5, maxCapacity: 100 },
          itemDefinitions: {
            potion: { id: 'potion', name: 'Potion', description: '', weight: 1 },
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.remove')!;
      await action.execute(context, { itemId: 'potion', quantity: 2 });

      expect(context.storyState.inventory.items['potion']).toBe(3);
      expect(context.variables.get('inventory_count_potion')).toBe(3);
    });
  });

  describe('equip/unequip actions', () => {
    it('should equip an equippable item', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1 }, equipped: [], capacity: 5, maxCapacity: 100 },
          itemDefinitions: {
            sword: {
              id: 'sword',
              name: 'Sword',
              description: '',
              equippable: true,
            },
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.equip')!;
      await action.execute(context, { itemId: 'sword' });

      expect(context.storyState.inventory.equipped).toContain('sword');
      expect(context.variables.get('equipped_sword')).toBe(true);
    });

    it('should not equip non-equippable item', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { potion: 1 }, equipped: [], capacity: 1, maxCapacity: 100 },
          itemDefinitions: {
            potion: {
              id: 'potion',
              name: 'Potion',
              description: '',
              equippable: false,
            },
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.equip')!;
      await action.execute(context, { itemId: 'potion' });

      expect(context.storyState.inventory.equipped).not.toContain('potion');
    });

    it('should unequip an equipped item', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1 }, equipped: ['sword'], capacity: 5, maxCapacity: 100 },
        } as any,
        variables: new Map([['equipped_sword', true]]),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.unequip')!;
      await action.execute(context, { itemId: 'sword' });

      expect(context.storyState.inventory.equipped).not.toContain('sword');
      expect(context.variables.get('equipped_sword')).toBe(false);
    });
  });

  describe('clear action', () => {
    it('should clear all items', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: {
            items: { sword: 1, potion: 5 },
            equipped: ['sword'],
            capacity: 10,
            maxCapacity: 100,
          },
        } as any,
        variables: new Map(),
        currentPassage: null,
      };

      const action = inventorySystem.actions!.find(a => a.type === 'inventory.clear')!;
      await action.execute(context, {});

      expect(context.storyState.inventory.items).toEqual({});
      expect(context.storyState.inventory.equipped).toEqual([]);
      expect(context.storyState.inventory.capacity).toBe(0);
    });
  });

  describe('has condition', () => {
    it('should check if has item', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1, potion: 5 }, equipped: [], capacity: 10, maxCapacity: 100 },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = inventorySystem.conditions!.find(c => c.type === 'inventory.has')!;

      expect(condition.evaluate(context, { itemId: 'sword' })).toBe(true);
      expect(condition.evaluate(context, { itemId: 'potion', quantity: 3 })).toBe(true);
      expect(condition.evaluate(context, { itemId: 'potion', quantity: 10 })).toBe(false);
      expect(condition.evaluate(context, { itemId: 'shield' })).toBe(false);
    });
  });

  describe('equipped condition', () => {
    it('should check if item is equipped', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1 }, equipped: ['sword'], capacity: 5, maxCapacity: 100 },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = inventorySystem.conditions!.find(c => c.type === 'inventory.equipped')!;

      expect(condition.evaluate(context, { itemId: 'sword' })).toBe(true);
      expect(condition.evaluate(context, { itemId: 'shield' })).toBe(false);
    });
  });

  describe('capacity condition', () => {
    it('should check if has capacity', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: {}, equipped: [], capacity: 80, maxCapacity: 100 },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = inventorySystem.conditions!.find(c => c.type === 'inventory.capacity')!;

      expect(condition.evaluate(context, { weight: 15 })).toBe(true);
      expect(condition.evaluate(context, { weight: 25 })).toBe(false);
    });
  });

  describe('category condition', () => {
    it('should check if has item in category', async () => {
      await pluginStoreActions.register(inventorySystem);

      const context = {
        storyState: {
          inventory: { items: { sword: 1, bow: 1 }, equipped: [], capacity: 10, maxCapacity: 100 },
          itemDefinitions: {
            sword: { id: 'sword', name: 'Sword', description: '', category: 'weapon' },
            bow: { id: 'bow', name: 'Bow', description: '', category: 'weapon' },
          },
        },
        variables: new Map(),
        currentPassage: null,
      };

      const condition = inventorySystem.conditions!.find(c => c.type === 'inventory.category')!;

      expect(condition.evaluate(context, { category: 'weapon' })).toBe(true);
      expect(condition.evaluate(context, { category: 'armor' })).toBe(false);
    });
  });
});
