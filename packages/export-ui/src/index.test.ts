import { describe, it, expect } from 'vitest';
import * as ExportUIModule from './index';

describe('@writewhisker/export-ui', () => {
  describe('module exports', () => {
    it('should export ExportDialog component', () => {
      expect(ExportUIModule.ExportDialog).toBeDefined();
    });

    it('should export FormatSelector component', () => {
      expect(ExportUIModule.FormatSelector).toBeDefined();
    });

    it('should export DownloadButton component', () => {
      expect(ExportUIModule.DownloadButton).toBeDefined();
    });

    it('should export all expected components', () => {
      const exports = Object.keys(ExportUIModule);
      expect(exports).toContain('ExportDialog');
      expect(exports).toContain('FormatSelector');
      expect(exports).toContain('DownloadButton');
    });

    it('should have exactly 3 exports', () => {
      const exports = Object.keys(ExportUIModule);
      expect(exports.length).toBe(3);
    });
  });

  describe('component availability', () => {
    it('should make ExportDialog importable', () => {
      const { ExportDialog } = ExportUIModule;
      expect(ExportDialog).not.toBeUndefined();
      expect(typeof ExportDialog).toBe('function');
    });

    it('should make FormatSelector importable', () => {
      const { FormatSelector } = ExportUIModule;
      expect(FormatSelector).not.toBeUndefined();
      expect(typeof FormatSelector).toBe('function');
    });

    it('should make DownloadButton importable', () => {
      const { DownloadButton } = ExportUIModule;
      expect(DownloadButton).not.toBeUndefined();
      expect(typeof DownloadButton).toBe('function');
    });
  });
});
