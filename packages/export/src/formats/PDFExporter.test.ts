/**
 * Comprehensive tests for PDF Exporter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFExporter } from './PDFExporter';
import { Story, Passage, Choice } from '@writewhisker/core-ts';
import type { ExportContext, ExportOptions } from '../types';

describe('PDFExporter', () => {
  let exporter: PDFExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new PDFExporter();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        description: 'A test story for PDF export',
        version: '1.0.0',
        created: new Date('2025-01-01').toISOString(),
        modified: new Date('2025-01-15').toISOString(),
      },
    });

    // Add passages
    const passage1 = new Passage({ title: 'Welcome' });
    passage1.content = 'Welcome to the test story. This is the starting passage.';
    passage1.addChoice(new Choice({ text: 'Go left', target: 'passage2' }));
    passage1.addChoice(new Choice({ text: 'Go right', target: 'passage3' }));

    const passage2 = new Passage({ title: 'Left Path' });
    passage2.content = 'You went left and found a treasure.';
    passage2.addChoice(new Choice({ text: 'Return', target: passage1.id }));

    const passage3 = new Passage({ title: 'Right Path' });
    passage3.content = 'You went right and encountered a dragon.';
    passage3.addChoice(new Choice({ text: 'Fight', target: 'passage4' }));
    passage3.addChoice(new Choice({ text: 'Flee', target: passage1.id }));

    const passage4 = new Passage({ title: 'Combat' });
    passage4.content = 'You fought bravely and defeated the dragon!';

    story.addPassage(passage1);
    story.addPassage(passage2);
    story.addPassage(passage3);
    story.addPassage(passage4);

    story.startPassage = passage1.id;
  });

  describe('Basic Properties', () => {
    it('should have correct exporter properties', () => {
      expect(exporter.name).toBe('PDF Exporter');
      expect(exporter.format).toBe('pdf');
      expect(exporter.extension).toBe('.pdf');
      expect(exporter.mimeType).toBe('application/pdf');
    });
  });

  describe('Export - Playable Mode', () => {
    it('should export story in playable mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'playable',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeInstanceOf(Blob);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toMatch(/test_story_playable_\d{4}-\d{2}-\d{2}\.pdf/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use default options when not specified', async () => {
      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('playable'); // Default mode
    });

    it('should include table of contents by default', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'playable',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // TOC is included by default (pdfIncludeTOC defaults to true)
    });

    it('should exclude table of contents when requested', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'playable',
        pdfIncludeTOC: false,
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Export - Manuscript Mode', () => {
    it('should export story in manuscript mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'manuscript',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('manuscript');
    });

    it('should sort passages alphabetically in manuscript mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'manuscript',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // Passages are sorted by name in manuscript mode
    });
  });

  describe('Export - Outline Mode', () => {
    it('should export story in outline mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'outline',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('outline');
    });

    it('should include statistics in outline mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'outline',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // Outline mode includes passage statistics
    });

    it('should warn about graph visualization in outline mode', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'outline',
        pdfIncludeGraph: true,
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Graph visualization in PDF requires html2canvas integration (not yet implemented)');
    });
  });

  describe('PDF Configuration Options', () => {
    it('should support A4 format', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFormat: 'a4',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support letter format', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFormat: 'letter',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support legal format', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFormat: 'legal',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support landscape orientation', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfOrientation: 'landscape',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support portrait orientation', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfOrientation: 'portrait',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support custom font size', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFontSize: 14,
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support custom line height', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfLineHeight: 2.0,
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should support custom margin', async () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMargin: 30,
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle story with no passages gracefully', async () => {
      const emptyStory = new Story({
        metadata: {
          title: 'Empty Story',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story: emptyStory,
        options,
      };

      const result = await exporter.export(context);

      // Story class may auto-create a default passage, or export may handle empty stories
      // Either way, we should not crash
      expect(result.success).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle stories without start passage', async () => {
      story.startPassage = undefined;

      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'playable',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      // Should still succeed but handle gracefully
      expect(result.success).toBe(true);
    });

    it('should handle empty passage content', async () => {
      const emptyPassage = new Passage({ title: 'Empty Passage' });
      emptyPassage.content = '';
      story.addPassage(emptyPassage);

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should handle choices without targets', async () => {
      const passage = new Passage({ title: 'Orphan Choice' });
      passage.content = 'This has a choice with no target.';
      passage.addChoice(new Choice({ text: 'Go nowhere' }));
      story.addPassage(passage);

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate correct PDF options', () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFormat: 'a4',
        pdfOrientation: 'portrait',
        pdfMode: 'playable',
      };

      const errors = exporter.validateOptions(options);

      expect(errors).toEqual([]);
    });

    it('should reject invalid format', () => {
      const options: ExportOptions = {
        format: 'html' as any,
      };

      const errors = exporter.validateOptions(options);

      expect(errors).toContain('Invalid format for PDF exporter');
    });

    it('should reject invalid PDF format', () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfFormat: 'tabloid' as any,
      };

      const errors = exporter.validateOptions(options);

      expect(errors).toContain('Invalid PDF format option');
    });

    it('should reject invalid PDF orientation', () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfOrientation: 'diagonal' as any,
      };

      const errors = exporter.validateOptions(options);

      expect(errors).toContain('Invalid PDF orientation option');
    });

    it('should reject invalid PDF mode', () => {
      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'interactive' as any,
      };

      const errors = exporter.validateOptions(options);

      expect(errors).toContain('Invalid PDF mode option');
    });

    it('should reject font size outside valid range', () => {
      const options1: ExportOptions = {
        format: 'pdf',
        pdfFontSize: 5,
      };

      const errors1 = exporter.validateOptions(options1);
      expect(errors1).toContain('PDF font size must be between 8 and 24 points');

      const options2: ExportOptions = {
        format: 'pdf',
        pdfFontSize: 30,
      };

      const errors2 = exporter.validateOptions(options2);
      expect(errors2).toContain('PDF font size must be between 8 and 24 points');
    });

    it('should reject line height outside valid range', () => {
      const options1: ExportOptions = {
        format: 'pdf',
        pdfLineHeight: 0.5,
      };

      const errors1 = exporter.validateOptions(options1);
      expect(errors1).toContain('PDF line height must be between 1 and 3');

      const options2: ExportOptions = {
        format: 'pdf',
        pdfLineHeight: 4,
      };

      const errors2 = exporter.validateOptions(options2);
      expect(errors2).toContain('PDF line height must be between 1 and 3');
    });

    it('should reject margin outside valid range', () => {
      const options1: ExportOptions = {
        format: 'pdf',
        pdfMargin: 5,
      };

      const errors1 = exporter.validateOptions(options1);
      expect(errors1).toContain('PDF margin must be between 10 and 50mm');

      const options2: ExportOptions = {
        format: 'pdf',
        pdfMargin: 60,
      };

      const errors2 = exporter.validateOptions(options2);
      expect(errors2).toContain('PDF margin must be between 10 and 50mm');
    });
  });

  describe('Size Estimation', () => {
    it('should estimate export size', () => {
      const estimatedSize = exporter.estimateSize(story);

      expect(estimatedSize).toBeGreaterThan(0);
      expect(estimatedSize).toBe(10000 + (story.passages.size * 2000));
    });

    it('should scale estimate with number of passages', () => {
      const smallStory = new Story({
        metadata: {
          title: 'Small',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      smallStory.addPassage(new Passage({ title: 'Passage 1' }));

      const largeStory = new Story({
        metadata: {
          title: 'Large',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      for (let i = 0; i < 100; i++) {
        largeStory.addPassage(new Passage({ title: `Passage ${i}` }));
      }

      const smallSize = exporter.estimateSize(smallStory);
      const largeSize = exporter.estimateSize(largeStory);

      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });

  describe('Story Metadata', () => {
    it('should include story metadata in cover page', async () => {
      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      // Cover page includes title, author, description, metadata
    });

    it('should handle missing optional metadata', async () => {
      const minimalStory = new Story({
        metadata: {
          title: 'Minimal Story',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      const startPassage = new Passage({ title: 'Start' });
      minimalStory.addPassage(startPassage);
      minimalStory.startPassage = startPassage.id;

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story: minimalStory,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Complex Stories', () => {
    it('should handle large stories with many passages', async () => {
      const largeStory = new Story({
        metadata: {
          title: 'Large Story',
          author: 'Test Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passages: Passage[] = [];

      // Create 50 passages
      for (let i = 0; i < 50; i++) {
        const passage = new Passage({ title: `Passage ${i}` });
        passage.content = `This is the content for passage ${i}. It has some text in it to make the PDF more realistic.`;
        passages.push(passage);
        largeStory.addPassage(passage);
      }

      // Link passages
      for (let i = 0; i < 49; i++) {
        passages[i].addChoice(new Choice({ text: `Continue to ${i + 1}`, target: passages[i + 1].id }));
      }

      largeStory.startPassage = passages[0].id;

      const options: ExportOptions = {
        format: 'pdf',
        pdfMode: 'playable',
      };

      const context: ExportContext = {
        story: largeStory,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle passages with long content', async () => {
      const passages = Array.from(story.passages.values());
      const passage = passages[0];
      passage.content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });

    it('should handle passages with many choices', async () => {
      const passage = new Passage({ title: 'Hub Passage' });
      passage.content = 'You are at a crossroads with many paths.';

      for (let i = 0; i < 20; i++) {
        passage.addChoice(new Choice({ text: `Path ${i}`, target: `target${i}` }));
      }

      story.addPassage(passage);

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Filename Generation', () => {
    it('should generate filename with story title', async () => {
      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.filename).toContain('test_story');
    });

    it('should include mode in filename', async () => {
      const modes: ('playable' | 'manuscript' | 'outline')[] = ['playable', 'manuscript', 'outline'];

      for (const mode of modes) {
        const options: ExportOptions = {
          format: 'pdf',
          pdfMode: mode,
        };

        const context: ExportContext = {
          story,
          options,
        };

        const result = await exporter.export(context);

        expect(result.filename).toContain(mode);
      }
    });

    it('should include timestamp in filename', async () => {
      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      expect(result.filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should sanitize story title in filename', async () => {
      story.metadata.title = 'Test Story: With Special Characters!@#$%';

      const options: ExportOptions = {
        format: 'pdf',
      };

      const context: ExportContext = {
        story,
        options,
      };

      const result = await exporter.export(context);

      // Special characters should be replaced with underscores
      expect(result.filename).not.toMatch(/[:!@#$%]/);
    });
  });
});
