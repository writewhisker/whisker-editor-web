/**
 * LIST State Machine Module
 *
 * Provides a dedicated state machine class for managing LIST variables
 * in story playback. Extends the base ListValue with:
 * - Event-based state transitions with enter/exit callbacks
 * - State transition history tracking
 * - Thread-safe operations for ThreadedStoryPlayer
 * - Integration with save/restore state system
 */

import { ListValue, ListRegistry, parseListDeclaration } from '@writewhisker/scripting';

/**
 * Callback function signature for state transitions
 */
export type StateTransitionCallback = (
  state: string,
  action: 'enter' | 'exit',
  machine: ListStateMachine
) => void;

/**
 * State transition event
 */
export interface StateTransitionEvent {
  state: string;
  action: 'enter' | 'exit';
  timestamp: number;
  previousStates: string[];
}

/**
 * State machine configuration
 */
export interface ListStateMachineConfig {
  /** Whether to track transition history */
  trackHistory?: boolean;
  /** Maximum history entries to keep (0 = unlimited) */
  maxHistoryLength?: number;
  /** Whether to allow undefined states */
  allowUndefinedStates?: boolean;
  /** Callback for all state transitions */
  onTransition?: StateTransitionCallback;
}

/**
 * Serialized state machine state
 */
export interface ListStateMachineState {
  name: string;
  validStates: string[];
  activeStates: string[];
  history?: StateTransitionEvent[];
}

/**
 * ListStateMachine - Enhanced LIST with state machine capabilities
 *
 * Wraps the base ListValue from the scripting package and adds
 * event-driven state management features for story playback.
 */
export class ListStateMachine {
  private list: ListValue;
  private config: ListStateMachineConfig;
  private history: StateTransitionEvent[] = [];
  private stateCallbacks: Map<string, {
    onEnter?: StateTransitionCallback;
    onExit?: StateTransitionCallback;
  }> = new Map();
  private locked: boolean = false;

  constructor(
    name: string,
    validStates: string[] = [],
    initialActive: string[] = [],
    config: ListStateMachineConfig = {}
  ) {
    this.list = new ListValue(name, validStates, initialActive);
    this.config = {
      trackHistory: config.trackHistory ?? false,
      maxHistoryLength: config.maxHistoryLength ?? 100,
      allowUndefinedStates: config.allowUndefinedStates ?? false,
      onTransition: config.onTransition,
    };

    // Record initial state entries if tracking history
    if (this.config.trackHistory && initialActive.length > 0) {
      for (const state of initialActive) {
        this.recordTransition(state, 'enter', []);
      }
    }
  }

  /**
   * Create from an existing ListValue
   */
  static fromListValue(list: ListValue, config?: ListStateMachineConfig): ListStateMachine {
    return new ListStateMachine(
      list.getName(),
      list.getValidStates(),
      list.getActiveStates(),
      config
    );
  }

  /**
   * Create from a LIST declaration string
   * Format: "state1, (activeState), state2"
   */
  static fromDeclaration(
    name: string,
    declaration: string,
    config?: ListStateMachineConfig
  ): ListStateMachine {
    const parsed = parseListDeclaration(declaration);
    const validStates = parsed.map(p => p.state);
    const activeStates = parsed.filter(p => p.active).map(p => p.state);
    return new ListStateMachine(name, validStates, activeStates, config);
  }

  // ============ Basic Properties ============

  /**
   * Get the machine name
   */
  getName(): string {
    return this.list.getName();
  }

  /**
   * Get all valid states
   */
  getValidStates(): string[] {
    return this.list.getValidStates();
  }

  /**
   * Get currently active states
   */
  getActiveStates(): string[] {
    return this.list.getActiveStates();
  }

  /**
   * Get the underlying ListValue
   */
  getListValue(): ListValue {
    return this.list;
  }

  // ============ State Transitions ============

  /**
   * Enter a state (make it active)
   * Triggers onEnter callback if registered
   */
  enter(state: string): void {
    this.ensureUnlocked();

    if (!this.list.contains(state)) {
      const previousStates = this.list.getActiveStates();
      this.list.add(state);
      this.recordTransition(state, 'enter', previousStates);
      this.triggerCallback(state, 'enter');
    }
  }

  /**
   * Exit a state (make it inactive)
   * Triggers onExit callback if registered
   */
  exit(state: string): void {
    this.ensureUnlocked();

    if (this.list.contains(state)) {
      const previousStates = this.list.getActiveStates();
      this.list.remove(state);
      this.recordTransition(state, 'exit', previousStates);
      this.triggerCallback(state, 'exit');
    }
  }

  /**
   * Toggle a state (enter if not active, exit if active)
   * Returns the new active status
   */
  toggle(state: string): boolean {
    if (this.list.contains(state)) {
      this.exit(state);
      return false;
    } else {
      this.enter(state);
      return true;
    }
  }

  /**
   * Transition to exactly one state (exit all others, enter this one)
   * Useful for exclusive state machines (like door: open/closed)
   */
  transitionTo(state: string): void {
    this.ensureUnlocked();

    const previousStates = this.list.getActiveStates();

    // Exit all current states
    for (const currentState of previousStates) {
      if (currentState !== state) {
        this.list.remove(currentState);
        this.recordTransition(currentState, 'exit', previousStates);
        this.triggerCallback(currentState, 'exit');
      }
    }

    // Enter the new state if not already active
    if (!previousStates.includes(state)) {
      this.list.add(state);
      this.recordTransition(state, 'enter', previousStates);
      this.triggerCallback(state, 'enter');
    }
  }

  /**
   * Reset to initial states (clear all states)
   */
  reset(): void {
    this.ensureUnlocked();

    const previousStates = this.list.getActiveStates();

    for (const state of previousStates) {
      this.list.remove(state);
      this.recordTransition(state, 'exit', previousStates);
      this.triggerCallback(state, 'exit');
    }
  }

  // ============ State Queries ============

  /**
   * Check if a state is currently active
   */
  isActive(state: string): boolean {
    return this.list.contains(state);
  }

  /**
   * Check if any of the given states is active
   */
  isAnyActive(...states: string[]): boolean {
    return states.some(state => this.list.contains(state));
  }

  /**
   * Check if all of the given states are active
   */
  areAllActive(...states: string[]): boolean {
    return states.every(state => this.list.contains(state));
  }

  /**
   * Get count of active states
   */
  count(): number {
    return this.list.count();
  }

  /**
   * Check if no states are active
   */
  isEmpty(): boolean {
    return this.list.isEmpty();
  }

  // ============ Callbacks ============

  /**
   * Register callbacks for a specific state
   */
  onState(
    state: string,
    callbacks: { onEnter?: StateTransitionCallback; onExit?: StateTransitionCallback }
  ): void {
    this.stateCallbacks.set(state, callbacks);
  }

  /**
   * Remove callbacks for a state
   */
  offState(state: string): void {
    this.stateCallbacks.delete(state);
  }

  /**
   * Clear all state callbacks
   */
  clearCallbacks(): void {
    this.stateCallbacks.clear();
  }

  // ============ History ============

  /**
   * Get transition history
   */
  getHistory(): StateTransitionEvent[] {
    return [...this.history];
  }

  /**
   * Clear transition history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get the last N transitions
   */
  getRecentTransitions(count: number): StateTransitionEvent[] {
    return this.history.slice(-count);
  }

  /**
   * Find when a state was last entered
   */
  getLastEntry(state: string): StateTransitionEvent | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].state === state && this.history[i].action === 'enter') {
        return this.history[i];
      }
    }
    return undefined;
  }

  /**
   * Find when a state was last exited
   */
  getLastExit(state: string): StateTransitionEvent | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].state === state && this.history[i].action === 'exit') {
        return this.history[i];
      }
    }
    return undefined;
  }

  // ============ Thread Safety ============

  /**
   * Lock the state machine to prevent modifications
   * Useful for thread-safe read operations
   */
  lock(): void {
    this.locked = true;
  }

  /**
   * Unlock the state machine
   */
  unlock(): void {
    this.locked = false;
  }

  /**
   * Check if the machine is locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Execute a function with the machine locked
   * Automatically unlocks after execution
   */
  withLock<T>(fn: (machine: ListStateMachine) => T): T {
    this.lock();
    try {
      return fn(this);
    } finally {
      this.unlock();
    }
  }

  // ============ Serialization ============

  /**
   * Get current state for serialization
   */
  getState(): ListStateMachineState {
    return {
      name: this.list.getName(),
      validStates: this.list.getValidStates(),
      activeStates: this.list.getActiveStates(),
      history: this.config.trackHistory ? [...this.history] : undefined,
    };
  }

  /**
   * Restore from serialized state
   */
  restoreState(state: ListStateMachineState): void {
    this.ensureUnlocked();

    // Clear current state without triggering callbacks
    this.list = new ListValue(state.name, state.validStates, state.activeStates);

    // Restore history if provided
    if (state.history) {
      this.history = [...state.history];
    }
  }

  /**
   * Create a new machine from serialized state
   */
  static fromState(
    state: ListStateMachineState,
    config?: ListStateMachineConfig
  ): ListStateMachine {
    const machine = new ListStateMachine(
      state.name,
      state.validStates,
      state.activeStates,
      config
    );
    if (state.history) {
      machine.history = [...state.history];
    }
    return machine;
  }

  /**
   * Clone this machine
   */
  clone(includeHistory: boolean = true): ListStateMachine {
    const cloned = new ListStateMachine(
      this.list.getName(),
      this.list.getValidStates(),
      this.list.getActiveStates(),
      { ...this.config }
    );

    if (includeHistory) {
      cloned.history = [...this.history];
    }

    // Clone callbacks
    for (const [state, callbacks] of this.stateCallbacks) {
      cloned.stateCallbacks.set(state, { ...callbacks });
    }

    return cloned;
  }

  // ============ Private Helpers ============

  private ensureUnlocked(): void {
    if (this.locked) {
      throw new Error(`ListStateMachine '${this.list.getName()}' is locked`);
    }
  }

  private recordTransition(
    state: string,
    action: 'enter' | 'exit',
    previousStates: string[]
  ): void {
    if (!this.config.trackHistory) return;

    this.history.push({
      state,
      action,
      timestamp: Date.now(),
      previousStates,
    });

    // Trim history if needed
    if (this.config.maxHistoryLength && this.config.maxHistoryLength > 0) {
      while (this.history.length > this.config.maxHistoryLength) {
        this.history.shift();
      }
    }
  }

  private triggerCallback(state: string, action: 'enter' | 'exit'): void {
    // Call global transition callback
    if (this.config.onTransition) {
      this.config.onTransition(state, action, this);
    }

    // Call state-specific callback
    const callbacks = this.stateCallbacks.get(state);
    if (callbacks) {
      if (action === 'enter' && callbacks.onEnter) {
        callbacks.onEnter(state, action, this);
      } else if (action === 'exit' && callbacks.onExit) {
        callbacks.onExit(state, action, this);
      }
    }
  }
}

/**
 * Registry for managing multiple ListStateMachines
 */
export class ListStateMachineRegistry {
  private machines: Map<string, ListStateMachine> = new Map();
  private defaultConfig: ListStateMachineConfig;

  constructor(defaultConfig: ListStateMachineConfig = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Create from an existing ListRegistry
   */
  static fromListRegistry(
    registry: ListRegistry,
    config?: ListStateMachineConfig
  ): ListStateMachineRegistry {
    const machineRegistry = new ListStateMachineRegistry(config);
    for (const name of registry.getNames()) {
      const list = registry.get(name);
      if (list) {
        machineRegistry.machines.set(name, ListStateMachine.fromListValue(list, config));
      }
    }
    return machineRegistry;
  }

  /**
   * Declare a new list state machine
   */
  declare(
    name: string,
    declaration: string,
    config?: ListStateMachineConfig
  ): ListStateMachine {
    const machine = ListStateMachine.fromDeclaration(
      name,
      declaration,
      config ?? this.defaultConfig
    );
    this.machines.set(name, machine);
    return machine;
  }

  /**
   * Add an existing machine
   */
  add(machine: ListStateMachine): void {
    this.machines.set(machine.getName(), machine);
  }

  /**
   * Get a machine by name
   */
  get(name: string): ListStateMachine | undefined {
    return this.machines.get(name);
  }

  /**
   * Check if a machine exists
   */
  has(name: string): boolean {
    return this.machines.has(name);
  }

  /**
   * Get all machine names
   */
  getNames(): string[] {
    return Array.from(this.machines.keys());
  }

  /**
   * Get all machines
   */
  getAll(): ListStateMachine[] {
    return Array.from(this.machines.values());
  }

  /**
   * Remove a machine
   */
  remove(name: string): boolean {
    return this.machines.delete(name);
  }

  /**
   * Clear all machines
   */
  clear(): void {
    this.machines.clear();
  }

  /**
   * Get serialized state of all machines
   */
  getState(): Record<string, ListStateMachineState> {
    const result: Record<string, ListStateMachineState> = {};
    for (const [name, machine] of this.machines) {
      result[name] = machine.getState();
    }
    return result;
  }

  /**
   * Restore all machines from serialized state
   */
  restoreState(state: Record<string, ListStateMachineState>): void {
    for (const [name, machineState] of Object.entries(state)) {
      const existing = this.machines.get(name);
      if (existing) {
        existing.restoreState(machineState);
      } else {
        this.machines.set(name, ListStateMachine.fromState(machineState, this.defaultConfig));
      }
    }
  }

  /**
   * Clone this registry
   */
  clone(includeHistory: boolean = true): ListStateMachineRegistry {
    const cloned = new ListStateMachineRegistry({ ...this.defaultConfig });
    for (const [name, machine] of this.machines) {
      cloned.machines.set(name, machine.clone(includeHistory));
    }
    return cloned;
  }
}

/**
 * Create a simple state machine for exclusive states
 * Convenience function for common patterns like doors, switches, etc.
 */
export function createExclusiveStateMachine(
  name: string,
  states: string[],
  initialState?: string,
  config?: ListStateMachineConfig
): ListStateMachine {
  const initial = initialState ? [initialState] : states.length > 0 ? [states[0]] : [];
  return new ListStateMachine(name, states, initial, config);
}

/**
 * Create a flag-based state machine where multiple states can be active
 * Convenience function for tracking multiple conditions
 */
export function createFlagStateMachine(
  name: string,
  flags: string[],
  initialFlags: string[] = [],
  config?: ListStateMachineConfig
): ListStateMachine {
  return new ListStateMachine(name, flags, initialFlags, config);
}
