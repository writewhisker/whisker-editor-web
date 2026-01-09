/**
 * ExternalFunctions Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExternalFunctions,
  createExternalFunctions,
  parseDeclaration,
} from './ExternalFunctions';

describe('parseDeclaration', () => {
  it('parses function with no parameters', () => {
    const decl = parseDeclaration('quit()');

    expect(decl.name).toBe('quit');
    expect(decl.params).toEqual([]);
    expect(decl.returnType).toBe('void');
  });

  it('parses function with return type', () => {
    const decl = parseDeclaration('getTime(): number');

    expect(decl.name).toBe('getTime');
    expect(decl.returnType).toBe('number');
  });

  it('parses function with single parameter', () => {
    const decl = parseDeclaration('playSound(id: string): void');

    expect(decl.name).toBe('playSound');
    expect(decl.params).toHaveLength(1);
    expect(decl.params[0]).toEqual({
      name: 'id',
      type: 'string',
      optional: false,
    });
  });

  it('parses function with multiple parameters', () => {
    const decl = parseDeclaration('setVolume(channel: string, level: number): void');

    expect(decl.params).toHaveLength(2);
    expect(decl.params[0].name).toBe('channel');
    expect(decl.params[0].type).toBe('string');
    expect(decl.params[1].name).toBe('level');
    expect(decl.params[1].type).toBe('number');
  });

  it('parses optional parameters', () => {
    const decl = parseDeclaration('playSound(id: string, loop?: boolean): void');

    expect(decl.params[0].optional).toBe(false);
    expect(decl.params[1].optional).toBe(true);
  });

  it('parses boolean type', () => {
    const decl = parseDeclaration('setFlag(enabled: boolean): void');

    expect(decl.params[0].type).toBe('boolean');
  });

  it('parses any type', () => {
    const decl = parseDeclaration('log(message: any): void');

    expect(decl.params[0].type).toBe('any');
  });

  it('defaults unknown types to any', () => {
    const decl = parseDeclaration('custom(data: CustomType): void');

    expect(decl.params[0].type).toBe('any');
  });

  it('handles whitespace', () => {
    const decl = parseDeclaration('  test(  a: string ,  b: number  ):  void  ');

    expect(decl.name).toBe('test');
    expect(decl.params).toHaveLength(2);
  });

  it('throws on invalid format', () => {
    expect(() => parseDeclaration('invalid')).toThrow('Invalid declaration format');
    expect(() => parseDeclaration('')).toThrow('Invalid declaration format');
  });

  it('throws on invalid parameter format', () => {
    expect(() => parseDeclaration('test(badparam): void')).toThrow('Invalid parameter format');
  });
});

describe('ExternalFunctions', () => {
  let externalFns: ExternalFunctions;

  beforeEach(() => {
    externalFns = createExternalFunctions();
  });

  describe('register', () => {
    it('registers a function', () => {
      const fn = vi.fn();
      externalFns.register('test', fn);

      expect(externalFns.has('test')).toBe(true);
    });

    it('updates existing function', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      externalFns.register('test', fn1);
      externalFns.register('test', fn2);

      externalFns.call('test');

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('preserves declaration when updating', () => {
      externalFns.declare('test(a: string): void');
      externalFns.register('test', vi.fn());

      const decl = externalFns.getDeclaration('test');
      expect(decl).toBeDefined();
      expect(decl!.params).toHaveLength(1);
    });
  });

  describe('declare', () => {
    it('declares function signature from string', () => {
      externalFns.declare('playSound(id: string, loop?: boolean): void');

      const decl = externalFns.getDeclaration('playSound');
      expect(decl).toBeDefined();
      expect(decl!.params).toHaveLength(2);
    });

    it('declares function signature from object', () => {
      externalFns.declare({
        name: 'test',
        params: [{ name: 'x', type: 'number', optional: false }],
        returnType: 'number',
      });

      const decl = externalFns.getDeclaration('test');
      expect(decl).toBeDefined();
      expect(decl!.returnType).toBe('number');
    });

    it('creates placeholder function for undeclared', () => {
      externalFns.declare('notImplemented(): void');

      expect(() => externalFns.call('notImplemented')).toThrow(
        'declared but not registered'
      );
    });

    it('adds declaration to existing function', () => {
      externalFns.register('test', vi.fn());
      externalFns.declare('test(a: string): void');

      const decl = externalFns.getDeclaration('test');
      expect(decl).toBeDefined();
    });
  });

  describe('has', () => {
    it('returns true for registered function', () => {
      externalFns.register('test', vi.fn());

      expect(externalFns.has('test')).toBe(true);
    });

    it('returns false for unregistered function', () => {
      expect(externalFns.has('unknown')).toBe(false);
    });

    it('returns true for declared-only function (has placeholder)', () => {
      externalFns.declare('test(): void');

      // Note: declared functions have a placeholder, so has() returns true
      expect(externalFns.has('test')).toBe(true);
    });
  });

  describe('validateArgs', () => {
    it('validates required argument count', () => {
      externalFns.declare('test(a: string, b: number): void');
      externalFns.register('test', vi.fn());

      const result = externalFns.validateArgs('test', ['hello']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires at least 2');
    });

    it('validates maximum argument count', () => {
      externalFns.declare('test(a: string): void');
      externalFns.register('test', vi.fn());

      const result = externalFns.validateArgs('test', ['a', 'b', 'c']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('accepts at most 1');
    });

    it('allows optional arguments to be omitted', () => {
      externalFns.declare('test(a: string, b?: number): void');
      externalFns.register('test', vi.fn());

      const result = externalFns.validateArgs('test', ['hello']);

      expect(result.valid).toBe(true);
    });

    it('validates argument types', () => {
      externalFns.declare('test(a: string): void');
      externalFns.register('test', vi.fn());

      const result = externalFns.validateArgs('test', [42]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expects string, got number");
    });

    it('accepts any type', () => {
      externalFns.declare('log(msg: any): void');
      externalFns.register('log', vi.fn());

      expect(externalFns.validateArgs('log', ['string']).valid).toBe(true);
      expect(externalFns.validateArgs('log', [42]).valid).toBe(true);
      expect(externalFns.validateArgs('log', [true]).valid).toBe(true);
    });

    it('skips validation for undefined optional args', () => {
      externalFns.declare('test(a: string, b?: number): void');
      externalFns.register('test', vi.fn());

      const result = externalFns.validateArgs('test', ['hello', undefined]);

      expect(result.valid).toBe(true);
    });

    it('accepts any args when no declaration', () => {
      externalFns.register('noDecl', vi.fn());

      const result = externalFns.validateArgs('noDecl', [1, 'two', true, null]);

      expect(result.valid).toBe(true);
    });

    it('returns error for unregistered function', () => {
      const result = externalFns.validateArgs('unknown', []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not registered');
    });
  });

  describe('call', () => {
    it('calls registered function', () => {
      const fn = vi.fn().mockReturnValue('result');
      externalFns.register('test', fn);

      const result = externalFns.call('test', ['arg1', 'arg2']);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
    });

    it('validates before calling', () => {
      externalFns.declare('test(a: string): void');
      externalFns.register('test', vi.fn());

      expect(() => externalFns.call('test', [42])).toThrow('expects string');
    });

    it('throws for unregistered function', () => {
      expect(() => externalFns.call('unknown')).toThrow('not registered');
    });

    it('defaults to empty args array', () => {
      const fn = vi.fn();
      externalFns.register('noArgs', fn);

      externalFns.call('noArgs');

      expect(fn).toHaveBeenCalledWith();
    });
  });

  describe('strict type checking', () => {
    it('can be disabled', () => {
      const lenient = createExternalFunctions({ strictTypeChecking: false });
      lenient.declare('test(a: string): void');
      lenient.register('test', vi.fn());

      // Would fail with strict checking
      const result = lenient.validateArgs('test', [42]);

      expect(result.valid).toBe(true);
    });
  });

  describe('getRegisteredNames', () => {
    it('returns all registered function names', () => {
      externalFns.register('fn1', vi.fn());
      externalFns.register('fn2', vi.fn());
      externalFns.register('fn3', vi.fn());

      const names = externalFns.getRegisteredNames();

      expect(names).toContain('fn1');
      expect(names).toContain('fn2');
      expect(names).toContain('fn3');
    });
  });

  describe('unregister', () => {
    it('removes a function', () => {
      externalFns.register('test', vi.fn());

      const result = externalFns.unregister('test');

      expect(result).toBe(true);
      expect(externalFns.has('test')).toBe(false);
    });

    it('returns false for non-existent function', () => {
      const result = externalFns.unregister('unknown');

      expect(result).toBe(false);
    });
  });

  describe('clear / reset', () => {
    it('removes all functions', () => {
      externalFns.register('fn1', vi.fn());
      externalFns.register('fn2', vi.fn());

      externalFns.clear();

      expect(externalFns.getRegisteredNames()).toEqual([]);
    });

    it('reset is alias for clear', () => {
      externalFns.register('test', vi.fn());
      externalFns.reset();

      expect(externalFns.has('test')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns copy of all entries', () => {
      externalFns.register('fn1', vi.fn());
      externalFns.declare('fn1(a: string): void');

      const all = externalFns.getAll();

      expect(all.size).toBe(1);
      expect(all.has('fn1')).toBe(true);
      expect(all.get('fn1')!.declaration).toBeDefined();
    });
  });

  describe('registerMany', () => {
    it('registers multiple functions at once', () => {
      externalFns.registerMany({
        fn1: vi.fn(),
        fn2: vi.fn(),
        fn3: vi.fn(),
      });

      expect(externalFns.has('fn1')).toBe(true);
      expect(externalFns.has('fn2')).toBe(true);
      expect(externalFns.has('fn3')).toBe(true);
    });
  });

  describe('declareMany', () => {
    it('declares multiple functions at once', () => {
      externalFns.declareMany([
        'fn1(): void',
        'fn2(a: string): number',
        { name: 'fn3', params: [], returnType: 'boolean' },
      ]);

      expect(externalFns.getDeclaration('fn1')).toBeDefined();
      expect(externalFns.getDeclaration('fn2')).toBeDefined();
      expect(externalFns.getDeclaration('fn3')).toBeDefined();
    });
  });
});
