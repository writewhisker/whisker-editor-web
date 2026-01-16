/**
 * UserFunctionRegistry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserFunctionRegistry,
  createUserFunctionRegistry,
  UserFunction,
} from './UserFunctionRegistry';
import { ModuleError } from './ModuleResolver';

describe('UserFunctionRegistry', () => {
  let registry: UserFunctionRegistry;

  const greetFunction: UserFunction = {
    name: 'greet',
    parameters: [{ name: 'name' }],
    body: 'RETURN "Hello, " .. name',
  };

  const addFunction: UserFunction = {
    name: 'add',
    parameters: [{ name: 'a' }, { name: 'b', defaultValue: 0 }],
    body: 'RETURN a + b',
  };

  beforeEach(() => {
    registry = createUserFunctionRegistry();
  });

  describe('function registration', () => {
    it('registers a function', () => {
      registry.register(greetFunction);

      expect(registry.has('greet')).toBe(true);
      expect(registry.get('greet')).toEqual(greetFunction);
    });

    it('registers multiple functions', () => {
      registry.registerAll([greetFunction, addFunction]);

      expect(registry.has('greet')).toBe(true);
      expect(registry.has('add')).toBe(true);
    });

    it('throws on duplicate registration', () => {
      registry.register(greetFunction);

      expect(() => registry.register(greetFunction)).toThrow(ModuleError);
    });

    it('allows redefinition when configured', () => {
      const permissiveRegistry = createUserFunctionRegistry({
        allowRedefinition: true,
      });

      permissiveRegistry.register(greetFunction);
      const updated = { ...greetFunction, body: 'RETURN "Hi!"' };
      permissiveRegistry.register(updated);

      expect(permissiveRegistry.get('greet')?.body).toBe('RETURN "Hi!"');
    });

    it('unregisters functions', () => {
      registry.register(greetFunction);
      const result = registry.unregister('greet');

      expect(result).toBe(true);
      expect(registry.has('greet')).toBe(false);
    });
  });

  describe('function listing', () => {
    beforeEach(() => {
      registry.registerAll([greetFunction, addFunction]);
    });

    it('lists all function names', () => {
      const names = registry.getNames();

      expect(names).toContain('greet');
      expect(names).toContain('add');
    });

    it('gets all functions', () => {
      const functions = registry.getAll();

      expect(functions.length).toBe(2);
    });

    it('clears all functions', () => {
      registry.clear();

      expect(registry.getNames().length).toBe(0);
    });
  });

  describe('function call preparation', () => {
    beforeEach(() => {
      registry.register(addFunction);
    });

    it('prepares call with arguments', () => {
      const { fn, context } = registry.prepareCall('add', [5, 3]);

      expect(fn.name).toBe('add');
      expect(context.locals.get('a')).toBe(5);
      expect(context.locals.get('b')).toBe(3);
      expect(context.depth).toBe(1);
    });

    it('uses default values for missing arguments', () => {
      const { context } = registry.prepareCall('add', [5]);

      expect(context.locals.get('a')).toBe(5);
      expect(context.locals.get('b')).toBe(0); // default value
    });

    it('throws for undefined function', () => {
      expect(() => registry.prepareCall('missing', [])).toThrow(ModuleError);
    });

    it('enforces recursion depth limit', () => {
      const limitedRegistry = createUserFunctionRegistry({
        maxRecursionDepth: 3,
      });
      limitedRegistry.register(addFunction);

      // Simulate deep call stack
      (limitedRegistry as any).currentContext = {
        depth: 3,
        locals: new Map(),
        callStack: ['a', 'b', 'c'],
      };

      expect(() => limitedRegistry.prepareCall('add', [1, 2])).toThrow(
        'MOD_005'
      );
    });
  });

  describe('call context management', () => {
    beforeEach(() => {
      registry.register(greetFunction);
    });

    it('enters and exits call context', () => {
      const { context } = registry.prepareCall('greet', ['World']);

      registry.enterCall(context);
      expect(registry.getCurrentContext()).toBe(context);

      registry.exitCall();
      expect(registry.getCurrentContext()).toBeNull();
    });

    it('manages local variables in context', () => {
      const { context } = registry.prepareCall('greet', ['World']);
      registry.enterCall(context);

      expect(registry.getLocal('name')).toBe('World');
      expect(registry.hasLocal('name')).toBe(true);
      expect(registry.hasLocal('other')).toBe(false);

      registry.setLocal('temp', 42);
      expect(registry.getLocal('temp')).toBe(42);

      registry.exitCall();
    });
  });

  describe('namespace support', () => {
    const combatAttack: UserFunction = {
      name: 'attack',
      namespace: 'Combat',
      parameters: [{ name: 'target' }],
      body: 'RETURN "Attacking " .. target',
    };

    beforeEach(() => {
      registry.register(greetFunction);
      registry.register(combatAttack);
    });

    it('registers with namespace qualification', () => {
      expect(registry.has('attack', 'Combat')).toBe(true);
      // When using qualified name directly without namespace param, it looks up 'Combat::attack'
      // which doesn't exist (only 'Combat::attack' exists)
      expect(registry.getNames()).toContain('Combat::attack');
    });

    it('gets namespace functions', () => {
      const combatFunctions = registry.getNamespaceFunctions('Combat');

      expect(combatFunctions.length).toBe(1);
      expect(combatFunctions[0].name).toBe('attack');
    });

    it('resolves from namespace context', () => {
      // From Combat namespace, find attack
      const fn = registry.resolveFunction('attack', 'Combat');
      expect(fn).toBeDefined();
      expect(fn?.name).toBe('attack');

      // Global function from any context
      const globalFn = registry.resolveFunction('greet', 'Combat');
      expect(globalFn).toBeDefined();
      expect(globalFn?.name).toBe('greet');
    });

    it('resolves qualified names directly', () => {
      const fn = registry.resolveFunction('Combat::attack');
      expect(fn).toBeDefined();
      expect(fn?.name).toBe('attack');
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      registry.registerAll([greetFunction, addFunction]);
    });

    it('saves and restores state', () => {
      const state = registry.getState();

      expect(Object.keys(state.functions)).toContain('greet');
      expect(Object.keys(state.functions)).toContain('add');

      const newRegistry = createUserFunctionRegistry();
      newRegistry.restoreState(state);

      expect(newRegistry.has('greet')).toBe(true);
      expect(newRegistry.has('add')).toBe(true);
    });

    it('clones registry', () => {
      const cloned = registry.clone();

      cloned.unregister('greet');

      expect(registry.has('greet')).toBe(true);
      expect(cloned.has('greet')).toBe(false);
    });
  });
});
