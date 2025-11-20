/**
 * Inventory System
 *
 * Manages player inventory with support for:
 * - Adding/removing items
 * - Item stacking
 * - Capacity limits
 * - Item queries
 * - Event notifications
 */

import { nanoid } from 'nanoid';
import type { Item, GameSystemEvent, EventHandler } from './types';

/**
 * Inventory system for managing items
 */
export class InventorySystem {
  private items: Map<string, Item> = new Map();
  private capacity: number = -1; // -1 = unlimited
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  constructor(capacity: number = -1) {
    this.capacity = capacity;
  }

  /**
   * Add an item to inventory
   */
  addItem(item: Item): boolean {
    // Check capacity
    if (this.capacity > 0 && this.items.size >= this.capacity) {
      // Try to stack if item already exists and is stackable
      if (item.stackable !== false) {
        const existing = this.findItemByName(item.name);
        if (existing) {
          return this.stackItem(existing.id, item.quantity);
        }
      }

      this.emit('itemAddFailed', { item, reason: 'capacity' });
      return false;
    }

    // Check if item is stackable and already exists
    if (item.stackable !== false) {
      const existing = this.findItemByName(item.name);
      if (existing) {
        return this.stackItem(existing.id, item.quantity);
      }
    }

    // Add new item
    const itemToAdd: Item = {
      ...item,
      id: item.id || nanoid(),
      quantity: item.quantity || 1,
    };

    this.items.set(itemToAdd.id, itemToAdd);
    this.emit('itemAdded', { item: itemToAdd });

    return true;
  }

  /**
   * Remove an item from inventory
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      this.emit('itemRemoveFailed', { itemId, reason: 'notFound' });
      return false;
    }

    if (item.quantity > quantity) {
      // Decrease quantity
      item.quantity -= quantity;
      this.items.set(itemId, item);
      this.emit('itemQuantityChanged', { item, delta: -quantity });
    } else {
      // Remove item completely
      this.items.delete(itemId);
      this.emit('itemRemoved', { item });
    }

    return true;
  }

  /**
   * Remove item by name
   */
  removeItemByName(name: string, quantity: number = 1): boolean {
    const item = this.findItemByName(name);
    if (!item) {
      return false;
    }
    return this.removeItem(item.id, quantity);
  }

  /**
   * Check if inventory has an item
   */
  hasItem(itemId: string): boolean {
    return this.items.has(itemId);
  }

  /**
   * Check if inventory has item by name
   */
  hasItemByName(name: string, quantity: number = 1): boolean {
    const item = this.findItemByName(name);
    return item !== undefined && item.quantity >= quantity;
  }

  /**
   * Get an item by ID
   */
  getItem(itemId: string): Item | undefined {
    return this.items.get(itemId);
  }

  /**
   * Find item by name
   */
  findItemByName(name: string): Item | undefined {
    for (const item of this.items.values()) {
      if (item.name === name) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Get all items
   */
  getItems(): Item[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category: string): Item[] {
    return this.getItems().filter(item => item.category === category);
  }

  /**
   * Get item count
   */
  getItemCount(): number {
    return this.items.size;
  }

  /**
   * Get total quantity of all items
   */
  getTotalQuantity(): number {
    return Array.from(this.items.values()).reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Stack an item (increase quantity)
   */
  private stackItem(itemId: string, quantity: number): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    const maxStack = item.maxStack || Infinity;
    const newQuantity = Math.min(item.quantity + quantity, maxStack);
    const added = newQuantity - item.quantity;

    if (added > 0) {
      item.quantity = newQuantity;
      this.items.set(itemId, item);
      this.emit('itemQuantityChanged', { item, delta: added });
    }

    return added === quantity; // Return true if all quantity was added
  }

  /**
   * Check if inventory is full
   */
  isFull(): boolean {
    if (this.capacity < 0) {
      return false; // Unlimited capacity
    }
    return this.items.size >= this.capacity;
  }

  /**
   * Get remaining capacity
   */
  getRemainingCapacity(): number {
    if (this.capacity < 0) {
      return Infinity;
    }
    return Math.max(0, this.capacity - this.items.size);
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
    this.emit('inventoryCleared', {});
  }

  /**
   * Sort items by property
   */
  sortItems(property: keyof Item, ascending: boolean = true): Item[] {
    const items = this.getItems();
    items.sort((a, b) => {
      const aVal = a[property];
      const bVal = b[property];

      if (aVal === undefined || bVal === undefined) {
        return 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return ascending ? comparison : -comparison;
    });

    return items;
  }

  /**
   * Search items by query
   */
  searchItems(query: string): Item[] {
    const lowerQuery = query.toLowerCase();
    return this.getItems().filter(item => {
      return (
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery) ||
        item.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get inventory value (sum of all item values)
   */
  getTotalValue(): number {
    return this.getItems().reduce((sum, item) => {
      const itemValue = item.value || 0;
      return sum + (itemValue * item.quantity);
    }, 0);
  }

  /**
   * Export inventory state
   */
  export(): Item[] {
    return this.getItems().map(item => ({ ...item }));
  }

  /**
   * Import inventory state
   */
  import(items: Item[]): void {
    this.clear();
    for (const item of items) {
      this.addItem(item);
    }
    this.emit('inventoryImported', { itemCount: items.length });
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: string, data: any): void {
    const event: GameSystemEvent = {
      type,
      data,
      timestamp: Date.now(),
      source: 'inventory',
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }

    // Emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(event);
      }
    }
  }
}
