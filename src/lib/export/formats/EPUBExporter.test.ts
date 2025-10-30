/**
 * EPUBExporter Tests
 *
 * Comprehensive tests for EPUB export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EPUBExporter } from './EPUBExporter';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';
import type { ExportContext } from '../types';
import JSZip from 'jszip';

describe('EPUBExporter', () => {
  let exporter: EPUBExporter;
  let story: Story;
  let context: ExportContext;

  beforeEach(() => {
    exporter = new EPUBExporter();

    // Create a test story
    story = new Story();
    story.metadata.title = 'Test Story';
    story.metadata.author = 'Test Author';
    story.metadata.description = 'A test story for EPUB export';

    // Add passages
    const passage1 = new Passage('start', 'Beginning', 100, 100);
    passage1.content = '# Welcome\n\nThis is the **beginning** of your adventure.';
    passage1.choices.push(new Choice('Go left', 'left'));
    passage1.choices.push(new Choice('Go right', 'right'));

    const passage2 = new Passage('left', 'Left Path', 100, 200);
    passage2.content = 'You went *left*. Here is a list:\n\n- Item 1\n- Item 2\n- Item 3';

    const passage3 = new Passage('right', 'Right Path', 200, 200);
    passage3.content = 'You went **right**.\n\n> This is a quote.';

    story.passages.set(passage1.id, passage1);
    story.passages.set(passage2.id, passage2);
    story.passages.set(passage3.id, passage3);

    story.startPassage = 'start';

    context = {
      story,
      options: {
        format: 'epub',
        includeMetadata: true
      }
    };
  });

  describe('Basic Export', () => {
    it('should export a valid EPUB structure', async () => {
      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeInstanceOf(Blob);
      expect(result.mimeType).toBe('application/epub+zip');
      expect(result.filename).toContain('.epub');
    });

    it('should include all required EPUB files', async () => {
      const result = await exporter.export(context);
      expect(result.success).toBe(true);

      // Unzip and check contents
      const zip = await JSZip.loadAsync(result.content as Blob);

      // Check required files
      expect(zip.file('mimetype')).toBeTruthy();
      expect(zip.file('META-INF/container.xml')).toBeTruthy();
      expect(zip.file('EPUB/content.opf')).toBeTruthy();
      expect(zip.file('EPUB/nav.xhtml')).toBeTruthy();
      expect(zip.file('EPUB/styles.css')).toBeTruthy();
      expect(zip.file('EPUB/cover.xhtml')).toBeTruthy();
    });

    it('should have correct mimetype content', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const mimetypeContent = await zip.file('mimetype')?.async('string');
      expect(mimetypeContent).toBe('application/epub+zip');
    });

    it('should generate chapters for all passages', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      // Should have 3 chapter files
      expect(zip.file('EPUB/chapter_0001.xhtml')).toBeTruthy();
      expect(zip.file('EPUB/chapter_0002.xhtml')).toBeTruthy();
      expect(zip.file('EPUB/chapter_0003.xhtml')).toBeTruthy();
    });
  });

  describe('Metadata', () => {
    it('should include story metadata in content.opf', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const contentOPF = await zip.file('EPUB/content.opf')?.async('string');
      expect(contentOPF).toContain('<dc:title>Test Story</dc:title>');
      expect(contentOPF).toContain('<dc:creator>Test Author</dc:creator>');
      expect(contentOPF).toContain('<dc:description>A test story for EPUB export</dc:description>');
    });

    it('should handle missing metadata gracefully', async () => {
      story.metadata.title = '';
      story.metadata.author = '';
      story.metadata.description = '';

      const result = await exporter.export(context);
      expect(result.success).toBe(true);

      const zip = await JSZip.loadAsync(result.content as Blob);
      const contentOPF = await zip.file('EPUB/content.opf')?.async('string');

      expect(contentOPF).toContain('<dc:title>Untitled Story</dc:title>');
      expect(contentOPF).toContain('<dc:creator>Unknown Author</dc:creator>');
    });
  });

  describe('Markdown Rendering', () => {
    it('should render markdown headers', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      expect(chapter).toContain('<h1>Welcome</h1>');
    });

    it('should render markdown bold text', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      expect(chapter).toContain('<strong>beginning</strong>');
    });

    it('should render markdown italic text', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0002.xhtml')?.async('string');
      expect(chapter).toContain('<em>left</em>');
    });

    it('should render markdown lists', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0002.xhtml')?.async('string');
      expect(chapter).toContain('<ul>');
      expect(chapter).toContain('<li>Item 1</li>');
      expect(chapter).toContain('<li>Item 2</li>');
      expect(chapter).toContain('<li>Item 3</li>');
    });

    it('should render markdown blockquotes', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0003.xhtml')?.async('string');
      expect(chapter).toContain('<blockquote>');
      expect(chapter).toContain('This is a quote');
    });
  });

  describe('Choices', () => {
    it('should include choices in chapters', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      expect(chapter).toContain('<div class="choices">');
      expect(chapter).toContain('Go left</a>');
      expect(chapter).toContain('Go right</a>');
    });

    it('should link choices to correct chapters', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      // Should have links to other chapters
      expect(chapter).toContain('chapter_');
      expect(chapter).toContain('.xhtml');
    });

    it('should display choice conditions', async () => {
      // Add a choice with conditions
      const passage = story.passages.get('start');
      if (!passage) {
        throw new Error('Start passage not found');
      }
      const conditionalChoice = new Choice('Secret path', 'secret');
      conditionalChoice.conditions = ['has_key', 'health > 50'];
      passage.choices.push(conditionalChoice);

      const secretPassage = new Passage('secret', 'Secret', 300, 300);
      secretPassage.content = 'You found the secret!';
      story.passages.set(secretPassage.id, secretPassage);

      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      expect(chapter).toContain('Requires:');
      expect(chapter).toContain('has_key');
      expect(chapter).toContain('health &gt; 50');
    });
  });

  describe('Cover Page', () => {
    it('should generate a cover page', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const cover = await zip.file('EPUB/cover.xhtml')?.async('string');
      expect(cover).toBeTruthy();
      expect(cover).toContain('<div class="cover">');
    });

    it('should include title and author on cover', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const cover = await zip.file('EPUB/cover.xhtml')?.async('string');
      expect(cover).toContain('Test Story');
      expect(cover).toContain('Test Author');
    });

    it('should include description on cover if present', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const cover = await zip.file('EPUB/cover.xhtml')?.async('string');
      expect(cover).toContain('A test story for EPUB export');
    });
  });

  describe('Navigation', () => {
    it('should generate table of contents', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const nav = await zip.file('EPUB/nav.xhtml')?.async('string');
      expect(nav).toContain('Table of Contents');
      expect(nav).toContain('Beginning');
      expect(nav).toContain('Left Path');
      expect(nav).toContain('Right Path');
    });

    it('should have correct navigation links', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const nav = await zip.file('EPUB/nav.xhtml')?.async('string');
      expect(nav).toContain('chapter_0001.xhtml');
      expect(nav).toContain('chapter_0002.xhtml');
      expect(nav).toContain('chapter_0003.xhtml');
    });
  });

  describe('CSS Styling', () => {
    it('should include comprehensive CSS styles', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const css = await zip.file('EPUB/styles.css')?.async('string');
      expect(css).toContain('body {');
      expect(css).toContain('.cover');
      expect(css).toContain('.choice');
      expect(css).toContain('.passage');
    });

    it('should style markdown elements', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const css = await zip.file('EPUB/styles.css')?.async('string');
      expect(css).toContain('blockquote');
      expect(css).toContain('code');
      expect(css).toContain('pre');
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully with no passages', async () => {
      story.passages.clear();

      const result = await exporter.export(context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('no passages');
    });

    it('should handle empty passage content', async () => {
      const passage = Array.from(story.passages.values())[0];
      if (!passage) throw new Error('No passages found');
      passage.content = '';

      const result = await exporter.export(context);
      expect(result.success).toBe(true);
    });

    it('should handle invalid markdown gracefully', async () => {
      const passage = Array.from(story.passages.values())[0];
      if (!passage) throw new Error('No passages found');
      passage.content = '**unclosed bold\n\n```unclosed code block';

      const result = await exporter.export(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Size Estimation', () => {
    it('should estimate export size', () => {
      const estimatedSize = exporter.estimateSize(story);
      expect(estimatedSize).toBeGreaterThan(0);
      // Should be base (10KB) + 3 passages * 2KB = ~16KB
      expect(estimatedSize).toBeGreaterThanOrEqual(16000);
    });
  });

  describe('Option Validation', () => {
    it('should validate EPUB format option', () => {
      const errors = exporter.validateOptions({ format: 'epub' });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'pdf' } as any);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid format');
    });
  });

  describe('Warnings', () => {
    it('should add warnings for local image paths', async () => {
      const passage = Array.from(story.passages.values())[0];
      if (!passage) throw new Error('No passages found');
      passage.content = '![Local image](./local/path.png)';

      const result = await exporter.export(context);
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0]).toContain('Cannot embed local image');
    });
  });

  describe('Content.opf Structure', () => {
    it('should include cover in spine', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const contentOPF = await zip.file('EPUB/content.opf')?.async('string');
      expect(contentOPF).toContain('<spine>');
      expect(contentOPF).toContain('<itemref idref="cover"/>');
    });

    it('should include all chapters in manifest', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const contentOPF = await zip.file('EPUB/content.opf')?.async('string');
      expect(contentOPF).toContain('id="chapter_1"');
      expect(contentOPF).toContain('id="chapter_2"');
      expect(contentOPF).toContain('id="chapter_3"');
    });

    it('should include navigation in manifest', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const contentOPF = await zip.file('EPUB/content.opf')?.async('string');
      expect(contentOPF).toContain('id="nav"');
      expect(contentOPF).toContain('properties="nav"');
    });
  });

  describe('XHTML Validity', () => {
    it('should generate valid XHTML for chapters', async () => {
      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapter = await zip.file('EPUB/chapter_0001.xhtml')?.async('string');
      expect(chapter).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(chapter).toContain('<!DOCTYPE html>');
      expect(chapter).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    });

    it('should escape special XML characters', async () => {
      const passage = Array.from(story.passages.values())[0];
      if (!passage) throw new Error('No passages found');
      passage.content = 'Test & < > " \' characters';

      const result = await exporter.export(context);
      const zip = await JSZip.loadAsync(result.content as Blob);

      const chapters = zip.file(/chapter_\d+\.xhtml/);
      expect(chapters.length).toBeGreaterThan(0);
      const chapter = await chapters[0].async('string');
      expect(chapter).toContain('&amp;');
      expect(chapter).toContain('&lt;');
      expect(chapter).toContain('&gt;');
    });
  });

  describe('Performance', () => {
    it('should export large stories in reasonable time', async () => {
      // Add 50 passages
      for (let i = 0; i < 50; i++) {
        const passage = new Passage(`passage_${i}`, `Passage ${i}`, i * 100, i * 100);
        passage.content = `# Chapter ${i}\n\nThis is content for passage ${i}.\n\n**Bold** and *italic* text.`;
        passage.choices.push(new Choice(`Next`, `passage_${i + 1}`));
        story.passages.set(passage.id, passage);
      }

      const startTime = Date.now();
      const result = await exporter.export(context);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});
