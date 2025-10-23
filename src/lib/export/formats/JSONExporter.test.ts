import { describe, it, expect, beforeEach } from 'vitest';
import { JSONExporter } from './JSONExporter';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';
import type { ExportContext } from '../types';

describe('JSONExporter', () => {
  let exporter: JSONExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new JSONExporter();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Add some passages
    const passage1 = new Passage({ title: 'Start' });
    const passage2 = new Passage({ title: 'Second' });

    passage1.addChoice(new Choice({
      text: 'Go to second',
      target: passage2.id,
    }));

    story.addPassage(passage1);
    story.addPassage(passage2);
    story.startPassage = passage1.id;
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(exporter.name).toBe('JSON Exporter');
      expect(exporter.format).toBe('json');
      expect(exporter.extension).toBe('.json');
      expect(exporter.mimeType).toBe('application/json');
    });
  });

  describe('export', () => {
    it('should export story to JSON', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.filename).toBeDefined();
      expect(result.mimeType).toBe('application/json');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should export with pretty print by default', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('\n'); // Has newlines (pretty-printed)
      expect(result.content).toContain('  '); // Has indentation
    });

    it('should export minified when prettyPrint is false', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'json', prettyPrint: false },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // Minified JSON has less whitespace
      const prettySize = JSON.stringify({ story: story.serialize() }, null, 2).length;
      const minifiedSize = (result.content as string).length;
      expect(minifiedSize).toBeLessThan(prettySize);
    });

    it('should include validation when requested', async () => {
      const validation = {
        timestamp: Date.now(),
        duration: 10,
        valid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 2,
          reachablePassages: 2,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      const context: ExportContext = {
        story,
        options: { format: 'json', includeValidation: true },
        validation,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.validation).toBeDefined();
      expect(parsed.validation.valid).toBe(true);
    });

    it('should include metrics when requested', async () => {
      const metrics = {
        depth: 2,
        branchingFactor: 1,
        density: 0.5,
        totalPassages: 2,
        totalChoices: 1,
        totalVariables: 0,
        totalWords: 10,
        avgWordsPerPassage: 5,
        uniqueEndings: 1,
        reachabilityScore: 1,
        conditionalComplexity: 0,
        variableComplexity: 0,
        estimatedPlayTime: 2,
        estimatedPaths: 1,
      };

      const context: ExportContext = {
        story,
        options: { format: 'json', includeMetrics: true },
        metrics,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.metrics).toBeDefined();
      expect(parsed.metrics.structure.depth).toBe(2);
    });

    it('should include test scenarios when requested', async () => {
      const testScenarios = [
        { name: 'Test 1', steps: [] },
        { name: 'Test 2', steps: [] },
      ];

      const context: ExportContext = {
        story,
        options: { format: 'json', includeTestScenarios: true },
        testScenarios,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.testScenarios).toBeDefined();
      expect(parsed.testScenarios.length).toBe(2);
    });

    it('should include metadata in export', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.exportDate).toBeDefined();
      expect(parsed.metadata.editorVersion).toBeDefined();
      expect(parsed.metadata.formatVersion).toBeDefined();
      expect(parsed.metadata.storyId).toBe(story.metadata.title);
      expect(parsed.metadata.storyTitle).toBe('Test Story');
      expect(parsed.metadata.storyAuthor).toBe('Test Author');
    });

    it('should include validation status in metadata', async () => {
      const validation = {
        timestamp: Date.now(),
        duration: 10,
        valid: false,
        errorCount: 2,
        warningCount: 1,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 2,
          reachablePassages: 2,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      const context: ExportContext = {
        story,
        options: { format: 'json' },
        validation,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content as string);
      expect(parsed.metadata.validationStatus).toBe('errors');
    });

    it('should generate meaningful filename', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should handle stories with special characters in title', async () => {
      story.metadata.title = 'Test Story: "The Beginning"!';

      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // Special characters are replaced with underscores
      expect(result.filename).toMatch(/test_story_+the_beginning_+\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should handle export errors gracefully', async () => {
      // Create a story that will cause an error
      const badStory = {
        serialize: () => {
          throw new Error('Serialization failed');
        },
        metadata: {
          title: 'Bad Story',
          author: 'Test',
        },
      } as unknown as Story;

      const context: ExportContext = {
        story: badStory,
        options: { format: 'json' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Serialization failed');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateOptions', () => {
    it('should accept valid JSON options', () => {
      const errors = exporter.validateOptions({ format: 'json' });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'html' } as any);
      expect(errors).toContain('Invalid format for JSON exporter');
    });
  });

  describe('estimateSize', () => {
    it('should estimate export size', () => {
      const size = exporter.estimateSize(story);
      expect(size).toBeGreaterThan(0);
    });

    it('should provide reasonable estimates', () => {
      const size = exporter.estimateSize(story);
      const jsonString = JSON.stringify(story.serialize());

      // Estimate should be roughly 1.5x the JSON size
      expect(size).toBeGreaterThan(jsonString.length);
      expect(size).toBeLessThan(jsonString.length * 2);
    });
  });
});
