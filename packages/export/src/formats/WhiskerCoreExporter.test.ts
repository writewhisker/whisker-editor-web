/**
 * Tests for Whisker Core Exporter
 */

import { describe, it, expect } from 'vitest';
import { WhiskerCoreExporter } from './WhiskerCoreExporter';
import { Story } from '@writewhisker/core-ts';
import type { ExportContext, ExportOptions } from '../types';

describe('WhiskerCoreExporter', () => {
  const exporter = new WhiskerCoreExporter();

  const createTestStory = (): Story => {
    const story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-01T00:00:00.000Z',
        ifid: '12345678-1234-4234-8234-123456789012'
      },
      startPassage: 'start',
      passages: {
        start: {
          id: 'start',
          title: 'Start',
          content: 'Welcome to the story!',
          position: { x: 0, y: 0 },
          choices: [
            {
              id: 'choice1',
              text: 'Continue',
              target: 'next'
            }
          ]
        },
        next: {
          id: 'next',
          title: 'Next',
          content: 'Next scene',
          position: { x: 100, y: 100 },
          choices: []
        }
      },
      variables: {
        health: {
          name: 'health',
          type: 'number',
          initial: 100
        }
      }
    });

    return story;
  };

  describe('metadata', () => {
    it('should have correct name and format', () => {
      expect(exporter.name).toBe('Whisker Core Exporter');
      expect(exporter.format).toBe('whisker-core');
      expect(exporter.extension).toBe('.whisker');
      expect(exporter.mimeType).toBe('application/json');
    });
  });

  describe('export', () => {
    it('should export story to whisker-core format', async () => {
      const story = createTestStory();
      const options: ExportOptions = {
        format: 'whisker-core',
        prettyPrint: true
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.whisker/);
      expect(result.mimeType).toBe('application/json');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should export with correct whisker-core structure', async () => {
      const story = createTestStory();
      const options: ExportOptions = {
        format: 'whisker-core',
        prettyPrint: true
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(data.format).toBe('whisker');
      expect(data.formatVersion).toBe('1.0');
      expect(data.metadata.title).toBe('Test Story');
      expect(data.metadata.ifid).toBe('12345678-1234-4234-8234-123456789012');
      expect(data.settings.startPassage).toBe('start');
      expect(data.settings.scriptingLanguage).toBe('lua');
      expect(Array.isArray(data.passages)).toBe(true);
      expect(data.passages).toHaveLength(2);
      expect(data.variables).toEqual({ health: 100 });
    });

    it('should support format version 2.0', async () => {
      const story = createTestStory();
      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '2.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(data.formatVersion).toBe('2.0');
    });

    it('should strip extensions by default', async () => {
      const story = createTestStory();
      // Add editor-specific extensions
      const startPassage = story.passages.get('start')!;
      startPassage.onEnterScript = 'console.log("enter")';
      startPassage.color = '#ff0000';

      const options: ExportOptions = {
        format: 'whisker-core'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      const exportedStart = data.passages.find((p: any) => p.id === 'start');
      expect(exportedStart.onEnterScript).toBeUndefined();
      expect(exportedStart.color).toBeUndefined();
    });

    it('should preserve extensions when stripExtensions is false', async () => {
      const story = createTestStory();
      const startPassage = story.passages.get('start')!;
      startPassage.onEnterScript = 'console.log("enter")';
      startPassage.color = '#ff0000';

      const options: ExportOptions = {
        format: 'whisker-core',
        stripExtensions: false
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      const exportedStart = data.passages.find((p: any) => p.id === 'start');
      expect(exportedStart.onEnterScript).toBe('console.log("enter")');
      expect(exportedStart.color).toBe('#ff0000');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('editor-specific extensions');
    });

    it('should support minified output', async () => {
      const story = createTestStory();
      const optionsPretty: ExportOptions = {
        format: 'whisker-core',
        prettyPrint: true
      };

      const optionsMinified: ExportOptions = {
        format: 'whisker-core',
        prettyPrint: false
      };

      const contextPretty: ExportContext = {
        story,
        options: optionsPretty
      };

      const contextMinified: ExportContext = {
        story,
        options: optionsMinified
      };

      const resultPretty = await exporter.export(contextPretty);
      const resultMinified = await exporter.export(contextMinified);

      expect(resultPretty.size).toBeGreaterThan(resultMinified.size!);
    });

    it('should handle export errors gracefully', async () => {
      const brokenStory = {
        serialize: () => {
          throw new Error('Serialization failed');
        },
        serializeWhiskerCore: () => {
          throw new Error('Serialization failed');
        },
        passages: new Map(),
        metadata: { title: 'Broken' }
      } as any;

      const options: ExportOptions = {
        format: 'whisker-core'
      };

      const context: ExportContext = {
        story: brokenStory,
        options
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateOptions', () => {
    it('should accept valid options', () => {
      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '1.0'
      };

      const errors = exporter.validateOptions(options);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const options: ExportOptions = {
        format: 'json' as any
      };

      const errors = exporter.validateOptions(options);
      expect(errors).toContain('Invalid format for Whisker Core exporter');
    });

    it('should reject invalid version', () => {
      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '3.0' as any
      };

      const errors = exporter.validateOptions(options);
      expect(errors).toContain('whiskerCoreVersion must be "1.0", "2.0", or "2.1"');
    });
  });

  describe('estimateSize', () => {
    it('should estimate export size', () => {
      const story = createTestStory();
      const size = exporter.estimateSize(story);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should provide reasonable estimates', async () => {
      const story = createTestStory();
      const estimatedSize = exporter.estimateSize(story);

      const options: ExportOptions = {
        format: 'whisker-core',
        prettyPrint: false
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);

      // Estimate should be within reasonable range of actual size
      expect(estimatedSize).toBeGreaterThan(0);
      expect(estimatedSize).toBeLessThan(result.size! * 2);
    });
  });

  describe('luaFunctions export', () => {
    it('should export story without luaFunctions (field omitted)', async () => {
      const story = createTestStory();
      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '2.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(result.success).toBe(true);
      expect(data.luaFunctions).toBeUndefined();
    });

    it('should export story with luaFunctions in v2.0 format', async () => {
      const story = createTestStory();

      // Add Lua functions using the Story API
      const func1 = story.addLuaFunction();
      func1.name = 'calculateDamage';
      func1.description = 'Calculate combat damage';
      func1.code = 'function calculateDamage(attacker, defender)\n  return attacker.strength - defender.defense\nend';
      func1.category = 'Combat';
      func1.parameters = 'attacker, defender';
      func1.returnType = 'number';
      func1.tags = ['combat', 'utility'];

      const func2 = story.addLuaFunction();
      func2.name = 'checkInventory';
      func2.description = 'Check if player has item';
      func2.code = 'function checkInventory(item)\n  return inventory[item] ~= nil\nend';
      func2.category = 'Inventory';
      func2.parameters = 'item';
      func2.returnType = 'boolean';

      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '2.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(result.success).toBe(true);
      expect(data.formatVersion).toBe('2.0');
      expect(data.luaFunctions).toBeDefined();
      expect(typeof data.luaFunctions).toBe('object');
      expect(Object.keys(data.luaFunctions)).toHaveLength(2);

      // Verify first function
      const exportedFunc1 = data.luaFunctions[func1.id];
      expect(exportedFunc1).toBeDefined();
      expect(exportedFunc1.name).toBe('calculateDamage');
      expect(exportedFunc1.description).toBe('Calculate combat damage');
      expect(exportedFunc1.code).toContain('calculateDamage');
      expect(exportedFunc1.category).toBe('Combat');
      expect(exportedFunc1.parameters).toBe('attacker, defender');
      expect(exportedFunc1.returnType).toBe('number');
      expect(exportedFunc1.tags).toEqual(['combat', 'utility']);
      expect(exportedFunc1.created).toBeDefined();
      expect(exportedFunc1.modified).toBeDefined();

      // Verify second function
      const exportedFunc2 = data.luaFunctions[func2.id];
      expect(exportedFunc2).toBeDefined();
      expect(exportedFunc2.name).toBe('checkInventory');
      expect(exportedFunc2.description).toBe('Check if player has item');
      expect(exportedFunc2.code).toContain('checkInventory');
      expect(exportedFunc2.category).toBe('Inventory');
    });

    it('should export luaFunctions in v1.0 format for backward compatibility', async () => {
      const story = createTestStory();

      const func = story.addLuaFunction();
      func.name = 'testFunction';
      func.code = 'function testFunction()\n  return true\nend';

      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '1.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(result.success).toBe(true);
      expect(data.formatVersion).toBe('1.0');
      // v1.0 should still include luaFunctions for forward compatibility
      expect(data.luaFunctions).toBeDefined();
      expect(data.luaFunctions[func.id]).toBeDefined();
      expect(data.luaFunctions[func.id].name).toBe('testFunction');
    });

    it('should preserve all luaFunction fields during export', async () => {
      const story = createTestStory();

      const func = story.addLuaFunction();
      const funcData = {
        name: 'complexFunction',
        description: 'A complex test function',
        code: 'function complexFunction(a, b, c)\n  return a + b * c\nend',
        category: 'Math',
        parameters: 'a, b, c',
        returnType: 'number',
        tags: ['math', 'test', 'complex']
      };

      Object.assign(func, funcData);

      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '2.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      const exported = data.luaFunctions[func.id];
      expect(exported.name).toBe(funcData.name);
      expect(exported.description).toBe(funcData.description);
      expect(exported.code).toBe(funcData.code);
      expect(exported.category).toBe(funcData.category);
      expect(exported.parameters).toBe(funcData.parameters);
      expect(exported.returnType).toBe(funcData.returnType);
      expect(exported.tags).toEqual(funcData.tags);
    });

    it('should handle multiple luaFunctions correctly', async () => {
      const story = createTestStory();

      // Add 5 different functions
      const functions = [];
      for (let i = 0; i < 5; i++) {
        const func = story.addLuaFunction();
        func.name = `testFunction${i}`;
        func.description = `Test function ${i}`;
        func.code = `function testFunction${i}()\n  return ${i}\nend`;
        func.category = `Category${i % 2}`;
        functions.push(func);
      }

      const options: ExportOptions = {
        format: 'whisker-core',
        whiskerCoreVersion: '2.0'
      };

      const context: ExportContext = {
        story,
        options
      };

      const result = await exporter.export(context);
      const data = JSON.parse(result.content as string);

      expect(data.luaFunctions).toBeDefined();
      expect(Object.keys(data.luaFunctions)).toHaveLength(5);

      // Verify all functions are present
      functions.forEach((func, i) => {
        const exported = data.luaFunctions[func.id];
        expect(exported).toBeDefined();
        expect(exported.name).toBe(`testFunction${i}`);
        expect(exported.description).toBe(`Test function ${i}`);
      });
    });
  });
});
