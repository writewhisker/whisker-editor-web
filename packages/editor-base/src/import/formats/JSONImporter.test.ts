import { describe, it, expect, beforeEach } from 'vitest';
import { JSONImporter } from './JSONImporter';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import type { ImportContext } from '../types';

describe('JSONImporter', () => {
  let importer: JSONImporter;
  let testStory: Story;
  let exportedJSON: string;

  beforeEach(() => {
    importer = new JSONImporter();

    // Create a test story
    testStory = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    const passage1 = new Passage({ title: 'Start' });
    passage1.content = 'Welcome!';

    const passage2 = new Passage({ title: 'Second' });
    passage2.content = 'Second passage.';

    passage1.addChoice(new Choice({
      text: 'Continue',
      target: passage2.id,
    }));

    testStory.addPassage(passage1);
    testStory.addPassage(passage2);
    testStory.startPassage = passage1.id;

    // Create exported JSON (simulating JSONExporter output)
    exportedJSON = JSON.stringify({
      metadata: {
        exportDate: new Date().toISOString(),
        editorVersion: '1.0.0',
        formatVersion: '1.0.0',
        storyTitle: testStory.metadata.title,
        validationStatus: 'valid',
      },
      story: testStory.serialize(),
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(importer.name).toBe('JSON Importer');
      expect(importer.format).toBe('json');
      expect(importer.extensions).toEqual(['.json']);
    });
  });

  describe('import', () => {
    it('should import story from JSON string', async () => {
      const context: ImportContext = {
        data: exportedJSON,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.metadata.title).toBe('Test Story');
      expect(result.passageCount).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should import story from JSON object', async () => {
      const context: ImportContext = {
        data: JSON.parse(exportedJSON),
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.metadata.title).toBe('Test Story');
    });

    it('should import story with passages', async () => {
      const context: ImportContext = {
        data: exportedJSON,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      // Story creates default passage if empty, so we have more than we added
      expect(result.passageCount).toBeGreaterThanOrEqual(2);
    });

    it('should preserve passage content', async () => {
      const context: ImportContext = {
        data: exportedJSON,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      const passages = Array.from(result.story!.passages.values());
      // Find our test Start passage by content (not the default one)
      const startPassage = passages.find(p => (p as any).content === 'Welcome!');
      expect(startPassage).toBeDefined();
      expect((startPassage as any)?.content).toBe('Welcome!');
    });

    it('should preserve choices and connections', async () => {
      const context: ImportContext = {
        data: exportedJSON,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      const passages = Array.from(result.story!.passages.values());
      // Find our test Start passage with choices (not the default one)
      const startPassage = passages.find(p => (p as any).choices?.length > 0);
      expect(startPassage).toBeDefined();
      expect((startPassage as any)?.choices.length).toBeGreaterThan(0);
      expect((startPassage as any)?.choices[0].text).toBe('Continue');
    });

    it('should import direct story data format', async () => {
      const directData = testStory.serialize();

      const context: ImportContext = {
        data: JSON.stringify(directData),
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.metadata.title).toBe('Test Story');
    });

    it('should warn about validation errors in metadata', async () => {
      const dataWithErrors = JSON.parse(exportedJSON);
      dataWithErrors.metadata.validationStatus = 'errors';

      const context: ImportContext = {
        data: dataWithErrors,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Imported story had validation errors');
    });

    it('should warn about validation warnings in metadata', async () => {
      const dataWithWarnings = JSON.parse(exportedJSON);
      dataWithWarnings.metadata.validationStatus = 'warnings';

      const context: ImportContext = {
        data: dataWithWarnings,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Imported story had validation warnings');
    });

    it('should handle invalid JSON', async () => {
      const context: ImportContext = {
        data: 'invalid json {',
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing story data', async () => {
      const context: ImportContext = {
        data: '{"other": "data"}',
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });

    it('should include passage and variable counts', async () => {
      const context: ImportContext = {
        data: exportedJSON,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.passageCount).toBeGreaterThan(0);
      expect(result.variableCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('canImport', () => {
    it('should detect valid JSONExporter format', () => {
      const canImport = importer.canImport(exportedJSON);
      expect(canImport).toBe(true);
    });

    it('should detect valid direct story format', () => {
      const directData = testStory.serialize();
      const canImport = importer.canImport(JSON.stringify(directData));
      expect(canImport).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const canImport = importer.canImport('invalid json');
      expect(canImport).toBe(false);
    });

    it('should reject JSON without story data', () => {
      const canImport = importer.canImport('{"other": "data"}');
      expect(canImport).toBe(false);
    });

    it('should work with object data', () => {
      const canImport = importer.canImport(JSON.parse(exportedJSON));
      expect(canImport).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct JSON', () => {
      const errors = importer.validate(exportedJSON);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing metadata', () => {
      const data = { story: { passages: {} } };
      const errors = importer.validate(data);
      expect(errors).toContain('Missing story metadata');
    });

    it('should detect missing passages', () => {
      const data = { story: { metadata: {} } };
      const errors = importer.validate(data);
      expect(errors).toContain('Missing story passages');
    });

    it('should detect invalid passages format', () => {
      const data = { story: { metadata: {}, passages: 'invalid' } };
      const errors = importer.validate(data);
      expect(errors).toContain('Invalid passages format');
    });

    it('should detect invalid variables format', () => {
      const data = { story: { metadata: {}, passages: {}, variables: 'invalid' } };
      const errors = importer.validate(data);
      expect(errors).toContain('Invalid variables format');
    });

    it('should detect invalid JSON', () => {
      const errors = importer.validate('invalid json {');
      expect(errors).toContain('Invalid JSON format');
    });
  });

  describe('getFormatVersion', () => {
    it('should extract format version from metadata', () => {
      const version = importer.getFormatVersion(exportedJSON);
      expect(version).toBe('1.0.0');
    });

    it('should return default version for direct format', () => {
      const directData = testStory.serialize();
      const version = importer.getFormatVersion(JSON.stringify(directData));
      expect(version).toBe('1.0.0');
    });

    it('should return unknown for invalid data', () => {
      const version = importer.getFormatVersion('invalid');
      expect(version).toBe('unknown');
    });
  });
});
