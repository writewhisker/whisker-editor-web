import { describe, it, expect } from 'vitest';
import { validateLinks, type ValidationDiagnostic } from './links';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Link Validation', () => {
  describe('Dead Links (WLS-LNK-001)', () => {
    it('should detect dead link to non-existent passage', () => {
      const result = parse(`:: Start
+ [Go to nowhere] -> NonExistent`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const deadLinks = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.DEAD_LINK
      );
      expect(deadLinks.length).toBe(1);
      expect(deadLinks[0].target).toBe('NonExistent');
      expect(deadLinks[0].severity).toBe('error');
    });

    it('should not flag link to existing passage', () => {
      const result = parse(`:: Start
+ [Go somewhere] -> Other

:: Other
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const deadLinks = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.DEAD_LINK
      );
      expect(deadLinks.length).toBe(0);
    });

    it('should not flag special targets (END, BACK, RESTART)', () => {
      const result = parse(`:: Start
+ [End game] -> END
+ [Go back] -> BACK
+ [Restart] -> RESTART`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const deadLinks = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.DEAD_LINK
      );
      expect(deadLinks.length).toBe(0);
    });
  });

  describe('Self Links (WLS-LNK-002)', () => {
    it('should detect self-link without state change', () => {
      const result = parse(`:: Start
+ [Loop forever] -> Start`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const selfLinks = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SELF_LINK_NO_CHANGE
      );
      expect(selfLinks.length).toBe(1);
      expect(selfLinks[0].severity).toBe('warning');
    });

    it('should not flag self-link with action', () => {
      const result = parse(`:: Start
+ [Increment and stay] {$counter += 1} -> Start`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const selfLinks = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SELF_LINK_NO_CHANGE
      );
      expect(selfLinks.length).toBe(0);
    });
  });

  describe('Special Target Case (WLS-LNK-003)', () => {
    it('should detect wrong case for END', () => {
      const result = parse(`:: Start
+ [End game] -> end`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const caseErrors = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SPECIAL_TARGET_CASE
      );
      expect(caseErrors.length).toBe(1);
      expect(caseErrors[0].suggestion).toContain('END');
    });

    it('should detect wrong case for BACK', () => {
      const result = parse(`:: Start
Content

:: Other
+ [Go back] -> Back`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const caseErrors = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SPECIAL_TARGET_CASE
      );
      expect(caseErrors.length).toBe(1);
    });

    it('should detect wrong case for RESTART', () => {
      const result = parse(`:: Start
+ [Restart game] -> restart`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const caseErrors = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SPECIAL_TARGET_CASE
      );
      expect(caseErrors.length).toBe(1);
    });

    it('should not flag correct case', () => {
      const result = parse(`:: Start
+ [End] -> END
+ [Back] -> BACK
+ [Restart] -> RESTART`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const caseErrors = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.SPECIAL_TARGET_CASE
      );
      expect(caseErrors.length).toBe(0);
    });
  });

  describe('BACK on Start (WLS-LNK-004)', () => {
    it('should detect BACK on start passage', () => {
      const result = parse(`:: Start
+ [Go back] -> BACK`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const backOnStart = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.BACK_ON_START
      );
      expect(backOnStart.length).toBe(1);
      expect(backOnStart[0].severity).toBe('warning');
    });

    it('should not flag BACK on non-start passage', () => {
      const result = parse(`:: Start
+ [Continue] -> Other

:: Other
+ [Go back] -> BACK`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const backOnStart = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.BACK_ON_START
      );
      expect(backOnStart.length).toBe(0);
    });
  });

  describe('Orphan Passages (WLS-STR-005)', () => {
    it('should detect orphan passage', () => {
      const result = parse(`:: Start
+ [Go to other] -> Other

:: Other
Content

:: Orphan
Never reached`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const orphans = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.ORPHAN_PASSAGE
      );
      expect(orphans.length).toBe(1);
      expect(orphans[0].passageId).toBe('Orphan');
    });

    it('should not flag start passage as orphan', () => {
      const result = parse(`:: Start
Content only`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const orphans = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.ORPHAN_PASSAGE
      );
      expect(orphans.length).toBe(0);
    });

    it('should track all referenced passages', () => {
      const result = parse(`:: Start
+ [Go to A] -> A
+ [Go to B] -> B

:: A
+ [Go to C] -> C

:: B
Content

:: C
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      const orphans = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.ORPHAN_PASSAGE
      );
      expect(orphans.length).toBe(0);
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(`:: Start
+ [Continue] -> Other

:: Other
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should return valid: false when there are errors', () => {
      const result = parse(`:: Start
+ [Go nowhere] -> Missing`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      expect(validation.valid).toBe(false);
    });

    it('should include all diagnostics', () => {
      const result = parse(`:: Start
+ [Self loop] -> Start
+ [Wrong case] -> end
+ [Dead link] -> Missing`);
      expect(result.ast).not.toBeNull();

      const validation = validateLinks(result.ast!);
      expect(validation.diagnostics.length).toBeGreaterThanOrEqual(3);
    });
  });
});
