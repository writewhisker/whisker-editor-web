/**
 * ArrayValue - Dynamic Array
 *
 * Represents a 0-indexed array with push, pop, insert, and remove operations.
 * Supports serialization for save/restore and history tracking.
 *
 * Reference: whisker-core/lib/whisker/core/game_state.lua (lines 354-467)
 */

export interface ArrayValueConfig {
  trackHistory?: boolean;
  maxHistoryLength?: number;
}

export interface ArrayHistoryEntry {
  action: 'push' | 'pop' | 'set' | 'insert' | 'remove' | 'clear';
  index?: number;
  value?: unknown;
  timestamp: number;
  previousLength: number;
}

export interface ArrayValueState {
  name: string;
  elements: unknown[];
  history?: ArrayHistoryEntry[];
}

const DEFAULT_CONFIG: ArrayValueConfig = {
  trackHistory: false,
  maxHistoryLength: 100,
};

export class ArrayValue {
  private _name: string;
  private _elements: unknown[];
  private _history: ArrayHistoryEntry[];
  private _config: ArrayValueConfig;
  private _locked: boolean;

  constructor(
    name: string,
    initialElements: unknown[] = [],
    config: Partial<ArrayValueConfig> = {}
  ) {
    this._name = name;
    this._elements = [...initialElements];
    this._history = [];
    this._locked = false;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Properties
  // ==========================================================================

  get name(): string {
    return this._name;
  }

  /**
   * Get the array name (method form for compatibility)
   */
  getName(): string {
    return this._name;
  }

  /**
   * Get the array length
   */
  get length(): number {
    return this._elements.length;
  }

  // ==========================================================================
  // Element Access (0-indexed as per WLS spec)
  // ==========================================================================

  /**
   * Get element at index (0-based)
   */
  get(index: number): unknown {
    if (index < 0 || index >= this._elements.length) {
      return undefined;
    }
    return this._elements[index];
  }

  /**
   * Set element at index (0-based)
   */
  set(index: number, value: unknown): boolean {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return false;
    }

    if (index < 0) {
      console.warn(`Negative index ${index} not allowed for '${this._name}'`);
      return false;
    }

    // Expand array if needed
    while (this._elements.length <= index) {
      this._elements.push(undefined);
    }

    const previousLength = this._elements.length;
    this._elements[index] = value;

    this._recordHistory('set', index, value, previousLength);
    return true;
  }

  // ==========================================================================
  // Stack/Queue Operations
  // ==========================================================================

  /**
   * Append element to end of array
   */
  push(value: unknown): number {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return this._elements.length;
    }

    const previousLength = this._elements.length;
    this._elements.push(value);
    this._recordHistory('push', previousLength, value, previousLength);

    return this._elements.length;
  }

  /**
   * Remove and return last element
   */
  pop(): unknown {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return undefined;
    }

    if (this._elements.length === 0) {
      return undefined;
    }

    const previousLength = this._elements.length;
    const value = this._elements.pop();
    this._recordHistory('pop', previousLength - 1, value, previousLength);

    return value;
  }

  /**
   * Insert element at index (0-based), shifting subsequent elements
   */
  insert(index: number, value: unknown): boolean {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return false;
    }

    if (index < 0) {
      console.warn(`Negative index ${index} not allowed for '${this._name}'`);
      return false;
    }

    const previousLength = this._elements.length;

    // Clamp to valid range
    const insertIndex = Math.min(index, this._elements.length);
    this._elements.splice(insertIndex, 0, value);

    this._recordHistory('insert', insertIndex, value, previousLength);
    return true;
  }

  /**
   * Remove element at index (0-based), shifting subsequent elements
   */
  remove(index: number): unknown {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return undefined;
    }

    if (index < 0 || index >= this._elements.length) {
      return undefined;
    }

    const previousLength = this._elements.length;
    const [value] = this._elements.splice(index, 1);

    this._recordHistory('remove', index, value, previousLength);
    return value;
  }

  /**
   * Clear all elements
   */
  clear(): void {
    if (this._locked) {
      console.warn(`ArrayValue '${this._name}' is locked`);
      return;
    }

    const previousLength = this._elements.length;
    this._elements = [];
    this._recordHistory('clear', undefined, undefined, previousLength);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Check if array contains a value
   */
  contains(value: unknown): boolean {
    return this._elements.includes(value);
  }

  /**
   * Find index of value (0-based), returns -1 if not found
   */
  indexOf(value: unknown): number {
    return this._elements.indexOf(value);
  }

  /**
   * Check if array is empty
   */
  isEmpty(): boolean {
    return this._elements.length === 0;
  }

  /**
   * Get all elements as array (copy)
   */
  getElements(): unknown[] {
    return [...this._elements];
  }

  /**
   * Get element at index (alias for compatibility)
   */
  at(index: number): unknown {
    return this.get(index);
  }

  // ==========================================================================
  // Iteration
  // ==========================================================================

  /**
   * Iterate over elements
   */
  forEach(callback: (value: unknown, index: number) => void): void {
    this._elements.forEach(callback);
  }

  /**
   * Map elements to new values
   */
  map<T>(callback: (value: unknown, index: number) => T): T[] {
    return this._elements.map(callback);
  }

  /**
   * Filter elements
   */
  filter(predicate: (value: unknown, index: number) => boolean): unknown[] {
    return this._elements.filter(predicate);
  }

  /**
   * Find first matching element
   */
  find(predicate: (value: unknown, index: number) => boolean): unknown {
    return this._elements.find(predicate);
  }

  // ==========================================================================
  // Thread Safety
  // ==========================================================================

  /**
   * Lock the array (prevent modifications)
   */
  lock(): void {
    this._locked = true;
  }

  /**
   * Unlock the array
   */
  unlock(): void {
    this._locked = false;
  }

  /**
   * Check if locked
   */
  isLocked(): boolean {
    return this._locked;
  }

  /**
   * Execute a function with the array locked
   */
  withLock<T>(fn: () => T): T {
    const wasLocked = this._locked;
    this._locked = true;
    try {
      return fn();
    } finally {
      this._locked = wasLocked;
    }
  }

  // ==========================================================================
  // History
  // ==========================================================================

  /**
   * Get full history
   */
  getHistory(): ArrayHistoryEntry[] {
    return [...this._history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this._history = [];
  }

  private _recordHistory(
    action: ArrayHistoryEntry['action'],
    index: number | undefined,
    value: unknown,
    previousLength: number
  ): void {
    if (!this._config.trackHistory) {
      return;
    }

    this._history.push({
      action,
      index,
      value,
      timestamp: Date.now(),
      previousLength,
    });

    // Trim history if exceeds max length
    if (
      this._config.maxHistoryLength &&
      this._history.length > this._config.maxHistoryLength
    ) {
      this._history = this._history.slice(-this._config.maxHistoryLength);
    }
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): ArrayValueState {
    return {
      name: this._name,
      elements: [...this._elements],
      history: this._config.trackHistory ? [...this._history] : undefined,
    };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: ArrayValueState): void {
    if (state.name !== this._name) {
      console.warn(
        `State name mismatch: expected '${this._name}', got '${state.name}'`
      );
    }

    this._elements = [...state.elements];

    if (state.history) {
      this._history = [...state.history];
    }
  }

  /**
   * Create a copy of this array
   */
  copy(includeHistory: boolean = false): ArrayValue {
    const copy = new ArrayValue(this._name, [...this._elements], {
      ...this._config,
    });

    if (includeHistory && this._config.trackHistory) {
      copy._history = [...this._history];
    }

    return copy;
  }

  /**
   * String representation
   */
  toString(): string {
    const elements = this._elements
      .slice(0, 5)
      .map((e) => JSON.stringify(e))
      .join(', ');
    const suffix = this._elements.length > 5 ? ', ...' : '';
    return `ArrayValue(${this._name}: [${elements}${suffix}])`;
  }
}

// =============================================================================
// ArrayRegistry - Manager for multiple arrays
// =============================================================================

export interface ArrayRegistryState {
  arrays: Record<string, ArrayValueState>;
}

export class ArrayRegistry {
  private _arrays: Map<string, ArrayValue> = new Map();
  private _defaultConfig: ArrayValueConfig;

  constructor(defaultConfig: Partial<ArrayValueConfig> = {}) {
    this._defaultConfig = { ...DEFAULT_CONFIG, ...defaultConfig };
  }

  /**
   * Define a new array
   */
  define(
    name: string,
    initialElements: unknown[] = [],
    config?: Partial<ArrayValueConfig>
  ): ArrayValue {
    const array = new ArrayValue(name, initialElements, {
      ...this._defaultConfig,
      ...config,
    });
    this._arrays.set(name, array);
    return array;
  }

  /**
   * Get an array by name
   */
  get(name: string): ArrayValue | undefined {
    return this._arrays.get(name);
  }

  /**
   * Check if an array exists
   */
  has(name: string): boolean {
    return this._arrays.has(name);
  }

  /**
   * Remove an array
   */
  remove(name: string): boolean {
    return this._arrays.delete(name);
  }

  /**
   * Get all array names
   */
  getNames(): string[] {
    return Array.from(this._arrays.keys());
  }

  /**
   * Get all arrays
   */
  getAll(): ArrayValue[] {
    return Array.from(this._arrays.values());
  }

  /**
   * Clear all arrays
   */
  clear(): void {
    this._arrays.clear();
  }

  // ==========================================================================
  // Convenience Accessors
  // ==========================================================================

  /**
   * Get element from array
   */
  getElement(arrayName: string, index: number): unknown {
    const array = this._arrays.get(arrayName);
    return array?.get(index);
  }

  /**
   * Set element in array
   */
  setElement(arrayName: string, index: number, value: unknown): boolean {
    const array = this._arrays.get(arrayName);
    return array?.set(index, value) ?? false;
  }

  /**
   * Push element to array
   */
  pushElement(arrayName: string, value: unknown): number {
    const array = this._arrays.get(arrayName);
    return array?.push(value) ?? -1;
  }

  /**
   * Pop element from array
   */
  popElement(arrayName: string): unknown {
    const array = this._arrays.get(arrayName);
    return array?.pop();
  }

  /**
   * Get array length
   */
  getLength(arrayName: string): number {
    const array = this._arrays.get(arrayName);
    return array?.length ?? 0;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): ArrayRegistryState {
    const arrays: Record<string, ArrayValueState> = {};
    for (const [name, array] of this._arrays) {
      arrays[name] = array.getState();
    }
    return { arrays };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: ArrayRegistryState): void {
    for (const [name, arrayState] of Object.entries(state.arrays)) {
      let array = this._arrays.get(name);
      if (!array) {
        array = new ArrayValue(name, [], this._defaultConfig);
        this._arrays.set(name, array);
      }
      array.restoreState(arrayState);
    }
  }

  /**
   * Clone this registry
   */
  clone(includeHistory: boolean = false): ArrayRegistry {
    const cloned = new ArrayRegistry({ ...this._defaultConfig });
    for (const [name, array] of this._arrays) {
      cloned._arrays.set(name, array.copy(includeHistory));
    }
    return cloned;
  }
}
