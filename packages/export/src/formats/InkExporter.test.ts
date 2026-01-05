import { describe, it, expect, beforeEach } from 'vitest';
import { InkExporter } from './InkExporter';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import { Variable } from '@writewhisker/core-ts';
import type { ExportContext } from '../types';

describe('InkExporter', () => {
  let exporter: InkExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new InkExporter();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        description: 'A test story for Ink export',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Add some passages
    const passage1 = new Passage({ title: 'Start', tags: ['intro'] });
    passage1.content = 'Welcome to the story!';

    const passage2 = new Passage({ title: 'Second', tags: ['chapter1'] });
    passage2.content = 'This is the second passage.';

    const passage3 = new Passage({ title: 'Ending' });
    passage3.content = 'The end.';

    passage1.addChoice(new Choice({
      text: 'Continue',
      target: passage2.id,
    }));

    passage1.addChoice(new Choice({
      text: 'Jump to end',
      target: passage3.id,
      condition: 'score > 10',
    }));

    passage2.addChoice(new Choice({
      text: 'Finish',
      target: passage3.id,
    }));

    story.addPassage(passage1);
    story.addPassage(passage2);
    story.addPassage(passage3);
    story.startPassage = passage1.id;

    // Add a variable
    story.addVariable(new Variable({ name: 'score', initial: 0, type: 'number' }));
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(exporter.name).toBe('Ink Exporter');
      expect(exporter.format).toBe('ink');
      expect(exporter.extension).toBe('.ink');
      expect(exporter.mimeType).toBe('text/plain');
    });
  });

  describe('export', () => {
    it('should export story to Ink format', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.filename).toBeDefined();
      expect(result.mimeType).toBe('text/plain');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include story title as comment', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('// Test Story');
      expect(ink).toContain('// by Test Author');
    });

    it('should generate knots from passages', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('=== Start ===');
      expect(ink).toContain('=== Second ===');
      expect(ink).toContain('=== Ending ===');
    });

    it('should include passage content', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('Welcome to the story!');
      expect(ink).toContain('This is the second passage.');
      expect(ink).toContain('The end.');
    });

    it('should include choices with targets', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('* [Continue]');
      expect(ink).toContain('-> Second');
      expect(ink).toContain('* [Jump to end]');
      expect(ink).toContain('-> Ending');
      expect(ink).toContain('* [Finish]');
    });

    it('should include VAR declarations for variables', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('VAR score = 0');
    });

    it('should include END for passages without choices', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      // Ending passage should have -> END
      expect(ink).toContain('-> END');
    });

    it('should include tags as comments', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('// Tags: intro');
      expect(ink).toContain('// Tags: chapter1');
    });

    it('should handle conditional choices', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('score > 10');
    });

    it('should generate meaningful filename', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.ink/);
    });

    it('should handle export errors gracefully', async () => {
      const badStory = {
        metadata: {
          title: 'Bad Story',
        },
        passages: {
          values: () => {
            throw new Error('Cannot iterate passages');
          },
        },
        variables: {
          values: () => [],
          size: 0,
        },
      } as unknown as Story;

      const context: ExportContext = {
        story: badStory,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot iterate passages');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sanitizeKnotName', () => {
    it('should export passage with special characters in title', async () => {
      const storyWithSpecialChars = new Story({
        metadata: {
          title: 'Special Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'My Passage Name!' });
      passage.content = 'Test content';
      storyWithSpecialChars.addPassage(passage);
      storyWithSpecialChars.startPassage = passage.id;

      const context: ExportContext = {
        story: storyWithSpecialChars,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      // Should sanitize special characters
      expect(ink).toContain('=== My_Passage_Name ===');
    });

    it('should handle passage titles starting with numbers', async () => {
      const storyWithNumber = new Story({
        metadata: {
          title: 'Number Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: '123Start' });
      passage.content = 'Test content';
      storyWithNumber.addPassage(passage);
      storyWithNumber.startPassage = passage.id;

      const context: ExportContext = {
        story: storyWithNumber,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      // Should prefix with underscore
      expect(ink).toContain('=== _123Start ===');
    });
  });

  describe('variable types', () => {
    it('should export string variables correctly', async () => {
      story.addVariable(new Variable({ name: 'playerName', initial: 'Hero', type: 'string' }));

      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('VAR playerName = "Hero"');
    });

    it('should export boolean variables correctly', async () => {
      story.addVariable(new Variable({ name: 'hasKey', initial: true, type: 'boolean' }));

      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('VAR hasKey = true');
    });

    it('should export number variables correctly', async () => {
      story.addVariable(new Variable({ name: 'health', initial: 100, type: 'number' }));

      const context: ExportContext = {
        story,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      expect(ink).toContain('VAR health = 100');
    });
  });

  describe('variable interpolation', () => {
    it('should convert variable interpolation syntax', async () => {
      const storyWithInterpolation = new Story({
        metadata: {
          title: 'Interpolation Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Your score is ${score} points.';
      storyWithInterpolation.addPassage(passage);
      storyWithInterpolation.startPassage = passage.id;

      const context: ExportContext = {
        story: storyWithInterpolation,
        options: { format: 'ink' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const ink = result.content as string;
      // Should convert ${score} to {score}
      expect(ink).toContain('Your score is {score} points.');
    });
  });

  describe('validateOptions', () => {
    it('should accept valid Ink options', () => {
      const errors = exporter.validateOptions({ format: 'ink' as any });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'html' } as any);
      expect(errors).toContain('Invalid format for Ink exporter');
    });
  });

  describe('estimateSize', () => {
    it('should estimate export size', () => {
      const size = exporter.estimateSize(story);
      expect(size).toBeGreaterThan(0);
    });

    it('should scale with number of passages', () => {
      const smallStory = new Story({ metadata: { title: 'Small', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
      smallStory.addPassage(new Passage({ title: 'P1' }));

      const largeStory = new Story({ metadata: { title: 'Large', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() } });
      for (let i = 0; i < 10; i++) {
        largeStory.addPassage(new Passage({ title: `P${i}` }));
      }

      const smallSize = exporter.estimateSize(smallStory);
      const largeSize = exporter.estimateSize(largeStory);

      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });
});
