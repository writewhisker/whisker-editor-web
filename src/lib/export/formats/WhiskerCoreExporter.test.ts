/**
 * Tests for Whisker Core Exporter
 */

import { describe, it, expect } from 'vitest';
import { WhiskerCoreExporter } from './WhiskerCoreExporter';
import { Story } from '../../models/Story';
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
      expect(errors).toContain('whiskerCoreVersion must be "1.0" or "2.0"');
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
});
