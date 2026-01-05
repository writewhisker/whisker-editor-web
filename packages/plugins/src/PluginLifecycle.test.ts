/**
 * Tests for PluginLifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PluginLifecycle,
  PluginStateMachine,
  STATES,
  TRANSITIONS,
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  getTransitionHooks,
  isTerminalState,
  isActiveState,
  canDestroy,
  getTransitionPath,
} from './PluginLifecycle';

describe('PluginLifecycle', () => {
  describe('STATES', () => {
    it('includes all expected states', () => {
      expect(STATES).toContain('discovered');
      expect(STATES).toContain('loaded');
      expect(STATES).toContain('initialized');
      expect(STATES).toContain('enabled');
      expect(STATES).toContain('disabled');
      expect(STATES).toContain('destroyed');
      expect(STATES).toContain('error');
    });
  });

  describe('isValidState', () => {
    it('returns true for valid states', () => {
      for (const state of STATES) {
        expect(isValidState(state)).toBe(true);
      }
    });

    it('returns false for invalid states', () => {
      expect(isValidState('invalid')).toBe(false);
      expect(isValidState('')).toBe(false);
    });
  });

  describe('isValidTransition', () => {
    it('allows discovered -> loaded', () => {
      expect(isValidTransition('discovered', 'loaded')).toBe(true);
    });

    it('allows loaded -> initialized', () => {
      expect(isValidTransition('loaded', 'initialized')).toBe(true);
    });

    it('allows initialized -> enabled', () => {
      expect(isValidTransition('initialized', 'enabled')).toBe(true);
    });

    it('allows enabled -> disabled', () => {
      expect(isValidTransition('enabled', 'disabled')).toBe(true);
    });

    it('allows disabled -> enabled', () => {
      expect(isValidTransition('disabled', 'enabled')).toBe(true);
    });

    it('allows disabled -> destroyed', () => {
      expect(isValidTransition('disabled', 'destroyed')).toBe(true);
    });

    it('allows any state -> error', () => {
      expect(isValidTransition('discovered', 'error')).toBe(true);
      expect(isValidTransition('loaded', 'error')).toBe(true);
      expect(isValidTransition('enabled', 'error')).toBe(true);
    });

    it('disallows invalid transitions', () => {
      expect(isValidTransition('discovered', 'enabled')).toBe(false);
      expect(isValidTransition('enabled', 'loaded')).toBe(false);
      expect(isValidTransition('destroyed', 'enabled')).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns correct transitions for each state', () => {
      expect(getAllowedTransitions('discovered')).toEqual(['loaded', 'error']);
      expect(getAllowedTransitions('enabled')).toEqual(['disabled', 'error']);
      expect(getAllowedTransitions('destroyed')).toEqual([]);
    });
  });

  describe('getTransitionHooks', () => {
    it('returns hooks for lifecycle transitions', () => {
      expect(getTransitionHooks('loaded', 'initialized')).toEqual(['on_load', 'on_init']);
      expect(getTransitionHooks('initialized', 'enabled')).toEqual(['on_enable']);
      expect(getTransitionHooks('enabled', 'disabled')).toEqual(['on_disable']);
    });

    it('returns undefined for transitions without hooks', () => {
      expect(getTransitionHooks('discovered', 'loaded')).toBeUndefined();
    });
  });

  describe('isTerminalState', () => {
    it('returns true only for destroyed', () => {
      expect(isTerminalState('destroyed')).toBe(true);
      expect(isTerminalState('enabled')).toBe(false);
      expect(isTerminalState('error')).toBe(false);
    });
  });

  describe('isActiveState', () => {
    it('returns true only for enabled', () => {
      expect(isActiveState('enabled')).toBe(true);
      expect(isActiveState('initialized')).toBe(false);
      expect(isActiveState('disabled')).toBe(false);
    });
  });

  describe('canDestroy', () => {
    it('returns true for disabled and error', () => {
      expect(canDestroy('disabled')).toBe(true);
      expect(canDestroy('error')).toBe(true);
    });

    it('returns false for other states', () => {
      expect(canDestroy('enabled')).toBe(false);
      expect(canDestroy('destroyed')).toBe(false);
      expect(canDestroy('initialized')).toBe(false);
    });
  });

  describe('getTransitionPath', () => {
    it('returns empty array when already at target', () => {
      expect(getTransitionPath('enabled', 'enabled')).toEqual([]);
    });

    it('finds direct path', () => {
      expect(getTransitionPath('discovered', 'loaded')).toEqual(['loaded']);
    });

    it('finds multi-step path', () => {
      const path = getTransitionPath('discovered', 'enabled');
      expect(path).toEqual(['loaded', 'initialized', 'enabled']);
    });

    it('returns undefined for impossible paths', () => {
      expect(getTransitionPath('destroyed', 'enabled')).toBeUndefined();
    });
  });
});

describe('PluginStateMachine', () => {
  let machine: PluginStateMachine;

  beforeEach(() => {
    machine = PluginStateMachine.create();
  });

  describe('factory method', () => {
    it('creates with default state', () => {
      const m = PluginStateMachine.create();
      expect(m.getState()).toBe('discovered');
    });

    it('creates with custom initial state', () => {
      const m = PluginStateMachine.create('loaded');
      expect(m.getState()).toBe('loaded');
    });
  });

  describe('transition', () => {
    it('transitions to valid state', () => {
      const result = machine.transition('loaded');
      expect(result.success).toBe(true);
      expect(machine.getState()).toBe('loaded');
    });

    it('rejects invalid transition', () => {
      const result = machine.transition('enabled');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(machine.getState()).toBe('discovered');
    });

    it('records transition in history', () => {
      machine.transition('loaded');
      const history = machine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe('discovered');
      expect(history[0].to).toBe('loaded');
    });

    it('stores error message when transitioning to error', () => {
      machine.transition('error', 'Something went wrong');
      expect(machine.getError()).toBe('Something went wrong');
    });

    it('clears error when transitioning away from error', () => {
      machine.transition('error', 'Error');
      machine.transition('destroyed');
      expect(machine.getError()).toBeUndefined();
    });
  });

  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(machine.canTransition('loaded')).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(machine.canTransition('enabled')).toBe(false);
    });
  });

  describe('getAllowedNext', () => {
    it('returns allowed next states', () => {
      expect(machine.getAllowedNext()).toEqual(['loaded', 'error']);
    });
  });

  describe('isActive', () => {
    it('returns true when enabled', () => {
      machine.transition('loaded');
      machine.transition('initialized');
      machine.transition('enabled');
      expect(machine.isActive()).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(machine.isActive()).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('returns true when destroyed', () => {
      machine.transition('error');
      machine.transition('destroyed');
      expect(machine.isTerminal()).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(machine.isTerminal()).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      machine.transition('loaded');
      machine.transition('initialized');
      machine.reset();
      expect(machine.getState()).toBe('discovered');
      expect(machine.getHistory()).toHaveLength(0);
    });
  });
});

describe('PluginLifecycle namespace', () => {
  it('exports all functions', () => {
    expect(PluginLifecycle.isValidState).toBe(isValidState);
    expect(PluginLifecycle.isValidTransition).toBe(isValidTransition);
    expect(PluginLifecycle.getAllowedTransitions).toBe(getAllowedTransitions);
    expect(PluginLifecycle.getTransitionHooks).toBe(getTransitionHooks);
    expect(PluginLifecycle.isTerminalState).toBe(isTerminalState);
    expect(PluginLifecycle.isActiveState).toBe(isActiveState);
    expect(PluginLifecycle.canDestroy).toBe(canDestroy);
    expect(PluginLifecycle.getTransitionPath).toBe(getTransitionPath);
  });

  it('exports constants', () => {
    expect(PluginLifecycle.STATES).toBe(STATES);
    expect(PluginLifecycle.TRANSITIONS).toBe(TRANSITIONS);
  });
});
