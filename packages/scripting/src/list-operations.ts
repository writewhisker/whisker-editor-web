/**
 * WLS 2.0 LIST State Machine Operations
 *
 * Extends LIST with state machine operators for managing
 * enumerated states with add, remove, and query operations.
 */

/**
 * Represents a LIST value that can function as a state machine.
 * Multiple states can be active simultaneously.
 */
export class ListValue {
  /** Active states in this list */
  private states: Set<string>;
  /** All valid states defined for this list */
  private validStates: Set<string>;
  /** Name of the list for error messages */
  private name: string;

  constructor(name: string, validStates: string[] = [], initialActive: string[] = []) {
    this.name = name;
    this.validStates = new Set(validStates);
    this.states = new Set();

    // Initialize with active states
    for (const state of initialActive) {
      if (validStates.length === 0 || this.validStates.has(state)) {
        this.states.add(state);
      }
    }
  }

  /**
   * Get the list name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get all valid states defined for this list
   */
  getValidStates(): string[] {
    return Array.from(this.validStates);
  }

  /**
   * Get all currently active states
   */
  getActiveStates(): string[] {
    return Array.from(this.states);
  }

  /**
   * Add a state (make it active)
   * Operator: +=
   */
  add(state: string): void {
    if (this.validStates.size > 0 && !this.validStates.has(state)) {
      throw new Error(`Invalid state '${state}' for LIST '${this.name}'`);
    }
    this.states.add(state);
  }

  /**
   * Remove a state (make it inactive)
   * Operator: -=
   */
  remove(state: string): void {
    this.states.delete(state);
  }

  /**
   * Check if a state is active
   * Operator: ?
   */
  contains(state: string): boolean {
    return this.states.has(state);
  }

  /**
   * Check if this list includes all states from another list (superset)
   * Operator: >=
   */
  includes(other: ListValue): boolean {
    for (const state of other.states) {
      if (!this.states.has(state)) return false;
    }
    return true;
  }

  /**
   * Check if this list is a subset of another list
   * Operator: <=
   */
  isSubsetOf(other: ListValue): boolean {
    for (const state of this.states) {
      if (!other.states.has(state)) return false;
    }
    return true;
  }

  /**
   * Check equality (same active states)
   */
  equals(other: ListValue): boolean {
    if (this.states.size !== other.states.size) return false;
    for (const state of this.states) {
      if (!other.states.has(state)) return false;
    }
    return true;
  }

  /**
   * Get the count of active states
   */
  count(): number {
    return this.states.size;
  }

  /**
   * Check if no states are active
   */
  isEmpty(): boolean {
    return this.states.size === 0;
  }

  /**
   * Clear all active states
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * Toggle a state (add if not present, remove if present)
   */
  toggle(state: string): boolean {
    if (this.states.has(state)) {
      this.states.delete(state);
      return false;
    } else {
      this.add(state);
      return true;
    }
  }

  /**
   * Set exactly one state (clear others)
   */
  setExclusive(state: string): void {
    if (this.validStates.size > 0 && !this.validStates.has(state)) {
      throw new Error(`Invalid state '${state}' for LIST '${this.name}'`);
    }
    this.states.clear();
    this.states.add(state);
  }

  /**
   * Create a copy of this list value
   */
  clone(): ListValue {
    const copy = new ListValue(this.name, Array.from(this.validStates));
    for (const state of this.states) {
      copy.states.add(state);
    }
    return copy;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const active = Array.from(this.states).join(', ');
    return active || '(empty)';
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): { name: string; validStates: string[]; activeStates: string[] } {
    return {
      name: this.name,
      validStates: Array.from(this.validStates),
      activeStates: Array.from(this.states),
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: {
    name: string;
    validStates: string[];
    activeStates: string[];
  }): ListValue {
    return new ListValue(json.name, json.validStates, json.activeStates);
  }
}

/**
 * Registry for managing LIST declarations in a story
 */
export class ListRegistry {
  private lists: Map<string, ListValue> = new Map();

  /**
   * Declare a new LIST
   */
  declare(
    name: string,
    values: { state: string; active: boolean }[]
  ): ListValue {
    const validStates = values.map((v) => v.state);
    const activeStates = values.filter((v) => v.active).map((v) => v.state);
    const list = new ListValue(name, validStates, activeStates);
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
   * Clear all lists
   */
  clear(): void {
    this.lists.clear();
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, ReturnType<ListValue['toJSON']>> {
    const result: Record<string, ReturnType<ListValue['toJSON']>> = {};
    for (const [name, list] of this.lists) {
      result[name] = list.toJSON();
    }
    return result;
  }

  /**
   * Restore from JSON
   */
  static fromJSON(
    json: Record<string, { name: string; validStates: string[]; activeStates: string[] }>
  ): ListRegistry {
    const registry = new ListRegistry();
    for (const [name, listJson] of Object.entries(json)) {
      registry.lists.set(name, ListValue.fromJSON(listJson));
    }
    return registry;
  }
}

/**
 * Parse a LIST declaration string
 * Format: "state1, (activeState), state2"
 */
export function parseListDeclaration(
  declaration: string
): { state: string; active: boolean }[] {
  const result: { state: string; active: boolean }[] = [];
  const parts = declaration.split(',').map((p) => p.trim()).filter((p) => p);

  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) {
      // Active state
      result.push({
        state: part.slice(1, -1).trim(),
        active: true,
      });
    } else {
      result.push({
        state: part,
        active: false,
      });
    }
  }

  return result;
}

/**
 * Evaluate a LIST operator expression
 */
export function evaluateListOperator(
  list: ListValue,
  operator: string,
  operand: string | ListValue
): boolean | void {
  switch (operator) {
    case '+=':
      if (typeof operand === 'string') {
        list.add(operand);
      } else {
        for (const state of operand.getActiveStates()) {
          list.add(state);
        }
      }
      return;

    case '-=':
      if (typeof operand === 'string') {
        list.remove(operand);
      } else {
        for (const state of operand.getActiveStates()) {
          list.remove(state);
        }
      }
      return;

    case '?':
      if (typeof operand === 'string') {
        return list.contains(operand);
      }
      // For list operand, check if any state matches
      for (const state of operand.getActiveStates()) {
        if (list.contains(state)) return true;
      }
      return false;

    case '>=':
      if (operand instanceof ListValue) {
        return list.includes(operand);
      }
      return list.contains(operand);

    case '<=':
      if (operand instanceof ListValue) {
        return list.isSubsetOf(operand);
      }
      return list.count() <= 1 && list.contains(operand);

    case '==':
      if (operand instanceof ListValue) {
        return list.equals(operand);
      }
      return list.count() === 1 && list.contains(operand);

    default:
      throw new Error(`Unknown LIST operator: ${operator}`);
  }
}
