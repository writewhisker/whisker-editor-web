import { describe, it, expect } from 'vitest';
import { validateExpressions } from './expressions';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Expression Validation', () => {
  describe('Basic Functionality', () => {
    it('should validate a simple story', () => {
      const result = parse(`:: Start
Some text \${$name} here`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.diagnostics)).toBe(true);
    });

    it('should validate story with do blocks', () => {
      const result = parse(`:: Start
{do $x = 1 + 2}
{do $y = $a and $b}
{do $z = $c == $d}`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should validate choice conditions', () => {
      const result = parse(`:: Start
+ [Buy] {if $gold >= 50} -> Shop

:: Shop
Welcome!`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Assignment in Condition (WLS-EXP-003)', () => {
    it('should detect assignment in choice condition', () => {
      const result = parse(`:: Start
+ [Buy] {if $x = 5} -> Shop

:: Shop
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      const assignInCond = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.ASSIGNMENT_IN_CONDITION
      );
      // Check that it detects assignment in condition
      expect(assignInCond.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(`:: Start
{do $x = 10}
The value is \${$x + 5}`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should include diagnostics array', () => {
      const result = parse(`:: Start
Simple content`);
      expect(result.ast).not.toBeNull();

      const validation = validateExpressions(result.ast!);
      expect(Array.isArray(validation.diagnostics)).toBe(true);
    });
  });
});
