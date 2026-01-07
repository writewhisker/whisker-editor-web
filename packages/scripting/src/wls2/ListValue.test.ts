/**
 * ListValue Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ListValue,
  createExclusive,
  createFlags,
  fromState,
} from './ListValue';

describe('ListValue', () => {
  describe('constructor', () => {
    it('creates a list with possible values', () => {
      const list = new ListValue('status', ['active', 'inactive', 'pending']);

      expect(list.name).toBe('status');
      expect(list.getPossibleValues()).toEqual(['active', 'inactive', 'pending']);
      expect(list.getActiveValues()).toEqual([]);
    });

    it('initializes with initial values', () => {
      const list = new ListValue(
        'status',
        ['active', 'inactive'],
        ['active']
      );

      expect(list.getActiveValues()).toEqual(['active']);
    });

    it('ignores invalid initial values by default', () => {
      const list = new ListValue(
        'status',
        ['active', 'inactive'],
        ['active', 'unknown']
      );

      expect(list.getActiveValues()).toEqual(['active']);
    });

    it('allows undefined states with config', () => {
      const list = new ListValue(
        'status',
        ['active', 'inactive'],
        ['active', 'unknown'],
        { allowUndefinedStates: true }
      );

      expect(list.getActiveValues()).toContain('unknown');
    });
  });

  describe('state manipulation', () => {
    let list: ListValue;

    beforeEach(() => {
      list = new ListValue('status', ['a', 'b', 'c']);
    });

    describe('add', () => {
      it('adds a state', () => {
        const result = list.add('a');

        expect(result).toBe(true);
        expect(list.contains('a')).toBe(true);
      });

      it('returns false if already active', () => {
        list.add('a');
        const result = list.add('a');

        expect(result).toBe(false);
      });

      it('rejects invalid state', () => {
        const result = list.add('invalid');

        expect(result).toBe(false);
        expect(list.contains('invalid')).toBe(false);
      });

      it('rejects when locked', () => {
        list.lock();
        const result = list.add('a');

        expect(result).toBe(false);
      });
    });

    describe('remove', () => {
      it('removes an active state', () => {
        list.add('a');
        const result = list.remove('a');

        expect(result).toBe(true);
        expect(list.contains('a')).toBe(false);
      });

      it('returns false if not active', () => {
        const result = list.remove('a');

        expect(result).toBe(false);
      });
    });

    describe('toggle', () => {
      it('adds if not active', () => {
        list.toggle('a');

        expect(list.contains('a')).toBe(true);
      });

      it('removes if active', () => {
        list.add('a');
        list.toggle('a');

        expect(list.contains('a')).toBe(false);
      });
    });

    describe('enter', () => {
      it('sets a single exclusive state', () => {
        list.add('a');
        list.add('b');
        list.enter('c');

        expect(list.getActiveValues()).toEqual(['c']);
      });

      it('clears all previous states', () => {
        list.add('a');
        list.add('b');
        list.enter('c');

        expect(list.contains('a')).toBe(false);
        expect(list.contains('b')).toBe(false);
      });
    });

    describe('set', () => {
      it('sets multiple states exactly', () => {
        list.set(['a', 'c']);

        expect(list.getActiveValues()).toContain('a');
        expect(list.getActiveValues()).toContain('c');
        expect(list.getActiveValues()).not.toContain('b');
      });

      it('returns false if any state is invalid', () => {
        const result = list.set(['a', 'invalid']);

        expect(result).toBe(false);
      });
    });

    describe('reset / clear', () => {
      it('clears all active states', () => {
        list.add('a');
        list.add('b');
        list.reset();

        expect(list.isEmpty()).toBe(true);
      });

      it('clear is alias for reset', () => {
        list.add('a');
        list.clear();

        expect(list.isEmpty()).toBe(true);
      });
    });
  });

  describe('state queries', () => {
    let list: ListValue;

    beforeEach(() => {
      list = new ListValue('status', ['a', 'b', 'c', 'd']);
      list.add('a');
      list.add('c');
    });

    it('contains checks active state', () => {
      expect(list.contains('a')).toBe(true);
      expect(list.contains('b')).toBe(false);
    });

    it('includes is alias for contains', () => {
      expect(list.includes('a')).toBe(true);
    });

    it('count returns active count', () => {
      expect(list.count()).toBe(2);
    });

    it('isEmpty checks if no active states', () => {
      expect(list.isEmpty()).toBe(false);
      list.reset();
      expect(list.isEmpty()).toBe(true);
    });

    it('isAnyActive checks if any of given states active', () => {
      expect(list.isAnyActive(['a', 'b'])).toBe(true);
      expect(list.isAnyActive(['b', 'd'])).toBe(false);
    });

    it('areAllActive checks if all given states active', () => {
      expect(list.areAllActive(['a', 'c'])).toBe(true);
      expect(list.areAllActive(['a', 'b'])).toBe(false);
    });

    it('getValue returns first active value', () => {
      const exclusive = createExclusive('ex', ['x', 'y', 'z'], 'y');
      expect(exclusive.getValue()).toBe('y');
    });

    describe('isSubsetOf', () => {
      it('returns true if subset', () => {
        const superset = new ListValue('super', ['a', 'b', 'c', 'd']);
        superset.add('a');
        superset.add('b');
        superset.add('c');

        expect(list.isSubsetOf(superset)).toBe(true);
      });

      it('returns false if not subset', () => {
        const other = new ListValue('other', ['a', 'b']);
        other.add('a');

        expect(list.isSubsetOf(other)).toBe(false);
      });
    });

    describe('equals', () => {
      it('returns true if same active values', () => {
        const other = new ListValue('other', ['a', 'b', 'c', 'd']);
        other.add('a');
        other.add('c');

        expect(list.equals(other)).toBe(true);
      });

      it('returns false if different active values', () => {
        const other = new ListValue('other', ['a', 'b', 'c', 'd']);
        other.add('a');
        other.add('b');

        expect(list.equals(other)).toBe(false);
      });
    });
  });

  describe('callbacks', () => {
    let list: ListValue;

    beforeEach(() => {
      list = new ListValue('status', ['a', 'b', 'c']);
    });

    it('triggers onEnter callback when state added', () => {
      const onEnter = vi.fn();
      list.onState('a', { onEnter });

      list.add('a');

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('triggers onExit callback when state removed', () => {
      const onExit = vi.fn();
      list.onState('a', { onExit });
      list.add('a');

      list.remove('a');

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('triggers onExit for previous state in enter()', () => {
      const onExit = vi.fn();
      list.onState('a', { onExit });
      list.add('a');

      list.enter('b');

      expect(onExit).toHaveBeenCalled();
    });

    it('offState removes callbacks', () => {
      const onEnter = vi.fn();
      list.onState('a', { onEnter });
      list.offState('a');

      list.add('a');

      expect(onEnter).not.toHaveBeenCalled();
    });

    it('clearCallbacks removes all callbacks', () => {
      const onEnter = vi.fn();
      list.onState('a', { onEnter });
      list.onState('b', { onEnter });
      list.clearCallbacks();

      list.add('a');
      list.add('b');

      expect(onEnter).not.toHaveBeenCalled();
    });

    it('triggers onTransition config callback', () => {
      const onTransition = vi.fn();
      const listWithCallback = new ListValue(
        'status',
        ['a', 'b'],
        [],
        { onTransition }
      );

      listWithCallback.add('a');

      expect(onTransition).toHaveBeenCalledWith([], ['a']);
    });
  });

  describe('history', () => {
    let list: ListValue;

    beforeEach(() => {
      list = new ListValue('status', ['a', 'b', 'c'], [], {
        trackHistory: true,
      });
    });

    it('records history when enabled', () => {
      list.add('a');
      list.remove('a');

      const history = list.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('add');
      expect(history[1].action).toBe('remove');
    });

    it('does not record history when disabled', () => {
      const noHistory = new ListValue('test', ['a', 'b']);
      noHistory.add('a');

      expect(noHistory.getHistory()).toHaveLength(0);
    });

    it('getRecentTransitions returns last N entries', () => {
      list.add('a');
      list.add('b');
      list.add('c');

      const recent = list.getRecentTransitions(2);

      expect(recent).toHaveLength(2);
    });

    it('getLastEntry finds last entry for state', () => {
      list.add('a');
      list.remove('a');
      list.add('a');

      const lastEntry = list.getLastEntry('a');

      expect(lastEntry).toBeDefined();
      expect(lastEntry!.action).toBe('add');
    });

    it('getLastExit finds last exit for state', () => {
      list.add('a');
      list.remove('a');

      const lastExit = list.getLastExit('a');

      expect(lastExit).toBeDefined();
      expect(lastExit!.action).toBe('remove');
    });

    it('clearHistory removes all history', () => {
      list.add('a');
      list.clearHistory();

      expect(list.getHistory()).toHaveLength(0);
    });

    it('respects maxHistoryLength', () => {
      const limited = new ListValue('test', ['a', 'b', 'c'], [], {
        trackHistory: true,
        maxHistoryLength: 3,
      });

      limited.add('a');
      limited.remove('a');
      limited.add('b');
      limited.add('c');

      expect(limited.getHistory()).toHaveLength(3);
    });
  });

  describe('thread safety', () => {
    it('lock prevents modifications', () => {
      const list = new ListValue('status', ['a', 'b']);
      list.lock();

      const result = list.add('a');

      expect(result).toBe(false);
      expect(list.contains('a')).toBe(false);
    });

    it('unlock allows modifications', () => {
      const list = new ListValue('status', ['a', 'b']);
      list.lock();
      list.unlock();

      const result = list.add('a');

      expect(result).toBe(true);
    });

    it('isLocked returns lock state', () => {
      const list = new ListValue('status', ['a', 'b']);

      expect(list.isLocked()).toBe(false);
      list.lock();
      expect(list.isLocked()).toBe(true);
    });

    it('withLock executes with lock and restores', () => {
      const list = new ListValue('status', ['a', 'b']);

      const result = list.withLock(() => {
        expect(list.isLocked()).toBe(true);
        return 42;
      });

      expect(result).toBe(42);
      expect(list.isLocked()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('getState returns serializable state', () => {
      const list = new ListValue('status', ['a', 'b', 'c']);
      list.add('a');
      list.add('c');

      const state = list.getState();

      expect(state.name).toBe('status');
      expect(state.possibleValues).toEqual(['a', 'b', 'c']);
      expect(state.activeValues).toContain('a');
      expect(state.activeValues).toContain('c');
    });

    it('restoreState restores from serialized state', () => {
      const list = new ListValue('status', ['a', 'b', 'c']);
      const state = {
        name: 'status',
        possibleValues: ['x', 'y', 'z'],
        activeValues: ['y'],
      };

      list.restoreState(state);

      expect(list.getPossibleValues()).toEqual(['x', 'y', 'z']);
      expect(list.getActiveValues()).toEqual(['y']);
    });

    it('copy creates independent copy', () => {
      const original = new ListValue('status', ['a', 'b', 'c']);
      original.add('a');

      const copy = original.copy();
      copy.add('b');

      expect(original.contains('b')).toBe(false);
      expect(copy.contains('b')).toBe(true);
    });

    it('toString returns string representation', () => {
      const list = new ListValue('status', ['a', 'b', 'c']);
      list.add('a');
      list.add('c');

      const str = list.toString();

      expect(str).toContain('status');
      expect(str).toContain('a');
      expect(str).toContain('c');
    });
  });
});

describe('factory functions', () => {
  describe('createExclusive', () => {
    it('creates exclusive list with initial value', () => {
      const list = createExclusive('mode', ['light', 'dark', 'system'], 'light');

      expect(list.getValue()).toBe('light');
    });

    it('creates empty exclusive list', () => {
      const list = createExclusive('mode', ['light', 'dark']);

      expect(list.isEmpty()).toBe(true);
    });
  });

  describe('createFlags', () => {
    it('creates flags list with initial values', () => {
      const list = createFlags('features', ['a', 'b', 'c'], ['a', 'c']);

      expect(list.getActiveValues()).toContain('a');
      expect(list.getActiveValues()).toContain('c');
      expect(list.count()).toBe(2);
    });
  });

  describe('fromState', () => {
    it('creates list from state object', () => {
      const state = {
        name: 'test',
        possibleValues: ['x', 'y', 'z'],
        activeValues: ['x', 'z'],
      };

      const list = fromState(state);

      expect(list.name).toBe('test');
      expect(list.getActiveValues()).toContain('x');
      expect(list.getActiveValues()).toContain('z');
    });
  });
});
