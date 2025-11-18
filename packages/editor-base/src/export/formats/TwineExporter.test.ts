import { describe, it, expect } from 'vitest';
import { TwineExporter } from './TwineExporter';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('TwineExporter', () => {
  const exporter = new TwineExporter();

  describe('metadata', () => {
    it('should have correct exporter metadata', () => {
      expect(exporter.name).toBe('Twine HTML Exporter');
      expect(exporter.format).toBe('twine');
      expect(exporter.extension).toEqual('.html');
      expect(exporter.mimeType).toBe('text/html');
    });
  });

  describe('export', () => {
    it('should export a simple story to Twine HTML', async () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Test Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          ifid: 'TEST-IFID-12345',
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'This is the start passage.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.format).toBe('twine');
      expect(result.filename).toBe('Test Story.html');

      // Verify HTML structure
      const html = result.content as string;
      expect(html).toContain('<tw-storydata');
      expect(html).toContain('name="Test Story"');
      expect(html).toContain('ifid="TEST-IFID-12345"');
      expect(html).toContain('format="Harlowe"');
      expect(html).toContain('<tw-passagedata');
      expect(html).toContain('name="Start"');
    });

    it('should export multiple passages', async () => {
      const story = new Story({
        metadata: {
          title: 'Multi-Passage Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage1 = new Passage({ title: 'Start' });
      passage1.content = 'First passage';
      story.addPassage(passage1);

      const passage2 = new Passage({ title: 'Second' });
      passage2.content = 'Second passage';
      story.addPassage(passage2);

      const passage3 = new Passage({ title: 'Third' });
      passage3.content = 'Third passage';
      story.addPassage(passage3);

      story.startPassage = passage1.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      // Verify all passages are present
      expect(html).toContain('name="Start"');
      expect(html).toContain('name="Second"');
      expect(html).toContain('name="Third"');
      expect(html).toContain('First passage');
      expect(html).toContain('Second passage');
      expect(html).toContain('Third passage');
    });

    it('should handle passages with tags', async () => {
      const story = new Story({
        metadata: {
          title: 'Tagged Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Tagged Passage' });
      passage.content = 'Content';
      passage.tags = ['intro', 'important'];
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('tags="intro important"');
    });

    it('should handle empty story', async () => {
      const story = new Story({
        metadata: {
          title: 'Empty Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('name="Empty Story"');
    });

    it('should handle missing story title', async () => {
      const story = new Story({
        metadata: {
          title: '',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('name="Untitled Story"');
    });

    it('should handle null story', async () => {
      const result = await exporter.export({ story: null as any, options: { format: 'twine' } });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No story provided');
    });

    it('should escape HTML entities in passage content', async () => {
      const story = new Story({
        metadata: {
          title: 'HTML Test',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Test' });
      passage.content = 'Text with <html> & "quotes" and \'apostrophes\'';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('&lt;html&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
      expect(html).toContain('&#39;');
    });

    it('should escape HTML entities in story title', async () => {
      const story = new Story({
        metadata: {
          title: 'Story <with> "HTML"',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('name="Story &lt;with&gt; &quot;HTML&quot;"');
    });

    it('should escape HTML entities in passage titles', async () => {
      const story = new Story({
        metadata: {
          title: 'Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Passage <with> "HTML"' });
      passage.content = 'Content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('name="Passage &lt;with&gt; &quot;HTML&quot;"');
    });

    it('should convert Whisker variables to Harlowe syntax', async () => {
      const story = new Story({
        metadata: {
          title: 'Variable Test',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Your name is {{playerName}} and you have {{health}} HP.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('$playerName');
      expect(html).toContain('$health');
      expect(html).not.toContain('{{playerName}}');
      expect(html).not.toContain('{{health}}');
    });

    it('should convert Whisker conditionals to Harlowe syntax', async () => {
      const story = new Story({
        metadata: {
          title: 'Conditional Test',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = '{{#if health > 50}}You are healthy{{else}}You are weak{{/if}}';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('(if: health &gt; 50)[');
      expect(html).toContain('](else:)[');
      expect(html).toContain(']');
      expect(html).not.toContain('{{#if');
      expect(html).not.toContain('{{else}}');
      expect(html).not.toContain('{{/if}}');
    });

    it('should convert Whisker set statements to Harlowe syntax', async () => {
      const story = new Story({
        metadata: {
          title: 'Set Test',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = '{{set health = 100}}\n{{set name = "Hero"}}';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('(set: $health to 100)');
      expect(html).toContain('(set: $name to &quot;Hero&quot;)');
      expect(html).not.toContain('{{set');
    });

    it('should generate IFID if not provided', async () => {
      const story = new Story({
        metadata: {
          title: 'No IFID Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          ifid: '',
        },
      });

      const passage = new Passage({ title: 'Start' });
      passage.content = 'Content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toMatch(/ifid="[a-zA-Z0-9_-]+"/);
    });

    it('should include passage positions', async () => {
      const story = new Story({
        metadata: {
          title: 'Position Test',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Remove default passage
      const defaultPassage = Array.from(story.passages.values())[0];
      if (defaultPassage && (defaultPassage as any).id) {
        story.passages.delete((defaultPassage as any).id);
      }

      const passage = new Passage({ title: 'Positioned', position: { x: 250, y: 300 } });
      passage.content = 'Content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      const result = await exporter.export({ story, options: { format: 'twine' } });

      expect(result.success).toBe(true);
      const html = result.content as string;

      expect(html).toContain('position="250,300"');
    });
  });
});
