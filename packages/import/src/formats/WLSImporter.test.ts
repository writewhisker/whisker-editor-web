import { describe, it, expect, beforeEach } from 'vitest';
import { WLSImporter } from './WLSImporter';
import type { ImportContext } from '../types';

describe('WLSImporter', () => {
  let importer: WLSImporter;

  beforeEach(() => {
    importer = new WLSImporter();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(importer.name).toBe('WLS Importer');
      expect(importer.format).toBe('wls');
      expect(importer.extensions).toContain('.ws');
      expect(importer.extensions).toContain('.wls');
    });
  });

  describe('canImport', () => {
    it('should detect WLS file with @title directive', () => {
      const wls = '@title: My Story\n\n:: Start\nHello';
      expect(importer.canImport(wls)).toBe(true);
    });

    it('should detect WLS file with @author directive', () => {
      const wls = '@author: John Doe\n\n:: Start\nHello';
      expect(importer.canImport(wls)).toBe(true);
    });

    it('should detect WLS file with passage header', () => {
      const wls = ':: Start\nHello';
      expect(importer.canImport(wls)).toBe(true);
    });

    it('should detect WLS file with @vars block', () => {
      const wls = '@vars\n  gold = 100\n@/vars\n\n:: Start\nHello';
      expect(importer.canImport(wls)).toBe(true);
    });

    it('should not detect JSON as WLS', () => {
      const json = '{"metadata": {"title": "Test"}, "passages": {}}';
      expect(importer.canImport(json)).toBe(false);
    });

    it('should not detect HTML as WLS', () => {
      const html = '<html><body>Test</body></html>';
      expect(importer.canImport(html)).toBe(false);
    });

    it('should not detect object data as WLS', () => {
      expect(importer.canImport({ test: 'data' })).toBe(false);
    });
  });

  describe('import', () => {
    it('should import simple WLS story', async () => {
      const wls = `@title: SimpleStory
@author: TestAuthor

:: Start
Welcome to the story

:: Next
The end`;

      const context: ImportContext = {
        data: wls,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.metadata.title).toBe('SimpleStory');
      expect(result.story?.metadata.author).toBe('TestAuthor');
      expect(result.passageCount).toBe(2);
    });

    it('should import WLS with choices', async () => {
      const wls = `:: Start
Choose your path

+ [Go left] -> Left
+ [Go right] -> Right`;

      const context: ImportContext = {
        data: wls,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      const passages = Array.from(result.story!.passages.values());
      const startPassage = passages.find(p => p.title === 'Start');
      expect(startPassage).toBeDefined();
      expect(startPassage?.choices.length).toBe(2);
    });

    it('should set start passage from @start directive', async () => {
      const wls = `@title: TestStory
@start: Introduction

:: Introduction
Welcome

:: Other
Other passage`;

      const context: ImportContext = {
        data: wls,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story?.startPassage).toBeDefined();

      const startPassage = result.story?.getPassage(result.story.startPassage!);
      expect(startPassage?.title).toBe('Introduction');
    });

    it('should default to first passage as start', async () => {
      const wls = `:: First
First passage`;

      const context: ImportContext = {
        data: wls,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.success).toBe(true);
      expect(result.story?.startPassage).toBeDefined();

      const startPassage = result.story?.getPassage(result.story.startPassage!);
      expect(startPassage?.title).toBe('First');
    });

    it('should include duration in result', async () => {
      const wls = `:: Start\nHello`;

      const context: ImportContext = {
        data: wls,
        options: {},
      };

      const result = await importer.import(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validate', () => {
    it('should validate correct WLS content', () => {
      const wls = `@title: Test\n\n:: Start\nHello`;
      const errors = importer.validate(wls);
      expect(errors).toHaveLength(0);
    });

    it('should detect WLS without passages', () => {
      const wls = `@title: Test\n@author: Author`;
      const errors = importer.validate(wls);
      expect(errors.some(e => e.includes('No passages'))).toBe(true);
    });

    it('should reject non-string data', () => {
      const errors = importer.validate({ test: 'data' });
      expect(errors.some(e => e.includes('requires string'))).toBe(true);
    });
  });

  describe('getFormatVersion', () => {
    it('should extract version from @version directive', () => {
      const wls = `@title: Test\n@version: 2.0\n\n:: Start\nHello`;
      const version = importer.getFormatVersion(wls);
      expect(version).toBe('2.0');
    });

    it('should return default version if not specified', () => {
      const wls = `@title: Test\n\n:: Start\nHello`;
      const version = importer.getFormatVersion(wls);
      expect(version).toBe('1.0');
    });

    it('should return unknown for non-string data', () => {
      const version = importer.getFormatVersion({ test: 'data' });
      expect(version).toBe('unknown');
    });
  });
});
