import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExternalFunctionRegistry,
  createExternalFunctionRegistry,
  parseExternalDeclaration,
  type FunctionDeclaration,
} from './ExternalFunctions';

describe('ExternalFunctionRegistry', () => {
  let registry: ExternalFunctionRegistry;

  beforeEach(() => {
    registry = new ExternalFunctionRegistry();
  });

  describe('register/unregister', () => {
    it('should register a function', () => {
      registry.register('test', () => 'result');
      expect(registry.isRegistered('test')).toBe(true);
    });

    it('should throw when registering non-function', () => {
      expect(() => registry.register('test', 'not a function' as any)).toThrow(
        /must be a function/
      );
    });

    it('should unregister a function', () => {
      registry.register('test', () => 'result');
      expect(registry.unregister('test')).toBe(true);
      expect(registry.isRegistered('test')).toBe(false);
    });

    it('should return false when unregistering unknown function', () => {
      expect(registry.unregister('unknown')).toBe(false);
    });
  });

  describe('declare/undeclare', () => {
    it('should declare a function', () => {
      registry.declare({
        name: 'test',
        params: [{ name: 'id', type: 'string' }],
      });
      expect(registry.isDeclared('test')).toBe(true);
    });

    it('should throw when declaring without name', () => {
      expect(() => registry.declare({ name: '', params: [] })).toThrow(
        /must have a name/
      );
    });

    it('should undeclare a function', () => {
      registry.declare({ name: 'test', params: [] });
      expect(registry.undeclare('test')).toBe(true);
      expect(registry.isDeclared('test')).toBe(false);
    });

    it('should get declaration', () => {
      const decl: FunctionDeclaration = {
        name: 'test',
        params: [{ name: 'id', type: 'string' }],
        returnType: 'number',
      };
      registry.declare(decl);
      expect(registry.getDeclaration('test')).toEqual(decl);
    });
  });

  describe('call', () => {
    it('should call registered function', async () => {
      registry.register('greet', (name: string) => `Hello, ${name}!`);
      const result = await registry.call('greet', ['World']);
      expect(result).toBe('Hello, World!');
    });

    it('should throw for unregistered function', async () => {
      await expect(registry.call('unknown', [])).rejects.toThrow(
        /not registered/
      );
    });

    it('should handle async functions', async () => {
      registry.register('asyncFn', async () => {
        return 'async result';
      });
      const result = await registry.call('asyncFn', []);
      expect(result).toBe('async result');
    });

    it('should handle functions with no args', async () => {
      registry.register('noArgs', () => 42);
      const result = await registry.call('noArgs');
      expect(result).toBe(42);
    });

    it('should call onError handler when function throws', async () => {
      const onError = vi.fn();
      const reg = new ExternalFunctionRegistry({ onError });

      reg.register('failing', () => {
        throw new Error('Intentional failure');
      });

      await expect(reg.call('failing', [])).rejects.toThrow(
        /Intentional failure/
      );
      expect(onError).toHaveBeenCalledWith('failing', expect.any(Error));
    });
  });

  describe('callSafe', () => {
    it('should return success result on success', async () => {
      registry.register('test', () => 'value');
      const result = await registry.callSafe('test', []);
      expect(result).toEqual({ success: true, value: 'value' });
    });

    it('should return error result on failure', async () => {
      const result = await registry.callSafe('unknown', []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not registered/);
    });

    it('should return error result when function throws', async () => {
      registry.register('failing', () => {
        throw new Error('Intentional failure');
      });
      const result = await registry.callSafe('failing', []);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Intentional failure/);
    });
  });

  describe('type validation', () => {
    beforeEach(() => {
      registry.declare({
        name: 'saveData',
        params: [
          { name: 'key', type: 'string' },
          { name: 'value', type: 'number' },
        ],
      });
      registry.register('saveData', () => {});
    });

    it('should pass with correct types', async () => {
      await expect(
        registry.call('saveData', ['key', 42])
      ).resolves.not.toThrow();
    });

    it('should throw with wrong type', async () => {
      await expect(registry.call('saveData', ['key', 'not a number'])).rejects.toThrow(
        /expected number, got string/
      );
    });

    it('should throw with too few arguments', async () => {
      await expect(registry.call('saveData', ['key'])).rejects.toThrow(
        /requires at least 2/
      );
    });

    it('should throw with too many arguments', async () => {
      await expect(registry.call('saveData', ['key', 42, 'extra'])).rejects.toThrow(
        /accepts at most 2/
      );
    });

    it('should allow optional parameters', async () => {
      registry.declare({
        name: 'optional',
        params: [
          { name: 'required', type: 'string' },
          { name: 'optional', type: 'number', optional: true },
        ],
      });
      registry.register('optional', () => {});

      await expect(registry.call('optional', ['only required'])).resolves.not.toThrow();
    });

    it('should skip validation when disabled', async () => {
      const reg = new ExternalFunctionRegistry({ validateTypes: false });
      reg.declare({
        name: 'typed',
        params: [{ name: 'id', type: 'number' }],
      });
      reg.register('typed', () => 'ok');

      // Should not throw even with wrong type
      await expect(reg.call('typed', ['string instead'])).resolves.toBe('ok');
    });

    it('should allow any type', async () => {
      registry.declare({
        name: 'anyType',
        params: [{ name: 'value', type: 'any' }],
      });
      registry.register('anyType', (v) => v);

      await expect(registry.call('anyType', ['string'])).resolves.toBe('string');
      await expect(registry.call('anyType', [42])).resolves.toBe(42);
      await expect(registry.call('anyType', [true])).resolves.toBe(true);
    });
  });

  describe('validateDeclarations', () => {
    it('should return empty array when all declared functions are registered', () => {
      registry.declare({ name: 'fn1', params: [] });
      registry.declare({ name: 'fn2', params: [] });
      registry.register('fn1', () => {});
      registry.register('fn2', () => {});

      expect(registry.validateDeclarations()).toEqual([]);
    });

    it('should return missing function names', () => {
      registry.declare({ name: 'fn1', params: [] });
      registry.declare({ name: 'fn2', params: [] });
      registry.register('fn1', () => {});

      expect(registry.validateDeclarations()).toEqual(['fn2']);
    });
  });

  describe('getRegisteredNames/getDeclaredNames', () => {
    it('should return registered function names', () => {
      registry.register('fn1', () => {});
      registry.register('fn2', () => {});
      expect(registry.getRegisteredNames()).toEqual(['fn1', 'fn2']);
    });

    it('should return declared function names', () => {
      registry.declare({ name: 'fn1', params: [] });
      registry.declare({ name: 'fn2', params: [] });
      expect(registry.getDeclaredNames()).toEqual(['fn1', 'fn2']);
    });
  });

  describe('clear', () => {
    it('should clear all functions and declarations', () => {
      registry.register('fn', () => {});
      registry.declare({ name: 'fn', params: [] });

      registry.clear();

      expect(registry.isRegistered('fn')).toBe(false);
      expect(registry.isDeclared('fn')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', () => {
      registry.register('fn1', () => {});
      registry.register('fn2', () => {});
      registry.declare({ name: 'fn1', params: [] });
      registry.declare({ name: 'fn3', params: [] });

      const stats = registry.getStats();
      expect(stats.registered).toBe(2);
      expect(stats.declared).toBe(2);
      expect(stats.validated).toBe(1); // fn1 is both registered and declared
    });
  });
});

describe('parseExternalDeclaration', () => {
  it('should parse function with no params', () => {
    const decl = parseExternalDeclaration('getUserName()');
    expect(decl).toEqual({
      name: 'getUserName',
      params: [],
    });
  });

  it('should parse function with return type', () => {
    const decl = parseExternalDeclaration('getUserName(): string');
    expect(decl).toEqual({
      name: 'getUserName',
      params: [],
      returnType: 'string',
    });
  });

  it('should parse function with single param', () => {
    const decl = parseExternalDeclaration('playSound(id: string)');
    expect(decl).toEqual({
      name: 'playSound',
      params: [{ name: 'id', type: 'string', optional: false }],
    });
  });

  it('should parse function with multiple params', () => {
    const decl = parseExternalDeclaration(
      'saveAchievement(id: string, value: number)'
    );
    expect(decl).toEqual({
      name: 'saveAchievement',
      params: [
        { name: 'id', type: 'string', optional: false },
        { name: 'value', type: 'number', optional: false },
      ],
    });
  });

  it('should parse optional parameters', () => {
    const decl = parseExternalDeclaration('log(message: string, level?: number)');
    expect(decl.params[0].optional).toBe(false);
    expect(decl.params[1].optional).toBe(true);
  });

  it('should parse boolean type', () => {
    const decl = parseExternalDeclaration('setFlag(flag: boolean)');
    expect(decl.params[0].type).toBe('boolean');
  });

  it('should parse any type', () => {
    const decl = parseExternalDeclaration('store(value: any)');
    expect(decl.params[0].type).toBe('any');
  });

  it('should parse void return type', () => {
    const decl = parseExternalDeclaration('doSomething(): void');
    expect(decl.returnType).toBe('void');
  });

  it('should handle whitespace', () => {
    const decl = parseExternalDeclaration(
      '  playSound  (  id : string  )  :  void  '
    );
    expect(decl.name).toBe('playSound');
    expect(decl.params[0].name).toBe('id');
    expect(decl.returnType).toBe('void');
  });

  it('should throw for invalid format', () => {
    expect(() => parseExternalDeclaration('invalid')).toThrow(
      /Invalid EXTERNAL declaration/
    );
  });

  it('should throw for invalid parameter', () => {
    expect(() => parseExternalDeclaration('fn(badparam)')).toThrow(
      /Invalid parameter/
    );
  });

  it('should throw for invalid parameter type', () => {
    expect(() => parseExternalDeclaration('fn(x: object)')).toThrow(
      /Invalid parameter type/
    );
  });

  it('should throw for invalid return type', () => {
    expect(() => parseExternalDeclaration('fn(): object')).toThrow(
      /Invalid return type/
    );
  });
});

describe('createExternalFunctionRegistry', () => {
  it('should create a new registry instance', () => {
    const registry = createExternalFunctionRegistry();
    expect(registry).toBeInstanceOf(ExternalFunctionRegistry);
  });

  it('should pass options to registry', () => {
    const onError = vi.fn();
    const registry = createExternalFunctionRegistry({ onError });

    registry.register('failing', () => {
      throw new Error('test');
    });

    registry.callSafe('failing', []).then(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});

describe('real-world examples', () => {
  it('should work like a game audio system', async () => {
    const audioLog: string[] = [];

    const registry = createExternalFunctionRegistry();

    // Host registers functions
    registry.register('playSound', (id: string) => {
      audioLog.push(`played: ${id}`);
    });

    registry.register('stopSound', (id: string) => {
      audioLog.push(`stopped: ${id}`);
    });

    // Story declares functions (optional but enables type checking)
    registry.declare(parseExternalDeclaration('playSound(id: string): void'));
    registry.declare(parseExternalDeclaration('stopSound(id: string): void'));

    // Story calls functions
    await registry.call('playSound', ['bgm_forest']);
    await registry.call('playSound', ['sfx_footstep']);
    await registry.call('stopSound', ['bgm_forest']);

    expect(audioLog).toEqual([
      'played: bgm_forest',
      'played: sfx_footstep',
      'stopped: bgm_forest',
    ]);
  });

  it('should work like a save/load system', async () => {
    const storage: Record<string, unknown> = {};

    const registry = createExternalFunctionRegistry();

    registry.register('save', (key: string, value: unknown) => {
      storage[key] = value;
    });

    registry.register('load', (key: string) => {
      return storage[key];
    });

    registry.declare(parseExternalDeclaration('save(key: string, value: any)'));
    registry.declare(parseExternalDeclaration('load(key: string): any'));

    await registry.call('save', ['playerName', 'Alice']);
    await registry.call('save', ['score', 100]);

    const name = await registry.call('load', ['playerName']);
    const score = await registry.call('load', ['score']);

    expect(name).toBe('Alice');
    expect(score).toBe(100);
  });

  it('should work with async functions', async () => {
    const registry = createExternalFunctionRegistry();

    registry.register('fetchData', async (url: string) => {
      // Simulate async fetch
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { url, data: 'mock data' };
    });

    const result = await registry.call('fetchData', ['/api/story']);
    expect(result).toEqual({ url: '/api/story', data: 'mock data' });
  });
});
