import { describe, it, expect, beforeEach } from 'vitest';
import { InventorySystem } from './InventorySystem';
import type { Item } from './types';

describe('InventorySystem', () => {
  let inventory: InventorySystem;

  beforeEach(() => {
    inventory = new InventorySystem();
  });

  describe('addItem', () => {
    it('should add a new item', () => {
      const item: Item = {
        id: 'potion1',
        name: 'Health Potion',
        quantity: 1,
      };

      const result = inventory.addItem(item);
      expect(result).toBe(true);
      expect(inventory.hasItem('potion1')).toBe(true);
    });

    it('should stack identical items', () => {
      const item1: Item = {
        id: 'potion1',
        name: 'Health Potion',
        quantity: 2,
      };

      const item2: Item = {
        id: 'potion2',
        name: 'Health Potion',
        quantity: 3,
      };

      inventory.addItem(item1);
      inventory.addItem(item2);

      const found = inventory.findItemByName('Health Potion');
      expect(found?.quantity).toBe(5);
      expect(inventory.getItemCount()).toBe(1); // Only one slot used
    });

    it('should respect max stack size', () => {
      const item1: Item = {
        id: 'arrow1',
        name: 'Arrow',
        quantity: 50,
        maxStack: 99,
      };

      const item2: Item = {
        id: 'arrow2',
        name: 'Arrow',
        quantity: 60,
        maxStack: 99,
      };

      inventory.addItem(item1);
      inventory.addItem(item2);

      const found = inventory.findItemByName('Arrow');
      expect(found?.quantity).toBe(99); // Capped at maxStack
    });

    it('should respect capacity limits', () => {
      const limitedInventory = new InventorySystem(2);

      limitedInventory.addItem({ id: '1', name: 'Item 1', quantity: 1, stackable: false });
      limitedInventory.addItem({ id: '2', name: 'Item 2', quantity: 1, stackable: false });
      const result = limitedInventory.addItem({ id: '3', name: 'Item 3', quantity: 1, stackable: false });

      expect(result).toBe(false);
      expect(limitedInventory.getItemCount()).toBe(2);
    });

    it('should not stack non-stackable items', () => {
      const item1: Item = {
        id: 'sword1',
        name: 'Iron Sword',
        quantity: 1,
        stackable: false,
      };

      const item2: Item = {
        id: 'sword2',
        name: 'Iron Sword',
        quantity: 1,
        stackable: false,
      };

      inventory.addItem(item1);
      inventory.addItem(item2);

      expect(inventory.getItemCount()).toBe(2); // Two separate slots
    });
  });

  describe('removeItem', () => {
    it('should remove an item completely', () => {
      const item: Item = { id: 'key1', name: 'Key', quantity: 1 };
      inventory.addItem(item);

      const result = inventory.removeItem('key1', 1);
      expect(result).toBe(true);
      expect(inventory.hasItem('key1')).toBe(false);
    });

    it('should decrease item quantity', () => {
      const item: Item = { id: 'coin1', name: 'Gold Coin', quantity: 10 };
      inventory.addItem(item);

      inventory.removeItem('coin1', 3);
      const found = inventory.getItem('coin1');
      expect(found?.quantity).toBe(7);
    });

    it('should return false for non-existent items', () => {
      const result = inventory.removeItem('nonexistent', 1);
      expect(result).toBe(false);
    });
  });

  describe('removeItemByName', () => {
    it('should remove item by name', () => {
      const item: Item = { id: 'potion1', name: 'Mana Potion', quantity: 5 };
      inventory.addItem(item);

      const result = inventory.removeItemByName('Mana Potion', 2);
      expect(result).toBe(true);

      const found = inventory.findItemByName('Mana Potion');
      expect(found?.quantity).toBe(3);
    });
  });

  describe('hasItem and hasItemByName', () => {
    it('should check if item exists by ID', () => {
      const item: Item = { id: 'gem1', name: 'Ruby', quantity: 1 };
      inventory.addItem(item);

      expect(inventory.hasItem('gem1')).toBe(true);
      expect(inventory.hasItem('gem2')).toBe(false);
    });

    it('should check if item exists by name with quantity', () => {
      const item: Item = { id: 'wood1', name: 'Wood', quantity: 10 };
      inventory.addItem(item);

      expect(inventory.hasItemByName('Wood', 5)).toBe(true);
      expect(inventory.hasItemByName('Wood', 15)).toBe(false);
      expect(inventory.hasItemByName('Stone')).toBe(false);
    });
  });

  describe('getItems and filtering', () => {
    beforeEach(() => {
      inventory.addItem({ id: '1', name: 'Health Potion', quantity: 5, category: 'potion' });
      inventory.addItem({ id: '2', name: 'Mana Potion', quantity: 3, category: 'potion' });
      inventory.addItem({ id: '3', name: 'Iron Sword', quantity: 1, category: 'weapon' });
    });

    it('should get all items', () => {
      const items = inventory.getItems();
      expect(items).toHaveLength(3);
    });

    it('should get items by category', () => {
      const potions = inventory.getItemsByCategory('potion');
      expect(potions).toHaveLength(2);
      expect(potions.every(i => i.category === 'potion')).toBe(true);
    });
  });

  describe('searchItems', () => {
    beforeEach(() => {
      inventory.addItem({
        id: '1',
        name: 'Healing Elixir',
        description: 'Restores health',
        quantity: 1,
      });
      inventory.addItem({
        id: '2',
        name: 'Mana Potion',
        description: 'Restores mana',
        quantity: 1,
      });
    });

    it('should search by name', () => {
      const results = inventory.searchItems('healing');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Healing Elixir');
    });

    it('should search by description', () => {
      const results = inventory.searchItems('mana');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mana Potion');
    });

    it('should be case insensitive', () => {
      const results = inventory.searchItems('HEALING');
      expect(results).toHaveLength(1);
    });
  });

  describe('sortItems', () => {
    beforeEach(() => {
      inventory.addItem({ id: '1', name: 'C Item', quantity: 3, value: 10 });
      inventory.addItem({ id: '2', name: 'A Item', quantity: 1, value: 30 });
      inventory.addItem({ id: '3', name: 'B Item', quantity: 2, value: 20 });
    });

    it('should sort by name ascending', () => {
      const sorted = inventory.sortItems('name', true);
      expect(sorted[0].name).toBe('A Item');
      expect(sorted[2].name).toBe('C Item');
    });

    it('should sort by value descending', () => {
      const sorted = inventory.sortItems('value', false);
      expect(sorted[0].value).toBe(30);
      expect(sorted[2].value).toBe(10);
    });
  });

  describe('capacity management', () => {
    it('should report unlimited capacity by default', () => {
      expect(inventory.isFull()).toBe(false);
      expect(inventory.getRemainingCapacity()).toBe(Infinity);
    });

    it('should track capacity correctly', () => {
      const limitedInventory = new InventorySystem(5);
      limitedInventory.addItem({ id: '1', name: 'Item 1', quantity: 1, stackable: false });
      limitedInventory.addItem({ id: '2', name: 'Item 2', quantity: 1, stackable: false });

      expect(limitedInventory.getRemainingCapacity()).toBe(3);
      expect(limitedInventory.isFull()).toBe(false);
    });
  });

  describe('getTotalValue', () => {
    it('should calculate total inventory value', () => {
      inventory.addItem({ id: '1', name: 'Gold', quantity: 10, value: 5 });
      inventory.addItem({ id: '2', name: 'Diamond', quantity: 2, value: 100 });

      expect(inventory.getTotalValue()).toBe(250); // 10*5 + 2*100
    });
  });

  describe('getTotalQuantity', () => {
    it('should count all item quantities', () => {
      inventory.addItem({ id: '1', name: 'Item 1', quantity: 10 });
      inventory.addItem({ id: '2', name: 'Item 2', quantity: 5 });

      expect(inventory.getTotalQuantity()).toBe(15);
    });
  });

  describe('export and import', () => {
    it('should export inventory state', () => {
      inventory.addItem({ id: '1', name: 'Sword', quantity: 1 });
      inventory.addItem({ id: '2', name: 'Shield', quantity: 1 });

      const exported = inventory.export();
      expect(exported).toHaveLength(2);
      expect(exported[0].name).toBeDefined();
    });

    it('should import inventory state', () => {
      const items: Item[] = [
        { id: '1', name: 'Imported Item 1', quantity: 5 },
        { id: '2', name: 'Imported Item 2', quantity: 3 },
      ];

      inventory.import(items);

      expect(inventory.getItemCount()).toBe(2);
      expect(inventory.hasItem('1')).toBe(true);
      expect(inventory.hasItem('2')).toBe(true);
    });

    it('should clear existing items on import', () => {
      inventory.addItem({ id: 'old', name: 'Old Item', quantity: 1 });

      const items: Item[] = [
        { id: 'new', name: 'New Item', quantity: 1 },
      ];

      inventory.import(items);

      expect(inventory.hasItem('old')).toBe(false);
      expect(inventory.hasItem('new')).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit itemAdded event', () => {
      let eventFired = false;
      inventory.on('itemAdded', (event) => {
        expect(event.type).toBe('itemAdded');
        expect(event.data.item.name).toBe('Test Item');
        eventFired = true;
      });

      inventory.addItem({ id: '1', name: 'Test Item', quantity: 1 });
      expect(eventFired).toBe(true);
    });

    it('should emit itemRemoved event', () => {
      let eventFired = false;
      inventory.addItem({ id: '1', name: 'Test Item', quantity: 1 });

      inventory.on('itemRemoved', (event) => {
        expect(event.type).toBe('itemRemoved');
        eventFired = true;
      });

      inventory.removeItem('1', 1);
      expect(eventFired).toBe(true);
    });

    it('should support wildcard event handlers', () => {
      const events: string[] = [];

      inventory.on('*', (event) => {
        events.push(event.type);
      });

      inventory.addItem({ id: '1', name: 'Item', quantity: 1 });
      inventory.removeItem('1', 1);

      expect(events).toContain('itemAdded');
      expect(events).toContain('itemRemoved');
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      inventory.addItem({ id: '1', name: 'Item 1', quantity: 1 });
      inventory.addItem({ id: '2', name: 'Item 2', quantity: 1 });

      inventory.clear();

      expect(inventory.getItemCount()).toBe(0);
      expect(inventory.getItems()).toHaveLength(0);
    });
  });
});
