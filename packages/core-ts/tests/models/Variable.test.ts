import { describe, it, expect } from 'vitest';
import { Variable } from '@writewhisker/core-ts';

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
