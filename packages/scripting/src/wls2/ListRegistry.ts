/**
 * ListRegistry - Multi-List State Manager
 *
 * Manages multiple ListValue instances with a central registry.
 * Provides global operations, serialization, and list factory methods.
 *
 * Reference: whisker-core/lib/whisker/wls2/list_state_machine.lua
 */

import type {
  ListValueConfig,
  ListValueState,
  ListRegistryState,
} from './types';
import { ListValue, createExclusive, createFlags, fromState } from './ListValue';

export interface ListRegistryOptions {
  defaultConfig?: Partial<ListValueConfig>;
}

export class ListRegistry {
  private lists: Map<string, ListValue> = new Map();
  private defaultConfig: Partial<ListValueConfig>;

  constructor(options: ListRegistryOptions = {}) {
    this.defaultConfig = options.defaultConfig || {};
  }

  // ==========================================================================
  // List Management
  // ==========================================================================

  /**
   * Define a new list with possible values
   */
  define(
    name: string,
    possibleValues: string[],
    initialValues: string[] = [],
    config?: Partial<ListValueConfig>
  ): ListValue {
    if (this.lists.has(name)) {
      console.warn(`ListRegistry: List '${name}' already exists, overwriting`);
    }

    const mergedConfig = { ...this.defaultConfig, ...config };
    const list = new ListValue(name, possibleValues, initialValues, mergedConfig);
    this.lists.set(name, list);

    return list;
  }

  /**
   * Define an exclusive list (only one state active at a time)
   */
  defineExclusive(
    name: string,
    states: string[],
    initial?: string,
    config?: Partial<ListValueConfig>
  ): ListValue {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const list = createExclusive(name, states, initial, mergedConfig);
    this.lists.set(name, list);
    return list;
  }

  /**
   * Define a flags list (multiple states can be active)
   */
  defineFlags(
    name: string,
    flags: string[],
    initial: string[] = [],
    config?: Partial<ListValueConfig>
  ): ListValue {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const list = createFlags(name, flags, initial, mergedConfig);
    this.lists.set(name, list);
    return list;
  }

  /**
   * Get a list by name
   */
  get(name: string): ListValue | undefined {
    return this.lists.get(name);
  }

  /**
   * Check if a list exists
   */
  has(name: string): boolean {
    return this.lists.has(name);
  }

  /**
   * Get all list names
   */
  getNames(): string[] {
    return Array.from(this.lists.keys());
  }

  /**
   * Remove a list
   */
  remove(name: string): boolean {
    return this.lists.delete(name);
  }

  /**
   * Get all lists
   */
  getAll(): Map<string, ListValue> {
    return new Map(this.lists);
  }

  /**
   * Get list count
   */
  count(): number {
    return this.lists.size;
  }

  /**
   * Clear all lists
   */
  clear(): void {
    this.lists.clear();
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Reset all lists to empty
   */
  resetAll(): void {
    for (const list of this.lists.values()) {
      list.reset();
    }
  }

  /**
   * Clear history on all lists
   */
  clearAllHistory(): void {
    for (const list of this.lists.values()) {
      list.clearHistory();
    }
  }

  /**
   * Lock all lists
   */
  lockAll(): void {
    for (const list of this.lists.values()) {
      list.lock();
    }
  }

  /**
   * Unlock all lists
   */
  unlockAll(): void {
    for (const list of this.lists.values()) {
      list.unlock();
    }
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Check if a state is active in any list
   */
  isStateActiveAnywhere(state: string): boolean {
    for (const list of this.lists.values()) {
      if (list.contains(state)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find all lists that contain a specific active state
   */
  findListsWithState(state: string): string[] {
    const result: string[] = [];

    for (const [name, list] of this.lists) {
      if (list.contains(state)) {
        result.push(name);
      }
    }

    return result;
  }

  /**
   * Get a summary of all active states across all lists
   */
  getActiveSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};

    for (const [name, list] of this.lists) {
      summary[name] = list.getActiveValues();
    }

    return summary;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): ListRegistryState {
    const listsState: Record<string, ListValueState> = {};

    for (const [name, list] of this.lists) {
      listsState[name] = list.getState();
    }

    return { lists: listsState };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: ListRegistryState): void {
    this.lists.clear();

    for (const [name, listState] of Object.entries(state.lists)) {
      const list = fromState(listState, this.defaultConfig);
      this.lists.set(name, list);
    }
  }

  /**
   * Clone the registry
   */
  clone(includeHistory: boolean = false): ListRegistry {
    const cloned = new ListRegistry({ defaultConfig: this.defaultConfig });

    for (const [name, list] of this.lists) {
      cloned.lists.set(name, list.copy(includeHistory));
    }

    return cloned;
  }

  // ==========================================================================
  // Convenience Accessors
  // ==========================================================================

  /**
   * Get active value from a list (for exclusive lists)
   */
  getValue(listName: string): string | undefined {
    const list = this.lists.get(listName);
    return list?.getValue();
  }

  /**
   * Get active values from a list (for flag lists)
   */
  getValues(listName: string): string[] {
    const list = this.lists.get(listName);
    return list?.getActiveValues() || [];
  }

  /**
   * Set value in a list (exclusive mode)
   */
  setValue(listName: string, value: string): boolean {
    const list = this.lists.get(listName);
    if (!list) {
      console.warn(`ListRegistry: List '${listName}' not found`);
      return false;
    }
    return list.enter(value);
  }

  /**
   * Set values in a list (flags mode)
   */
  setValues(listName: string, values: string[]): boolean {
    const list = this.lists.get(listName);
    if (!list) {
      console.warn(`ListRegistry: List '${listName}' not found`);
      return false;
    }
    return list.set(values);
  }

  /**
   * Check if a value is active in a list
   */
  hasValue(listName: string, value: string): boolean {
    const list = this.lists.get(listName);
    return list?.contains(value) || false;
  }

  /**
   * Add a value to a list
   */
  addValue(listName: string, value: string): boolean {
    const list = this.lists.get(listName);
    if (!list) {
      console.warn(`ListRegistry: List '${listName}' not found`);
      return false;
    }
    return list.add(value);
  }

  /**
   * Remove a value from a list
   */
  removeValue(listName: string, value: string): boolean {
    const list = this.lists.get(listName);
    if (!list) {
      console.warn(`ListRegistry: List '${listName}' not found`);
      return false;
    }
    return list.remove(value);
  }

  /**
   * Toggle a value in a list
   */
  toggleValue(listName: string, value: string): boolean {
    const list = this.lists.get(listName);
    if (!list) {
      console.warn(`ListRegistry: List '${listName}' not found`);
      return false;
    }
    return list.toggle(value);
  }
}

/**
 * Factory function to create a ListRegistry
 */
export function createListRegistry(
  options?: ListRegistryOptions
): ListRegistry {
  return new ListRegistry(options);
}
