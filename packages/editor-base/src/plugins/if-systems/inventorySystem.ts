import type { EditorPlugin } from '../types';

/**
 * Inventory System Plugin
 *
 * Provides comprehensive inventory management for interactive fiction:
 * - Item definitions with metadata
 * - Inventory add/remove/check operations
 * - Item properties (weight, value, stackable)
 * - Capacity limits
 * - Item categories/tags
 * - Equipped items tracking
 */

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  weight?: number;
  value?: number;
  stackable?: boolean;
  maxStack?: number;
  equippable?: boolean;
  metadata?: Record<string, any>;
}

export interface InventoryState {
  items: Map<string, number>; // itemId -> quantity
  equipped: Set<string>; // equipped item IDs
  capacity: number;
  maxCapacity: number;
}

export const inventorySystem: EditorPlugin = {
  name: 'inventory-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Comprehensive inventory management system for interactive fiction',

  // Custom passage type for items
  nodeTypes: [
    {
      type: 'item',
      label: 'Item',
      icon: '📦',
      color: '#FF6B6B',
      description: 'Represents an inventory item',
    },
  ],

  // Inventory actions
  actions: [
    {
      type: 'inventory.add',
      label: 'Add Item to Inventory',
      description: 'Add an item to the player inventory',
      execute: async (context, params: { itemId: string; quantity?: number; item?: InventoryItem }) => {
        const quantity = params.quantity || 1;

        // Initialize inventory if needed
        if (!context.storyState.inventory) {
          context.storyState.inventory = {
            items: {},
            equipped: [],
            capacity: 0,
            maxCapacity: 100,
          };
        }

        const inventory = context.storyState.inventory;

        // Get item definition
        const itemDef = params.item || context.storyState.itemDefinitions?.[params.itemId];
        if (!itemDef) {
          console.warn(`[Inventory] Item ${params.itemId} not found`);
          return;
        }

        // Check capacity
        const itemWeight = itemDef.weight || 1;
        const totalWeight = itemWeight * quantity;

        if (inventory.capacity + totalWeight > inventory.maxCapacity) {
          console.warn('[Inventory] Not enough capacity');
          context.variables.set('inventory_full', true);
          return;
        }

        // Add to inventory
        const currentQty = inventory.items[params.itemId] || 0;
        const maxStack = itemDef.stackable ? (itemDef.maxStack || 99) : 1;
        const newQty = Math.min(currentQty + quantity, maxStack);

        inventory.items[params.itemId] = newQty;
        inventory.capacity += totalWeight;

        // Set variables
        context.variables.set(`has_${params.itemId}`, true);
        context.variables.set(`inventory_count_${params.itemId}`, newQty);
        context.variables.set('inventory_full', false);

        console.log(`[Inventory] Added ${quantity}x ${itemDef.name}`);
      },
    },
    {
      type: 'inventory.remove',
      label: 'Remove Item from Inventory',
      description: 'Remove an item from the player inventory',
      execute: async (context, params: { itemId: string; quantity?: number }) => {
        const quantity = params.quantity || 1;

        if (!context.storyState.inventory?.items[params.itemId]) {
          console.warn(`[Inventory] Item ${params.itemId} not in inventory`);
          return;
        }

        const inventory = context.storyState.inventory;
        const itemDef = context.storyState.itemDefinitions?.[params.itemId];
        const currentQty = inventory.items[params.itemId];
        const newQty = Math.max(0, currentQty - quantity);

        if (newQty === 0) {
          delete inventory.items[params.itemId];
          context.variables.set(`has_${params.itemId}`, false);
        } else {
          inventory.items[params.itemId] = newQty;
        }

        // Update capacity
        if (itemDef) {
          const itemWeight = itemDef.weight || 1;
          inventory.capacity -= itemWeight * quantity;
        }

        context.variables.set(`inventory_count_${params.itemId}`, newQty);

        console.log(`[Inventory] Removed ${quantity}x ${params.itemId}`);
      },
    },
    {
      type: 'inventory.equip',
      label: 'Equip Item',
      description: 'Equip an item from inventory',
      execute: async (context, params: { itemId: string }) => {
        if (!context.storyState.inventory?.items[params.itemId]) {
          console.warn(`[Inventory] Cannot equip - item ${params.itemId} not in inventory`);
          return;
        }

        const itemDef = context.storyState.itemDefinitions?.[params.itemId];
        if (!itemDef?.equippable) {
          console.warn(`[Inventory] Item ${params.itemId} is not equippable`);
          return;
        }

        if (!context.storyState.inventory.equipped) {
          context.storyState.inventory.equipped = [];
        }

        if (!context.storyState.inventory.equipped.includes(params.itemId)) {
          context.storyState.inventory.equipped.push(params.itemId);
          context.variables.set(`equipped_${params.itemId}`, true);
          console.log(`[Inventory] Equipped ${itemDef.name}`);
        }
      },
    },
    {
      type: 'inventory.unequip',
      label: 'Unequip Item',
      description: 'Unequip an equipped item',
      execute: async (context, params: { itemId: string }) => {
        if (!context.storyState.inventory?.equipped) {
          return;
        }

        const index = context.storyState.inventory.equipped.indexOf(params.itemId);
        if (index > -1) {
          context.storyState.inventory.equipped.splice(index, 1);
          context.variables.set(`equipped_${params.itemId}`, false);
          console.log(`[Inventory] Unequipped ${params.itemId}`);
        }
      },
    },
    {
      type: 'inventory.clear',
      label: 'Clear Inventory',
      description: 'Remove all items from inventory',
      execute: async (context) => {
        if (context.storyState.inventory) {
          context.storyState.inventory.items = {};
          context.storyState.inventory.equipped = [];
          context.storyState.inventory.capacity = 0;
          console.log('[Inventory] Cleared all items');
        }
      },
    },
  ],

  // Inventory conditions
  conditions: [
    {
      type: 'inventory.has',
      label: 'Has Item',
      description: 'Check if inventory contains an item',
      evaluate: (context, params: { itemId: string; quantity?: number }) => {
        const quantity = params.quantity || 1;
        const currentQty = context.storyState.inventory?.items[params.itemId] || 0;
        return currentQty >= quantity;
      },
    },
    {
      type: 'inventory.equipped',
      label: 'Item Equipped',
      description: 'Check if an item is equipped',
      evaluate: (context, params: { itemId: string }) => {
        return context.storyState.inventory?.equipped?.includes(params.itemId) || false;
      },
    },
    {
      type: 'inventory.capacity',
      label: 'Has Capacity',
      description: 'Check if inventory has enough capacity',
      evaluate: (context, params: { weight: number }) => {
        const inventory = context.storyState.inventory;
        if (!inventory) return true;
        return inventory.capacity + params.weight <= inventory.maxCapacity;
      },
    },
    {
      type: 'inventory.category',
      label: 'Has Item in Category',
      description: 'Check if inventory has any item from a category',
      evaluate: (context, params: { category: string }) => {
        const inventory = context.storyState.inventory;
        if (!inventory) return false;

        const itemDefs = context.storyState.itemDefinitions || {};
        return Object.keys(inventory.items).some(itemId => {
          const item = itemDefs[itemId];
          return item?.category === params.category;
        });
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      // Initialize inventory system
      if (!context.storyState.inventory) {
        context.storyState.inventory = {
          items: {},
          equipped: [],
          capacity: 0,
          maxCapacity: 100,
        };
      }

      if (!context.storyState.itemDefinitions) {
        context.storyState.itemDefinitions = {};
      }

      console.log('[Inventory System] Initialized');
    },

    onStoryLoad: (context) => {
      console.log('[Inventory System] Story loaded', {
        itemCount: Object.keys(context.storyState.inventory?.items || {}).length,
        capacity: context.storyState.inventory?.capacity || 0,
      });
    },
  },

  onRegister: () => {
    console.log('[Inventory System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Inventory System] Plugin unregistered');
  },
};
