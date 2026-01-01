/**
 * Tests for LuaExecutor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LuaExecutor, type LuaExecutionContext } from './LuaExecutor';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('LuaExecutor', () => {
  let executor: LuaExecutor;
  let story: Story;
  let context: LuaExecutionContext;

  beforeEach(() => {
    executor = new LuaExecutor();

    const passage1 = new Passage({
      id: 'passage-1',
      name: 'Start',
      content: 'Starting passage',
      tags: ['start', 'intro'],
      position: { x: 0, y: 0 },
    });

    const passage2 = new Passage({
      id: 'passage-2',
      name: 'Middle',
      content: 'Middle passage',
      tags: ['middle'],
      position: { x: 100, y: 0 },
    });

    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      passages: {
        'passage-1': passage1,
        'passage-2': passage2,
      },
    });

    context = {
      story,
      currentPassageId: 'passage-1',
      variables: {
        playerName: 'Alice',
        score: 100,
      },
      history: ['passage-1'],
    };
  });

  afterEach(async () => {
    await executor.dispose();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await executor.initialize();
      // No error thrown = success
    });

    it('should handle multiple initialize calls', async () => {
      await executor.initialize();
      await executor.initialize();
      await executor.initialize();
      // No error thrown = success
    });
  });

  describe('Basic Execution', () => {
    it('should execute simple Lua code', async () => {
      const result = await executor.execute('return 42', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it('should execute arithmetic operations', async () => {
      const result = await executor.execute('return 10 + 20 * 2', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
    });

    it('should execute string operations', async () => {
      const result = await executor.execute('return "Hello" .. " " .. "World"', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should handle syntax errors', async () => {
      const result = await executor.execute('invalid lua syntax }{', context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors', async () => {
      const result = await executor.execute('return nil + 5', context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('game_state API', () => {
    it('should get existing variable', async () => {
      const result = await executor.execute(
        'return game_state.get("playerName")',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Alice');
    });

    it('should set variable', async () => {
      const result = await executor.execute(
        'game_state.set("playerName", "Bob")',
        context
      );

      expect(result.success).toBe(true);
      expect(context.variables.playerName).toBe('Bob');
    });

    it('should check if variable exists', async () => {
      const result = await executor.execute(
        'return game_state.exists("playerName")',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should check non-existent variable', async () => {
      const result = await executor.execute(
        'return game_state.exists("nonExistent")',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should delete variable', async () => {
      await executor.execute('game_state.delete("playerName")', context);

      expect(context.variables.playerName).toBeUndefined();
    });

    it('should list all variables', async () => {
      const result = await executor.execute(
        'local vars = game_state.list(); return #vars',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(Object.keys(context.variables).length);
    });
  });

  describe('passages API', () => {
    it('should get passage by ID', async () => {
      const result = await executor.execute(
        'local p = passages.get("passage-1"); return p ~= nil',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return null for non-existent passage', async () => {
      const result = await executor.execute(
        'return passages.get("non-existent") == nil',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should get current passage', async () => {
      const result = await executor.execute(
        'local p = passages.current(); return p ~= nil',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should navigate to passage', async () => {
      await executor.execute('passages.navigate("passage-2")', context);

      expect(context.currentPassageId).toBe('passage-2');
      expect(context.history).toContain('passage-2');
    });

    it('should count passages', async () => {
      const result = await executor.execute('return passages.count()', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });
  });

  describe('history API', () => {
    it('should get history length', async () => {
      const result = await executor.execute('return history.length', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should get history entry', async () => {
      const result = await executor.execute('return history.get(0)', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('passage-1');
    });

    it('should list history', async () => {
      context.history = ['passage-1', 'passage-2'];

      const result = await executor.execute(
        'local h = history.list(); return #h',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should go back in history', async () => {
      context.history = ['passage-1', 'passage-2'];
      context.currentPassageId = 'passage-2';

      await executor.execute('history.back()', context);

      expect(context.currentPassageId).toBe('passage-1');
      expect(context.history.length).toBe(1);
    });

    it('should clear history', async () => {
      context.history = ['passage-1', 'passage-2', 'passage-3'];

      await executor.execute('history.clear()', context);

      expect(context.history).toEqual([]);
    });
  });

  describe('tags API', () => {
    it('should check if current passage has tag', async () => {
      const result = await executor.execute('return tags.has("start")', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false for non-existent tag', async () => {
      const result = await executor.execute('return tags.has("nonexistent")', context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should list tags for current passage', async () => {
      const result = await executor.execute(
        'local t = tags.list(); return #t',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(2); // start, intro
    });
  });

  describe('Helper Functions', () => {
    it('should generate random number', async () => {
      const result = await executor.execute('return random(1, 10)', context);

      expect(result.success).toBe(true);
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(10);
    });

    it('should choose from array', async () => {
      const result = await executor.execute(
        'return choice({"a", "b", "c"})',
        context
      );

      expect(result.success).toBe(true);
      expect(['a', 'b', 'c']).toContain(result.value);
    });

    it('should format string', async () => {
      const result = await executor.execute(
        'return format("Hello {0}, you have {1} points", "Alice", 100)',
        context
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello Alice, you have 100 points');
    });
  });

  describe('Output Capture', () => {
    it('should capture print output', async () => {
      const result = await executor.execute('print("Hello World")', context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
    });

    it('should capture multiple print calls', async () => {
      const result = await executor.execute(
        'print("Line 1"); print("Line 2"); print("Line 3")',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toHaveLength(3);
      expect(result.output[0]).toBe('Line 1');
      expect(result.output[1]).toBe('Line 2');
      expect(result.output[2]).toBe('Line 3');
    });

    it('should capture print with multiple arguments', async () => {
      const result = await executor.execute('print("Number:", 42, "String:", "test")', context);

      expect(result.success).toBe(true);
      expect(result.output[0]).toBe('Number:\t42\tString:\ttest');
    });
  });

  describe('Complex Scripts', () => {
    it('should execute conditional logic', async () => {
      const script = `
        local score = game_state.get("score")
        if score > 50 then
          return "Pass"
        else
          return "Fail"
        end
      `;

      const result = await executor.execute(script, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Pass');
    });

    it('should execute loops', async () => {
      const script = `
        local sum = 0
        for i = 1, 10 do
          sum = sum + i
        end
        return sum
      `;

      const result = await executor.execute(script, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(55); // 1+2+3+...+10
    });

    it('should execute functions', async () => {
      const script = `
        function factorial(n)
          if n <= 1 then
            return 1
          else
            return n * factorial(n - 1)
          end
        end
        return factorial(5)
      `;

      const result = await executor.execute(script, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(120); // 5!
    });

    it('should execute tables', async () => {
      const script = `
        local inventory = {"sword", "shield", "potion"}
        return #inventory
      `;

      const result = await executor.execute(script, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', async () => {
      const result = await executor.validate('local x = 10; return x + 5');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect syntax errors', async () => {
      const result = await executor.validate('invalid syntax }{');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should dispose cleanly', async () => {
      await executor.initialize();
      await executor.dispose();
      // No error = success
    });

    it('should handle dispose without initialize', async () => {
      await executor.dispose();
      // No error = success
    });
  });
});
