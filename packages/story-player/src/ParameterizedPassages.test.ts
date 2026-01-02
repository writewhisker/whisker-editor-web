import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParameterizedPassageManager,
  createParameterizedPassageManager,
  parsePassageHeader,
  parsePassageCall,
  formatPassageCall,
  type PassageParameter,
} from './ParameterizedPassages';

describe('ParameterizedPassageManager', () => {
  let manager: ParameterizedPassageManager;

  beforeEach(() => {
    manager = new ParameterizedPassageManager();
  });

  describe('registerPassage/unregisterPassage', () => {
    it('should register a passage with parameters', () => {
      manager.registerPassage('Describe', [
        { name: 'item', required: true },
        { name: 'quality', defaultValue: 'normal', required: false },
      ]);

      expect(manager.hasPassage('Describe')).toBe(true);
      expect(manager.isParameterized('Describe')).toBe(true);
    });

    it('should register a passage without parameters', () => {
      manager.registerPassage('Simple', []);

      expect(manager.hasPassage('Simple')).toBe(true);
      expect(manager.isParameterized('Simple')).toBe(false);
    });

    it('should unregister a passage', () => {
      manager.registerPassage('Test', []);
      expect(manager.unregisterPassage('Test')).toBe(true);
      expect(manager.hasPassage('Test')).toBe(false);
    });

    it('should return false when unregistering unknown passage', () => {
      expect(manager.unregisterPassage('Unknown')).toBe(false);
    });

    it('should get passage definition', () => {
      const params: PassageParameter[] = [
        { name: 'x', required: true },
      ];
      manager.registerPassage('Test', params);

      const passage = manager.getPassage('Test');
      expect(passage?.name).toBe('Test');
      expect(passage?.params).toEqual(params);
    });

    it('should get all passage names', () => {
      manager.registerPassage('A', []);
      manager.registerPassage('B', []);
      manager.registerPassage('C', []);

      expect(manager.getPassageNames()).toEqual(['A', 'B', 'C']);
    });
  });

  describe('bindArguments', () => {
    it('should bind positional arguments', () => {
      manager.registerPassage('Describe', [
        { name: 'item', required: true },
        { name: 'quality', required: true },
      ]);

      const result = manager.bindArguments('Describe', ['sword', 'excellent']);

      expect(result.success).toBe(true);
      expect(result.bindings.get('item')).toBe('sword');
      expect(result.bindings.get('quality')).toBe('excellent');
    });

    it('should use default values for missing arguments', () => {
      manager.registerPassage('Greet', [
        { name: 'name', required: true },
        { name: 'title', defaultValue: 'friend', required: false },
      ]);

      const result = manager.bindArguments('Greet', ['Alice']);

      expect(result.success).toBe(true);
      expect(result.bindings.get('name')).toBe('Alice');
      expect(result.bindings.get('title')).toBe('friend');
    });

    it('should override default values when argument provided', () => {
      manager.registerPassage('Greet', [
        { name: 'name', required: true },
        { name: 'title', defaultValue: 'friend', required: false },
      ]);

      const result = manager.bindArguments('Greet', ['Bob', 'Sir']);

      expect(result.success).toBe(true);
      expect(result.bindings.get('name')).toBe('Bob');
      expect(result.bindings.get('title')).toBe('Sir');
    });

    it('should report error for missing required parameter', () => {
      manager.registerPassage('Test', [
        { name: 'required', required: true },
      ]);

      const result = manager.bindArguments('Test', []);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing_required');
      expect(result.errors[0].paramName).toBe('required');
    });

    it('should report error for too many arguments', () => {
      manager.registerPassage('Test', [
        { name: 'x', required: true },
      ]);

      const result = manager.bindArguments('Test', ['a', 'b', 'c']);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('too_many_args');
    });

    it('should succeed for unregistered passage (no params to check)', () => {
      const result = manager.bindArguments('Unknown', ['arg1', 'arg2']);

      expect(result.success).toBe(true);
      expect(result.bindings.size).toBe(0);
    });
  });

  describe('type validation', () => {
    let typedManager: ParameterizedPassageManager;

    beforeEach(() => {
      typedManager = new ParameterizedPassageManager({ validateTypes: true });
    });

    it('should validate string type', () => {
      typedManager.registerPassage('Test', [
        { name: 'text', type: 'string', required: true },
      ]);

      const result = typedManager.bindArguments('Test', [123]);

      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('type_mismatch');
    });

    it('should validate number type', () => {
      typedManager.registerPassage('Test', [
        { name: 'num', type: 'number', required: true },
      ]);

      const result = typedManager.bindArguments('Test', ['not a number']);

      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('type_mismatch');
    });

    it('should pass validation for correct types', () => {
      typedManager.registerPassage('Test', [
        { name: 'str', type: 'string', required: true },
        { name: 'num', type: 'number', required: true },
        { name: 'bool', type: 'boolean', required: true },
      ]);

      const result = typedManager.bindArguments('Test', ['hello', 42, true]);

      expect(result.success).toBe(true);
    });

    it('should skip validation for any type', () => {
      typedManager.registerPassage('Test', [
        { name: 'anything', type: 'any', required: true },
      ]);

      const result = typedManager.bindArguments('Test', [{ complex: 'object' }]);

      expect(result.success).toBe(true);
    });
  });

  describe('allowExtraArgs option', () => {
    it('should allow extra arguments when enabled', () => {
      const permissiveManager = new ParameterizedPassageManager({
        allowExtraArgs: true,
      });

      permissiveManager.registerPassage('Test', [
        { name: 'x', required: true },
      ]);

      const result = permissiveManager.bindArguments('Test', ['a', 'b', 'c']);

      expect(result.success).toBe(true);
    });
  });

  describe('createVariableScope', () => {
    it('should create scope object from bindings', () => {
      manager.registerPassage('Test', [
        { name: 'x', required: true },
        { name: 'y', required: true },
      ]);

      const result = manager.bindArguments('Test', [10, 20]);
      const scope = manager.createVariableScope(result.bindings);

      expect(scope).toEqual({ x: 10, y: 20 });
    });
  });

  describe('clear', () => {
    it('should clear all registered passages', () => {
      manager.registerPassage('A', []);
      manager.registerPassage('B', []);

      manager.clear();

      expect(manager.getPassageNames()).toHaveLength(0);
    });
  });
});

describe('parsePassageHeader', () => {
  it('should parse passage name without parameters', () => {
    const result = parsePassageHeader('Start');
    expect(result.name).toBe('Start');
    expect(result.params).toHaveLength(0);
  });

  it('should parse passage with empty parameter list', () => {
    const result = parsePassageHeader('Test()');
    expect(result.name).toBe('Test');
    expect(result.params).toHaveLength(0);
  });

  it('should parse passage with single parameter', () => {
    const result = parsePassageHeader('Describe(item)');
    expect(result.name).toBe('Describe');
    expect(result.params).toHaveLength(1);
    expect(result.params[0].name).toBe('item');
    expect(result.params[0].required).toBe(true);
  });

  it('should parse passage with multiple parameters', () => {
    const result = parsePassageHeader('Describe(item, quality, condition)');
    expect(result.name).toBe('Describe');
    expect(result.params).toHaveLength(3);
    expect(result.params.map((p) => p.name)).toEqual([
      'item',
      'quality',
      'condition',
    ]);
  });

  it('should parse parameter with string default', () => {
    const result = parsePassageHeader('Greet(name, title = "friend")');
    expect(result.params[1].name).toBe('title');
    expect(result.params[1].defaultValue).toBe('friend');
    expect(result.params[1].required).toBe(false);
  });

  it('should parse parameter with number default', () => {
    const result = parsePassageHeader('SetScore(value = 100)');
    expect(result.params[0].defaultValue).toBe(100);
  });

  it('should parse parameter with boolean default', () => {
    const result = parsePassageHeader('Toggle(state = true)');
    expect(result.params[0].defaultValue).toBe(true);
  });

  it('should parse parameter with nil default', () => {
    const result = parsePassageHeader('Optional(value = nil)');
    expect(result.params[0].defaultValue).toBeNull();
  });

  it('should handle whitespace', () => {
    const result = parsePassageHeader('  Test  (  a  ,  b = 5  )  ');
    expect(result.name).toBe('Test');
    expect(result.params).toHaveLength(2);
    expect(result.params[1].defaultValue).toBe(5);
  });

  it('should throw for invalid header', () => {
    expect(() => parsePassageHeader('')).toThrow(/Invalid passage header/);
    expect(() => parsePassageHeader('invalid-name')).toThrow(
      /Invalid passage header/
    );
  });
});

describe('parsePassageCall', () => {
  it('should parse call without arguments', () => {
    const result = parsePassageCall('Start');
    expect(result.target).toBe('Start');
    expect(result.args).toHaveLength(0);
  });

  it('should parse call with empty argument list', () => {
    const result = parsePassageCall('Test()');
    expect(result.target).toBe('Test');
    expect(result.args).toHaveLength(0);
  });

  it('should parse call with string arguments', () => {
    const result = parsePassageCall('Describe("sword", "excellent")');
    expect(result.target).toBe('Describe');
    expect(result.args).toEqual(['sword', 'excellent']);
  });

  it('should parse call with number arguments', () => {
    const result = parsePassageCall('SetValues(10, 20, 30)');
    expect(result.args).toEqual([10, 20, 30]);
  });

  it('should parse call with mixed arguments', () => {
    const result = parsePassageCall('Mixed("text", 42, true)');
    expect(result.args).toEqual(['text', 42, true]);
  });

  it('should handle single quotes', () => {
    const result = parsePassageCall("Test('hello')");
    expect(result.args).toEqual(['hello']);
  });

  it('should throw for invalid call', () => {
    expect(() => parsePassageCall('')).toThrow(/Invalid passage call/);
  });
});

describe('formatPassageCall', () => {
  it('should format call without arguments', () => {
    expect(formatPassageCall('Start', [])).toBe('Start');
  });

  it('should format call with string arguments', () => {
    expect(formatPassageCall('Test', ['hello', 'world'])).toBe(
      'Test("hello", "world")'
    );
  });

  it('should format call with number arguments', () => {
    expect(formatPassageCall('Test', [1, 2, 3])).toBe('Test(1, 2, 3)');
  });

  it('should format call with mixed arguments', () => {
    expect(formatPassageCall('Test', ['text', 42, true])).toBe(
      'Test("text", 42, true)'
    );
  });
});

describe('createParameterizedPassageManager', () => {
  it('should create a new manager instance', () => {
    const manager = createParameterizedPassageManager();
    expect(manager).toBeInstanceOf(ParameterizedPassageManager);
  });

  it('should pass options to manager', () => {
    const manager = createParameterizedPassageManager({ validateTypes: true });

    manager.registerPassage('Test', [
      { name: 'num', type: 'number', required: true },
    ]);

    const result = manager.bindArguments('Test', ['not a number']);
    expect(result.success).toBe(false);
  });
});

describe('real-world examples', () => {
  it('should work like the spec example - Describe passage', () => {
    const manager = createParameterizedPassageManager();

    // Register passage from spec: :: Describe(item, quality)
    manager.registerPassage('Describe', [
      { name: 'item', required: true },
      { name: 'quality', required: true },
    ]);

    // Call with arguments: -> Describe("sword", "good") ->
    const result = manager.bindArguments('Describe', ['sword', 'good']);

    expect(result.success).toBe(true);
    const scope = manager.createVariableScope(result.bindings);
    expect(scope.item).toBe('sword');
    expect(scope.quality).toBe('good');
  });

  it('should work like the spec example - Greet with default', () => {
    const manager = createParameterizedPassageManager();

    // Register passage from spec: :: Greet(name, title = "friend")
    manager.registerPassage('Greet', [
      { name: 'name', required: true },
      { name: 'title', defaultValue: 'friend', required: false },
    ]);

    // Call without title: -> Greet("Alice") ->
    const result1 = manager.bindArguments('Greet', ['Alice']);
    expect(result1.success).toBe(true);
    const scope1 = manager.createVariableScope(result1.bindings);
    expect(scope1.name).toBe('Alice');
    expect(scope1.title).toBe('friend');

    // Call with title: -> Greet("Bob", "Sir") ->
    const result2 = manager.bindArguments('Greet', ['Bob', 'Sir']);
    expect(result2.success).toBe(true);
    const scope2 = manager.createVariableScope(result2.bindings);
    expect(scope2.name).toBe('Bob');
    expect(scope2.title).toBe('Sir');
  });

  it('should work with parsed header', () => {
    const manager = createParameterizedPassageManager();

    // Parse header and register
    const { name, params } = parsePassageHeader('ShowItem(name, price = 0)');
    manager.registerPassage(name, params);

    // Parse call and bind
    const call = parsePassageCall('ShowItem("Potion", 50)');
    const result = manager.bindArguments(call.target, call.args);

    expect(result.success).toBe(true);
    const scope = manager.createVariableScope(result.bindings);
    expect(scope.name).toBe('Potion');
    expect(scope.price).toBe(50);
  });
});
