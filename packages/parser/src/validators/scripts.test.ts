import { describe, it, expect } from 'vitest';
import { validateScripts, getUnsafeFunctions } from './scripts';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Script Validation', () => {
  describe('Empty Script (WLS-SCR-001)', () => {
    it('should detect empty do block', () => {
      const result = parse(`:: Start
{do}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const emptyScript = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.EMPTY_SCRIPT
      );
      expect(emptyScript.length).toBe(1);
      expect(emptyScript[0].severity).toBe('warning');
    });

    it('should not flag do block with content', () => {
      const result = parse(`:: Start
{do $x = 5}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const emptyScript = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.EMPTY_SCRIPT
      );
      expect(emptyScript.length).toBe(0);
    });
  });

  describe('Unsafe Function (WLS-SCR-003)', () => {
    it('should detect os.execute call', () => {
      const result = parse(`:: Start
{do os.execute("rm -rf /")}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const unsafe = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNSAFE_FUNCTION
      );
      expect(unsafe.length).toBe(1);
      expect(unsafe[0].severity).toBe('warning');
    });

    it('should detect loadfile call', () => {
      const result = parse(`:: Start
{do loadfile("script.lua")}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const unsafe = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNSAFE_FUNCTION
      );
      expect(unsafe.length).toBe(1);
    });

    it('should not flag safe operations', () => {
      const result = parse(`:: Start
{do $x = 5}
{do print("hello")}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const unsafe = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNSAFE_FUNCTION
      );
      expect(unsafe.length).toBe(0);
    });
  });

  describe('Script Too Large (WLS-SCR-004)', () => {
    it('should not flag small do blocks', () => {
      const result = parse(`:: Start
{do $a = 1; $b = 2; $c = 3}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      const tooLarge = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SCRIPT_TOO_LARGE
      );
      expect(tooLarge.length).toBe(0);
    });
  });

  describe('Script Stats', () => {
    it('should count do blocks', () => {
      const result = parse(`:: Start
{do $x = 1}
{do $y = 2}
{do $z = 3}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      expect(validation.stats.doBlockCount).toBe(3);
    });

    it('should count total expressions', () => {
      const result = parse(`:: Start
{do $a = 1; $b = 2}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      expect(validation.stats.totalExpressions).toBeGreaterThanOrEqual(2);
    });

    it('should track unsafe function calls', () => {
      const result = parse(`:: Start
{do os.execute("test")}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      expect(validation.stats.unsafeFunctionCalls).toContain('os.execute');
    });
  });

  describe('getUnsafeFunctions', () => {
    it('should return list of unsafe functions', () => {
      const unsafe = getUnsafeFunctions();
      expect(unsafe).toContain('os.execute');
      expect(unsafe).toContain('io.open');
      expect(unsafe).toContain('loadfile');
      expect(unsafe).toContain('require');
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(`:: Start
{do $x = 5}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should return valid: true even with warnings', () => {
      // Unsafe functions produce warnings, not errors
      const result = parse(`:: Start
{do os.execute("test")}`);
      expect(result.ast).not.toBeNull();

      const validation = validateScripts(result.ast!);
      expect(validation.valid).toBe(true);
    });
  });
});
