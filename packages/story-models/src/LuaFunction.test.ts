import { describe, it, expect, beforeEach } from 'vitest';
import { LuaFunction, DEFAULT_FUNCTION_TEMPLATES, type LuaFunctionData } from './LuaFunction';

describe('LuaFunction', () => {
  let testFunctionData: Partial<LuaFunctionData>;

  beforeEach(() => {
    testFunctionData = {
      name: 'testFunction',
      description: 'A test function',
      code: 'function testFunction()\n  return true\nend',
      category: 'Testing',
      parameters: 'none',
      returnType: 'boolean',
      tags: ['test', 'example'],
    };
  });

  describe('constructor', () => {
    it('should create a function with provided data', () => {
      const func = new LuaFunction(testFunctionData);

      expect(func.name).toBe('testFunction');
      expect(func.description).toBe('A test function');
      expect(func.code).toBe('function testFunction()\n  return true\nend');
      expect(func.category).toBe('Testing');
      expect(func.parameters).toBe('none');
      expect(func.returnType).toBe('boolean');
      expect(func.tags).toEqual(['test', 'example']);
    });

    it('should generate an ID if not provided', () => {
      const func = new LuaFunction(testFunctionData);
      expect(func.id).toBeTruthy();
      expect(typeof func.id).toBe('string');
    });

    it('should use provided ID', () => {
      const funcWithId = new LuaFunction({
        ...testFunctionData,
        id: 'custom-id-123',
      });
      expect(funcWithId.id).toBe('custom-id-123');
    });

    it('should set timestamps on creation', () => {
      const before = new Date().toISOString();
      const func = new LuaFunction(testFunctionData);
      const after = new Date().toISOString();

      expect(func.created).toBeTruthy();
      expect(func.modified).toBeTruthy();
      expect(func.created >= before).toBe(true);
      expect(func.created <= after).toBe(true);
      expect(func.modified >= before).toBe(true);
      expect(func.modified <= after).toBe(true);
    });

    it('should preserve provided timestamps', () => {
      const created = '2024-01-01T00:00:00.000Z';
      const modified = '2024-01-02T00:00:00.000Z';

      const func = new LuaFunction({
        ...testFunctionData,
        created,
        modified,
      });

      expect(func.created).toBe(created);
      expect(func.modified).toBe(modified);
    });

    it('should use default values for missing fields', () => {
      const func = new LuaFunction();

      expect(func.name).toBe('New Function');
      expect(func.description).toBe('');
      expect(func.code).toBe('function myFunction()\n  -- Add code here\nend');
      expect(func.category).toBe('General');
      expect(func.parameters).toBe('');
      expect(func.returnType).toBe('');
      expect(func.tags).toEqual([]);
    });
  });

  describe('serialize', () => {
    it('should serialize all properties', () => {
      const func = new LuaFunction({
        ...testFunctionData,
        id: 'test-id',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z',
      });

      const serialized = func.serialize();

      expect(serialized).toEqual({
        id: 'test-id',
        name: 'testFunction',
        description: 'A test function',
        code: 'function testFunction()\n  return true\nend',
        category: 'Testing',
        parameters: 'none',
        returnType: 'boolean',
        tags: ['test', 'example'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should produce plain object (not class instance)', () => {
      const func = new LuaFunction(testFunctionData);
      const serialized = func.serialize();

      expect(serialized).not.toBeInstanceOf(LuaFunction);
      expect(typeof serialized).toBe('object');
    });
  });

  describe('deserialize', () => {
    it('should deserialize from plain object', () => {
      const data: LuaFunctionData = {
        id: 'test-id',
        name: 'testFunction',
        description: 'A test function',
        code: 'function testFunction()\n  return true\nend',
        category: 'Testing',
        parameters: 'none',
        returnType: 'boolean',
        tags: ['test', 'example'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z',
      };

      const func = LuaFunction.deserialize(data);

      expect(func).toBeInstanceOf(LuaFunction);
      expect(func.id).toBe('test-id');
      expect(func.name).toBe('testFunction');
      expect(func.description).toBe('A test function');
      expect(func.code).toBe('function testFunction()\n  return true\nend');
      expect(func.category).toBe('Testing');
      expect(func.parameters).toBe('none');
      expect(func.returnType).toBe('boolean');
      expect(func.tags).toEqual(['test', 'example']);
      expect(func.created).toBe('2024-01-01T00:00:00.000Z');
      expect(func.modified).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should round-trip serialize/deserialize', () => {
      const original = new LuaFunction(testFunctionData);
      const serialized = original.serialize();
      const deserialized = LuaFunction.deserialize(serialized);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.description).toBe(original.description);
      expect(deserialized.code).toBe(original.code);
      expect(deserialized.category).toBe(original.category);
      expect(deserialized.parameters).toBe(original.parameters);
      expect(deserialized.returnType).toBe(original.returnType);
      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.created).toBe(original.created);
      expect(deserialized.modified).toBe(original.modified);
    });
  });

  describe('clone', () => {
    it('should create a copy with new ID', () => {
      const original = new LuaFunction(testFunctionData);
      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe(`${original.name} (Copy)`);
    });

    it('should copy all properties except ID and name', () => {
      const original = new LuaFunction(testFunctionData);
      const cloned = original.clone();

      expect(cloned.description).toBe(original.description);
      expect(cloned.code).toBe(original.code);
      expect(cloned.category).toBe(original.category);
      expect(cloned.parameters).toBe(original.parameters);
      expect(cloned.returnType).toBe(original.returnType);
      expect(cloned.tags).toEqual(original.tags);
    });

    it('should set new timestamps on clone', () => {
      const original = new LuaFunction({
        ...testFunctionData,
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
      });

      const before = new Date().toISOString();
      const cloned = original.clone();
      const after = new Date().toISOString();

      expect(cloned.created).not.toBe(original.created);
      expect(cloned.modified).not.toBe(original.modified);
      expect(cloned.created >= before).toBe(true);
      expect(cloned.created <= after).toBe(true);
      expect(cloned.modified >= before).toBe(true);
      expect(cloned.modified <= after).toBe(true);
    });

    it('should create independent copy (not share references)', () => {
      const original = new LuaFunction(testFunctionData);
      const cloned = original.clone();

      // Modify clone's tags
      cloned.tags.push('new-tag');

      // Original should not be affected
      expect(original.tags).not.toContain('new-tag');
      expect(cloned.tags).toContain('new-tag');
    });
  });

  describe('touch', () => {
    it('should update modified timestamp', () => {
      const func = new LuaFunction({
        ...testFunctionData,
        modified: '2024-01-01T00:00:00.000Z',
      });

      const originalModified = func.modified;

      // Wait a bit to ensure timestamp changes
      const before = new Date().toISOString();
      func.touch();
      const after = new Date().toISOString();

      expect(func.modified).not.toBe(originalModified);
      expect(func.modified >= before).toBe(true);
      expect(func.modified <= after).toBe(true);
    });

    it('should not update created timestamp', () => {
      const created = '2024-01-01T00:00:00.000Z';
      const func = new LuaFunction({
        ...testFunctionData,
        created,
      });

      func.touch();

      expect(func.created).toBe(created);
    });
  });

  describe('DEFAULT_FUNCTION_TEMPLATES', () => {
    it('should contain function templates', () => {
      expect(DEFAULT_FUNCTION_TEMPLATES).toBeDefined();
      expect(Array.isArray(DEFAULT_FUNCTION_TEMPLATES)).toBe(true);
      expect(DEFAULT_FUNCTION_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have valid template structure', () => {
      DEFAULT_FUNCTION_TEMPLATES.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.code).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(Array.isArray(template.tags)).toBe(true);
      });
    });

    it('should have unique IDs', () => {
      const ids = DEFAULT_FUNCTION_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have expected categories', () => {
      const categories = [...new Set(DEFAULT_FUNCTION_TEMPLATES.map(t => t.category))];

      expect(categories).toContain('Combat');
      expect(categories).toContain('Inventory');
      expect(categories).toContain('Dialogue');
      expect(categories).toContain('Quests');
      expect(categories).toContain('Stats');
    });

    it('should have valid Lua code', () => {
      DEFAULT_FUNCTION_TEMPLATES.forEach(template => {
        // Check that code contains function keyword
        expect(template.code).toContain('function');

        // Check that code contains end keyword
        expect(template.code).toContain('end');

        // Check that function name matches template name
        expect(template.code).toContain(template.name);
      });
    });

    it('should have combat functions', () => {
      const combatFunctions = DEFAULT_FUNCTION_TEMPLATES.filter(
        t => t.category === 'Combat'
      );

      expect(combatFunctions.length).toBeGreaterThan(0);
      expect(combatFunctions.some(f => f.name.includes('Damage'))).toBe(true);
      expect(combatFunctions.some(f => f.name.includes('Health'))).toBe(true);
    });

    it('should have inventory functions', () => {
      const inventoryFunctions = DEFAULT_FUNCTION_TEMPLATES.filter(
        t => t.category === 'Inventory'
      );

      expect(inventoryFunctions.length).toBeGreaterThan(0);
      expect(inventoryFunctions.some(f => f.name.toLowerCase().includes('inventory'))).toBe(true);
    });

    it('should have quest functions', () => {
      const questFunctions = DEFAULT_FUNCTION_TEMPLATES.filter(
        t => t.category === 'Quests'
      );

      expect(questFunctions.length).toBeGreaterThan(0);
      expect(questFunctions.some(f => f.name.toLowerCase().includes('quest'))).toBe(true);
    });
  });
});
