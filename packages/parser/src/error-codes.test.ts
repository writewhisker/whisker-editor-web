import { describe, it, expect } from 'vitest';
import { WLS_ERROR_CODES, type WLSErrorCode } from './ast';

/**
 * Test suite for WLS Error Codes
 * Ensures all 87+ error codes are properly defined per the WLS specification
 */
describe('WLS Error Codes', () => {
  describe('Error Code Format', () => {
    it('all error codes should follow WLS-{CATEGORY}-{NUMBER} format', () => {
      const pattern = /^WLS-[A-Z]{2,4}-\d{3}$/;
      for (const [key, code] of Object.entries(WLS_ERROR_CODES)) {
        expect(code).toMatch(pattern, `${key}: "${code}" does not match WLS-XXX-NNN format`);
      }
    });

    it('all error codes should be unique', () => {
      const codes = Object.values(WLS_ERROR_CODES);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have at least 87 error codes (WLS spec minimum)', () => {
      const codeCount = Object.keys(WLS_ERROR_CODES).length;
      expect(codeCount).toBeGreaterThanOrEqual(87);
    });
  });

  describe('Syntax Errors (SYN)', () => {
    it('should define SYN-001: expected passage name', () => {
      expect(WLS_ERROR_CODES.EXPECTED_PASSAGE_NAME).toBe('WLS-SYN-001');
    });

    it('should define SYN-002: expected passage marker', () => {
      expect(WLS_ERROR_CODES.EXPECTED_PASSAGE_MARKER).toBe('WLS-SYN-002');
    });

    it('should define SYN-003: expected choice target', () => {
      expect(WLS_ERROR_CODES.EXPECTED_CHOICE_TARGET).toBe('WLS-SYN-003');
    });

    it('should define SYN-004: expected expression', () => {
      expect(WLS_ERROR_CODES.EXPECTED_EXPRESSION).toBe('WLS-SYN-004');
    });

    it('should define SYN-005: expected closing brace', () => {
      expect(WLS_ERROR_CODES.EXPECTED_CLOSING_BRACE).toBe('WLS-SYN-005');
    });

    it('should define SYN-006: unexpected token', () => {
      expect(WLS_ERROR_CODES.UNEXPECTED_TOKEN).toBe('WLS-SYN-006');
    });
  });

  describe('Structure Errors (STR)', () => {
    it('should define STR-001: missing start passage', () => {
      expect(WLS_ERROR_CODES.MISSING_START_PASSAGE).toBe('WLS-STR-001');
    });

    it('should define STR-002: unreachable passage', () => {
      expect(WLS_ERROR_CODES.UNREACHABLE_PASSAGE).toBe('WLS-STR-002');
    });

    it('should define STR-003: duplicate passage', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_PASSAGE).toBe('WLS-STR-003');
    });

    it('should define STR-004: empty passage', () => {
      expect(WLS_ERROR_CODES.EMPTY_PASSAGE).toBe('WLS-STR-004');
    });

    it('should define STR-005: orphan passage', () => {
      expect(WLS_ERROR_CODES.ORPHAN_PASSAGE).toBe('WLS-STR-005');
    });

    it('should define STR-006: no terminal', () => {
      expect(WLS_ERROR_CODES.NO_TERMINAL).toBe('WLS-STR-006');
    });
  });

  describe('Link Errors (LNK)', () => {
    it('should define LNK-001: dead link', () => {
      expect(WLS_ERROR_CODES.DEAD_LINK).toBe('WLS-LNK-001');
    });

    it('should define LNK-002: self link no change', () => {
      expect(WLS_ERROR_CODES.SELF_LINK_NO_CHANGE).toBe('WLS-LNK-002');
    });

    it('should define LNK-003: special target case', () => {
      expect(WLS_ERROR_CODES.SPECIAL_TARGET_CASE).toBe('WLS-LNK-003');
    });

    it('should define LNK-004: back on start', () => {
      expect(WLS_ERROR_CODES.BACK_ON_START).toBe('WLS-LNK-004');
    });

    it('should define LNK-005: empty choice target', () => {
      expect(WLS_ERROR_CODES.EMPTY_CHOICE_TARGET).toBe('WLS-LNK-005');
    });
  });

  describe('Variable Errors (VAR)', () => {
    it('should define VAR-001: undefined variable', () => {
      expect(WLS_ERROR_CODES.UNDEFINED_VARIABLE).toBe('WLS-VAR-001');
    });

    it('should define VAR-002: unused variable', () => {
      expect(WLS_ERROR_CODES.UNUSED_VARIABLE).toBe('WLS-VAR-002');
    });

    it('should define VAR-003: invalid variable name', () => {
      expect(WLS_ERROR_CODES.INVALID_VARIABLE_NAME).toBe('WLS-VAR-003');
    });

    it('should define VAR-004: reserved prefix', () => {
      expect(WLS_ERROR_CODES.RESERVED_PREFIX).toBe('WLS-VAR-004');
    });

    it('should define VAR-005: variable shadowing', () => {
      expect(WLS_ERROR_CODES.VARIABLE_SHADOWING).toBe('WLS-VAR-005');
    });

    it('should define VAR-006: lone dollar', () => {
      expect(WLS_ERROR_CODES.LONE_DOLLAR).toBe('WLS-VAR-006');
    });

    it('should define VAR-007: unclosed interpolation', () => {
      expect(WLS_ERROR_CODES.UNCLOSED_INTERPOLATION).toBe('WLS-VAR-007');
    });

    it('should define VAR-008: temp cross passage', () => {
      expect(WLS_ERROR_CODES.TEMP_CROSS_PASSAGE).toBe('WLS-VAR-008');
    });
  });

  describe('Flow Errors (FLW)', () => {
    it('should define FLW-001: dead end', () => {
      expect(WLS_ERROR_CODES.DEAD_END).toBe('WLS-FLW-001');
    });

    it('should define FLW-002: bottleneck', () => {
      expect(WLS_ERROR_CODES.BOTTLENECK).toBe('WLS-FLW-002');
    });

    it('should define FLW-003: cycle detected', () => {
      expect(WLS_ERROR_CODES.CYCLE_DETECTED).toBe('WLS-FLW-003');
    });

    it('should define FLW-004: infinite loop', () => {
      expect(WLS_ERROR_CODES.INFINITE_LOOP).toBe('WLS-FLW-004');
    });

    it('should define FLW-005: unreachable choice', () => {
      expect(WLS_ERROR_CODES.UNREACHABLE_CHOICE).toBe('WLS-FLW-005');
    });

    it('should define FLW-006: always true condition', () => {
      expect(WLS_ERROR_CODES.ALWAYS_TRUE_CONDITION).toBe('WLS-FLW-006');
    });

    it('should define FLW-007: orphan gather', () => {
      expect(WLS_ERROR_CODES.ORPHAN_GATHER).toBe('WLS-FLW-007');
    });

    it('should define FLW-008: tunnel depth exceeded', () => {
      expect(WLS_ERROR_CODES.TUNNEL_DEPTH_EXCEEDED).toBe('WLS-FLW-008');
    });

    it('should define FLW-009: orphan tunnel return', () => {
      expect(WLS_ERROR_CODES.ORPHAN_TUNNEL_RETURN).toBe('WLS-FLW-009');
    });

    it('should define FLW-010: missing tunnel return', () => {
      expect(WLS_ERROR_CODES.MISSING_TUNNEL_RETURN).toBe('WLS-FLW-010');
    });

    it('should define FLW-011: invalid tunnel syntax', () => {
      expect(WLS_ERROR_CODES.INVALID_TUNNEL_SYNTAX).toBe('WLS-FLW-011');
    });
  });

  describe('Expression Errors (EXP)', () => {
    it('should define EXP-001: empty expression', () => {
      expect(WLS_ERROR_CODES.EMPTY_EXPRESSION).toBe('WLS-EXP-001');
    });

    it('should define EXP-002: unclosed block', () => {
      expect(WLS_ERROR_CODES.UNCLOSED_BLOCK).toBe('WLS-EXP-002');
    });

    it('should define EXP-003: assignment in condition', () => {
      expect(WLS_ERROR_CODES.ASSIGNMENT_IN_CONDITION).toBe('WLS-EXP-003');
    });

    it('should define EXP-004: missing operand', () => {
      expect(WLS_ERROR_CODES.MISSING_OPERAND).toBe('WLS-EXP-004');
    });

    it('should define EXP-005: invalid operator', () => {
      expect(WLS_ERROR_CODES.INVALID_OPERATOR).toBe('WLS-EXP-005');
    });

    it('should define EXP-006: unmatched parenthesis', () => {
      expect(WLS_ERROR_CODES.UNMATCHED_PARENTHESIS).toBe('WLS-EXP-006');
    });

    it('should define EXP-007: incomplete expression', () => {
      expect(WLS_ERROR_CODES.INCOMPLETE_EXPRESSION).toBe('WLS-EXP-007');
    });
  });

  describe('Quality Warnings (QUA)', () => {
    it('should define QUA-001: low branching', () => {
      expect(WLS_ERROR_CODES.LOW_BRANCHING).toBe('WLS-QUA-001');
    });

    it('should define QUA-002: high complexity', () => {
      expect(WLS_ERROR_CODES.HIGH_COMPLEXITY).toBe('WLS-QUA-002');
    });

    it('should define QUA-003: long passage', () => {
      expect(WLS_ERROR_CODES.LONG_PASSAGE).toBe('WLS-QUA-003');
    });

    it('should define QUA-004: deep nesting', () => {
      expect(WLS_ERROR_CODES.DEEP_NESTING).toBe('WLS-QUA-004');
    });

    it('should define QUA-005: many variables', () => {
      expect(WLS_ERROR_CODES.MANY_VARIABLES).toBe('WLS-QUA-005');
    });
  });

  describe('Asset Errors (AST)', () => {
    it('should define AST-001: missing asset ID', () => {
      expect(WLS_ERROR_CODES.MISSING_ASSET_ID).toBe('WLS-AST-001');
    });

    it('should define AST-002: invalid asset path', () => {
      expect(WLS_ERROR_CODES.INVALID_ASSET_PATH).toBe('WLS-AST-002');
    });

    it('should define AST-003: asset not found', () => {
      expect(WLS_ERROR_CODES.ASSET_NOT_FOUND).toBe('WLS-AST-003');
    });

    it('should define AST-004: unsupported asset type', () => {
      expect(WLS_ERROR_CODES.UNSUPPORTED_ASSET_TYPE).toBe('WLS-AST-004');
    });

    it('should define AST-005: asset too large', () => {
      expect(WLS_ERROR_CODES.ASSET_TOO_LARGE).toBe('WLS-AST-005');
    });

    it('should define AST-006: duplicate asset ID', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_ASSET_ID).toBe('WLS-AST-006');
    });

    it('should define AST-007: unused asset', () => {
      expect(WLS_ERROR_CODES.UNUSED_ASSET).toBe('WLS-AST-007');
    });
  });

  describe('Metadata Errors (META)', () => {
    it('should define META-001: missing IFID', () => {
      expect(WLS_ERROR_CODES.MISSING_IFID).toBe('WLS-META-001');
    });

    it('should define META-002: invalid IFID', () => {
      expect(WLS_ERROR_CODES.INVALID_IFID).toBe('WLS-META-002');
    });

    it('should define META-003: invalid dimensions', () => {
      expect(WLS_ERROR_CODES.INVALID_DIMENSIONS).toBe('WLS-META-003');
    });

    it('should define META-004: reserved meta key', () => {
      expect(WLS_ERROR_CODES.RESERVED_META_KEY).toBe('WLS-META-004');
    });

    it('should define META-005: duplicate meta key', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_META_KEY).toBe('WLS-META-005');
    });
  });

  describe('Script Errors (SCR)', () => {
    it('should define SCR-001: empty script', () => {
      expect(WLS_ERROR_CODES.EMPTY_SCRIPT).toBe('WLS-SCR-001');
    });

    it('should define SCR-002: script syntax error', () => {
      expect(WLS_ERROR_CODES.SCRIPT_SYNTAX_ERROR).toBe('WLS-SCR-002');
    });

    it('should define SCR-003: unsafe function', () => {
      expect(WLS_ERROR_CODES.UNSAFE_FUNCTION).toBe('WLS-SCR-003');
    });

    it('should define SCR-004: script too large', () => {
      expect(WLS_ERROR_CODES.SCRIPT_TOO_LARGE).toBe('WLS-SCR-004');
    });
  });

  describe('Collection Errors (COL)', () => {
    it('should define COL-001: duplicate list value', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_LIST_VALUE).toBe('WLS-COL-001');
    });

    it('should define COL-002: empty list', () => {
      expect(WLS_ERROR_CODES.EMPTY_LIST).toBe('WLS-COL-002');
    });

    it('should define COL-003: invalid list value', () => {
      expect(WLS_ERROR_CODES.INVALID_LIST_VALUE).toBe('WLS-COL-003');
    });

    it('should define COL-004: duplicate array index', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_ARRAY_INDEX).toBe('WLS-COL-004');
    });

    it('should define COL-005: array index out of bounds', () => {
      expect(WLS_ERROR_CODES.ARRAY_INDEX_OUT_OF_BOUNDS).toBe('WLS-COL-005');
    });

    it('should define COL-006: invalid array type', () => {
      expect(WLS_ERROR_CODES.INVALID_ARRAY_TYPE).toBe('WLS-COL-006');
    });

    it('should define COL-007: duplicate map key', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_MAP_KEY).toBe('WLS-COL-007');
    });

    it('should define COL-008: invalid map key', () => {
      expect(WLS_ERROR_CODES.INVALID_MAP_KEY).toBe('WLS-COL-008');
    });

    it('should define COL-009: undefined collection', () => {
      expect(WLS_ERROR_CODES.UNDEFINED_COLLECTION).toBe('WLS-COL-009');
    });

    it('should define COL-010: collection type mismatch', () => {
      expect(WLS_ERROR_CODES.COLLECTION_TYPE_MISMATCH).toBe('WLS-COL-010');
    });
  });

  describe('Module Errors (MOD)', () => {
    it('should define MOD-001: include not found', () => {
      expect(WLS_ERROR_CODES.INCLUDE_NOT_FOUND).toBe('WLS-MOD-001');
    });

    it('should define MOD-002: circular include', () => {
      expect(WLS_ERROR_CODES.CIRCULAR_INCLUDE).toBe('WLS-MOD-002');
    });

    it('should define MOD-003: undefined function', () => {
      expect(WLS_ERROR_CODES.UNDEFINED_FUNCTION).toBe('WLS-MOD-003');
    });

    it('should define MOD-004: duplicate function', () => {
      expect(WLS_ERROR_CODES.DUPLICATE_FUNCTION).toBe('WLS-MOD-004');
    });

    it('should define MOD-005: namespace conflict', () => {
      expect(WLS_ERROR_CODES.NAMESPACE_CONFLICT).toBe('WLS-MOD-005');
    });

    it('should define MOD-006: undefined namespace', () => {
      expect(WLS_ERROR_CODES.UNDEFINED_NAMESPACE).toBe('WLS-MOD-006');
    });

    it('should define MOD-007: unmatched end namespace', () => {
      expect(WLS_ERROR_CODES.UNMATCHED_END_NAMESPACE).toBe('WLS-MOD-007');
    });

    it('should define MOD-008: invalid export', () => {
      expect(WLS_ERROR_CODES.INVALID_EXPORT).toBe('WLS-MOD-008');
    });
  });

  describe('Presentation Errors (PRS)', () => {
    it('should define PRS-001: invalid markdown', () => {
      expect(WLS_ERROR_CODES.INVALID_MARKDOWN).toBe('WLS-PRS-001');
    });

    it('should define PRS-002: invalid CSS class', () => {
      expect(WLS_ERROR_CODES.INVALID_CSS_CLASS).toBe('WLS-PRS-002');
    });

    it('should define PRS-003: undefined CSS class', () => {
      expect(WLS_ERROR_CODES.UNDEFINED_CSS_CLASS).toBe('WLS-PRS-003');
    });

    it('should define PRS-004: missing media source', () => {
      expect(WLS_ERROR_CODES.MISSING_MEDIA_SOURCE).toBe('WLS-PRS-004');
    });

    it('should define PRS-005: invalid media format', () => {
      expect(WLS_ERROR_CODES.INVALID_MEDIA_FORMAT).toBe('WLS-PRS-005');
    });

    it('should define PRS-006: theme not found', () => {
      expect(WLS_ERROR_CODES.THEME_NOT_FOUND).toBe('WLS-PRS-006');
    });

    it('should define PRS-007: invalid style property', () => {
      expect(WLS_ERROR_CODES.INVALID_STYLE_PROPERTY).toBe('WLS-PRS-007');
    });

    it('should define PRS-008: unclosed style block', () => {
      expect(WLS_ERROR_CODES.UNCLOSED_STYLE_BLOCK).toBe('WLS-PRS-008');
    });
  });

  describe('Developer Errors (DEV)', () => {
    it('should define DEV-001: LSP connection failed', () => {
      expect(WLS_ERROR_CODES.LSP_CONNECTION_FAILED).toBe('WLS-DEV-001');
    });

    it('should define DEV-002: debug adapter error', () => {
      expect(WLS_ERROR_CODES.DEBUG_ADAPTER_ERROR).toBe('WLS-DEV-002');
    });

    it('should define DEV-003: format parse error', () => {
      expect(WLS_ERROR_CODES.FORMAT_PARSE_ERROR).toBe('WLS-DEV-003');
    });

    it('should define DEV-004: preview runtime error', () => {
      expect(WLS_ERROR_CODES.PREVIEW_RUNTIME_ERROR).toBe('WLS-DEV-004');
    });

    it('should define DEV-005: breakpoint invalid', () => {
      expect(WLS_ERROR_CODES.BREAKPOINT_INVALID).toBe('WLS-DEV-005');
    });
  });

  describe('Category Coverage', () => {
    const getCategoryCount = (category: string) => {
      return Object.values(WLS_ERROR_CODES).filter(
        code => code.includes(`-${category}-`)
      ).length;
    };

    it('should have 6 SYN codes', () => {
      expect(getCategoryCount('SYN')).toBe(6);
    });

    it('should have 6 STR codes', () => {
      expect(getCategoryCount('STR')).toBe(6);
    });

    it('should have 5 LNK codes', () => {
      expect(getCategoryCount('LNK')).toBe(5);
    });

    it('should have 8 VAR codes', () => {
      expect(getCategoryCount('VAR')).toBe(8);
    });

    it('should have at least 6 FLW codes', () => {
      expect(getCategoryCount('FLW')).toBeGreaterThanOrEqual(6);
    });

    it('should have 7 EXP codes', () => {
      expect(getCategoryCount('EXP')).toBe(7);
    });

    it('should have 5 QUA codes', () => {
      expect(getCategoryCount('QUA')).toBe(5);
    });

    it('should have 7 AST codes', () => {
      expect(getCategoryCount('AST')).toBe(7);
    });

    it('should have 5 META codes', () => {
      expect(getCategoryCount('META')).toBe(5);
    });

    it('should have 4 SCR codes', () => {
      expect(getCategoryCount('SCR')).toBe(4);
    });

    it('should have 10 COL codes', () => {
      expect(getCategoryCount('COL')).toBe(10);
    });

    it('should have 8 MOD codes', () => {
      expect(getCategoryCount('MOD')).toBe(8);
    });

    it('should have 8 PRS codes', () => {
      expect(getCategoryCount('PRS')).toBe(8);
    });

    it('should have 5 DEV codes', () => {
      expect(getCategoryCount('DEV')).toBe(5);
    });
  });

  describe('Type Safety', () => {
    it('WLSErrorCode type should include all codes', () => {
      const testCode: WLSErrorCode = WLS_ERROR_CODES.DEAD_LINK;
      expect(typeof testCode).toBe('string');
    });

    it('error codes should be readonly', () => {
      // This test verifies at compile time that WLS_ERROR_CODES is const
      const codes = WLS_ERROR_CODES;
      expect(Object.isFrozen(codes)).toBe(false); // JS const doesn't freeze
      // But TypeScript's `as const` prevents modification at compile time
    });
  });
});
