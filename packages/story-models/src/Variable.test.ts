import { describe, it, expect } from 'vitest';
import { Variable } from './Variable';

describe('Variable', () => {
  describe('constructor', () => {
    it('should create a string variable', () => {
      const variable = new Variable({
        name: 'playerName',
        type: 'string',
        initial: 'Hero',
      });

      expect(variable.name).toBe('playerName');
      expect(variable.type).toBe('string');
      expect(variable.initial).toBe('Hero');
    });

    it('should create a number variable', () => {
      const variable = new Variable({
        name: 'health',
        type: 'number',
        initial: 100,
      });

      expect(variable.name).toBe('health');
      expect(variable.type).toBe('number');
      expect(variable.initial).toBe(100);
    });

    it('should create a boolean variable', () => {
      const variable = new Variable({
        name: 'hasKey',
        type: 'boolean',
        initial: false,
      });

      expect(variable.name).toBe('hasKey');
      expect(variable.type).toBe('boolean');
      expect(variable.initial).toBe(false);
    });

    it('should default to empty string for string type', () => {
      const variable = new Variable({
        name: 'test',
        type: 'string',
        initial: '',
      });

      expect(variable.initial).toBe('');
    });
  });

  // WLS 1.0: Variable Scope Tests
  describe('scope (WLS 1.0)', () => {
    it('should default to story scope', () => {
      const variable = new Variable({ name: 'gold', type: 'number', initial: 100 });
      expect(variable.scope).toBe('story');
    });

    it('should accept story scope in constructor', () => {
      const variable = new Variable({
        name: 'gold',
        type: 'number',
        initial: 100,
        scope: 'story',
      });
      expect(variable.scope).toBe('story');
    });

    it('should accept temp scope in constructor', () => {
      const variable = new Variable({
        name: 'tempCounter',
        type: 'number',
        initial: 0,
        scope: 'temp',
      });
      expect(variable.scope).toBe('temp');
    });

    it('should return true for isStoryScoped() when scope is story', () => {
      const variable = new Variable({ name: 'test', type: 'string', initial: '', scope: 'story' });
      expect(variable.isStoryScoped()).toBe(true);
      expect(variable.isTempScoped()).toBe(false);
    });

    it('should return true for isTempScoped() when scope is temp', () => {
      const variable = new Variable({ name: 'test', type: 'string', initial: '', scope: 'temp' });
      expect(variable.isTempScoped()).toBe(true);
      expect(variable.isStoryScoped()).toBe(false);
    });

    it('should return prefixed name with $ for story scope', () => {
      const variable = new Variable({ name: 'gold', type: 'number', initial: 100, scope: 'story' });
      expect(variable.getPrefixedName()).toBe('$gold');
    });

    it('should return prefixed name with _ for temp scope', () => {
      const variable = new Variable({ name: 'counter', type: 'number', initial: 0, scope: 'temp' });
      expect(variable.getPrefixedName()).toBe('_counter');
    });

    it('should serialize scope only when temp', () => {
      const storyVar = new Variable({ name: 'gold', type: 'number', initial: 100, scope: 'story' });
      const tempVar = new Variable({ name: 'temp', type: 'number', initial: 0, scope: 'temp' });

      expect(storyVar.serialize().scope).toBeUndefined();
      expect(tempVar.serialize().scope).toBe('temp');
    });

    it('should deserialize scope from VariableData', () => {
      const tempData = {
        name: 'counter',
        type: 'number' as const,
        initial: 0,
        scope: 'temp' as const,
      };

      const variable = Variable.deserialize(tempData);
      expect(variable.scope).toBe('temp');
    });

    it('should default to story when deserializing without scope', () => {
      const data = {
        name: 'gold',
        type: 'number' as const,
        initial: 100,
      };

      const variable = Variable.deserialize(data);
      expect(variable.scope).toBe('story');
    });

    it('should preserve scope when cloning', () => {
      const tempVar = new Variable({ name: 'temp', type: 'number', initial: 0, scope: 'temp' });
      const cloned = tempVar.clone('tempCopy');
      expect(cloned.scope).toBe('temp');
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize string variable', () => {
      const variable = new Variable({
        name: 'location',
        type: 'string',
        initial: 'forest',
      });

      const data = variable.serialize();
      expect(data.name).toBe('location');
      expect(data.type).toBe('string');
      expect(data.initial).toBe('forest');
    });

    it('should serialize number variable', () => {
      const variable = new Variable({
        name: 'gold',
        type: 'number',
        initial: 50,
      });

      const data = variable.serialize();
      expect(data.name).toBe('gold');
      expect(data.type).toBe('number');
      expect(data.initial).toBe(50);
    });

    it('should serialize boolean variable', () => {
      const variable = new Variable({
        name: 'alive',
        type: 'boolean',
        initial: true,
      });

      const data = variable.serialize();
      expect(data.name).toBe('alive');
      expect(data.type).toBe('boolean');
      expect(data.initial).toBe(true);
    });

    it('should deserialize from VariableData', () => {
      const data = {
        name: 'score',
        type: 'number' as const,
        initial: 0,
      };

      const variable = Variable.deserialize(data);
      expect(variable.name).toBe('score');
      expect(variable.type).toBe('number');
      expect(variable.initial).toBe(0);
    });
  });
});
