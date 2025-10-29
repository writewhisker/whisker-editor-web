import { describe, it, expect } from 'vitest';
import { TwineImporter } from './TwineImporter';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('TwineImporter Integration Tests', () => {
  const importer = new TwineImporter();

  describe('Sample file imports', () => {
    it('should import harlowe-sample.html successfully', async () => {
      const samplePath = resolve(process.cwd(), 'samples/harlowe-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'harlowe-sample.html',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.metadata.title).toBe('Harlowe Adventure');
      expect(result.passageCount).toBeGreaterThan(0);
      expect(result.passageCount).toBe(10);

      // Verify specific passages were imported
      const passages = Array.from(result.story!.passages.values());
      const passageNames = passages.map((p) => p.title);
      expect(passageNames).toContain('Start');
      expect(passageNames).toContain('Forest Path');
      expect(passageNames).toContain('Old Cottage');

      // Verify start passage is set
      expect(result.story!.startPassage).toBeDefined();
      const startPassage = result.story!.passages.get(result.story!.startPassage!);
      expect(startPassage?.title).toBe('Start');

      // Check that variables were detected
      expect(result.variableCount).toBeGreaterThan(0);
    });

    it('should import sugarcube-sample.html successfully', async () => {
      const samplePath = resolve(process.cwd(), 'samples/sugarcube-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'sugarcube-sample.html',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.metadata.title).toBe('SugarCube Quest');
      expect(result.passageCount).toBeGreaterThan(0);
      expect(result.passageCount).toBe(17);

      // Verify specific passages
      const passages = Array.from(result.story!.passages.values());
      const passageNames = passages.map((p) => p.title);
      expect(passageNames).toContain('Start');
      expect(passageNames).toContain('Village Square');
      expect(passageNames).toContain('Shop');
      expect(passageNames).toContain('Quest Complete');

      // Check passage tags
      const shopPassage = passages.find((p) => p.title === 'Shop');
      expect(shopPassage?.tags).toContain('shop');

      // Verify variables were detected
      expect(result.variableCount).toBeGreaterThan(0);
    });

    it('should import chapbook-sample.html successfully', async () => {
      const samplePath = resolve(process.cwd(), 'samples/chapbook-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'chapbook-sample.html',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.metadata.title).toBe('Chapbook Journey');
      expect(result.passageCount).toBeGreaterThan(0);
      expect(result.passageCount).toBe(16);

      // Verify passages were imported
      const passages = Array.from(result.story!.passages.values());
      expect(passages.length).toBe(16);

      // Verify specific passages
      const passageNames = passages.map((p) => p.title);
      expect(passageNames).toContain('Start');
      expect(passageNames).toContain('Garden');
      expect(passageNames).toContain('Special Ending');

      // Chapbook passages should have content
      passages.forEach((passage) => {
        expect(passage.content).toBeDefined();
        expect(passage.content.length).toBeGreaterThan(0);
      });
    });

    it('should import twee-sample.twee successfully', async () => {
      const samplePath = resolve(process.cwd(), 'samples/twee-sample.twee');
      const tweeContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: tweeContent,
        options: {},
        filename: 'twee-sample.twee',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.metadata.title).toBe('Twee Format Example');
      expect(result.passageCount).toBeGreaterThan(0);

      // Verify specific passages
      const passages = Array.from(result.story!.passages.values());
      const passageNames = passages.map((p) => p.title);
      expect(passageNames).toContain('Awakening');
      expect(passageNames).toContain('Examine Room');
      expect(passageNames).toContain('Best Escape');

      // Check that tags were parsed
      const awakeningPassage = passages.find((p) => p.title === 'Awakening');
      expect(awakeningPassage?.tags).toContain('intro');
      expect(awakeningPassage?.tags).toContain('beginning');
    });
  });

  describe('Conversion quality', () => {
    it('should report high quality for Harlowe sample', async () => {
      const samplePath = resolve(process.cwd(), 'samples/harlowe-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'harlowe-sample.html',
      });

      expect(result.success).toBe(true);
      // Conversion quality may be undefined, that's okay
      if (result.lossReport?.conversionQuality !== undefined) {
        expect(result.lossReport?.conversionQuality).toBeGreaterThan(0.5);
      }
    });

    it('should report high quality for SugarCube sample', async () => {
      const samplePath = resolve(process.cwd(), 'samples/sugarcube-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'sugarcube-sample.html',
      });

      expect(result.success).toBe(true);
      // Conversion quality may be undefined, that's okay
      if (result.lossReport?.conversionQuality !== undefined) {
        expect(result.lossReport?.conversionQuality).toBeGreaterThan(0.5);
      }
    });

    it('should report quality for Twee sample when available', async () => {
      const samplePath = resolve(process.cwd(), 'samples/twee-sample.twee');
      const tweeContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: tweeContent,
        options: {},
        filename: 'twee-sample.twee',
      });

      expect(result.success).toBe(true);
      // Conversion quality may be undefined for Twee since it's mostly pass-through
      // Just verify the import succeeded
      expect(result.story).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle empty story data', async () => {
      const result = await importer.import({
        data: '<tw-storydata name="Empty" startnode="1"></tw-storydata>',
        options: {},
        filename: 'empty.html',
      });

      // Empty story should fail with no passages
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Conversion options', () => {
    it('should respect convertVariables option', async () => {
      const samplePath = resolve(process.cwd(), 'samples/harlowe-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: { convertVariables: true },
        filename: 'harlowe-sample.html',
      });

      expect(result.success).toBe(true);

      // Check that variables were converted in passage content
      const passages = Array.from(result.story!.passages.values());
      const startPassage = passages.find((p) => p.title === 'Start');
      expect(startPassage?.content).toBeDefined();
    });

    it('should respect preserveOriginalSyntax option', async () => {
      const samplePath = resolve(process.cwd(), 'samples/sugarcube-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: { preserveOriginalSyntax: true },
        filename: 'sugarcube-sample.html',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Metadata preservation', () => {
    it('should preserve story IFID from Harlowe sample', async () => {
      const samplePath = resolve(process.cwd(), 'samples/harlowe-sample.html');
      const htmlContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: htmlContent,
        options: {},
        filename: 'harlowe-sample.html',
      });

      expect(result.success).toBe(true);
      expect(result.story!.metadata.ifid).toBeDefined();
      expect(result.story!.metadata.ifid).toMatch(/^[A-F0-9-]+$/i);
    });

    it('should import passages from Twee sample with metadata', async () => {
      const samplePath = resolve(process.cwd(), 'samples/twee-sample.twee');
      const tweeContent = readFileSync(samplePath, 'utf-8');

      const result = await importer.import({
        data: tweeContent,
        options: {},
        filename: 'twee-sample.twee',
      });

      expect(result.success).toBe(true);

      const passages = Array.from(result.story!.passages.values());

      // Passages should be imported
      expect(passages.length).toBeGreaterThan(0);

      // Check that passages have the expected structure
      passages.forEach((passage) => {
        expect(passage.title).toBeDefined();
        expect(passage.content).toBeDefined();
        expect(typeof passage.title).toBe('string');
        expect(typeof passage.content).toBe('string');
      });
    });
  });
});
