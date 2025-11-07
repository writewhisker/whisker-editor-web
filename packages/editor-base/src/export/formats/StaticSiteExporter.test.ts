import { describe, it, expect } from 'vitest';
import { StaticSiteExporter } from './StaticSiteExporter';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';

describe('StaticSiteExporter', () => {
  const exporter = new StaticSiteExporter();

  describe('metadata', () => {
    it('should have correct exporter metadata', () => {
      expect(exporter.name).toBe('Static Site Exporter');
      expect(exporter.format).toBe('html-standalone');
      expect(exporter.extensions).toEqual(['.html']);
      expect(exporter.mimeType).toBe('text/html');
    });
  });

  describe('export', () => {
    it('should export a simple story to standalone HTML', async () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Test Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Remove default passage
      const defaultPassage = Array.from(story.passages.values())[0];
      if (defaultPassage) {
        story.passages.delete(defaultPassage.id);
      }

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Welcome to the story!';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.format).toBe('html-standalone');
      expect(result.filename).toBe('test-story.html');

      // Verify HTML structure
      const html = result.data as string;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Story</title>');
      expect(html).toContain('const STORY_DATA =');
      expect(html).toContain('class WhiskerPlayer');
    });

    it('should include story metadata in HTML', async () => {
      const story = new Story({
        metadata: {
          title: 'Adventure Game',
          description: 'An epic adventure',
          author: 'Author Name',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      expect(html).toContain('Adventure Game');
      expect(html).toContain('An epic adventure');
    });

    it('should embed player styles in HTML', async () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      expect(html).toContain('<style>');
      expect(html).toContain('#whisker-player');
      expect(html).toContain('.passage');
      expect(html).toContain('.choice');
    });

    it('should embed player script in HTML', async () => {
      const story = new Story({
        metadata: {
          title: 'Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      expect(html).toContain('class WhiskerPlayer');
      expect(html).toContain('render()');
      expect(html).toContain('makeChoice');
      expect(html).toContain('goBack');
      expect(html).toContain('restart');
    });

    it('should serialize story data as JSON', async () => {
      const story = new Story({
        metadata: {
          title: 'Data Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Remove default passage
      const defaultPassage = Array.from(story.passages.values())[0];
      if (defaultPassage) {
        story.passages.delete(defaultPassage.id);
      }

      const passage = new Passage({ title: 'First' });
      passage.content = 'Test content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      // Check that story data is present (format may vary based on Story.serialize())
      expect(html).toContain('const STORY_DATA =');
      expect(html).toContain('First'); // Passage title should be somewhere in the data
      expect(html).toContain('Test content'); // Content should be in the data
    });

    it('should sanitize filename', async () => {
      const story = new Story({
        metadata: {
          title: 'My Cool Story!!!',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('my-cool-story.html');
    });

    it('should handle story with multiple passages', async () => {
      const story = new Story({
        metadata: {
          title: 'Multi Passage',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Remove default passage
      const defaultPassage = Array.from(story.passages.values())[0];
      if (defaultPassage) {
        story.passages.delete(defaultPassage.id);
      }

      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Beginning';
      story.addPassage(passage1);

      const passage2 = new Passage({ title: 'Middle' });
      passage2.content = 'Middle part';
      story.addPassage(passage2);

      const passage3 = new Passage({ title: 'End' });
      passage3.content = 'The end';
      story.addPassage(passage3);

      story.startPassage = passage1.id;

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      // Passages should be in the data
      expect(html).toContain('Start');
      expect(html).toContain('Middle');
      expect(html).toContain('End');
    });

    it('should handle story with choices', async () => {
      const story = new Story({
        metadata: {
          title: 'Choice Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Remove default passage
      const defaultPassage = Array.from(story.passages.values())[0];
      if (defaultPassage) {
        story.passages.delete(defaultPassage.id);
      }

      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'Choose your path';
      story.addPassage(passage1);

      const passage2 = new Passage({ title: 'Path A' });
      passage2.content = 'You chose A';
      story.addPassage(passage2);

      const choice = new Choice({
        text: 'Go to A',
        targetPassageId: passage2.id,
      });
      passage1.addChoice(choice);

      story.startPassage = passage1.id;

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      // Choice text should be in the data
      expect(html).toContain('Go to A');
      expect(html).toContain(passage2.id);
    });

    it('should handle null story', async () => {
      const result = await exporter.export({ story: null as any, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No story provided');
    });

    it('should include responsive meta tags', async () => {
      const story = new Story({
        metadata: {
          title: 'Mobile Test',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('width=device-width');
      expect(html).toContain('initial-scale=1.0');
    });

    it('should escape HTML in title', async () => {
      const story = new Story({
        metadata: {
          title: 'Story <with> "HTML"',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      expect(html).toContain('Story &lt;with&gt; &quot;HTML&quot;');
    });

    it('should use default filename if title is empty', async () => {
      const story = new Story({
        metadata: {
          title: '',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: {}, format: 'html-standalone' });

      expect(result.success).toBe(true);
      const html = result.data as string;

      // Should generate valid HTML
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>');
      expect(html).toContain('class WhiskerPlayer');
      // Story model defaults empty title to "Untitled Story" which gets sanitized to "untitled-story"
      expect(result.filename).toBe('untitled-story.html');
    });
  });
});
