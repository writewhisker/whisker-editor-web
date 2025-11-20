/**
 * Macro Processor Tests
 *
 * Comprehensive tests for the macro system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MacroProcessor } from './MacroProcessor';
import type { MacroContext, CustomMacro } from './types';

describe('MacroProcessor', () => {
  let processor: MacroProcessor;
  let context: MacroContext;

  beforeEach(() => {
    processor = new MacroProcessor();
    context = {
      variables: new Map(),
      functions: new Map(),
      customMacros: new Map(),
    };
  });

  describe('Variable Interpolation ({{var}})', () => {
    it('should interpolate simple variables', async () => {
      context.variables.set('name', 'Alice');
      const result = await processor.process('Hello, {{var name}}!', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, Alice!');
    });

    it('should interpolate multiple variables', async () => {
      context.variables.set('firstName', 'Alice');
      context.variables.set('lastName', 'Smith');

      const result = await processor.process(
        '{{var firstName}} {{var lastName}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Alice Smith');
    });

    it('should handle property access', async () => {
      context.variables.set('player', { name: 'Alice', level: 5 });

      const result = await processor.process(
        'Name: {{var player.name}}, Level: {{var player.level}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Name: Alice, Level: 5');
    });

    it('should handle missing variables gracefully', async () => {
      const result = await processor.process('Hello, {{var missing}}!', context);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Error');
    });

    it('should interpolate numbers', async () => {
      context.variables.set('score', 100);
      const result = await processor.process('Score: {{var score}}', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Score: 100');
    });
  });

  describe('For Loops ({{for}})', () => {
    it('should iterate over range', async () => {
      const result = await processor.process(
        '{{for i in range(1, 3)}}{{var i}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('1 2 3 ');
    });

    it('should handle range with step', async () => {
      const result = await processor.process(
        '{{for i in range(0, 10, 2)}}{{var i}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('0 2 4 6 8 10 ');
    });

    it('should handle negative step', async () => {
      const result = await processor.process(
        '{{for i in range(5, 1, -1)}}{{var i}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('5 4 3 2 1 ');
    });

    it('should handle nested for loops', async () => {
      const result = await processor.process(
        '{{for i in range(1, 2)}}{{for j in range(1, 2)}}({{var i}},{{var j}}) {{end}}{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('(1,1) (1,2) (2,1) (2,2) ');
    });

    it('should protect against infinite loops', async () => {
      const result = await processor.process(
        '{{for i in range(1, 100000)}}{{var i}}{{end}}',
        context,
        { maxIterations: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum iterations');
    });
  });

  describe('Each Loops ({{each}})', () => {
    it('should iterate over array', async () => {
      context.variables.set('items', ['Apple', 'Banana', 'Orange']);

      const result = await processor.process(
        '{{each item in items}}{{var item}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Apple Banana Orange ');
    });

    it('should iterate over array with index', async () => {
      context.variables.set('items', ['A', 'B', 'C']);

      const result = await processor.process(
        '{{each index,item in items}}{{var index}}:{{var item}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('0:A 1:B 2:C ');
    });

    it('should iterate over object', async () => {
      context.variables.set('player', { name: 'Alice', level: 5 });

      const result = await processor.process(
        '{{each key,value in player}}{{var key}}={{var value}} {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toContain('name=Alice');
      expect(result.output).toContain('level=5');
    });

    it('should handle empty arrays', async () => {
      context.variables.set('items', []);

      const result = await processor.process(
        '{{each item in items}}{{var item}}{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should handle nested each loops', async () => {
      context.variables.set('outer', [1, 2]);
      context.variables.set('inner', ['a', 'b']);

      const result = await processor.process(
        '{{each i in outer}}{{each j in inner}}{{var i}}{{var j}} {{end}}{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('1a 1b 2a 2b ');
    });

    it('should handle array of objects', async () => {
      context.variables.set('inventory', [
        { name: 'Sword', quantity: 1 },
        { name: 'Potion', quantity: 3 },
      ]);

      const result = await processor.process(
        '{{each item in inventory}}{{var item.name}}({{var item.quantity}}) {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Sword(1) Potion(3) ');
    });
  });

  describe('Function Calls ({{call}})', () => {
    it('should call function with no arguments', async () => {
      context.functions.set('getTime', {
        name: 'getTime',
        execute: () => '12:00',
      });

      const result = await processor.process('Time: {{call getTime()}}', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Time: 12:00');
    });

    it('should call function with arguments', async () => {
      context.functions.set('add', {
        name: 'add',
        execute: (a: number, b: number) => a + b,
      });
      context.variables.set('x', 5);
      context.variables.set('y', 10);

      const result = await processor.process('Result: {{call add(x, y)}}', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Result: 15');
    });

    it('should call function with literal arguments', async () => {
      context.functions.set('greet', {
        name: 'greet',
        execute: (name: string) => `Hello, ${name}!`,
      });

      const result = await processor.process('{{call greet("Alice")}}', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello, Alice!');
    });

    it('should handle missing function', async () => {
      const result = await processor.process('{{call missing()}}', context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle function errors gracefully', async () => {
      context.functions.set('error', {
        name: 'error',
        execute: () => {
          throw new Error('Function error');
        },
      });

      const result = await processor.process('{{call error()}}', context);

      expect(result.success).toBe(false);
    });
  });

  describe('Conditionals ({{if}})', () => {
    it('should render content when condition is true', async () => {
      context.variables.set('hasKey', true);

      const result = await processor.process(
        '{{if hasKey}}You have the key{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('You have the key');
    });

    it('should not render content when condition is false', async () => {
      context.variables.set('hasKey', false);

      const result = await processor.process(
        '{{if hasKey}}You have the key{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should treat missing variables as false', async () => {
      const result = await processor.process(
        '{{if missing}}Should not appear{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should handle truthy values', async () => {
      context.variables.set('count', 5);

      const result = await processor.process(
        '{{if count}}You have items{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('You have items');
    });

    it('should handle falsy values', async () => {
      context.variables.set('count', 0);

      const result = await processor.process(
        '{{if count}}You have items{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });
  });

  describe('Custom Macros', () => {
    it('should register and use custom macro', async () => {
      const uppercaseMacro: CustomMacro = {
        name: 'uppercase',
        type: 'block',
        hasEndBlock: true,
        async process(args) {
          return (args.content || '').toUpperCase();
        },
      };

      processor.getRegistry().register(uppercaseMacro);

      const result = await processor.process(
        '{{uppercase}}hello world{{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('HELLO WORLD');
    });

    it('should register inline custom macro', async () => {
      const timeMacro: CustomMacro = {
        name: 'timestamp',
        type: 'inline',
        hasEndBlock: false,
        async process() {
          return '2025-01-01';
        },
      };

      processor.getRegistry().register(timeMacro);

      const result = await processor.process('Date: {{timestamp}}', context);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Date: 2025-01-01');
    });

    it('should handle macro with arguments', async () => {
      const repeatMacro: CustomMacro = {
        name: 'repeat',
        type: 'block',
        hasEndBlock: true,
        async process(args) {
          const count = parseInt(args.rawArgs.trim(), 10);
          return (args.content || '').repeat(count);
        },
      };

      processor.getRegistry().register(repeatMacro);

      const result = await processor.process(
        '{{repeat 3}}Hi! {{end}}',
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Hi! Hi! Hi! ');
    });
  });

  describe('Complex Templates', () => {
    it('should handle inventory system template', async () => {
      context.variables.set('hasItems', true);
      context.variables.set('inventory', [
        { name: 'Sword', quantity: 1 },
        { name: 'Potion', quantity: 3 },
      ]);

      const template = `Inventory:
{{each item in inventory}}- {{var item.name}} (x{{var item.quantity}})
{{end}}`;

      const result = await processor.process(template, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Inventory:');
      expect(result.output).toContain('Sword (x1)');
      expect(result.output).toContain('Potion (x3)');
    });

    it('should handle multiplication table', async () => {
      context.functions.set('multiply', {
        name: 'multiply',
        execute: (a: number, b: number) => a * b,
      });

      const template = '{{for i in range(1, 3)}}{{for j in range(1, 3)}}{{call multiply(i, j)}} {{end}}\n{{end}}';

      const result = await processor.process(template, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('1 2 3');
      expect(result.output).toContain('2 4 6');
      expect(result.output).toContain('3 6 9');
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed macro', async () => {
      const result = await processor.process('{{for i in range(1, 10)}}test', context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('{{end}}');
    });

    it('should handle invalid syntax in strict mode', async () => {
      await expect(async () => {
        await processor.process(
          '{{unknown}}',
          context,
          { strict: true }
        );
      }).rejects.toThrow('Unknown macro');
    });

    it('should display errors inline in non-strict mode', async () => {
      const result = await processor.process('{{unknown}}', context);

      expect(result.success).toBe(false);
      expect(result.output).toContain('[Unknown macro: unknown]');
    });
  });

  describe('Registry Operations', () => {
    it('should list registered macros', () => {
      const macros = processor.getRegistry().list();

      expect(macros).toContain('for');
      expect(macros).toContain('each');
      expect(macros).toContain('call');
      expect(macros).toContain('var');
      expect(macros).toContain('if');
    });

    it('should check if macro exists', () => {
      expect(processor.getRegistry().has('for')).toBe(true);
      expect(processor.getRegistry().has('unknown')).toBe(false);
    });

    it('should unregister macro', () => {
      const result = processor.getRegistry().unregister('if');

      expect(result).toBe(true);
      expect(processor.getRegistry().has('if')).toBe(false);
    });

    it('should prevent duplicate registration', () => {
      const macro: CustomMacro = {
        name: 'for',
        type: 'block',
        hasEndBlock: true,
        async process() {
          return '';
        },
      };

      expect(() => {
        processor.getRegistry().register(macro);
      }).toThrow('already registered');
    });
  });
});
