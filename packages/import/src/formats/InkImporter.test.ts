/**
 * Ink Importer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InkImporter } from './InkImporter';
import type { ImportContext, ImportOptions } from '../types';

describe('InkImporter', () => {
  let importer: InkImporter;

  beforeEach(() => {
    importer = new InkImporter();
  });

  describe('metadata', () => {
    it('should have correct name and format', () => {
      expect(importer.name).toBe('Ink Importer');
      expect(importer.format).toBe('ink');
      expect(importer.extensions).toEqual(['.ink']);
    });
  });

  describe('canImport', () => {
    it('should detect Ink content with knots', () => {
      const ink = `
=== start ===
Hello world!
-> END
`;
      expect(importer.canImport(ink)).toBe(true);
    });

    it('should detect Ink content with choices', () => {
      const ink = `
* [Option A] -> a
* [Option B] -> b
`;
      expect(importer.canImport(ink)).toBe(true);
    });

    it('should detect Ink content with variables', () => {
      const ink = `
VAR score = 0
VAR name = "Player"
-> start
`;
      expect(importer.canImport(ink)).toBe(true);
    });

    it('should not detect non-Ink content', () => {
      const html = '<html><body>Hello</body></html>';
      expect(importer.canImport(html)).toBe(false);
    });

    it('should not detect JSON content', () => {
      const json = '{"story": {}}';
      expect(importer.canImport(json)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass valid Ink content', () => {
      const ink = `
=== start ===
Hello!
-> END
`;
      const errors = importer.validate(ink);
      expect(errors).toHaveLength(0);
    });

    it('should fail on empty content', () => {
      const errors = importer.validate('');
      expect(errors).toContain('Empty Ink content');
    });

    it('should detect unmatched braces', () => {
      const ink = '{ condition: text';
      const errors = importer.validate(ink);
      expect(errors.some(e => e.includes('Unmatched braces'))).toBe(true);
    });
  });

  describe('import', () => {
    const createContext = (data: string, options: Partial<ImportOptions> = {}): ImportContext => ({
      data,
      options: {
        validateAfterImport: false,
        ...options,
      },
    });

    it('should import basic knot', async () => {
      const ink = `
=== start ===
Hello, world!
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.passages.has('start')).toBe(true);
    });

    it('should import multiple knots', async () => {
      const ink = `
=== start ===
Beginning.
-> middle

=== middle ===
Middle part.
-> ending

=== ending ===
The end.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.passageCount).toBe(3);
      expect(result.story!.passages.has('start')).toBe(true);
      expect(result.story!.passages.has('middle')).toBe(true);
      expect(result.story!.passages.has('ending')).toBe(true);
    });

    it('should import variables', async () => {
      const ink = `
VAR score = 0
VAR name = "Player"
VAR hasKey = false

=== start ===
Hello {name}!
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.variableCount).toBe(3);
      expect(result.story!.variables.has('score')).toBe(true);
      expect(result.story!.variables.has('name')).toBe(true);
      expect(result.story!.variables.has('hasKey')).toBe(true);
    });

    it('should import choices', async () => {
      const ink = `
=== start ===
What do you do?
* [Go north] -> north
* [Go south] -> south
+ [Look around] -> start

=== north ===
You went north.

=== south ===
You went south.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      const startPassage = result.story!.passages.get('start');
      expect(startPassage).toBeDefined();
      expect(startPassage!.choices.length).toBe(3);
    });

    it('should import stitches as sub-passages', async () => {
      const ink = `
=== london ===
You are in London.
-> london.pub

= pub
You enter the pub.

= market
You visit the market.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.story!.passages.has('london')).toBe(true);
      expect(result.story!.passages.has('london.pub')).toBe(true);
      expect(result.story!.passages.has('london.market')).toBe(true);
    });

    it('should convert variable assignments', async () => {
      const ink = `
=== start ===
~ score = 10
~ name = "Hero"
You have {score} points.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('{do score = 10}');
    });

    it('should handle gather points', async () => {
      const ink = `
=== start ===
* [Option A]
  You chose A.
* [Option B]
  You chose B.
- Both paths lead here.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('Both paths lead here');
    });

    it('should report issues for unsupported features', async () => {
      const ink = `
EXTERNAL doSomething()

=== start ===
Hello!
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.warnings.length).toBeGreaterThan(0);
      expect(result.lossReport!.warnings.some(w =>
        w.message.includes('External function')
      )).toBe(true);
    });

    it('should create implicit Start passage for content without knots', async () => {
      const ink = `
Hello world!
This is a simple story.
* [Continue] -> END
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.story!.passages.has('Start')).toBe(true);
    });

    it('should handle tunnel syntax', async () => {
      const ink = `
=== start ===
Before tunnel.
-> subroutine ->
After tunnel.

=== subroutine ===
Inside subroutine.
<-
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.story!.passages.has('start')).toBe(true);
      expect(result.story!.passages.has('subroutine')).toBe(true);

      // Tunnel syntax should be preserved in some form
      const startPassage = result.story!.passages.get('start');
      expect(startPassage).toBeDefined();

      const subPassage = result.story!.passages.get('subroutine');
      expect(subPassage).toBeDefined();
    });

    it('should set correct start passage', async () => {
      const ink = `
=== intro ===
This is the intro.
-> main

=== main ===
This is main.
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      // First knot becomes start passage when no 'Start' exists
      expect(result.story!.startPassage).toBe('intro');
    });

    it('should set metadata on imported story', async () => {
      const ink = `
=== start ===
Hello!
`;
      const result = await importer.import(createContext(ink));

      expect(result.success).toBe(true);
      expect(result.story!.metadata).toBeDefined();
      expect(result.story!.metadata.title).toBeDefined();
    });
  });

  describe('loss report', () => {
    const createContext = (data: string): ImportContext => ({
      data,
      options: {},
    });

    it('should calculate conversion quality', async () => {
      const ink = `
=== start ===
Simple story.
`;
      const result = await importer.import(createContext(ink));

      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.conversionQuality).toBeGreaterThan(0);
      expect(result.lossReport!.conversionQuality).toBeLessThanOrEqual(1);
    });

    it('should track affected passages', async () => {
      const ink = `
EXTERNAL customFunc()

=== start ===
Content.
`;
      const result = await importer.import(createContext(ink));

      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.categoryCounts['external']).toBe(1);
    });
  });
});
