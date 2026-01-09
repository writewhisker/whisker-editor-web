/**
 * ListValue - State Machine
 *
 * Represents a set of possible states with tracking for which are currently active.
 * Supports exclusive (one active at a time) and flags (multiple active) modes.
 * Includes history tracking, callbacks, and thread-safe locking.
 *
 * Reference: whisker-core/lib/whisker/runtime/list_state_machine.lua
 */

import type {
  ListValueConfig,
  HistoryEntry,
  StateCallback,
  ListValueState,
} from './runtime-types';

const DEFAULT_CONFIG: ListValueConfig = {
  trackHistory: false,
  maxHistoryLength: 100,
  allowUndefinedStates: false,
  onTransition: undefined,
};

export class ListValue {
  private _name: string;
  private _possibleValues: Set<string>;
  private _activeValues: Set<string>;
  private _stateCallbacks: Map<string, StateCallback>;
  private _history: HistoryEntry[];
  private _locked: boolean;
  private _config: ListValueConfig;

  constructor(
    name: string,
    possibleValues: string[],
    initialValues: string[] = [],
    config: Partial<ListValueConfig> = {}
  ) {
    this._name = name;
    this._possibleValues = new Set(possibleValues);
    this._activeValues = new Set();
    this._stateCallbacks = new Map();
    this._history = [];
    this._locked = false;
    this._config = { ...DEFAULT_CONFIG, ...config };

    // Initialize with initial values
    for (const value of initialValues) {
      if (this._possibleValues.has(value) || this._config.allowUndefinedStates) {
        this._activeValues.add(value);
      }
    }
  }

  // ==========================================================================
  // Properties
  // ==========================================================================

  get name(): string {
    return this._name;
  }

  // ==========================================================================
  // State Manipulation
  // ==========================================================================

  /**
   * Add a state to active values
   */
  add(state: string): boolean {
    if (this._locked) {
      console.warn(`ListValue '${this._name}' is locked`);
      return false;
    }

    if (!this._possibleValues.has(state) && !this._config.allowUndefinedStates) {
      console.warn(`State '${state}' is not a possible value for '${this._name}'`);
      return false;
    }

    if (this._activeValues.has(state)) {
      return false; // Already active
    }

    const previousStates = Array.from(this._activeValues);
    this._activeValues.add(state);

    this._recordHistory(state, 'add', previousStates);
    this._triggerCallback(state, 'onEnter');
    this._notifyTransition(previousStates, Array.from(this._activeValues));

    return true;
  }

  /**
   * Remove a state from active values
   */
  remove(state: string): boolean {
    if (this._locked) {
      console.warn(`ListValue '${this._name}' is locked`);
      return false;
    }

    if (!this._activeValues.has(state)) {
      return false; // Not active
    }

    const previousStates = Array.from(this._activeValues);
    this._activeValues.delete(state);

    this._recordHistory(state, 'remove', previousStates);
    this._triggerCallback(state, 'onExit');
    this._notifyTransition(previousStates, Array.from(this._activeValues));

    return true;
  }

  /**
   * Toggle a state (add if not active, remove if active)
   */
  toggle(state: string): boolean {
    if (this._activeValues.has(state)) {
      return this.remove(state);
    } else {
      return this.add(state);
    }
  }

  /**
   * Enter a state (exclusive - clears all others)
   */
  enter(state: string): boolean {
    if (this._locked) {
      console.warn(`ListValue '${this._name}' is locked`);
      return false;
    }

    if (!this._possibleValues.has(state) && !this._config.allowUndefinedStates) {
      console.warn(`State '${state}' is not a possible value for '${this._name}'`);
      return false;
    }

    const previousStates = Array.from(this._activeValues);

    // Exit all current states
    for (const activeState of previousStates) {
      this._triggerCallback(activeState, 'onExit');
    }

    this._activeValues.clear();
    this._activeValues.add(state);

    this._recordHistory(state, 'enter', previousStates);
    this._triggerCallback(state, 'onEnter');
    this._notifyTransition(previousStates, [state]);

    return true;
  }

  /**
   * Exit a specific state
   */
  exit(state: string): boolean {
    return this.remove(state);
  }

  /**
   * Transition from one state to another (exclusive)
   */
  transitionTo(state: string): boolean {
    return this.enter(state);
  }

  /**
   * Set active states to exactly the given values
   */
  set(states: string[]): boolean {
    if (this._locked) {
      console.warn(`ListValue '${this._name}' is locked`);
      return false;
    }

    const previousStates = Array.from(this._activeValues);

    // Validate all states
    if (!this._config.allowUndefinedStates) {
      for (const state of states) {
        if (!this._possibleValues.has(state)) {
          console.warn(`State '${state}' is not a possible value for '${this._name}'`);
          return false;
        }
      }
    }

    // Trigger exit callbacks for states being removed
    for (const state of previousStates) {
      if (!states.includes(state)) {
        this._triggerCallback(state, 'onExit');
      }
    }

    this._activeValues = new Set(states);

    // Trigger enter callbacks for states being added
    for (const state of states) {
      if (!previousStates.includes(state)) {
        this._triggerCallback(state, 'onEnter');
      }
    }

    this._recordHistory(states.join(','), 'set', previousStates);
    this._notifyTransition(previousStates, states);

    return true;
  }

  /**
   * Reset to initial empty state
   */
  reset(): void {
    if (this._locked) {
      console.warn(`ListValue '${this._name}' is locked`);
      return;
    }

    const previousStates = Array.from(this._activeValues);

    for (const state of previousStates) {
      this._triggerCallback(state, 'onExit');
    }

    this._activeValues.clear();
    this._recordHistory('', 'reset', previousStates);
    this._notifyTransition(previousStates, []);
  }

  /**
   * Clear all active states (alias for reset)
   */
  clear(): void {
    this.reset();
  }

  // ==========================================================================
  // State Queries
  // ==========================================================================

  /**
   * Check if a state is active
   */
  contains(state: string): boolean {
    return this._activeValues.has(state);
  }

  /**
   * Check if a state is active (alias for contains)
   */
  includes(state: string): boolean {
    return this.contains(state);
  }

  /**
   * Check if this list's active values are a subset of another list's
   */
  isSubsetOf(other: ListValue): boolean {
    for (const state of this._activeValues) {
      if (!other._activeValues.has(state)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if active values equal another list's active values
   */
  equals(other: ListValue): boolean {
    if (this._activeValues.size !== other._activeValues.size) {
      return false;
    }

    for (const state of this._activeValues) {
      if (!other._activeValues.has(state)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get count of active states
   */
  count(): number {
    return this._activeValues.size;
  }

  /**
   * Check if no states are active
   */
  isEmpty(): boolean {
    return this._activeValues.size === 0;
  }

  /**
   * Check if any of the given states are active
   */
  isAnyActive(states: string[]): boolean {
    for (const state of states) {
      if (this._activeValues.has(state)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if all of the given states are active
   */
  areAllActive(states: string[]): boolean {
    for (const state of states) {
      if (!this._activeValues.has(state)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all active states as array
   */
  getActiveValues(): string[] {
    return Array.from(this._activeValues);
  }

  /**
   * Get all possible states as array
   */
  getPossibleValues(): string[] {
    return Array.from(this._possibleValues);
  }

  /**
   * Get the first (or only) active value
   */
  getValue(): string | undefined {
    return this._activeValues.values().next().value;
  }

  // ==========================================================================
  // Callbacks
  // ==========================================================================

  /**
   * Register callbacks for a state
   */
  onState(state: string, callbacks: StateCallback): void {
    const existing = this._stateCallbacks.get(state) || {};
    this._stateCallbacks.set(state, { ...existing, ...callbacks });
  }

  /**
   * Remove callbacks for a state
   */
  offState(state: string): void {
    this._stateCallbacks.delete(state);
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this._stateCallbacks.clear();
  }

  private _triggerCallback(
    state: string,
    event: 'onEnter' | 'onExit'
  ): void {
    const callbacks = this._stateCallbacks.get(state);
    if (callbacks && callbacks[event]) {
      try {
        callbacks[event]!();
      } catch (error) {
        console.error(`Callback error for ${state}.${event}:`, error);
      }
    }
  }

  private _notifyTransition(from: string[], to: string[]): void {
    if (this._config.onTransition) {
      try {
        this._config.onTransition(from, to);
      } catch (error) {
        console.error('Transition callback error:', error);
      }
    }
  }

  // ==========================================================================
  // History
  // ==========================================================================

  /**
   * Get full history
   */
  getHistory(): HistoryEntry[] {
    return [...this._history];
  }

  /**
   * Get recent transitions (last N entries)
   */
  getRecentTransitions(count: number = 10): HistoryEntry[] {
    return this._history.slice(-count);
  }

  /**
   * Get last entry into a specific state
   */
  getLastEntry(state: string): HistoryEntry | undefined {
    for (let i = this._history.length - 1; i >= 0; i--) {
      const entry = this._history[i];
      if (
        entry.state === state &&
        (entry.action === 'enter' || entry.action === 'add')
      ) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get last exit from a specific state
   */
  getLastExit(state: string): HistoryEntry | undefined {
    for (let i = this._history.length - 1; i >= 0; i--) {
      const entry = this._history[i];
      if (
        entry.state === state &&
        (entry.action === 'exit' || entry.action === 'remove')
      ) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this._history = [];
  }

  private _recordHistory(
    state: string,
    action: HistoryEntry['action'],
    previousStates: string[]
  ): void {
    if (!this._config.trackHistory) {
      return;
    }

    this._history.push({
      state,
      action,
      timestamp: Date.now(),
      previousStates,
    });

    // Trim history if exceeds max length
    if (this._history.length > this._config.maxHistoryLength) {
      this._history = this._history.slice(-this._config.maxHistoryLength);
    }
  }

  // ==========================================================================
  // Thread Safety
  // ==========================================================================

  /**
   * Lock the list value (prevent modifications)
   */
  lock(): void {
    this._locked = true;
  }

  /**
   * Unlock the list value
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
   * Execute a function with the list locked
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
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): ListValueState {
    return {
      name: this._name,
      possibleValues: Array.from(this._possibleValues),
      activeValues: Array.from(this._activeValues),
      history: this._config.trackHistory ? [...this._history] : undefined,
    };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: ListValueState): void {
    if (state.name !== this._name) {
      console.warn(
        `State name mismatch: expected '${this._name}', got '${state.name}'`
      );
    }

    this._possibleValues = new Set(state.possibleValues);
    this._activeValues = new Set(state.activeValues);

    if (state.history) {
      this._history = [...state.history];
    }
  }

  /**
   * Create a copy of this list value
   */
  copy(includeHistory: boolean = false): ListValue {
    const copy = new ListValue(
      this._name,
      Array.from(this._possibleValues),
      Array.from(this._activeValues),
      { ...this._config }
    );

    if (includeHistory && this._config.trackHistory) {
      copy._history = [...this._history];
    }

    // Copy callbacks
    for (const [state, callbacks] of this._stateCallbacks) {
      copy._stateCallbacks.set(state, { ...callbacks });
    }

    return copy;
  }

  /**
   * String representation
   */
  toString(): string {
    const active = Array.from(this._activeValues).join(', ');
    return `ListValue(${this._name}: [${active}])`;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an exclusive list (only one state active at a time)
 */
export function createExclusive(
  name: string,
  states: string[],
  initial?: string,
  config?: Partial<ListValueConfig>
): ListValue {
  const list = new ListValue(name, states, initial ? [initial] : [], config);
  return list;
}

/**
 * Create a flags list (multiple states can be active)
 */
export function createFlags(
  name: string,
  flags: string[],
  initial: string[] = [],
  config?: Partial<ListValueConfig>
): ListValue {
  return new ListValue(name, flags, initial, config);
}

/**
 * Create a list value from a state object
 */
export function fromState(
  state: ListValueState,
  config?: Partial<ListValueConfig>
): ListValue {
  const list = new ListValue(
    state.name,
    state.possibleValues,
    state.activeValues,
    config
  );

  if (state.history) {
    list.restoreState(state);
  }

  return list;
}
