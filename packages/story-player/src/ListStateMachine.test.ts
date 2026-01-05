import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListStateMachine,
  ListStateMachineRegistry,
  createExclusiveStateMachine,
  createFlagStateMachine,
  StateTransitionCallback,
  StateTransitionEvent,
} from './ListStateMachine';

describe('ListStateMachine', () => {
  describe('Construction', () => {
    it('should create with no initial states', () => {
      const machine = new ListStateMachine('test');
      expect(machine.getName()).toBe('test');
      expect(machine.getActiveStates()).toEqual([]);
      expect(machine.isEmpty()).toBe(true);
    });

    it('should create with valid states and initial active', () => {
      const machine = new ListStateMachine('door', ['open', 'closed'], ['closed']);
      expect(machine.getValidStates()).toEqual(['open', 'closed']);
      expect(machine.getActiveStates()).toEqual(['closed']);
      expect(machine.isActive('closed')).toBe(true);
      expect(machine.isActive('open')).toBe(false);
    });

    it('should create from declaration string', () => {
      const machine = ListStateMachine.fromDeclaration(
        'door',
        'open, (closed), locked'
      );
      expect(machine.getValidStates()).toEqual(['open', 'closed', 'locked']);
      expect(machine.getActiveStates()).toEqual(['closed']);
    });

    it('should clone correctly', () => {
      const original = new ListStateMachine('test', ['a', 'b', 'c'], ['a', 'b']);
      const cloned = original.clone();

      expect(cloned.getName()).toBe('test');
      expect(cloned.getActiveStates()).toEqual(['a', 'b']);

      // Modifying clone should not affect original
      cloned.exit('a');
      expect(original.isActive('a')).toBe(true);
      expect(cloned.isActive('a')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    let machine: ListStateMachine;

    beforeEach(() => {
      machine = new ListStateMachine('test', ['a', 'b', 'c', 'd'], ['a']);
    });

    it('should enter a state', () => {
      machine.enter('b');
      expect(machine.isActive('b')).toBe(true);
      expect(machine.getActiveStates()).toContain('b');
    });

    it('should not duplicate when entering already active state', () => {
      machine.enter('a');
      expect(machine.count()).toBe(1);
    });

    it('should exit a state', () => {
      machine.exit('a');
      expect(machine.isActive('a')).toBe(false);
      expect(machine.isEmpty()).toBe(true);
    });

    it('should toggle states', () => {
      expect(machine.toggle('a')).toBe(false); // Was active, now inactive
      expect(machine.isActive('a')).toBe(false);

      expect(machine.toggle('a')).toBe(true); // Was inactive, now active
      expect(machine.isActive('a')).toBe(true);
    });

    it('should transition to exclusive state', () => {
      machine.enter('b');
      machine.enter('c');
      expect(machine.count()).toBe(3);

      machine.transitionTo('d');
      expect(machine.getActiveStates()).toEqual(['d']);
      expect(machine.count()).toBe(1);
    });

    it('should reset all states', () => {
      machine.enter('b');
      machine.enter('c');
      machine.reset();
      expect(machine.isEmpty()).toBe(true);
    });
  });

  describe('State Queries', () => {
    let machine: ListStateMachine;

    beforeEach(() => {
      machine = new ListStateMachine('test', ['a', 'b', 'c', 'd'], ['a', 'b']);
    });

    it('should check if any state is active', () => {
      expect(machine.isAnyActive('a', 'c', 'd')).toBe(true);
      expect(machine.isAnyActive('c', 'd')).toBe(false);
    });

    it('should check if all states are active', () => {
      expect(machine.areAllActive('a', 'b')).toBe(true);
      expect(machine.areAllActive('a', 'b', 'c')).toBe(false);
    });

    it('should get count', () => {
      expect(machine.count()).toBe(2);
    });
  });

  describe('Callbacks', () => {
    it('should trigger onEnter callback', () => {
      const callback = vi.fn();
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      machine.onState('a', { onEnter: callback });
      machine.enter('a');

      expect(callback).toHaveBeenCalledWith('a', 'enter', machine);
    });

    it('should trigger onExit callback', () => {
      const callback = vi.fn();
      const machine = new ListStateMachine('test', ['a', 'b'], ['a']);

      machine.onState('a', { onExit: callback });
      machine.exit('a');

      expect(callback).toHaveBeenCalledWith('a', 'exit', machine);
    });

    it('should trigger global onTransition callback', () => {
      const callback = vi.fn();
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        onTransition: callback,
      });

      machine.enter('a');
      machine.exit('a');

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 'a', 'enter', machine);
      expect(callback).toHaveBeenNthCalledWith(2, 'a', 'exit', machine);
    });

    it('should remove callbacks', () => {
      const callback = vi.fn();
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      machine.onState('a', { onEnter: callback });
      machine.offState('a');
      machine.enter('a');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      machine.onState('a', { onEnter: callback1 });
      machine.onState('b', { onEnter: callback2 });
      machine.clearCallbacks();

      machine.enter('a');
      machine.enter('b');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('History Tracking', () => {
    it('should not track history by default', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], []);
      machine.enter('a');
      machine.exit('a');

      expect(machine.getHistory()).toEqual([]);
    });

    it('should track history when enabled', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.exit('a');

      const history = machine.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].state).toBe('a');
      expect(history[0].action).toBe('enter');
      expect(history[1].state).toBe('a');
      expect(history[1].action).toBe('exit');
    });

    it('should limit history length', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
        maxHistoryLength: 3,
      });

      machine.enter('a');
      machine.exit('a');
      machine.enter('b');
      machine.exit('b');

      expect(machine.getHistory()).toHaveLength(3);
    });

    it('should get recent transitions', () => {
      const machine = new ListStateMachine('test', ['a', 'b', 'c'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.enter('b');
      machine.enter('c');

      const recent = machine.getRecentTransitions(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].state).toBe('b');
      expect(recent[1].state).toBe('c');
    });

    it('should find last entry for a state', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.exit('a');
      machine.enter('a');

      const lastEntry = machine.getLastEntry('a');
      expect(lastEntry).toBeDefined();
      expect(lastEntry!.action).toBe('enter');
    });

    it('should find last exit for a state', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.exit('a');

      const lastExit = machine.getLastExit('a');
      expect(lastExit).toBeDefined();
      expect(lastExit!.action).toBe('exit');
    });

    it('should clear history', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.clearHistory();

      expect(machine.getHistory()).toEqual([]);
    });
  });

  describe('Thread Safety', () => {
    it('should lock and prevent modifications', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      machine.lock();
      expect(machine.isLocked()).toBe(true);

      expect(() => machine.enter('a')).toThrow(/locked/);
    });

    it('should unlock and allow modifications', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      machine.lock();
      machine.unlock();

      expect(machine.isLocked()).toBe(false);
      expect(() => machine.enter('a')).not.toThrow();
    });

    it('should execute with lock and auto-unlock', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], ['a']);

      const result = machine.withLock((m) => {
        return m.isActive('a');
      });

      expect(result).toBe(true);
      expect(machine.isLocked()).toBe(false);
    });

    it('should unlock even on error', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], []);

      expect(() =>
        machine.withLock(() => {
          throw new Error('test error');
        })
      ).toThrow('test error');

      expect(machine.isLocked()).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should get and restore state', () => {
      const machine = new ListStateMachine('test', ['a', 'b', 'c'], ['a', 'b']);
      const state = machine.getState();

      expect(state.name).toBe('test');
      expect(state.validStates).toEqual(['a', 'b', 'c']);
      expect(state.activeStates).toEqual(['a', 'b']);

      // Modify and restore
      machine.exit('a');
      machine.restoreState(state);

      expect(machine.getActiveStates()).toEqual(['a', 'b']);
    });

    it('should create from state', () => {
      const state = {
        name: 'test',
        validStates: ['a', 'b', 'c'],
        activeStates: ['b', 'c'],
      };

      const machine = ListStateMachine.fromState(state);

      expect(machine.getName()).toBe('test');
      expect(machine.getActiveStates()).toEqual(['b', 'c']);
    });

    it('should include history in state when tracking', () => {
      const machine = new ListStateMachine('test', ['a', 'b'], [], {
        trackHistory: true,
      });

      machine.enter('a');
      machine.exit('a');

      const state = machine.getState();
      expect(state.history).toHaveLength(2);
    });
  });
});

describe('ListStateMachineRegistry', () => {
  it('should declare and retrieve machines', () => {
    const registry = new ListStateMachineRegistry();
    const machine = registry.declare('door', 'open, (closed), locked');

    expect(registry.has('door')).toBe(true);
    expect(registry.get('door')).toBe(machine);
  });

  it('should add existing machines', () => {
    const registry = new ListStateMachineRegistry();
    const machine = new ListStateMachine('test', ['a', 'b'], ['a']);

    registry.add(machine);

    expect(registry.get('test')).toBe(machine);
  });

  it('should list all machine names', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', 'open, closed');
    registry.declare('switch', 'on, off');

    expect(registry.getNames()).toEqual(['door', 'switch']);
  });

  it('should get all machines', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', 'open, closed');
    registry.declare('switch', 'on, off');

    expect(registry.getAll()).toHaveLength(2);
  });

  it('should remove machines', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', 'open, closed');

    expect(registry.remove('door')).toBe(true);
    expect(registry.has('door')).toBe(false);
  });

  it('should clear all machines', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', 'open, closed');
    registry.declare('switch', 'on, off');

    registry.clear();

    expect(registry.getNames()).toEqual([]);
  });

  it('should serialize and restore state', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', '(open), closed');
    registry.declare('switch', 'on, (off)');

    const state = registry.getState();

    // Modify
    registry.get('door')!.transitionTo('closed');

    // Restore
    registry.restoreState(state);

    expect(registry.get('door')!.isActive('open')).toBe(true);
    expect(registry.get('door')!.isActive('closed')).toBe(false);
  });

  it('should clone registry', () => {
    const registry = new ListStateMachineRegistry();
    registry.declare('door', '(open), closed');

    const cloned = registry.clone();

    // Modify original
    registry.get('door')!.transitionTo('closed');

    // Clone should be unchanged
    expect(cloned.get('door')!.isActive('open')).toBe(true);
  });
});

describe('Convenience Functions', () => {
  describe('createExclusiveStateMachine', () => {
    it('should create with first state as initial', () => {
      const machine = createExclusiveStateMachine('door', ['open', 'closed', 'locked']);

      expect(machine.getActiveStates()).toEqual(['open']);
    });

    it('should create with specified initial state', () => {
      const machine = createExclusiveStateMachine(
        'door',
        ['open', 'closed', 'locked'],
        'closed'
      );

      expect(machine.getActiveStates()).toEqual(['closed']);
    });

    it('should work as exclusive state machine', () => {
      const machine = createExclusiveStateMachine('door', ['open', 'closed', 'locked']);

      machine.transitionTo('locked');
      expect(machine.getActiveStates()).toEqual(['locked']);
    });
  });

  describe('createFlagStateMachine', () => {
    it('should create with no flags set by default', () => {
      const machine = createFlagStateMachine('features', [
        'dark_mode',
        'notifications',
        'sound',
      ]);

      expect(machine.isEmpty()).toBe(true);
    });

    it('should create with initial flags', () => {
      const machine = createFlagStateMachine(
        'features',
        ['dark_mode', 'notifications', 'sound'],
        ['notifications', 'sound']
      );

      expect(machine.isActive('notifications')).toBe(true);
      expect(machine.isActive('sound')).toBe(true);
      expect(machine.isActive('dark_mode')).toBe(false);
    });

    it('should allow multiple flags to be active', () => {
      const machine = createFlagStateMachine('features', [
        'dark_mode',
        'notifications',
        'sound',
      ]);

      machine.enter('dark_mode');
      machine.enter('sound');

      expect(machine.count()).toBe(2);
    });
  });
});

describe('Real-World Examples', () => {
  describe('Door State Machine', () => {
    it('should model a door with open/closed/locked states', () => {
      const door = createExclusiveStateMachine('door', ['open', 'closed', 'locked'], 'closed');
      const events: string[] = [];

      door.onState('locked', {
        onEnter: () => events.push('locked'),
        onExit: () => events.push('unlocked'),
      });

      // Try to open while locked
      door.transitionTo('locked');
      expect(events).toContain('locked');

      // Unlock and open
      door.transitionTo('open');
      expect(events).toContain('unlocked');
      expect(door.isActive('open')).toBe(true);
    });
  });

  describe('Quest Progress Tracking', () => {
    it('should track multiple quest stages', () => {
      const quest = new ListStateMachine(
        'quest_stages',
        ['discovered', 'accepted', 'in_progress', 'completed', 'failed'],
        [],
        { trackHistory: true }
      );

      // Progress through quest
      quest.enter('discovered');
      quest.enter('accepted');
      quest.enter('in_progress');

      expect(quest.areAllActive('discovered', 'accepted', 'in_progress')).toBe(true);
      expect(quest.getHistory()).toHaveLength(3);

      // Complete quest
      quest.enter('completed');
      quest.exit('in_progress');

      expect(quest.isActive('completed')).toBe(true);
      expect(quest.isActive('in_progress')).toBe(false);
    });
  });

  describe('Player Conditions', () => {
    it('should track multiple status effects', () => {
      const conditions = createFlagStateMachine('player_conditions', [
        'poisoned',
        'stunned',
        'blessed',
        'invisible',
        'flying',
      ]);

      // Player gets hit by poison trap
      conditions.enter('poisoned');
      expect(conditions.isActive('poisoned')).toBe(true);

      // Player drinks potion that cures poison and grants blessing
      conditions.exit('poisoned');
      conditions.enter('blessed');

      expect(conditions.isActive('poisoned')).toBe(false);
      expect(conditions.isActive('blessed')).toBe(true);

      // Check if player has any negative conditions
      expect(conditions.isAnyActive('poisoned', 'stunned')).toBe(false);
    });
  });
});
