import { describe, it, expect } from 'vitest';
import { validateQuality } from './quality';
import { parse } from '../parser';

describe('Quality Validation', () => {
  describe('Basic Functionality', () => {
    it('should validate a simple story', () => {
      const result = parse(`:: Start
Simple content
+ [Continue] -> End

:: End
The end.`);
      expect(result.ast).not.toBeNull();

      const validation = validateQuality(result.ast!);
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.diagnostics)).toBe(true);
    });

    it('should return quality metrics', () => {
      const result = parse(`:: Start
+ [Option 1] -> A
+ [Option 2] -> B

:: A
Content

:: B
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateQuality(result.ast!);
      expect(validation.metrics).toBeDefined();
      expect(typeof validation.metrics.branchingFactor).toBe('number');
      expect(typeof validation.metrics.maxComplexity).toBe('number');
      expect(typeof validation.metrics.maxPassageWords).toBe('number');
      expect(typeof validation.metrics.totalVariables).toBe('number');
    });

    it('should count passages', () => {
      const result = parse(`:: Start
Content
:: Other
More content`);
      expect(result.ast).not.toBeNull();

      const validation = validateQuality(result.ast!);
      expect(validation.metrics.totalPassages).toBe(2);
    });

    it('should count choices', () => {
      const result = parse(`:: Start
+ [A] -> End
+ [B] -> End

:: End
Done`);
      expect(result.ast).not.toBeNull();

      const validation = validateQuality(result.ast!);
      expect(validation.metrics.totalChoices).toBe(2);
    });

    it('should accept custom thresholds', () => {
      const result = parse(`:: Start
Simple content`);
      expect(result.ast).not.toBeNull();

      // Should not throw with custom thresholds
      const validation = validateQuality(result.ast!, {
        minBranchingFactor: 0,
        maxComplexity: 100,
        maxPassageWordCount: 1000,
        maxNestingDepth: 10,
        maxVariableCount: 200,
      });
      expect(validation.valid).toBe(true);
    });
  });
});
