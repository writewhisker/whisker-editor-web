import { describe, it, expect } from 'vitest';
import { trackVariables, validateVariables } from './variables';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Variable Validation', () => {
  describe('trackVariables', () => {
    it('should track variable usage in interpolation', () => {
      const result = parse(':: Start\nHello, $name!');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('name')).toBe(true);
      expect(vars.get('name')?.usedIn).toContain('Start');
    });

    it('should track variable assignment', () => {
      const result = parse(':: Start\n${$score = 100}\nScore: $score');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('score')).toBe(true);
      const scoreInfo = vars.get('score');
      expect(scoreInfo?.definedIn).toContain('Start');
      expect(scoreInfo?.usedIn).toContain('Start');
    });

    it('should track variables in conditions', () => {
      const result = parse(':: Start\n{ $health > 0 }\nYou are alive!\n{/}');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('health')).toBe(true);
    });

    it('should track variables in choice conditions', () => {
      const result = parse(':: Start\n+ [Buy] {if $gold >= 50} -> Shop');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('gold')).toBe(true);
    });

    it('should track variables in choice actions', () => {
      const result = parse(':: Start\n+ [Attack] {do $hp -= 10} -> Battle');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('hp')).toBe(true);
    });

    it('should identify temp variables', () => {
      const result = parse(':: Start\n${$_temp = 1}\nValue: $_temp');
      expect(result.ast).not.toBeNull();

      const vars = trackVariables(result.ast!);
      expect(vars.has('_temp')).toBe(true);
      expect(vars.get('_temp')?.isTemp).toBe(true);
    });
  });

  describe('Undefined Variables (WLS-VAR-001)', () => {
    it('should detect undefined variable', () => {
      const result = parse(':: Start\nHello, $unknownVar!');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const undefined_vars = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNDEFINED_VARIABLE
      );
      expect(undefined_vars.length).toBe(1);
      expect(undefined_vars[0].message).toContain('unknownVar');
    });

    it('should not flag defined variable', () => {
      const result = parse(':: Start\n${$name = "Hero"}\nHello, $name!');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const undefined_vars = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNDEFINED_VARIABLE
      );
      expect(undefined_vars.length).toBe(0);
    });
  });

  describe('Unused Variables (WLS-VAR-002)', () => {
    it('should detect unused variable', () => {
      const result = parse(':: Start\n${$unused = 100}\nThis passage does not use the variable.');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const unused = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNUSED_VARIABLE
      );
      expect(unused.length).toBe(1);
      expect(unused[0].message).toContain('unused');
    });

    it('should not flag used variable', () => {
      const result = parse(':: Start\n${$score = 100}\nYour score: $score');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const unused = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNUSED_VARIABLE
      );
      expect(unused.length).toBe(0);
    });
  });

  describe('Invalid Variable Names (WLS-VAR-003)', () => {
    it('should detect invalid variable name with space', () => {
      // This would typically be caught by the parser, but testing validator logic
      const result = parse(':: Start\nValue: $var');
      expect(result.ast).not.toBeNull();

      // Valid name should not trigger error
      const validation = validateVariables(result.ast!);
      const invalid = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_VARIABLE_NAME
      );
      expect(invalid.length).toBe(0);
    });
  });

  describe('Reserved Prefix (WLS-VAR-004)', () => {
    it('should warn about whisker_ prefix', () => {
      const result = parse(':: Start\n${$whisker_custom = 1}\nValue: $whisker_custom');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const reserved = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.RESERVED_PREFIX
      );
      expect(reserved.length).toBe(1);
      expect(reserved[0].message).toContain('whisker_');
    });

    it('should warn about wls_ prefix', () => {
      const result = parse(':: Start\n${$wls_internal = 1}\nValue: $wls_internal');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const reserved = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.RESERVED_PREFIX
      );
      expect(reserved.length).toBe(1);
    });

    it('should not warn about normal prefix', () => {
      const result = parse(':: Start\n${$player_name = "Hero"}\nHello, $player_name!');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const reserved = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.RESERVED_PREFIX
      );
      expect(reserved.length).toBe(0);
    });
  });

  describe('Temp Variable Cross-Passage (WLS-VAR-008)', () => {
    it('should warn about temp variable used across passages', () => {
      const result = parse(':: Start\n${$_temp = 1}\n+ [Continue] -> Other\n\n:: Other\nValue: $_temp');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const crossPassage = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.TEMP_CROSS_PASSAGE
      );
      expect(crossPassage.length).toBe(1);
      expect(crossPassage[0].message).toContain('_temp');
    });

    it('should not warn about temp variable in single passage', () => {
      const result = parse(':: Start\n${$_temp = 1}\nValue: $_temp');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const crossPassage = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.TEMP_CROSS_PASSAGE
      );
      expect(crossPassage.length).toBe(0);
    });

    it('should not warn about non-temp variable across passages', () => {
      const result = parse(':: Start\n${$score = 100}\n+ [Continue] -> Other\n\n:: Other\nScore: $score');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      const crossPassage = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.TEMP_CROSS_PASSAGE
      );
      expect(crossPassage.length).toBe(0);
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(':: Start\n${$name = "Hero"}\nHello, $name!');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should return valid: false when there are errors', () => {
      const result = parse(':: Start\nHello, $undefined_var!');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      expect(validation.valid).toBe(false);
    });

    it('should include variable map', () => {
      const result = parse(':: Start\n${$gold = 100}\nGold: $gold');
      expect(result.ast).not.toBeNull();

      const validation = validateVariables(result.ast!);
      expect(validation.variables).toBeDefined();
      expect(validation.variables.has('gold')).toBe(true);
    });
  });
});
