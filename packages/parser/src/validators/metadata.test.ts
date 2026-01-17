import { describe, it, expect } from 'vitest';
import { validateMetadata, generateIFID } from './metadata';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Metadata Validation', () => {
  describe('Missing IFID (WLS-META-001)', () => {
    it('should detect missing IFID', () => {
      const result = parse(`:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const missingIfid = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.MISSING_IFID
      );
      expect(missingIfid.length).toBe(1);
      expect(missingIfid[0].severity).toBe('warning');
    });
  });

  describe('Invalid IFID (WLS-META-002)', () => {
    it('should detect invalid IFID format', () => {
      const result = parse(`@ifid: not-a-valid-uuid
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const invalidIfid = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_IFID
      );
      expect(invalidIfid.length).toBe(1);
      expect(invalidIfid[0].severity).toBe('error');
    });

    it('should accept valid UUID v4', () => {
      const result = parse(`@ifid: 550e8400-e29b-41d4-a716-446655440000
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const invalidIfid = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_IFID
      );
      expect(invalidIfid.length).toBe(0);
    });
  });

  describe('Invalid Dimensions (WLS-META-003)', () => {
    it('should detect invalid width', () => {
      const result = parse(`@width: invalid
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const invalidDim = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_DIMENSIONS
      );
      expect(invalidDim.length).toBe(1);
    });

    it('should accept numeric dimensions', () => {
      const result = parse(`@width: 800
@height: 600
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const invalidDim = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_DIMENSIONS
      );
      expect(invalidDim.length).toBe(0);
    });
  });

  describe('Reserved Metadata Key (WLS-META-004)', () => {
    it('should detect reserved prefix usage', () => {
      const result = parse(`@_custom: value
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      const reserved = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.RESERVED_META_KEY
      );
      expect(reserved.length).toBe(1);
      expect(reserved[0].severity).toBe('warning');
    });
  });

  describe('generateIFID', () => {
    it('should generate valid UUID v4', () => {
      const ifid = generateIFID();
      // UUID v4 pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(ifid).toMatch(uuidPattern);
    });

    it('should generate unique IDs', () => {
      const ifid1 = generateIFID();
      const ifid2 = generateIFID();
      expect(ifid1).not.toBe(ifid2);
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors (only warnings)', () => {
      const result = parse(`:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      // Missing IFID is a warning, not an error
      expect(validation.valid).toBe(true);
    });

    it('should return valid: false with invalid IFID', () => {
      const result = parse(`@ifid: invalid
:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      expect(validation.valid).toBe(false);
    });

    it('should return metadata map', () => {
      const result = parse(`:: Start
Content`);
      expect(result.ast).not.toBeNull();

      const validation = validateMetadata(result.ast!);
      expect(validation.metadata instanceof Map).toBe(true);
    });
  });
});
