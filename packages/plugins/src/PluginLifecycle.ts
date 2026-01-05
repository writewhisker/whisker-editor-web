/**
 * Plugin Lifecycle State Machine
 * Manages plugin state transitions and validates lifecycle operations
 */

import type { PluginState, StateTransition } from './types';

/**
 * Valid lifecycle states
 */
export const STATES: PluginState[] = [
  'discovered',   // Plugin found during directory scan, metadata extracted
  'loaded',       // Plugin module loaded into memory, validated
  'initialized',  // on_init hook executed, plugin received context
  'enabled',      // on_enable hook executed, plugin actively participating
  'disabled',     // on_disable hook executed, plugin temporarily inactive
  'destroyed',    // on_destroy hook executed, plugin completely unloaded
  'error',        // Plugin encountered error during lifecycle transition
];

/**
 * Valid state transitions
 * Maps each state to an array of valid target states
 */
export const TRANSITIONS: Record<PluginState, PluginState[]> = {
  discovered: ['loaded', 'error'],
  loaded: ['initialized', 'error'],
  initialized: ['enabled', 'error'],
  enabled: ['disabled', 'error'],
  disabled: ['enabled', 'destroyed', 'error'],
  error: ['destroyed'],
  destroyed: [],  // Terminal state, no transitions allowed
};

/**
 * Hook names associated with transitions
 * Maps transition (from:to) to the hook(s) to call
 */
export const TRANSITION_HOOKS: Record<string, string[]> = {
  'loaded:initialized': ['on_load', 'on_init'],
  'initialized:enabled': ['on_enable'],
  'enabled:disabled': ['on_disable'],
  'disabled:enabled': ['on_enable'],
  'disabled:destroyed': ['on_destroy'],
  'error:destroyed': ['on_destroy'],
};

/**
 * Check if a state is valid
 */
export function isValidState(state: string): state is PluginState {
  return STATES.includes(state as PluginState);
}

/**
 * Check if state transition is valid
 */
export function isValidTransition(from: PluginState, to: PluginState): boolean {
  const allowed = TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Get allowed transitions from state
 */
export function getAllowedTransitions(from: PluginState): PluginState[] {
  return TRANSITIONS[from] || [];
}

/**
 * Get hooks to execute for a transition
 */
export function getTransitionHooks(from: PluginState, to: PluginState): string[] | undefined {
  const key = `${from}:${to}`;
  return TRANSITION_HOOKS[key];
}

/**
 * Check if a state is terminal (no further transitions)
 */
export function isTerminalState(state: PluginState): boolean {
  const transitions = TRANSITIONS[state];
  return !transitions || transitions.length === 0;
}

/**
 * Check if a state indicates the plugin is active
 */
export function isActiveState(state: PluginState): boolean {
  return state === 'enabled';
}

/**
 * Check if a state indicates the plugin can be safely destroyed
 */
export function canDestroy(state: PluginState): boolean {
  if (state === 'destroyed') {
    return false;  // Already destroyed
  }
  return state === 'error' || state === 'disabled';
}

/**
 * Get the path from current state to target state
 * Returns undefined if no valid path exists
 */
export function getTransitionPath(from: PluginState, to: PluginState): PluginState[] | undefined {
  if (from === to) {
    return [];
  }

  // BFS to find shortest path
  interface QueueEntry {
    state: PluginState;
    path: PluginState[];
  }

  const queue: QueueEntry[] = [{ state: from, path: [] }];
  const visited = new Set<PluginState>([from]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const allowed = getAllowedTransitions(current.state);

    for (const nextState of allowed) {
      if (!visited.has(nextState)) {
        const newPath = [...current.path, nextState];

        if (nextState === to) {
          return newPath;
        }

        visited.add(nextState);
        queue.push({ state: nextState, path: newPath });
      }
    }
  }

  return undefined;  // No path found
}

/**
 * State machine instance for tracking a plugin
 */
export class PluginStateMachine {
  private _state: PluginState;
  private _history: StateTransition[] = [];
  private _error: string | undefined;

  constructor(initialState: PluginState = 'discovered') {
    this._state = initialState;
  }

  /**
   * Factory method
   */
  static create(initialState?: PluginState): PluginStateMachine {
    return new PluginStateMachine(initialState);
  }

  /**
   * Get current state
   */
  getState(): PluginState {
    return this._state;
  }

  /**
   * Get error message (if in error state)
   */
  getError(): string | undefined {
    return this._error;
  }

  /**
   * Get state transition history
   */
  getHistory(): StateTransition[] {
    return [...this._history];
  }

  /**
   * Transition to new state
   */
  transition(to: PluginState, errorMsg?: string): { success: boolean; error?: string } {
    const from = this._state;

    if (!isValidTransition(from, to)) {
      return {
        success: false,
        error: `Invalid transition: ${from} -> ${to}`,
      };
    }

    // Record history
    this._history.push({
      from,
      to,
      timestamp: Date.now(),
    });

    this._state = to;

    if (to === 'error') {
      this._error = errorMsg;
    } else {
      this._error = undefined;
    }

    return { success: true };
  }

  /**
   * Check if can transition to state
   */
  canTransition(to: PluginState): boolean {
    return isValidTransition(this._state, to);
  }

  /**
   * Get allowed next states
   */
  getAllowedNext(): PluginState[] {
    return getAllowedTransitions(this._state);
  }

  /**
   * Check if plugin is in active state
   */
  isActive(): boolean {
    return isActiveState(this._state);
  }

  /**
   * Check if plugin is in terminal state
   */
  isTerminal(): boolean {
    return isTerminalState(this._state);
  }

  /**
   * Reset state machine
   */
  reset(): void {
    this._state = 'discovered';
    this._history = [];
    this._error = undefined;
  }
}

/**
 * PluginLifecycle namespace export
 */
export const PluginLifecycle = {
  STATES,
  TRANSITIONS,
  TRANSITION_HOOKS,
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  getTransitionHooks,
  isTerminalState,
  isActiveState,
  canDestroy,
  getTransitionPath,
  createStateMachine: PluginStateMachine.create,
};

export default PluginLifecycle;
