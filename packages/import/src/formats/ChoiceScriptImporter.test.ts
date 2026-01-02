/**
 * ChoiceScript Importer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChoiceScriptImporter } from './ChoiceScriptImporter';
import type { ImportContext, ImportOptions } from '../types';

describe('ChoiceScriptImporter', () => {
  let importer: ChoiceScriptImporter;

  beforeEach(() => {
    importer = new ChoiceScriptImporter();
  });

  describe('metadata', () => {
    it('should have correct name and format', () => {
      expect(importer.name).toBe('ChoiceScript Importer');
      expect(importer.format).toBe('choicescript');
      expect(importer.extensions).toEqual(['.txt']);
    });
  });

  describe('canImport', () => {
    it('should detect ChoiceScript content with labels', () => {
      const cs = `
*label start
Hello world!
*goto end

*label end
The End.
`;
      expect(importer.canImport(cs)).toBe(true);
    });

    it('should detect ChoiceScript content with choices', () => {
      const cs = `
*choice
  #Go north
    *goto north
  #Go south
    *goto south
`;
      expect(importer.canImport(cs)).toBe(true);
    });

    it('should detect ChoiceScript content with variables', () => {
      const cs = `
*create strength 50
*create name "Player"
*set strength + 10
`;
      expect(importer.canImport(cs)).toBe(true);
    });

    it('should detect title and author', () => {
      const cs = `
*title My Game
*author Jane Doe
*label start
Welcome!
`;
      expect(importer.canImport(cs)).toBe(true);
    });

    it('should not detect non-ChoiceScript content', () => {
      const html = '<html><body>Hello</body></html>';
      expect(importer.canImport(html)).toBe(false);
    });

    it('should not detect JSON content', () => {
      const json = '{"story": {}}';
      expect(importer.canImport(json)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass valid ChoiceScript content', () => {
      const cs = `
*label start
Hello!
*finish
`;
      const errors = importer.validate(cs);
      expect(errors).toHaveLength(0);
    });

    it('should fail on empty content', () => {
      const errors = importer.validate('');
      expect(errors).toContain('Empty ChoiceScript content');
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

    it('should import basic label', async () => {
      const cs = `
*label start
Hello, world!
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.passages.has('start')).toBe(true);
    });

    it('should import multiple labels', async () => {
      const cs = `
*label start
Beginning.
*goto middle

*label middle
Middle part.
*goto ending

*label ending
The end.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.passageCount).toBe(3);
      expect(result.story!.passages.has('start')).toBe(true);
      expect(result.story!.passages.has('middle')).toBe(true);
      expect(result.story!.passages.has('ending')).toBe(true);
    });

    it('should import variables', async () => {
      const cs = `
*create score 0
*create name "Player"
*create hasKey false

*label start
Hello {name}!
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.variableCount).toBe(3);
      expect(result.story!.variables.has('score')).toBe(true);
      expect(result.story!.variables.has('name')).toBe(true);
      expect(result.story!.variables.has('hasKey')).toBe(true);
    });

    it('should import temp variables', async () => {
      const cs = `
*temp counter 5

*label start
Count: {counter}
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.story!.variables.has('counter')).toBe(true);
    });

    it('should convert *set commands', async () => {
      const cs = `
*label start
*set score 10
*set score + 5
You have \${score} points.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('{do score = 10}');
      expect(passage!.content).toContain('{do score = score + 5}');
    });

    it('should import title and author', async () => {
      const cs = `
*title Adventure Game
*author John Smith

*label start
Welcome!
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.story!.metadata.title).toBe('Adventure Game');
      expect(result.story!.metadata.author).toBe('John Smith');
    });

    it('should convert *finish to END link', async () => {
      const cs = `
*label start
The story is over.
*finish
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('-> END');
    });

    it('should convert *ending with message', async () => {
      const cs = `
*label start
You win!
*ending Victory!
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('Victory!');
      expect(passage!.content).toContain('-> END');
    });

    it('should convert *page_break', async () => {
      const cs = `
*label start
Part one.
*page_break
Part two.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('---');
    });

    it('should convert *goto to link', async () => {
      const cs = `
*label start
Hello.
*goto next

*label next
World.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('-> next');
    });

    it('should convert *rand to random()', async () => {
      const cs = `
*label start
*rand dice 1 6
You rolled \${dice}.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      const passage = result.story!.passages.get('start');
      expect(passage!.content).toContain('random(1, 6)');
    });

    it('should report issues for fairmath operators', async () => {
      const cs = `
*label start
*set morale %+ 10
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.warnings.some(w =>
        w.message.includes('Fairmath')
      )).toBe(true);
    });

    it('should report issues for *goto_scene', async () => {
      const cs = `
*label start
*goto_scene chapter2
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.warnings.some(w =>
        w.message.includes('scene')
      )).toBe(true);
    });

    it('should set start passage correctly', async () => {
      const cs = `
*label startup
This is the beginning.
*goto main

*label main
Main content.
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      // "startup" should be recognized as start passage
      expect(result.story!.startPassage).toBe('startup');
    });

    it('should handle content without labels', async () => {
      const cs = `
Hello world!
This is a simple story.
*finish
`;
      const result = await importer.import(createContext(cs));

      expect(result.success).toBe(true);
      // Should create implicit "start" label
      expect(result.story!.passages.has('start')).toBe(true);
    });
  });

  describe('loss report', () => {
    const createContext = (data: string): ImportContext => ({
      data,
      options: {},
    });

    it('should calculate conversion quality', async () => {
      const cs = `
*label start
Simple story.
`;
      const result = await importer.import(createContext(cs));

      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.conversionQuality).toBeGreaterThan(0);
      expect(result.lossReport!.conversionQuality).toBeLessThanOrEqual(1);
    });

    it('should track affected passages', async () => {
      const cs = `
*label start
*goto_scene other_scene

*label next
Content.
`;
      const result = await importer.import(createContext(cs));

      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.affectedPassages).toContain('start');
    });
  });
});
