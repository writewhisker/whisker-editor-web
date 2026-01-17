/**
 * WLS 1.0 Whisker API Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WhiskerApi,
  InMemoryRuntimeContext,
  createTestWhiskerApi,
  type WhiskerPassage,
  type WhiskerChoice,
} from './whiskerApi';

describe('WhiskerApi', () => {
  let api: WhiskerApi;
  let context: InMemoryRuntimeContext;

  beforeEach(() => {
    const result = createTestWhiskerApi();
    api = result.api;
    context = result.context;
  });

  // ==========================================================================
  // whisker.state
  // ==========================================================================

  describe('whisker.state', () => {
    describe('get', () => {
      it('returns null for undefined variable', () => {
        expect(api.state.get('undefined_var')).toBeNull();
      });

      it('returns variable value', () => {
        context.setVariable('gold', 100);
        expect(api.state.get('gold')).toBe(100);
      });

      it('returns string value', () => {
        context.setVariable('name', 'Hero');
        expect(api.state.get('name')).toBe('Hero');
      });

      it('returns boolean value', () => {
        context.setVariable('hasKey', true);
        expect(api.state.get('hasKey')).toBe(true);
      });

      it('throws for non-string key', () => {
        expect(() => api.state.get(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('set', () => {
      it('sets number value', () => {
        api.state.set('gold', 100);
        expect(context.getVariable('gold')).toBe(100);
      });

      it('sets string value', () => {
        api.state.set('name', 'Hero');
        expect(context.getVariable('name')).toBe('Hero');
      });

      it('sets boolean value', () => {
        api.state.set('hasKey', true);
        expect(context.getVariable('hasKey')).toBe(true);
      });

      it('sets null value', () => {
        api.state.set('empty', null);
        expect(context.getVariable('empty')).toBeNull();
      });

      it('overwrites existing value', () => {
        api.state.set('gold', 100);
        api.state.set('gold', 200);
        expect(context.getVariable('gold')).toBe(200);
      });

      it('throws for non-string key', () => {
        expect(() => api.state.set(123 as unknown as string, 'value')).toThrow('requires a string key');
      });
    });

    describe('has', () => {
      it('returns false for undefined variable', () => {
        expect(api.state.has('undefined_var')).toBe(false);
      });

      it('returns true for defined variable', () => {
        api.state.set('gold', 100);
        expect(api.state.has('gold')).toBe(true);
      });

      it('returns true for variable set to null', () => {
        api.state.set('empty', null);
        expect(api.state.has('empty')).toBe(true);
      });

      it('throws for non-string key', () => {
        expect(() => api.state.has(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('delete', () => {
      it('removes variable', () => {
        api.state.set('gold', 100);
        api.state.delete('gold');
        expect(api.state.has('gold')).toBe(false);
      });

      it('does nothing for undefined variable', () => {
        expect(() => api.state.delete('undefined_var')).not.toThrow();
      });

      it('throws for non-string key', () => {
        expect(() => api.state.delete(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('all', () => {
      it('returns empty object when no variables', () => {
        expect(api.state.all()).toEqual({});
      });

      it('returns all variables', () => {
        api.state.set('gold', 100);
        api.state.set('name', 'Hero');
        expect(api.state.all()).toEqual({
          gold: 100,
          name: 'Hero',
        });
      });

      it('returns copy (not reference)', () => {
        api.state.set('gold', 100);
        const all = api.state.all();
        all.gold = 200;
        expect(api.state.get('gold')).toBe(100);
      });
    });

    describe('reset', () => {
      it('clears all variables', () => {
        api.state.set('gold', 100);
        api.state.set('name', 'Hero');
        api.state.reset();
        expect(api.state.all()).toEqual({});
      });
    });
  });

  // ==========================================================================
  // whisker.passage
  // ==========================================================================

  describe('whisker.passage', () => {
    const testPassage: WhiskerPassage = {
      id: 'TestRoom',
      content: 'You are in a test room.',
      tags: ['room', 'test'],
      metadata: { color: '#333' },
    };

    beforeEach(() => {
      context.addPassage(testPassage);
      context.addPassage({
        id: 'OtherRoom',
        content: 'Another room.',
        tags: ['room'],
        metadata: {},
      });
    });

    describe('current', () => {
      it('returns null when no current passage', () => {
        expect(api.passage.current()).toBeNull();
      });

      it('returns current passage', () => {
        context.setCurrentPassage('TestRoom');
        const current = api.passage.current();
        expect(current?.id).toBe('TestRoom');
        expect(current?.content).toBe('You are in a test room.');
      });
    });

    describe('get', () => {
      it('returns passage by id', () => {
        const passage = api.passage.get('TestRoom');
        expect(passage?.id).toBe('TestRoom');
      });

      it('returns null for non-existent passage', () => {
        expect(api.passage.get('NonExistent')).toBeNull();
      });

      it('throws for non-string id', () => {
        expect(() => api.passage.get(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('go', () => {
      it('navigates to passage', () => {
        context.setCurrentPassage('TestRoom');
        api.passage.go('OtherRoom');
        expect(api.passage.current()?.id).toBe('OtherRoom');
      });

      it('adds previous passage to history', () => {
        context.setCurrentPassage('TestRoom');
        api.passage.go('OtherRoom');
        expect(api.history.list()).toContain('TestRoom');
      });

      it('throws for non-existent passage', () => {
        expect(() => api.passage.go('NonExistent')).toThrow('Passage not found: NonExistent');
      });

      it('throws for non-string id', () => {
        expect(() => api.passage.go(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('exists', () => {
      it('returns true for existing passage', () => {
        expect(api.passage.exists('TestRoom')).toBe(true);
      });

      it('returns false for non-existent passage', () => {
        expect(api.passage.exists('NonExistent')).toBe(false);
      });

      it('throws for non-string id', () => {
        expect(() => api.passage.exists(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('all', () => {
      it('returns all passages', () => {
        const all = api.passage.all();
        expect(Object.keys(all)).toHaveLength(2);
        expect(all['TestRoom']).toBeDefined();
        expect(all['OtherRoom']).toBeDefined();
      });
    });

    describe('tags', () => {
      it('returns passages with specific tag', () => {
        const rooms = api.passage.tags('room');
        expect(rooms).toHaveLength(2);
      });

      it('returns passages with unique tag', () => {
        const tests = api.passage.tags('test');
        expect(tests).toHaveLength(1);
        expect(tests[0].id).toBe('TestRoom');
      });

      it('returns empty array for non-existent tag', () => {
        expect(api.passage.tags('nonexistent')).toHaveLength(0);
      });

      it('throws for non-string tag', () => {
        expect(() => api.passage.tags(123 as unknown as string)).toThrow('requires a string argument');
      });
    });
  });

  // ==========================================================================
  // whisker.history
  // ==========================================================================

  describe('whisker.history', () => {
    beforeEach(() => {
      context.addPassage({ id: 'A', content: 'A', tags: [], metadata: {} });
      context.addPassage({ id: 'B', content: 'B', tags: [], metadata: {} });
      context.addPassage({ id: 'C', content: 'C', tags: [], metadata: {} });
    });

    describe('back', () => {
      it('returns false when no history', () => {
        expect(api.history.back()).toBe(false);
      });

      it('navigates back and returns true', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        expect(api.history.back()).toBe(true);
        expect(api.passage.current()?.id).toBe('A');
      });
    });

    describe('canBack', () => {
      it('returns false when no history', () => {
        expect(api.history.canBack()).toBe(false);
      });

      it('returns true when history exists', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        expect(api.history.canBack()).toBe(true);
      });
    });

    describe('list', () => {
      it('returns empty array when no history', () => {
        expect(api.history.list()).toEqual([]);
      });

      it('returns history in order', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        api.passage.go('C');
        expect(api.history.list()).toEqual(['A', 'B']);
      });
    });

    describe('count', () => {
      it('returns 0 when no history', () => {
        expect(api.history.count()).toBe(0);
      });

      it('returns correct count', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        api.passage.go('C');
        expect(api.history.count()).toBe(2);
      });
    });

    describe('contains', () => {
      it('returns false for passage not in history', () => {
        context.setCurrentPassage('A');
        expect(api.history.contains('A')).toBe(false);
      });

      it('returns true for passage in history', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        expect(api.history.contains('A')).toBe(true);
      });

      it('throws for non-string id', () => {
        expect(() => api.history.contains(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('clear', () => {
      it('clears history', () => {
        context.setCurrentPassage('A');
        api.passage.go('B');
        api.passage.go('C');
        api.history.clear();
        expect(api.history.count()).toBe(0);
      });
    });
  });

  // ==========================================================================
  // whisker.choice
  // ==========================================================================

  describe('whisker.choice', () => {
    const testChoices: WhiskerChoice[] = [
      { text: 'Go north', target: 'North', type: 'once', index: 1 },
      { text: 'Go south', target: 'South', type: 'sticky', index: 2 },
    ];

    beforeEach(() => {
      context.addPassage({ id: 'North', content: 'North', tags: [], metadata: {} });
      context.addPassage({ id: 'South', content: 'South', tags: [], metadata: {} });
      context.addPassage({ id: 'Start', content: 'Start', tags: [], metadata: {} });
      context.setCurrentPassage('Start');
      context.setChoices(testChoices);
    });

    describe('available', () => {
      it('returns available choices', () => {
        const choices = api.choice.available();
        expect(choices).toHaveLength(2);
        expect(choices[0].text).toBe('Go north');
        expect(choices[1].text).toBe('Go south');
      });

      it('returns copy (not reference)', () => {
        const choices = api.choice.available();
        choices.push({ text: 'New', target: null, type: 'once', index: 3 });
        expect(api.choice.available()).toHaveLength(2);
      });
    });

    describe('select', () => {
      it('selects choice and navigates', () => {
        api.choice.select(1);
        expect(api.passage.current()?.id).toBe('North');
      });

      it('throws for invalid index', () => {
        expect(() => api.choice.select(0)).toThrow('Invalid choice index: 0');
        expect(() => api.choice.select(3)).toThrow('Invalid choice index: 3');
      });

      it('throws for non-number index', () => {
        expect(() => api.choice.select('1' as unknown as number)).toThrow('requires a number argument');
      });
    });

    describe('count', () => {
      it('returns choice count', () => {
        expect(api.choice.count()).toBe(2);
      });

      it('returns 0 when no choices', () => {
        context.setChoices([]);
        expect(api.choice.count()).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Top-level whisker functions
  // ==========================================================================

  describe('whisker.visited', () => {
    beforeEach(() => {
      context.addPassage({ id: 'A', content: 'A', tags: [], metadata: {} });
      context.addPassage({ id: 'B', content: 'B', tags: [], metadata: {} });
    });

    it('returns 0 for unvisited passage', () => {
      expect(api.visited('A')).toBe(0);
    });

    it('returns visit count', () => {
      context.setCurrentPassage('A');
      expect(api.visited('A')).toBe(1);
      api.passage.go('B');
      api.passage.go('A');
      expect(api.visited('A')).toBe(2);
    });

    it('returns current passage visits when no argument', () => {
      context.setCurrentPassage('A');
      expect(api.visited()).toBe(1);
    });

    it('throws for non-string argument', () => {
      expect(() => api.visited(123 as unknown as string)).toThrow('requires a string argument or no argument');
    });
  });

  describe('whisker.random', () => {
    it('returns integer in range', () => {
      for (let i = 0; i < 100; i++) {
        const result = api.random(1, 6);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('handles min === max', () => {
      expect(api.random(5, 5)).toBe(5);
    });

    it('throws for non-number arguments', () => {
      expect(() => api.random('1' as unknown as number, 6)).toThrow('requires two number arguments');
      expect(() => api.random(1, '6' as unknown as number)).toThrow('requires two number arguments');
    });
  });

  describe('whisker.pick', () => {
    it('returns one of the arguments', () => {
      const options = ['a', 'b', 'c'];
      for (let i = 0; i < 100; i++) {
        const result = api.pick(...options);
        expect(options).toContain(result);
      }
    });

    it('works with single argument', () => {
      expect(api.pick('only')).toBe('only');
    });

    it('works with different types', () => {
      const result = api.pick(1, 'two', true);
      expect([1, 'two', true]).toContain(result);
    });

    it('throws for no arguments', () => {
      expect(() => api.pick()).toThrow('requires at least one argument');
    });
  });

  describe('whisker.print', () => {
    it('outputs to context', () => {
      api.print('Hello', 'World');
      expect(context.getOutput()).toEqual(['Hello\tWorld']);
    });

    it('converts values to strings', () => {
      api.print(123, true, null);
      expect(context.getOutput()).toEqual(['123\ttrue\tnull']);
    });

    it('handles single argument', () => {
      api.print('Single');
      expect(context.getOutput()).toEqual(['Single']);
    });
  });

  // ==========================================================================
  // WLS 1.0 Gap 3: Collection Operations
  // ==========================================================================

  describe('whisker.state LIST operations', () => {
    beforeEach(() => {
      // Set up a test list
      context.setList('moods', {
        values: ['happy', 'sad', 'angry', 'neutral'],
        active: new Set(['happy']),
      });
    });

    it('getList returns list data', () => {
      const list = api.state.getList('moods');
      expect(list).not.toBeNull();
      expect(list?.values).toEqual(['happy', 'sad', 'angry', 'neutral']);
      expect(list?.active.has('happy')).toBe(true);
    });

    it('hasList returns true for existing list', () => {
      expect(api.state.hasList('moods')).toBe(true);
    });

    it('hasList returns false for non-existing list', () => {
      expect(api.state.hasList('nonexistent')).toBe(false);
    });

    it('listValues returns possible values', () => {
      expect(api.state.listValues('moods')).toEqual(['happy', 'sad', 'angry', 'neutral']);
    });

    it('listActive returns active values', () => {
      expect(api.state.listActive('moods')).toEqual(['happy']);
    });

    it('listContains checks active status', () => {
      expect(api.state.listContains('moods', 'happy')).toBe(true);
      expect(api.state.listContains('moods', 'sad')).toBe(false);
    });

    it('listAdd activates a value', () => {
      expect(api.state.listAdd('moods', 'sad')).toBe(true);
      expect(api.state.listContains('moods', 'sad')).toBe(true);
    });

    it('listAdd returns false for invalid value', () => {
      expect(api.state.listAdd('moods', 'invalid')).toBe(false);
    });

    it('listRemove deactivates a value', () => {
      expect(api.state.listRemove('moods', 'happy')).toBe(true);
      expect(api.state.listContains('moods', 'happy')).toBe(false);
    });

    it('listToggle switches value state', () => {
      expect(api.state.listToggle('moods', 'happy')).toBe(false); // was true, now false
      expect(api.state.listToggle('moods', 'happy')).toBe(true);  // was false, now true
    });

    it('listCount returns active count', () => {
      expect(api.state.listCount('moods')).toBe(1);
      api.state.listAdd('moods', 'sad');
      expect(api.state.listCount('moods')).toBe(2);
    });
  });

  describe('whisker.state ARRAY operations', () => {
    beforeEach(() => {
      context.setArray('scores', [100, 85, 92]);
    });

    it('getArray returns array', () => {
      expect(api.state.getArray('scores')).toEqual([100, 85, 92]);
    });

    it('hasArray returns true for existing array', () => {
      expect(api.state.hasArray('scores')).toBe(true);
    });

    it('hasArray returns false for non-existing array', () => {
      expect(api.state.hasArray('nonexistent')).toBe(false);
    });

    it('arrayGet returns element at index', () => {
      expect(api.state.arrayGet('scores', 0)).toBe(100);
      expect(api.state.arrayGet('scores', 1)).toBe(85);
      expect(api.state.arrayGet('scores', 2)).toBe(92);
    });

    it('arraySet updates element at index', () => {
      expect(api.state.arraySet('scores', 1, 90)).toBe(true);
      expect(api.state.arrayGet('scores', 1)).toBe(90);
    });

    it('arrayLength returns array length', () => {
      expect(api.state.arrayLength('scores')).toBe(3);
    });

    it('arrayPush appends value', () => {
      expect(api.state.arrayPush('scores', 95)).toBe(4);
      expect(api.state.arrayLength('scores')).toBe(4);
      expect(api.state.arrayGet('scores', 3)).toBe(95);
    });

    it('arrayPop removes and returns last value', () => {
      expect(api.state.arrayPop('scores')).toBe(92);
      expect(api.state.arrayLength('scores')).toBe(2);
    });

    it('arrayInsert inserts at index', () => {
      api.state.arrayInsert('scores', 1, 88);
      expect(api.state.getArray('scores')).toEqual([100, 88, 85, 92]);
    });

    it('arrayRemove removes at index', () => {
      expect(api.state.arrayRemove('scores', 1)).toBe(85);
      expect(api.state.getArray('scores')).toEqual([100, 92]);
    });

    it('arrayContains checks for value', () => {
      expect(api.state.arrayContains('scores', 85)).toBe(true);
      expect(api.state.arrayContains('scores', 99)).toBe(false);
    });

    it('arrayIndexOf finds value index', () => {
      expect(api.state.arrayIndexOf('scores', 85)).toBe(1);
      expect(api.state.arrayIndexOf('scores', 99)).toBe(-1);
    });
  });

  describe('whisker.state MAP operations', () => {
    beforeEach(() => {
      context.setMap('player', { name: 'Hero', health: 100, level: 1 });
    });

    it('getMap returns map', () => {
      expect(api.state.getMap('player')).toEqual({ name: 'Hero', health: 100, level: 1 });
    });

    it('hasMap returns true for existing map', () => {
      expect(api.state.hasMap('player')).toBe(true);
    });

    it('hasMap returns false for non-existing map', () => {
      expect(api.state.hasMap('nonexistent')).toBe(false);
    });

    it('mapGet returns value by key', () => {
      expect(api.state.mapGet('player', 'name')).toBe('Hero');
      expect(api.state.mapGet('player', 'health')).toBe(100);
    });

    it('mapGet returns null for missing key', () => {
      expect(api.state.mapGet('player', 'mana')).toBeNull();
    });

    it('mapSet updates value by key', () => {
      api.state.mapSet('player', 'health', 90);
      expect(api.state.mapGet('player', 'health')).toBe(90);
    });

    it('mapSet adds new key', () => {
      api.state.mapSet('player', 'mana', 50);
      expect(api.state.mapGet('player', 'mana')).toBe(50);
    });

    it('mapHas checks for key existence', () => {
      expect(api.state.mapHas('player', 'name')).toBe(true);
      expect(api.state.mapHas('player', 'mana')).toBe(false);
    });

    it('mapDelete removes key', () => {
      expect(api.state.mapDelete('player', 'level')).toBe(1);
      expect(api.state.mapHas('player', 'level')).toBe(false);
    });

    it('mapKeys returns all keys', () => {
      expect(api.state.mapKeys('player').sort()).toEqual(['health', 'level', 'name']);
    });

    it('mapValues returns all values', () => {
      const values = api.state.mapValues('player');
      expect(values).toContain('Hero');
      expect(values).toContain(100);
      expect(values).toContain(1);
    });

    it('mapSize returns entry count', () => {
      expect(api.state.mapSize('player')).toBe(3);
    });
  });

  // ==========================================================================
  // WLS Chapter 7: whisker.hook API
  // ==========================================================================

  describe('whisker.hook', () => {
    beforeEach(() => {
      // Set up test hooks
      context.addHook({ name: 'status', content: 'Ready', visible: true });
      context.addHook({ name: 'score', content: '42', visible: true });
      context.addHook({ name: 'hidden', content: 'Secret', visible: false });
      context.addHook({ name: 'inventory', content: 'sword, key, potion', visible: true });
    });

    describe('visible', () => {
      it('returns true for visible hook', () => {
        expect(api.hook.visible('status')).toBe(true);
      });

      it('returns false for hidden hook', () => {
        expect(api.hook.visible('hidden')).toBe(false);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.visible('nonexistent')).toBe(false);
      });

      it('throws for non-string name', () => {
        expect(() => api.hook.visible(123 as unknown as string)).toThrow('requires a string argument');
      });
    });

    describe('hidden', () => {
      it('returns true for hidden hook', () => {
        expect(api.hook.hidden('hidden')).toBe(true);
      });

      it('returns false for visible hook', () => {
        expect(api.hook.hidden('status')).toBe(false);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.hidden('nonexistent')).toBe(false);
      });
    });

    describe('exists', () => {
      it('returns true for existing hook', () => {
        expect(api.hook.exists('status')).toBe(true);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.exists('nonexistent')).toBe(false);
      });
    });

    describe('get', () => {
      it('returns hook content', () => {
        expect(api.hook.get('status')).toBe('Ready');
      });

      it('returns null for non-existent hook', () => {
        expect(api.hook.get('nonexistent')).toBeNull();
      });
    });

    describe('contains', () => {
      it('returns true when hook contains text', () => {
        expect(api.hook.contains('inventory', 'key')).toBe(true);
      });

      it('returns false when hook does not contain text', () => {
        expect(api.hook.contains('inventory', 'gold')).toBe(false);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.contains('nonexistent', 'text')).toBe(false);
      });
    });

    describe('number', () => {
      it('parses numeric content', () => {
        expect(api.hook.number('score')).toBe(42);
      });

      it('returns null for non-numeric content', () => {
        expect(api.hook.number('status')).toBeNull();
      });

      it('returns null for non-existent hook', () => {
        expect(api.hook.number('nonexistent')).toBeNull();
      });
    });

    describe('replace', () => {
      it('replaces hook content', () => {
        expect(api.hook.replace('status', 'Done')).toBe(true);
        expect(api.hook.get('status')).toBe('Done');
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.replace('nonexistent', 'content')).toBe(false);
      });
    });

    describe('append', () => {
      it('appends to hook content', () => {
        expect(api.hook.append('status', '!')).toBe(true);
        expect(api.hook.get('status')).toBe('Ready!');
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.append('nonexistent', 'content')).toBe(false);
      });
    });

    describe('prepend', () => {
      it('prepends to hook content', () => {
        expect(api.hook.prepend('status', '>>> ')).toBe(true);
        expect(api.hook.get('status')).toBe('>>> Ready');
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.prepend('nonexistent', 'content')).toBe(false);
      });
    });

    describe('show', () => {
      it('makes hidden hook visible', () => {
        expect(api.hook.visible('hidden')).toBe(false);
        expect(api.hook.show('hidden')).toBe(true);
        expect(api.hook.visible('hidden')).toBe(true);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.show('nonexistent')).toBe(false);
      });
    });

    describe('hide', () => {
      it('makes visible hook hidden', () => {
        expect(api.hook.visible('status')).toBe(true);
        expect(api.hook.hide('status')).toBe(true);
        expect(api.hook.visible('status')).toBe(false);
      });

      it('returns false for non-existent hook', () => {
        expect(api.hook.hide('nonexistent')).toBe(false);
      });
    });
  });
});
