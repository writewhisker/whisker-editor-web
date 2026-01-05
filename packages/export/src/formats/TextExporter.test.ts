import { describe, it, expect, beforeEach } from 'vitest';
import { TextExporter } from './TextExporter';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import { Variable } from '@writewhisker/core-ts';
import type { ExportContext } from '../types';

describe('TextExporter', () => {
  let exporter: TextExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new TextExporter();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        description: 'A test story for text export',
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
      expect(exporter.name).toBe('Text Exporter');
      expect(exporter.format).toBe('text');
      expect(exporter.extension).toBe('.txt');
      expect(exporter.mimeType).toBe('text/plain');
    });
  });

  describe('export', () => {
    it('should export story to text format', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
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

    it('should include story title in uppercase', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('TEST STORY');
    });

    it('should include author and version', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('Author: Test Author');
      expect(txt).toContain('Version: 1.0.0');
    });

    it('should include description', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('A test story for text export');
    });

    it('should include story structure summary', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('STORY STRUCTURE');
      expect(txt).toContain('Total Passages:');
      expect(txt).toContain('Total Choices:');
      expect(txt).toContain('Total Variables:');
      expect(txt).toContain('Start Passage:');
    });

    it('should include variables section', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('VARIABLES');
      expect(txt).toContain('score = 0');
    });

    it('should include passages section', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('PASSAGES');
      expect(txt).toContain('[Start]');
      expect(txt).toContain('[Second]');
      expect(txt).toContain('[Ending]');
    });

    it('should mark start passage', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('[Start] (START)');
    });

    it('should include passage content', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('Welcome to the story!');
      expect(txt).toContain('This is the second passage.');
      expect(txt).toContain('The end.');
    });

    it('should include passage tags', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('Tags: intro');
      expect(txt).toContain('Tags: chapter1');
    });

    it('should include numbered choices', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('Choices:');
      expect(txt).toContain('1. Continue');
      expect(txt).toContain('2. Jump to end');
    });

    it('should include choice targets', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('-> [Second]');
      expect(txt).toContain('-> [Ending]');
    });

    it('should include choice conditions', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('(if: score > 10)');
    });

    it('should generate meaningful filename', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.txt/);
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
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot iterate passages');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stripMarkup', () => {
    it('should convert variable interpolation to readable format', async () => {
      const storyWithVars = new Story({
        metadata: {
          title: 'Var Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Your score is ${score} points. You have $health HP.';
      storyWithVars.addPassage(passage);
      storyWithVars.startPassage = passage.id;

      const context: ExportContext = {
        story: storyWithVars,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      // Should convert to readable format
      expect(txt).toContain('[score]');
      expect(txt).toContain('[health]');
    });

    it('should handle story with no variables', async () => {
      const storyNoVars = new Story({
        metadata: {
          title: 'No Vars Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Just plain text.';
      storyNoVars.addPassage(passage);
      storyNoVars.startPassage = passage.id;

      const context: ExportContext = {
        story: storyNoVars,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).not.toContain('VARIABLES');
    });
  });

  describe('section separators', () => {
    it('should use clear section separators', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      // Should have separator lines
      expect(txt).toContain('='.repeat(60));
    });
  });

  describe('validateOptions', () => {
    it('should accept valid text options', () => {
      const errors = exporter.validateOptions({ format: 'text' as any });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'html' } as any);
      expect(errors).toContain('Invalid format for Text exporter');
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

  describe('edge cases', () => {
    it('should handle empty passages', async () => {
      const emptyStory = new Story({
        metadata: {
          title: 'Empty Story',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Empty' });
      passage.content = '';
      emptyStory.addPassage(passage);
      emptyStory.startPassage = passage.id;

      const context: ExportContext = {
        story: emptyStory,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should handle story with no passages', async () => {
      const emptyStory = new Story({
        metadata: {
          title: 'No Passages',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const context: ExportContext = {
        story: emptyStory,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in content', async () => {
      const specialStory = new Story({
        metadata: {
          title: 'Special Characters',
          author: '',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Special' });
      passage.content = 'Test with <brackets>, "quotes", and & ampersands';
      specialStory.addPassage(passage);
      specialStory.startPassage = passage.id;

      const context: ExportContext = {
        story: specialStory,
        options: { format: 'text' as any },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const txt = result.content as string;
      expect(txt).toContain('<brackets>');
      expect(txt).toContain('"quotes"');
      expect(txt).toContain('& ampersands');
    });
  });
});
