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
});
