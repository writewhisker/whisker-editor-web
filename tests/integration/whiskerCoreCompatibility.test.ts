/**
 * Whisker Core Compatibility Integration Tests
 *
 * These tests validate compatibility between whisker-editor-web and whisker-core:
 * - Format compatibility (v2.0 and v2.1)
 * - Round-trip serialization (no data loss)
 * - Script execution compatibility
 * - Import/export round-trips
 *
 * Gap #6: Testing & Validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Story } from '$lib/models/Story';
import { Passage } from '$lib/models/Passage';
import { Choice } from '$lib/models/Choice';
import { Variable } from '$lib/models/Variable';
import { LuaFunction } from '$lib/models/LuaFunction';
import type { WhiskerCoreFormat, WhiskerFormatV21, PassageData } from '$lib/models/types';
import { LuaEngine } from '$lib/scripting/LuaEngine';
import { fromWhiskerCoreFormat } from '$lib/utils/whiskerCoreAdapter';

describe('Whisker Core Compatibility', () => {
  describe('Format Compatibility', () => {
    describe('Whisker v2.0 Format', () => {
      it('should produce valid v2.0 format', () => {
        const story = new Story({
          title: 'Test Story',
          author: 'Test Author',
          startPassage: 'start',
        });

        const passage = new Passage({
          id: 'start',
          name: 'Start Passage',
          content: 'This is the start.',
        });
        story.addPassage(passage);

        story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));

        const exported = story.serializeWhiskerCore();

        // Validate v2.0 structure
        expect(exported.format).toBe('whisker');
        expect(exported.formatVersion).toBe('2.0');
        expect(exported.metadata).toHaveProperty('title', 'Test Story');
        expect(exported.metadata).toHaveProperty('author', 'Test Author');
        expect(exported.metadata).toHaveProperty('ifid'); // Should have IFID
        expect(exported.settings).toHaveProperty('startPassage', 'start');
        expect(exported.passages).toBeInstanceOf(Array);
        expect(exported.passages).toHaveLength(1);
        expect(exported.variables).toHaveProperty('score');
        expect(exported.variables.score).toEqual({ type: 'number', default: 0 });
      });

      it('should use whisker-core field names (name, target_passage)', () => {
        const story = new Story({ title: 'Test', startPassage: 'p1' });
        const passage = new Passage({
          id: 'p1',
          name: 'Passage One',
          content: 'Content',
        });
        passage.addChoice(new Choice({
          text: 'Next',
          target_passage: 'p2',
        }));
        story.addPassage(passage);

        const exported = story.serializeWhiskerCore();
        const exportedPassage = exported.passages[0];

        // Should use 'name' not 'title'
        expect(exportedPassage.name).toBe('Passage One');
        expect(exportedPassage).not.toHaveProperty('title');

        // Should use 'target' (which points to target_passage)
        expect(exportedPassage.choices[0].target).toBe('p2');
      });

      it('should include all whisker-core v2.0 fields', () => {
        const story = new Story({ title: 'Test', startPassage: 'p1' });
        const passage = new Passage({
          id: 'p1',
          name: 'Test Passage',
          content: 'Content',
          position: { x: 100, y: 200 },
          size: { width: 300, height: 150 },
          tags: ['important', 'start'],
          onEnterScript: 'print("entering")',
          onExitScript: 'print("exiting")',
        });
        passage.setMetadata('author', 'John');
        story.addPassage(passage);

        story.stylesheets.push('body { color: red; }');
        story.scripts.push('function test() end');

        const exported = story.serializeWhiskerCore();

        expect(exported.passages[0]).toMatchObject({
          id: 'p1',
          name: 'Test Passage',
          content: 'Content',
          position: { x: 100, y: 200 },
          size: { width: 300, height: 150 },
          tags: ['important', 'start'],
          onEnterScript: 'print("entering")',
          onExitScript: 'print("exiting")',
          metadata: { author: 'John' },
        });

        expect(exported.stylesheets).toEqual(['body { color: red; }']);
        expect(exported.scripts).toEqual(['function test() end']);
      });
    });

    describe('Whisker v2.1 Format', () => {
      it('should produce valid v2.1 format with editorData', () => {
        const story = new Story({ title: 'Test', startPassage: 'p1' });
        story.addPassage(new Passage({ id: 'p1', name: 'Start' }));

        const exported = story.serializeWhiskerV21();

        expect(exported.format).toBe('whisker');
        expect(exported.formatVersion).toBe('2.1');
        expect(exported.editorData).toBeDefined();
        expect(exported.editorData?.tool).toEqual({
          name: 'whisker-editor-web',
          version: expect.any(String),
          url: 'https://github.com/writewhisker/whisker-editor-web',
        });
        expect(exported.editorData?.modified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should include editorData extensions in v2.1', () => {
        const story = new Story({ title: 'Test', startPassage: 'p1' });
        story.addPassage(new Passage({ id: 'p1', name: 'Start' }));

        // Add editor-specific data that should go in editorData
        const helperFunc = new LuaFunction({
          id: 'helper',
          name: 'helper',
          description: 'A helper function',
          params: ['x', 'y'],
          body: 'return x + y',
          tags: [],
        });
        story.luaFunctions.set('helper', helperFunc);

        const exported = story.serializeWhiskerV21();

        expect(exported.editorData?.luaFunctions).toBeDefined();
        expect(exported.editorData?.luaFunctions?.helper).toMatchObject({
          name: 'helper',
          description: 'A helper function',
          params: ['x', 'y'],
          body: 'return x + y',
        });
      });
    });
  });

  describe('Round-Trip Serialization', () => {
    it('should preserve all data in v2.0 round-trip', () => {
      const original = new Story({
        title: 'Round Trip Test',
        author: 'Test Author',
        startPassage: 'start',
      });

      const passage1 = new Passage({
        id: 'start',
        name: 'Start',
        content: 'Beginning of the story.',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 150 },
        tags: ['start'],
      });
      passage1.addChoice(new Choice({
        text: 'Continue',
        target_passage: 'middle',
        condition: 'score > 0',
      }));
      original.addPassage(passage1);

      const passage2 = new Passage({
        id: 'middle',
        name: 'Middle',
        content: 'Middle of the story.',
        position: { x: 300, y: 0 },
      });
      original.addPassage(passage2);

      original.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));
      original.addVariable(new Variable({ name: 'name', type: 'string', initial: '' }));

      // Export to v2.0
      const exported = original.serializeWhiskerCore();

      // Import back
      const imported = Story.deserialize(fromWhiskerCoreFormat(exported));

      // Validate no data loss
      expect(imported.metadata.title).toBe('Round Trip Test');
      expect(imported.metadata.author).toBe('Test Author');
      expect(imported.startPassage).toBe('start');
      expect(imported.passages.size).toBe(2);

      const importedStart = imported.passages.get('start')!;
      expect(importedStart.name).toBe('Start');
      expect(importedStart.content).toBe('Beginning of the story.');
      expect(importedStart.position).toEqual({ x: 0, y: 0 });
      expect(importedStart.size).toEqual({ width: 200, height: 150 });
      expect(importedStart.tags).toEqual(['start']);
      expect(importedStart.choices).toHaveLength(1);
      expect(importedStart.choices[0].text).toBe('Continue');
      expect(importedStart.choices[0].target_passage).toBe('middle');
      expect(importedStart.choices[0].condition).toBe('score > 0');

      expect(imported.variables.size).toBe(2);
      const scoreVar = imported.variables.get('score')!;
      expect(scoreVar.type).toBe('number');
      expect(scoreVar.initial).toBe(0);
    });

    it('should preserve metadata in round-trip', () => {
      const original = new Story({ title: 'Test', startPassage: 'p1' });
      const passage = new Passage({ id: 'p1', name: 'Test' });
      passage.setMetadata('custom', 'value');
      passage.setMetadata('count', 42);
      original.addPassage(passage);

      const choice = new Choice({ text: 'Go', target_passage: 'p2' });
      choice.setMetadata('choiceMeta', 'data');
      passage.addChoice(choice);

      const exported = original.serializeWhiskerCore();
      const imported = Story.deserialize(fromWhiskerCoreFormat(exported));

      const importedPassage = imported.passages.get('p1')!;
      expect(importedPassage.getMetadata('custom')).toBe('value');
      expect(importedPassage.getMetadata('count')).toBe(42);

      expect(importedPassage.choices[0].getMetadata('choiceMeta')).toBe('data');
    });

    it('should preserve scripts and stylesheets', () => {
      const original = new Story({ title: 'Test', startPassage: 'p1' });
      original.addPassage(new Passage({ id: 'p1', name: 'Test' }));

      original.stylesheets.push('body { background: #000; }');
      original.stylesheets.push('.passage { color: #fff; }');
      original.scripts.push('function init() score = 0 end');
      original.scripts.push('function update() score = score + 1 end');

      const exported = original.serializeWhiskerCore();
      const imported = Story.deserialize(fromWhiskerCoreFormat(exported));

      expect(imported.stylesheets).toEqual([
        'body { background: #000; }',
        '.passage { color: #fff; }',
      ]);
      expect(imported.scripts).toEqual([
        'function init() score = 0 end',
        'function update() score = score + 1 end',
      ]);
    });

    it('should handle v2.1 round-trip with editorData', () => {
      const original = new Story({ title: 'Test', startPassage: 'p1' });
      original.addPassage(new Passage({ id: 'p1', name: 'Test' }));

      const testFunc = new LuaFunction({
        id: 'test',
        name: 'test',
        description: 'Test function',
        params: ['x'],
        body: 'return x * 2',
        tags: ['utility'],
      });
      original.luaFunctions.set('test', testFunc);

      const exported = original.serializeWhiskerV21();
      const imported = Story.deserialize(fromWhiskerCoreFormat(exported));

      // editorData should be preserved
      expect(imported.luaFunctions.size).toBe(1);
      const func = imported.luaFunctions.get('test')!;
      expect(func.name).toBe('test');
      expect(func.params).toEqual(['x']);
      expect(func.body).toBe('return x * 2');
    });
  });

  describe('Script Execution Compatibility', () => {
    let engine: LuaEngine;

    beforeEach(() => {
      engine = new LuaEngine();
    });

    it('should execute whisker-core compatible scripts', () => {
      // Test scripts that should work in both editor and core
      const scripts = [
        'score = 10',
        'name = "Alice"',
        'if score > 5 then result = "high" else result = "low" end',
        'for i = 1, 3 do sum = (sum or 0) + i end',
        'function double(x) return x * 2 end\nvalue = double(5)',
        't = {a = 1, b = 2}\nfor k, v in pairs(t) do count = (count or 0) + 1 end',
      ];

      scripts.forEach((script) => {
        const result = engine.execute(script);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle passage onEnter/onExit scripts', () => {
      const onEnterScript = `
        visited = (visited or 0) + 1
        print("Entering passage, visit " .. visited)
      `;

      const onExitScript = `
        print("Leaving passage")
      `;

      const result1 = engine.execute(onEnterScript);
      expect(result1.success).toBe(true);
      expect(result1.output).toContain('Entering passage, visit 1');

      const result2 = engine.execute(onExitScript);
      expect(result2.success).toBe(true);
      expect(result2.output).toContain('Leaving passage');
    });

    it('should handle choice conditions', () => {
      engine.execute('score = 10');

      const conditions = [
        { script: 'score > 5', expected: true },
        { script: 'score >= 10', expected: true },
        { script: 'score == 10', expected: true },
        { script: 'score < 5', expected: false },
      ];

      conditions.forEach(({ script, expected }) => {
        const result = engine.evaluate(script);
        expect(result.type).toBe('boolean');
        expect(result.value).toBe(expected);
      });
    });

    it('should handle complex table operations', () => {
      const script = `
        inventory = {}
        inventory["sword"] = 1
        inventory["potion"] = 3

        total = 0
        for item, count in pairs(inventory) do
          total = total + count
        end
      `;

      const result = engine.execute(script);
      expect(result.success).toBe(true);

      const total = engine.getVariable('total');
      expect(total).toBe(4);
    });

    it('should handle math functions', () => {
      const script = `
        x = math.max(1, 5, 3)
        y = math.min(1, 5, 3)
        z = math.sqrt(16)
        w = math.pow(2, 3)
      `;

      const result = engine.execute(script);
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(5);
      expect(engine.getVariable('y')).toBe(1);
      expect(engine.getVariable('z')).toBe(4);
      expect(engine.getVariable('w')).toBe(8);
    });

    it('should handle string functions', () => {
      const script = `
        s = "Hello World"
        upper = string.upper(s)
        lower = string.lower(s)
        len = string.len(s)
        sub = string.sub(s, 1, 5)
      `;

      const result = engine.execute(script);
      expect(result.success).toBe(true);
      expect(engine.getVariable('upper')).toBe('HELLO WORLD');
      expect(engine.getVariable('lower')).toBe('hello world');
      expect(engine.getVariable('len')).toBe(11);
      expect(engine.getVariable('sub')).toBe('Hello');
    });
  });

  describe('Import/Export Round-Trips', () => {
    it('should handle JSON export → import round-trip', () => {
      const original = new Story({ title: 'Export Test', startPassage: 'p1' });
      original.addPassage(new Passage({
        id: 'p1',
        name: 'Test Passage',
        content: 'Content here.',
      }));
      original.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));

      // Export to JSON
      const json = JSON.stringify(original.toWhiskerCoreFormat(), null, 2);

      // Import from JSON
      const imported = fromWhiskerCoreFormat(JSON.parse(json));

      expect(imported.metadata.title).toBe('Export Test');
      expect(imported.passages.size).toBe(1);
      expect(imported.variables.size).toBe(1);
    });

    it('should handle Markdown export → text consistency', () => {
      // This tests that exported markdown preserves content
      const story = new Story({ title: 'MD Test', startPassage: 'p1' });
      const passage = new Passage({
        id: 'p1',
        name: 'Test',
        content: 'This is **bold** and *italic* text.',
      });
      story.addPassage(passage);

      // The content should be preserved exactly
      const exported = story.serializeWhiskerCore();
      const importedPassage = exported.passages[0];
      expect(importedPassage.content).toBe('This is **bold** and *italic* text.');
    });
  });

  describe('Format Validation', () => {
    it('should reject invalid format version', () => {
      const invalid: any = {
        format: 'whisker',
        formatVersion: '99.0', // Invalid
        metadata: { title: 'Test', author: 'Test' },
        settings: { startPassage: 'p1' },
        passages: [],
        variables: {},
      };

      expect(() => fromWhiskerCoreFormat(invalid)).toThrow();
    });

    it('should reject missing required fields', () => {
      const invalid: any = {
        format: 'whisker',
        formatVersion: '2.0',
        // Missing metadata
        settings: { startPassage: 'p1' },
        passages: [],
        variables: {},
      };

      expect(() => fromWhiskerCoreFormat(invalid)).toThrow();
    });

    it('should validate passage structure', () => {
      const story: WhiskerCoreFormat = {
        format: 'whisker',
        formatVersion: '2.0',
        metadata: {
          title: 'Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          ifid: '12345678-1234-1234-1234-123456789012',
        },
        settings: { startPassage: 'p1' },
        passages: [
          {
            id: 'p1',
            name: 'Test',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          } as PassageData,
        ],
        variables: {},
      };

      expect(() => fromWhiskerCoreFormat(story)).not.toThrow();
    });

    it('should handle backward compatibility (title field)', () => {
      // Some old stories might still have 'title' instead of 'name'
      const legacyStory: any = {
        format: 'whisker',
        formatVersion: '2.0',
        metadata: {
          title: 'Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        settings: { startPassage: 'p1' },
        passages: [
          {
            id: 'p1',
            title: 'Old Title Field', // Legacy field
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          },
        ],
        variables: {},
      };

      const imported = Story.deserialize(fromWhiskerCoreFormat(legacyStory));
      const passage = imported.passages.get('p1')!;

      // Should convert title → name
      expect(passage.name).toBe('Old Title Field');
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should produce deterministic output for same input', () => {
      const story = new Story({ title: 'Deterministic', startPassage: 'p1' });
      story.addPassage(new Passage({ id: 'p1', name: 'Test', content: 'Content' }));

      const export1 = story.serializeWhiskerCore();
      const export2 = story.serializeWhiskerCore();

      // Timestamps might differ, but structure should be same
      expect(export1.format).toBe(export2.format);
      expect(export1.formatVersion).toBe(export2.formatVersion);
      expect(export1.passages).toEqual(export2.passages);
      expect(export1.variables).toEqual(export2.variables);
    });

    it('should handle different line endings', () => {
      const contentUnix = 'Line 1\nLine 2\nLine 3';
      const contentWindows = 'Line 1\r\nLine 2\r\nLine 3';

      const story1 = new Story({ title: 'Test', startPassage: 'p1' });
      story1.addPassage(new Passage({ id: 'p1', name: 'Test', content: contentUnix }));

      const story2 = new Story({ title: 'Test', startPassage: 'p1' });
      story2.addPassage(new Passage({ id: 'p1', name: 'Test', content: contentWindows }));

      // Both should export successfully
      expect(() => story1.toWhiskerCoreFormat()).not.toThrow();
      expect(() => story2.toWhiskerCoreFormat()).not.toThrow();
    });
  });
});
