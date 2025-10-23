import { describe, it, expect, beforeEach } from 'vitest';
import { HTMLExporter } from './HTMLExporter';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';
import type { ExportContext } from '../types';

describe('HTMLExporter', () => {
  let exporter: HTMLExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new HTMLExporter();

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
    passage1.content = 'Welcome to the story!';

    const passage2 = new Passage({ title: 'Second' });
    passage2.content = 'This is the second passage.';

    passage1.addChoice(new Choice({
      text: 'Continue',
      target: passage2.id,
    }));

    story.addPassage(passage1);
    story.addPassage(passage2);
    story.startPassage = passage1.id;
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(exporter.name).toBe('HTML Exporter');
      expect(exporter.format).toBe('html');
      expect(exporter.extension).toBe('.html');
      expect(exporter.mimeType).toBe('text/html');
    });
  });

  describe('export', () => {
    it('should export story to HTML', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.filename).toBeDefined();
      expect(result.mimeType).toBe('text/html');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include HTML structure', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('should include story title in HTML', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain('<title>Test Story</title>');
      expect(html).toContain('>Test Story<');
    });

    it('should embed story data as JSON', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain('const STORY_DATA =');
      expect(html).toContain('"metadata"');
      expect(html).toContain('"passages"');
    });

    it('should include player JavaScript', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain('class StoryPlayer');
      expect(html).toContain('player.start()');
    });

    it('should minify HTML when requested', async () => {
      const contextNormal: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const contextMinified: ExportContext = {
        story,
        options: { format: 'html', minifyHTML: true },
      };

      const normalResult = await exporter.export(contextNormal);
      const minifiedResult = await exporter.export(contextMinified);

      expect(normalResult.success).toBe(true);
      expect(minifiedResult.success).toBe(true);

      const normalSize = (normalResult.content as string).length;
      const minifiedSize = (minifiedResult.content as string).length;

      expect(minifiedSize).toBeLessThan(normalSize);
    });

    it('should support theme option', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html', theme: 'dark' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      // Dark theme should set CSS variables
      expect(html).toContain('--bg-primary');
    });

    it('should include custom CSS', async () => {
      const customCSS = '.custom { color: red; }';
      const context: ExportContext = {
        story,
        options: { format: 'html', customCSS },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain(customCSS);
    });

    it('should include custom JavaScript', async () => {
      const customJS = 'console.log("Custom script");';
      const context: ExportContext = {
        story,
        options: { format: 'html', customJS },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const html = result.content as string;
      expect(html).toContain(customJS);
    });

    it('should generate meaningful filename', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.html/);
    });

    it('should warn if no start passage', async () => {
      story.startPassage = undefined as any;

      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Story has no start passage set');
    });

    it('should handle export errors gracefully', async () => {
      const badStory = {
        serialize: () => {
          throw new Error('Serialization failed');
        },
        metadata: {
          title: 'Bad Story',
        },
      } as unknown as Story;

      const context: ExportContext = {
        story: badStory,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Serialization failed');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateOptions', () => {
    it('should accept valid HTML options', () => {
      const errors = exporter.validateOptions({ format: 'html' });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'json' } as any);
      expect(errors).toContain('Invalid format for HTML exporter');
    });

    it('should accept valid theme options', () => {
      expect(exporter.validateOptions({ format: 'html', theme: 'light' })).toHaveLength(0);
      expect(exporter.validateOptions({ format: 'html', theme: 'dark' })).toHaveLength(0);
      expect(exporter.validateOptions({ format: 'html', theme: 'auto' })).toHaveLength(0);
    });

    it('should reject invalid theme', () => {
      const errors = exporter.validateOptions({ format: 'html', theme: 'invalid' as any });
      expect(errors).toContain('Invalid theme option');
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

      // HTML should be larger than JSON due to template
      expect(size).toBeGreaterThan(jsonString.length);
    });
  });
});
