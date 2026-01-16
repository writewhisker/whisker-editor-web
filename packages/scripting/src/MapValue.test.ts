/**
 * MapValue Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapValue, MapRegistry } from './MapValue';

describe('MapValue', () => {
  describe('constructor', () => {
    it('creates an empty map', () => {
      const map = new MapValue('config');

      expect(map.name).toBe('config');
      expect(map.size).toBe(0);
      expect(map.isEmpty()).toBe(true);
    });

    it('creates map with initial entries', () => {
      const map = new MapValue('config', { a: 1, b: 2 });

      expect(map.size).toBe(2);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
    });
  });

  describe('entry access', () => {
    let map: MapValue;

    beforeEach(() => {
      map = new MapValue('config', { name: 'test', value: 42 });
    });

    it('gets value by key', () => {
      expect(map.get('name')).toBe('test');
      expect(map.get('value')).toBe(42);
    });

    it('returns undefined for non-existent key', () => {
      expect(map.get('unknown')).toBeUndefined();
    });

    it('sets value by key', () => {
      const result = map.set('name', 'updated');

      expect(result).toBe(true);
      expect(map.get('name')).toBe('updated');
    });

    it('adds new key', () => {
      map.set('newKey', 'newValue');

      expect(map.size).toBe(3);
      expect(map.get('newKey')).toBe('newValue');
    });

    it('checks has', () => {
      expect(map.has('name')).toBe(true);
      expect(map.has('unknown')).toBe(false);
    });
  });

  describe('delete and clear', () => {
    let map: MapValue;

    beforeEach(() => {
      map = new MapValue('config', { a: 1, b: 2, c: 3 });
    });

    it('deletes key and returns old value', () => {
      const oldValue = map.delete('b');

      expect(oldValue).toBe(2);
      expect(map.has('b')).toBe(false);
      expect(map.size).toBe(2);
    });

    it('returns undefined when deleting non-existent key', () => {
      const result = map.delete('unknown');

      expect(result).toBeUndefined();
    });

    it('clears all entries', () => {
      map.clear();

      expect(map.size).toBe(0);
      expect(map.isEmpty()).toBe(true);
    });
  });

  describe('query operations', () => {
    let map: MapValue;

    beforeEach(() => {
      map = new MapValue('config', { a: 1, b: 2, c: 3 });
    });

    it('gets all keys', () => {
      const keys = map.keys();

      expect(keys.sort()).toEqual(['a', 'b', 'c']);
    });

    it('gets all values', () => {
      const values = map.values();

      expect(values.sort()).toEqual([1, 2, 3]);
    });

    it('gets all entries', () => {
      const entries = map.entries();

      expect(entries.length).toBe(3);
      expect(entries.find(([k]) => k === 'a')).toEqual(['a', 1]);
    });

    it('converts to object', () => {
      const obj = map.toObject();

      expect(obj).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('iteration', () => {
    let map: MapValue;

    beforeEach(() => {
      map = new MapValue('config', { a: 1, b: 2 });
    });

    it('forEach iterates entries', () => {
      const results: [string, unknown][] = [];
      map.forEach((v, k) => results.push([k, v]));

      expect(results.length).toBe(2);
    });

    it('map transforms entries', () => {
      const doubled = map.map((v) => (v as number) * 2);

      expect(doubled.sort()).toEqual([2, 4]);
    });

    it('filter selects entries', () => {
      const filtered = map.filter((v) => (v as number) > 1);

      expect(filtered).toEqual([['b', 2]]);
    });

    it('find returns first match', () => {
      const found = map.find((v) => (v as number) > 1);

      expect(found).toEqual(['b', 2]);
    });
  });

  describe('locking', () => {
    let map: MapValue;

    beforeEach(() => {
      map = new MapValue('config', { a: 1 });
    });

    it('prevents modifications when locked', () => {
      map.lock();

      expect(map.set('b', 2)).toBe(false);
      expect(map.delete('a')).toBeUndefined();
      expect(map.size).toBe(1);
    });

    it('allows modifications after unlock', () => {
      map.lock();
      map.unlock();

      map.set('b', 2);
      expect(map.size).toBe(2);
    });

    it('withLock executes function with lock', () => {
      const result = map.withLock(() => {
        expect(map.isLocked()).toBe(true);
        return 42;
      });

      expect(result).toBe(42);
      expect(map.isLocked()).toBe(false);
    });
  });

  describe('history tracking', () => {
    it('tracks history when enabled', () => {
      const map = new MapValue('config', {}, { trackHistory: true });

      map.set('a', 1);
      map.set('b', 2);
      map.delete('a');

      const history = map.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('set');
      expect(history[2].action).toBe('delete');
    });

    it('does not track history by default', () => {
      const map = new MapValue('config');

      map.set('a', 1);
      expect(map.getHistory()).toEqual([]);
    });
  });

  describe('serialization', () => {
    it('serializes state', () => {
      const map = new MapValue('config', { a: 1, b: 2 });
      const state = map.getState();

      expect(state.name).toBe('config');
      expect(state.entries).toEqual({ a: 1, b: 2 });
    });

    it('restores state', () => {
      const map = new MapValue('config');
      map.restoreState({
        name: 'config',
        entries: { x: 10, y: 20 },
      });

      expect(map.toObject()).toEqual({ x: 10, y: 20 });
    });

    it('copies map', () => {
      const map = new MapValue('config', { a: 1 });
      const copy = map.copy();

      copy.set('b', 2);

      expect(map.size).toBe(1);
      expect(copy.size).toBe(2);
    });
  });
});

describe('MapRegistry', () => {
  let registry: MapRegistry;

  beforeEach(() => {
    registry = new MapRegistry();
  });

  describe('define and get', () => {
    it('defines and retrieves map', () => {
      const map = registry.define('config', { a: 1 });

      expect(map.get('a')).toBe(1);
      expect(registry.get('config')).toBe(map);
    });

    it('checks has', () => {
      registry.define('config');

      expect(registry.has('config')).toBe(true);
      expect(registry.has('other')).toBe(false);
    });

    it('removes map', () => {
      registry.define('config');

      const removed = registry.remove('config');

      expect(removed).toBe(true);
      expect(registry.has('config')).toBe(false);
    });
  });

  describe('convenience accessors', () => {
    beforeEach(() => {
      registry.define('config', { a: 1, b: 2 });
    });

    it('getValue', () => {
      expect(registry.getValue('config', 'a')).toBe(1);
    });

    it('setValue', () => {
      registry.setValue('config', 'a', 10);
      expect(registry.getValue('config', 'a')).toBe(10);
    });

    it('hasKey', () => {
      expect(registry.hasKey('config', 'a')).toBe(true);
      expect(registry.hasKey('config', 'z')).toBe(false);
    });

    it('deleteKey', () => {
      const val = registry.deleteKey('config', 'a');
      expect(val).toBe(1);
      expect(registry.hasKey('config', 'a')).toBe(false);
    });

    it('getSize', () => {
      expect(registry.getSize('config')).toBe(2);
    });
  });

  describe('serialization', () => {
    it('serializes all maps', () => {
      registry.define('a', { x: 1 });
      registry.define('b', { y: 2 });

      const state = registry.getState();

      expect(Object.keys(state.maps)).toEqual(['a', 'b']);
    });

    it('restores state', () => {
      registry.restoreState({
        maps: {
          config: { name: 'config', entries: { a: 1 } },
        },
      });

      expect(registry.has('config')).toBe(true);
      expect(registry.get('config')?.get('a')).toBe(1);
    });

    it('clones registry', () => {
      registry.define('config', { a: 1 });
      const cloned = registry.clone();

      cloned.get('config')?.set('b', 2);

      expect(registry.get('config')?.size).toBe(1);
      expect(cloned.get('config')?.size).toBe(2);
    });
  });
});
