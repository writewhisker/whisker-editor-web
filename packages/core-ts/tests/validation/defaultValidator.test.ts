import { describe, it, expect } from 'vitest';
import { createDefaultValidator } from '@writewhisker/core-ts';

describe('defaultValidator', () => {
  describe('createDefaultValidator', () => {
    it('should create a validator instance', () => {
      const validator = createDefaultValidator();

      expect(validator).toBeDefined();
      expect(validator.validate).toBeDefined();
      expect(validator.registerValidator).toBeDefined();
    });

    it('should register all standard validators', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      // At least 11 core validators, plus additional WLS validators
      expect(validators.length).toBeGreaterThanOrEqual(11);
    });

    it('should register MissingStartPassageValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'missing_start_passage');
      expect(hasValidator).toBe(true);
    });

    it('should register UnreachablePassagesValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'unreachable_passages');
      expect(hasValidator).toBe(true);
    });

    it('should register DeadLinksValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'dead_links');
      expect(hasValidator).toBe(true);
    });

    it('should register UndefinedVariablesValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'undefined_variables');
      expect(hasValidator).toBe(true);
    });

    it('should register UnusedVariablesValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'unused_variables');
      expect(hasValidator).toBe(true);
    });

    it('should register EmptyPassagesValidator', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();

      const hasValidator = validators.some(v => v.name === 'empty_passages');
      expect(hasValidator).toBe(true);
    });

    it('should not register duplicate validators', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();
      const names = validators.map(v => v.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it('should register validators from different categories', () => {
      const validator = createDefaultValidator();
      const validators = validator.getValidators();
      const categories = new Set(validators.map(v => v.category));

      expect(categories.has('structure')).toBe(true);
      expect(categories.has('links')).toBe(true);
      expect(categories.has('variables')).toBe(true);
      expect(categories.has('content')).toBe(true);
    });
  });
});
