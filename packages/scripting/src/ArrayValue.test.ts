/**
 * ArrayValue Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArrayValue, ArrayRegistry } from './ArrayValue';

describe('ArrayValue', () => {
  describe('constructor', () => {
    it('creates an empty array', () => {
      const arr = new ArrayValue('items');

      expect(arr.name).toBe('items');
      expect(arr.length).toBe(0);
      expect(arr.getElements()).toEqual([]);
    });

    it('creates array with initial elements', () => {
      const arr = new ArrayValue('items', [1, 2, 3]);

      expect(arr.length).toBe(3);
      expect(arr.getElements()).toEqual([1, 2, 3]);
    });
  });

  describe('element access', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', ['a', 'b', 'c']);
    });

    it('gets element at index', () => {
      expect(arr.get(0)).toBe('a');
      expect(arr.get(1)).toBe('b');
      expect(arr.get(2)).toBe('c');
    });

    it('returns undefined for out of bounds index', () => {
      expect(arr.get(-1)).toBeUndefined();
      expect(arr.get(3)).toBeUndefined();
    });

    it('sets element at index', () => {
      const result = arr.set(1, 'x');

      expect(result).toBe(true);
      expect(arr.get(1)).toBe('x');
    });

    it('expands array when setting past end', () => {
      arr.set(5, 'z');

      expect(arr.length).toBe(6);
      expect(arr.get(3)).toBeUndefined();
      expect(arr.get(5)).toBe('z');
    });

    it('rejects negative index for set', () => {
      const result = arr.set(-1, 'x');

      expect(result).toBe(false);
    });
  });

  describe('push/pop operations', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', [1, 2]);
    });

    it('pushes element to end', () => {
      const newLen = arr.push(3);

      expect(newLen).toBe(3);
      expect(arr.getElements()).toEqual([1, 2, 3]);
    });

    it('pops element from end', () => {
      const value = arr.pop();

      expect(value).toBe(2);
      expect(arr.getElements()).toEqual([1]);
    });

    it('returns undefined when popping empty array', () => {
      const empty = new ArrayValue('empty');
      const value = empty.pop();

      expect(value).toBeUndefined();
    });
  });

  describe('insert/remove operations', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', ['a', 'b', 'c']);
    });

    it('inserts at index', () => {
      arr.insert(1, 'x');

      expect(arr.getElements()).toEqual(['a', 'x', 'b', 'c']);
    });

    it('inserts at beginning', () => {
      arr.insert(0, 'x');

      expect(arr.getElements()).toEqual(['x', 'a', 'b', 'c']);
    });

    it('inserts at end when index exceeds length', () => {
      arr.insert(10, 'x');

      expect(arr.getElements()).toEqual(['a', 'b', 'c', 'x']);
    });

    it('removes at index', () => {
      const removed = arr.remove(1);

      expect(removed).toBe('b');
      expect(arr.getElements()).toEqual(['a', 'c']);
    });

    it('returns undefined when removing invalid index', () => {
      expect(arr.remove(-1)).toBeUndefined();
      expect(arr.remove(10)).toBeUndefined();
    });
  });

  describe('query operations', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', [1, 2, 3, 2]);
    });

    it('checks contains', () => {
      expect(arr.contains(2)).toBe(true);
      expect(arr.contains(5)).toBe(false);
    });

    it('finds indexOf', () => {
      expect(arr.indexOf(2)).toBe(1); // First occurrence
      expect(arr.indexOf(5)).toBe(-1);
    });

    it('checks isEmpty', () => {
      expect(arr.isEmpty()).toBe(false);
      expect(new ArrayValue('empty').isEmpty()).toBe(true);
    });
  });

  describe('iteration', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', [1, 2, 3]);
    });

    it('forEach iterates elements', () => {
      const results: number[] = [];
      arr.forEach((v) => results.push(v as number));

      expect(results).toEqual([1, 2, 3]);
    });

    it('map transforms elements', () => {
      const doubled = arr.map((v) => (v as number) * 2);

      expect(doubled).toEqual([2, 4, 6]);
    });

    it('filter selects elements', () => {
      const evens = arr.filter((v) => (v as number) % 2 === 0);

      expect(evens).toEqual([2]);
    });

    it('find returns first match', () => {
      const found = arr.find((v) => (v as number) > 1);

      expect(found).toBe(2);
    });
  });

  describe('locking', () => {
    let arr: ArrayValue;

    beforeEach(() => {
      arr = new ArrayValue('items', [1, 2]);
    });

    it('prevents modifications when locked', () => {
      arr.lock();

      expect(arr.push(3)).toBe(2); // Returns current length
      expect(arr.pop()).toBeUndefined();
      expect(arr.set(0, 99)).toBe(false);
      expect(arr.getElements()).toEqual([1, 2]);
    });

    it('allows modifications after unlock', () => {
      arr.lock();
      arr.unlock();

      arr.push(3);
      expect(arr.getElements()).toEqual([1, 2, 3]);
    });
  });

  describe('history tracking', () => {
    it('tracks history when enabled', () => {
      const arr = new ArrayValue('items', [], { trackHistory: true });

      arr.push(1);
      arr.push(2);
      arr.set(0, 10);

      const history = arr.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('push');
      expect(history[2].action).toBe('set');
    });

    it('does not track history by default', () => {
      const arr = new ArrayValue('items');

      arr.push(1);
      expect(arr.getHistory()).toEqual([]);
    });
  });

  describe('serialization', () => {
    it('serializes state', () => {
      const arr = new ArrayValue('items', [1, 2, 3]);
      const state = arr.getState();

      expect(state.name).toBe('items');
      expect(state.elements).toEqual([1, 2, 3]);
    });

    it('restores state', () => {
      const arr = new ArrayValue('items');
      arr.restoreState({
        name: 'items',
        elements: [4, 5, 6],
      });

      expect(arr.getElements()).toEqual([4, 5, 6]);
    });

    it('copies array', () => {
      const arr = new ArrayValue('items', [1, 2, 3]);
      const copy = arr.copy();

      copy.push(4);

      expect(arr.getElements()).toEqual([1, 2, 3]);
      expect(copy.getElements()).toEqual([1, 2, 3, 4]);
    });
  });
});

describe('ArrayRegistry', () => {
  let registry: ArrayRegistry;

  beforeEach(() => {
    registry = new ArrayRegistry();
  });

  describe('define and get', () => {
    it('defines and retrieves array', () => {
      const arr = registry.define('items', [1, 2, 3]);

      expect(arr.getElements()).toEqual([1, 2, 3]);
      expect(registry.get('items')).toBe(arr);
    });

    it('checks has', () => {
      registry.define('items');

      expect(registry.has('items')).toBe(true);
      expect(registry.has('other')).toBe(false);
    });

    it('removes array', () => {
      registry.define('items');

      const removed = registry.remove('items');

      expect(removed).toBe(true);
      expect(registry.has('items')).toBe(false);
    });
  });

  describe('convenience accessors', () => {
    beforeEach(() => {
      registry.define('items', [1, 2, 3]);
    });

    it('getElement', () => {
      expect(registry.getElement('items', 1)).toBe(2);
    });

    it('setElement', () => {
      registry.setElement('items', 1, 20);
      expect(registry.getElement('items', 1)).toBe(20);
    });

    it('pushElement', () => {
      registry.pushElement('items', 4);
      expect(registry.getLength('items')).toBe(4);
    });

    it('popElement', () => {
      const val = registry.popElement('items');
      expect(val).toBe(3);
      expect(registry.getLength('items')).toBe(2);
    });
  });

  describe('serialization', () => {
    it('serializes all arrays', () => {
      registry.define('a', [1]);
      registry.define('b', [2]);

      const state = registry.getState();

      expect(Object.keys(state.arrays)).toEqual(['a', 'b']);
    });

    it('restores state', () => {
      registry.restoreState({
        arrays: {
          items: { name: 'items', elements: [1, 2, 3] },
        },
      });

      expect(registry.has('items')).toBe(true);
      expect(registry.get('items')?.getElements()).toEqual([1, 2, 3]);
    });

    it('clones registry', () => {
      registry.define('items', [1, 2]);
      const cloned = registry.clone();

      cloned.get('items')?.push(3);

      expect(registry.get('items')?.getElements()).toEqual([1, 2]);
      expect(cloned.get('items')?.getElements()).toEqual([1, 2, 3]);
    });
  });
});
