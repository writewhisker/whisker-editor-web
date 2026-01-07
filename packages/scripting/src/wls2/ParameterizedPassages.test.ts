/**
 * ParameterizedPassages Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParameterizedPassages,
  createParameterizedPassages,
  parsePassageHeader,
  parsePassageCall,
  isVariableRef,
  isExpressionRef,
} from './ParameterizedPassages';

describe('parsePassageHeader', () => {
  it('parses simple passage name', () => {
    const header = parsePassageHeader('StartPassage');

    expect(header.name).toBe('StartPassage');
    expect(header.params).toEqual([]);
  });

  it('parses passage with single parameter', () => {
    const header = parsePassageHeader('Describe(item)');

    expect(header.name).toBe('Describe');
    expect(header.params).toHaveLength(1);
    expect(header.params[0].name).toBe('item');
  });

  it('parses passage with multiple parameters', () => {
    const header = parsePassageHeader('ShowItem(item, quality)');

    expect(header.params).toHaveLength(2);
    expect(header.params[0].name).toBe('item');
    expect(header.params[1].name).toBe('quality');
  });

  it('parses parameter with string default', () => {
    const header = parsePassageHeader('Describe(item, quality = "normal")');

    expect(header.params[1].name).toBe('quality');
    expect(header.params[1].default).toBe('normal');
  });

  it('parses parameter with number default', () => {
    const header = parsePassageHeader('Display(count = 10)');

    expect(header.params[0].default).toBe(10);
  });

  it('parses parameter with boolean default', () => {
    const header = parsePassageHeader('Toggle(enabled = true)');

    expect(header.params[0].default).toBe(true);
  });

  it('handles whitespace', () => {
    const header = parsePassageHeader('  Test( a , b = "x" )  ');

    expect(header.name).toBe('Test');
    expect(header.params).toHaveLength(2);
  });
});

describe('parsePassageCall', () => {
  it('parses simple passage call', () => {
    const call = parsePassageCall('StartPassage');

    expect(call.target).toBe('StartPassage');
    expect(call.args).toEqual([]);
  });

  it('parses call with string argument', () => {
    const call = parsePassageCall('Describe("sword")');

    expect(call.target).toBe('Describe');
    expect(call.args[0]).toBe('sword');
  });

  it('parses call with number argument', () => {
    const call = parsePassageCall('SetCount(42)');

    expect(call.args[0]).toBe(42);
  });

  it('parses call with boolean arguments', () => {
    const call = parsePassageCall('Toggle(true, false)');

    expect(call.args[0]).toBe(true);
    expect(call.args[1]).toBe(false);
  });

  it('parses call with variable reference', () => {
    const call = parsePassageCall('Display($itemName)');

    expect(isVariableRef(call.args[0])).toBe(true);
    if (isVariableRef(call.args[0])) {
      expect(call.args[0].name).toBe('itemName');
    }
  });

  it('parses call with expression', () => {
    const call = parsePassageCall('Calculate({score * 2})');

    expect(isExpressionRef(call.args[0])).toBe(true);
    if (isExpressionRef(call.args[0])) {
      expect(call.args[0].expr).toBe('score * 2');
    }
  });

  it('parses mixed arguments', () => {
    const call = parsePassageCall('Complex("text", 42, $var, {expr})');

    expect(call.args[0]).toBe('text');
    expect(call.args[1]).toBe(42);
    expect(isVariableRef(call.args[2])).toBe(true);
    expect(isExpressionRef(call.args[3])).toBe(true);
  });
});

describe('type guards', () => {
  it('isVariableRef identifies variable refs', () => {
    expect(isVariableRef({ _type: 'variable_ref', name: 'x' })).toBe(true);
    expect(isVariableRef('string')).toBe(false);
    expect(isVariableRef(42)).toBe(false);
  });

  it('isExpressionRef identifies expression refs', () => {
    expect(isExpressionRef({ _type: 'expression', expr: 'x + 1' })).toBe(true);
    expect(isExpressionRef('string')).toBe(false);
  });
});

describe('ParameterizedPassages', () => {
  let passages: ParameterizedPassages;

  beforeEach(() => {
    passages = createParameterizedPassages();
  });

  describe('registration', () => {
    it('registers passage from string', () => {
      passages.registerPassage('Describe(item)');

      expect(passages.isRegistered('Describe')).toBe(true);
    });

    it('registers passage from object', () => {
      passages.registerPassage({
        name: 'Test',
        params: [{ name: 'x' }],
      });

      expect(passages.isRegistered('Test')).toBe(true);
    });

    it('registers multiple passages', () => {
      passages.registerMany([
        'Describe(item)',
        'ShowItem(item, quality)',
      ]);

      expect(passages.isRegistered('Describe')).toBe(true);
      expect(passages.isRegistered('ShowItem')).toBe(true);
    });

    it('getRegisteredNames returns all names', () => {
      passages.registerPassage('A(x)');
      passages.registerPassage('B(y)');

      const names = passages.getRegisteredNames();

      expect(names).toContain('A');
      expect(names).toContain('B');
    });
  });

  describe('bindArguments', () => {
    beforeEach(() => {
      passages.registerPassage('Describe(item, quality = "normal")');
    });

    it('binds arguments to parameters', () => {
      const binding = passages.bindArguments('Describe', ['sword', 'excellent']);

      expect(binding).not.toBeNull();
      expect(binding!.bindings.get('item')).toBe('sword');
      expect(binding!.bindings.get('quality')).toBe('excellent');
    });

    it('uses default for missing optional', () => {
      const binding = passages.bindArguments('Describe', ['sword']);

      expect(binding!.bindings.get('quality')).toBe('normal');
    });

    it('returns null for missing required', () => {
      const binding = passages.bindArguments('Describe', []);

      expect(binding).toBeNull();
    });

    it('returns null for unregistered passage', () => {
      const binding = passages.bindArguments('Unknown', ['arg']);

      expect(binding).toBeNull();
    });
  });

  describe('resolveArguments', () => {
    it('resolves variable references', () => {
      const variables = new Map([['name', 'Hero']]);
      const args = [
        'literal',
        { _type: 'variable_ref' as const, name: 'name' },
      ];

      const resolved = passages.resolveArguments(args, variables);

      expect(resolved[0]).toBe('literal');
      expect(resolved[1]).toBe('Hero');
    });

    it('resolves expressions with evaluator', () => {
      const variables = new Map<string, unknown>();
      const evaluator = (expr: string) => eval(expr);
      const args = [{ _type: 'expression' as const, expr: '2 + 3' }];

      const resolved = passages.resolveArguments(args, variables, evaluator);

      expect(resolved[0]).toBe(5);
    });

    it('returns undefined for expression without evaluator', () => {
      const variables = new Map<string, unknown>();
      const args = [{ _type: 'expression' as const, expr: '2 + 3' }];

      const resolved = passages.resolveArguments(args, variables);

      expect(resolved[0]).toBeUndefined();
    });
  });

  describe('createVariableScope', () => {
    beforeEach(() => {
      passages.registerPassage('Test(a, b)');
    });

    it('creates scope from bindings', () => {
      const binding = passages.bindArguments('Test', ['hello', 42])!;
      const variables = new Map<string, unknown>();

      const scope = passages.createVariableScope(binding, variables);

      expect(scope.get('a')).toBe('hello');
      expect(scope.get('b')).toBe(42);
    });

    it('resolves variable refs in scope', () => {
      passages.registerPassage('Display(item)');
      const binding = passages.bindArguments('Display', [
        { _type: 'variable_ref' as const, name: 'currentItem' },
      ])!;
      const variables = new Map([['currentItem', 'sword']]);

      const scope = passages.createVariableScope(binding, variables);

      expect(scope.get('item')).toBe('sword');
    });
  });

  describe('validateCall', () => {
    beforeEach(() => {
      passages.registerPassage('Required(a, b)');
      passages.registerPassage('Optional(a, b = 1)');
    });

    it('validates required arguments', () => {
      const result = passages.validateCall('Required', ['x']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires at least 2');
    });

    it('validates maximum arguments', () => {
      const result = passages.validateCall('Required', ['a', 'b', 'c']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('accepts at most 2');
    });

    it('allows optional arguments to be omitted', () => {
      const result = passages.validateCall('Optional', ['x']);

      expect(result.valid).toBe(true);
    });

    it('returns valid for non-parameterized passage', () => {
      const result = passages.validateCall('Unknown', ['any', 'args']);

      expect(result.valid).toBe(true);
    });
  });

  describe('unregister', () => {
    it('removes registered passage', () => {
      passages.registerPassage('Test(x)');

      const result = passages.unregister('Test');

      expect(result).toBe(true);
      expect(passages.isRegistered('Test')).toBe(false);
    });

    it('returns false for non-existent passage', () => {
      const result = passages.unregister('Unknown');

      expect(result).toBe(false);
    });
  });

  describe('clear / reset', () => {
    it('clears all registrations', () => {
      passages.registerPassage('A(x)');
      passages.registerPassage('B(y)');

      passages.clear();

      expect(passages.getRegisteredNames()).toHaveLength(0);
    });

    it('reset is alias for clear', () => {
      passages.registerPassage('Test(x)');

      passages.reset();

      expect(passages.isRegistered('Test')).toBe(false);
    });
  });
});
