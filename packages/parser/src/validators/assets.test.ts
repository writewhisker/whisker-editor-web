import { describe, it, expect } from 'vitest';
import { validateAssets, getSupportedExtensions } from './assets';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Asset Validation', () => {
  describe('Missing Asset Source (WLS-AST-001)', () => {
    it('should detect image with empty src', () => {
      const result = parse(`:: Start
![alt text]()`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const missingSource = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.MISSING_ASSET_ID
      );
      expect(missingSource.length).toBe(1);
      expect(missingSource[0].severity).toBe('error');
    });

    it('should not flag image with valid src', () => {
      const result = parse(`:: Start
![alt text](images/photo.png)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const missingSource = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.MISSING_ASSET_ID
      );
      expect(missingSource.length).toBe(0);
    });
  });

  describe('Invalid Asset Path (WLS-AST-002)', () => {
    it('should detect invalid path with special characters', () => {
      const result = parse(`:: Start
![alt](path<with|invalid>chars)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const invalidPath = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_ASSET_PATH
      );
      expect(invalidPath.length).toBe(1);
      expect(invalidPath[0].severity).toBe('error');
    });

    it('should accept HTTP URLs', () => {
      const result = parse(`:: Start
![alt](https://example.com/image.png)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const invalidPath = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_ASSET_PATH
      );
      expect(invalidPath.length).toBe(0);
    });

    it('should accept data URIs', () => {
      const result = parse(`:: Start
![alt](data:image/png;base64,abc123)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const invalidPath = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.INVALID_ASSET_PATH
      );
      expect(invalidPath.length).toBe(0);
    });
  });

  describe('Unsupported Asset Type (WLS-AST-004)', () => {
    it('should detect unsupported image format', () => {
      const result = parse(`:: Start
![alt](image.xyz)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const unsupported = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNSUPPORTED_ASSET_TYPE
      );
      expect(unsupported.length).toBe(1);
      expect(unsupported[0].severity).toBe('warning');
    });

    it('should accept standard image formats', () => {
      const result = parse(`:: Start
![alt1](image.png)
![alt2](photo.jpg)
![alt3](icon.svg)
![alt4](animation.gif)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      const unsupported = validation.diagnostics.filter(
        d => d.code === WLS_ERROR_CODES.UNSUPPORTED_ASSET_TYPE
      );
      expect(unsupported.length).toBe(0);
    });
  });

  describe('Asset Collection', () => {
    it('should collect all assets from story', () => {
      const result = parse(`:: Start
![image1](pic1.png)
+ [Continue] -> Next

:: Next
![image2](pic2.jpg)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      expect(validation.assets.length).toBe(2);
    });

    it('should track asset type', () => {
      const result = parse(`:: Start
![image](photo.png)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      expect(validation.assets[0].type).toBe('image');
    });

    it('should track passage name', () => {
      const result = parse(`:: MyPassage
![image](photo.png)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      expect(validation.assets[0].passageName).toBe('MyPassage');
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return image extensions', () => {
      const exts = getSupportedExtensions('image');
      expect(exts).toContain('.png');
      expect(exts).toContain('.jpg');
      expect(exts).toContain('.gif');
    });

    it('should return audio extensions', () => {
      const exts = getSupportedExtensions('audio');
      expect(exts).toContain('.mp3');
      expect(exts).toContain('.wav');
    });

    it('should return video extensions', () => {
      const exts = getSupportedExtensions('video');
      expect(exts).toContain('.mp4');
      expect(exts).toContain('.webm');
    });

    it('should return empty array for unknown type', () => {
      const exts = getSupportedExtensions('unknown');
      expect(exts).toEqual([]);
    });
  });

  describe('Validation Result', () => {
    it('should return valid: true when no errors', () => {
      const result = parse(`:: Start
![image](valid.png)`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      expect(validation.valid).toBe(true);
    });

    it('should return valid: false with invalid assets', () => {
      const result = parse(`:: Start
![alt]()`);
      expect(result.ast).not.toBeNull();

      const validation = validateAssets(result.ast!);
      expect(validation.valid).toBe(false);
    });
  });
});
