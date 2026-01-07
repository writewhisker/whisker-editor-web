/**
 * ListRegistry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ListRegistry, createListRegistry } from './ListRegistry';
import { ListValue } from './ListValue';

describe('ListRegistry', () => {
  let registry: ListRegistry;

  beforeEach(() => {
    registry = createListRegistry();
  });

  describe('list management', () => {
    describe('define', () => {
      it('defines a new list', () => {
        const list = registry.define('status', ['active', 'inactive']);

        expect(list).toBeInstanceOf(ListValue);
        expect(registry.has('status')).toBe(true);
      });

      it('defines with initial values', () => {
        const list = registry.define('status', ['a', 'b'], ['a']);

        expect(list.contains('a')).toBe(true);
      });

      it('overwrites existing list', () => {
        registry.define('status', ['a', 'b']);
        const newList = registry.define('status', ['x', 'y']);

        expect(newList.getPossibleValues()).toEqual(['x', 'y']);
      });
    });

    describe('defineExclusive', () => {
      it('defines an exclusive list', () => {
        const list = registry.defineExclusive('mode', ['light', 'dark'], 'light');

        expect(list.getValue()).toBe('light');
      });
    });

    describe('defineFlags', () => {
      it('defines a flags list', () => {
        const list = registry.defineFlags('features', ['a', 'b', 'c'], ['a', 'b']);

        expect(list.count()).toBe(2);
      });
    });

    describe('get', () => {
      it('returns list by name', () => {
        registry.define('status', ['a', 'b']);

        const list = registry.get('status');

        expect(list).toBeDefined();
        expect(list!.name).toBe('status');
      });

      it('returns undefined for non-existent list', () => {
        const list = registry.get('unknown');

        expect(list).toBeUndefined();
      });
    });

    describe('has', () => {
      it('returns true for existing list', () => {
        registry.define('status', ['a', 'b']);

        expect(registry.has('status')).toBe(true);
      });

      it('returns false for non-existent list', () => {
        expect(registry.has('unknown')).toBe(false);
      });
    });

    describe('getNames', () => {
      it('returns all list names', () => {
        registry.define('list1', ['a']);
        registry.define('list2', ['b']);
        registry.define('list3', ['c']);

        const names = registry.getNames();

        expect(names).toContain('list1');
        expect(names).toContain('list2');
        expect(names).toContain('list3');
      });
    });

    describe('remove', () => {
      it('removes a list', () => {
        registry.define('status', ['a', 'b']);

        const result = registry.remove('status');

        expect(result).toBe(true);
        expect(registry.has('status')).toBe(false);
      });

      it('returns false for non-existent list', () => {
        const result = registry.remove('unknown');

        expect(result).toBe(false);
      });
    });

    describe('getAll', () => {
      it('returns copy of all lists', () => {
        registry.define('list1', ['a']);
        registry.define('list2', ['b']);

        const all = registry.getAll();

        expect(all.size).toBe(2);
        expect(all.has('list1')).toBe(true);
        expect(all.has('list2')).toBe(true);
      });
    });

    describe('count', () => {
      it('returns number of lists', () => {
        registry.define('list1', ['a']);
        registry.define('list2', ['b']);

        expect(registry.count()).toBe(2);
      });
    });

    describe('clear', () => {
      it('removes all lists', () => {
        registry.define('list1', ['a']);
        registry.define('list2', ['b']);

        registry.clear();

        expect(registry.count()).toBe(0);
      });
    });
  });

  describe('bulk operations', () => {
    beforeEach(() => {
      registry.defineFlags('features', ['a', 'b', 'c'], ['a', 'b']);
      registry.defineExclusive('mode', ['light', 'dark'], 'light');
    });

    describe('resetAll', () => {
      it('resets all lists', () => {
        registry.resetAll();

        expect(registry.get('features')!.isEmpty()).toBe(true);
        expect(registry.get('mode')!.isEmpty()).toBe(true);
      });
    });

    describe('lockAll / unlockAll', () => {
      it('locks all lists', () => {
        registry.lockAll();

        expect(registry.get('features')!.isLocked()).toBe(true);
        expect(registry.get('mode')!.isLocked()).toBe(true);
      });

      it('unlocks all lists', () => {
        registry.lockAll();
        registry.unlockAll();

        expect(registry.get('features')!.isLocked()).toBe(false);
        expect(registry.get('mode')!.isLocked()).toBe(false);
      });
    });
  });

  describe('query operations', () => {
    beforeEach(() => {
      registry.defineFlags('features', ['x', 'y', 'z'], ['x', 'y']);
      registry.defineExclusive('mode', ['x', 'dark'], 'x');
    });

    describe('isStateActiveAnywhere', () => {
      it('returns true if state active in any list', () => {
        expect(registry.isStateActiveAnywhere('x')).toBe(true);
        expect(registry.isStateActiveAnywhere('y')).toBe(true);
      });

      it('returns false if state not active anywhere', () => {
        expect(registry.isStateActiveAnywhere('z')).toBe(false);
        expect(registry.isStateActiveAnywhere('unknown')).toBe(false);
      });
    });

    describe('findListsWithState', () => {
      it('returns lists containing active state', () => {
        const lists = registry.findListsWithState('x');

        expect(lists).toContain('features');
        expect(lists).toContain('mode');
      });

      it('returns empty array if no lists have state', () => {
        const lists = registry.findListsWithState('z');

        expect(lists).toEqual([]);
      });
    });

    describe('getActiveSummary', () => {
      it('returns summary of all active states', () => {
        const summary = registry.getActiveSummary();

        expect(summary.features).toContain('x');
        expect(summary.features).toContain('y');
        expect(summary.mode).toEqual(['x']);
      });
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      registry.defineFlags('features', ['a', 'b', 'c'], ['a']);
      registry.defineExclusive('mode', ['light', 'dark'], 'dark');
    });

    describe('getState', () => {
      it('returns serializable state', () => {
        const state = registry.getState();

        expect(state.lists.features).toBeDefined();
        expect(state.lists.mode).toBeDefined();
        expect(state.lists.features.activeValues).toContain('a');
        expect(state.lists.mode.activeValues).toEqual(['dark']);
      });
    });

    describe('restoreState', () => {
      it('restores from serialized state', () => {
        const state = registry.getState();

        const newRegistry = createListRegistry();
        newRegistry.restoreState(state);

        expect(newRegistry.has('features')).toBe(true);
        expect(newRegistry.has('mode')).toBe(true);
        expect(newRegistry.get('features')!.contains('a')).toBe(true);
      });
    });

    describe('clone', () => {
      it('creates independent copy', () => {
        const cloned = registry.clone();

        cloned.get('features')!.add('b');

        expect(registry.get('features')!.contains('b')).toBe(false);
        expect(cloned.get('features')!.contains('b')).toBe(true);
      });
    });
  });

  describe('convenience accessors', () => {
    beforeEach(() => {
      registry.defineExclusive('mode', ['light', 'dark'], 'light');
      registry.defineFlags('features', ['a', 'b', 'c'], ['a']);
    });

    describe('getValue', () => {
      it('returns value from exclusive list', () => {
        expect(registry.getValue('mode')).toBe('light');
      });

      it('returns undefined for non-existent list', () => {
        expect(registry.getValue('unknown')).toBeUndefined();
      });
    });

    describe('getValues', () => {
      it('returns values from flags list', () => {
        expect(registry.getValues('features')).toEqual(['a']);
      });

      it('returns empty array for non-existent list', () => {
        expect(registry.getValues('unknown')).toEqual([]);
      });
    });

    describe('setValue', () => {
      it('sets value in exclusive list', () => {
        const result = registry.setValue('mode', 'dark');

        expect(result).toBe(true);
        expect(registry.getValue('mode')).toBe('dark');
      });

      it('returns false for non-existent list', () => {
        const result = registry.setValue('unknown', 'value');

        expect(result).toBe(false);
      });
    });

    describe('setValues', () => {
      it('sets values in flags list', () => {
        const result = registry.setValues('features', ['b', 'c']);

        expect(result).toBe(true);
        expect(registry.getValues('features')).toContain('b');
        expect(registry.getValues('features')).toContain('c');
        expect(registry.getValues('features')).not.toContain('a');
      });
    });

    describe('hasValue', () => {
      it('checks if value is active', () => {
        expect(registry.hasValue('features', 'a')).toBe(true);
        expect(registry.hasValue('features', 'b')).toBe(false);
      });

      it('returns false for non-existent list', () => {
        expect(registry.hasValue('unknown', 'a')).toBe(false);
      });
    });

    describe('addValue', () => {
      it('adds value to list', () => {
        const result = registry.addValue('features', 'b');

        expect(result).toBe(true);
        expect(registry.hasValue('features', 'b')).toBe(true);
      });

      it('returns false for non-existent list', () => {
        const result = registry.addValue('unknown', 'a');

        expect(result).toBe(false);
      });
    });

    describe('removeValue', () => {
      it('removes value from list', () => {
        const result = registry.removeValue('features', 'a');

        expect(result).toBe(true);
        expect(registry.hasValue('features', 'a')).toBe(false);
      });

      it('returns false for non-existent list', () => {
        const result = registry.removeValue('unknown', 'a');

        expect(result).toBe(false);
      });
    });

    describe('toggleValue', () => {
      it('toggles value in list', () => {
        registry.toggleValue('features', 'a'); // remove
        expect(registry.hasValue('features', 'a')).toBe(false);

        registry.toggleValue('features', 'a'); // add
        expect(registry.hasValue('features', 'a')).toBe(true);
      });

      it('returns false for non-existent list', () => {
        const result = registry.toggleValue('unknown', 'a');

        expect(result).toBe(false);
      });
    });
  });

  describe('default config', () => {
    it('applies default config to all lists', () => {
      const configuredRegistry = createListRegistry({
        defaultConfig: { trackHistory: true },
      });

      const list = configuredRegistry.define('test', ['a', 'b']);
      list.add('a');

      expect(list.getHistory()).toHaveLength(1);
    });
  });
});
