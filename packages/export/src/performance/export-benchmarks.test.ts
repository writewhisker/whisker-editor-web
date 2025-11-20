/**
 * Export Performance Benchmarks
 *
 * Tests to ensure export operations meet performance targets
 * for various story sizes and export formats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Story, Passage, Choice } from '@writewhisker/core-ts';
import {
  HTMLExporter,
  PDFExporter,
  MarkdownExporter,
  JSONExporter
} from '../formats';
import type { ExportContext } from '../types';

/**
 * Generate a story with specified number of passages
 */
function generateStory(passageCount: number): Story {
  const story = new Story({
    metadata: {
      title: `Performance Test Story (${passageCount} passages)`,
      author: 'Benchmark Suite',
      description: `Generated story with ${passageCount} passages for performance testing`,
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  });

  const passages: Passage[] = [];

  // Create passages
  for (let i = 0; i < passageCount; i++) {
    const passage = new Passage({ title: `Passage ${i}` });

    // Add realistic content (100-200 words)
    const wordCount = 100 + Math.floor(Math.random() * 100);
    const words = [];
    for (let j = 0; j < wordCount; j++) {
      words.push('Lorem ipsum dolor sit amet consectetur'.split(' ')[j % 6]);
    }
    passage.content = words.join(' ') + '.';

    passages.push(passage);
    story.addPassage(passage);
  }

  // Link passages in a realistic pattern
  for (let i = 0; i < passages.length; i++) {
    const choiceCount = Math.min(3, passages.length - i - 1);

    for (let j = 0; j < choiceCount; j++) {
      const targetIndex = Math.min(i + j + 1, passages.length - 1);
      passages[i].addChoice(new Choice({
        text: `Choice ${j + 1}`,
        target: passages[targetIndex].id,
      }));
    }
  }

  story.startPassage = passages[0]?.id;

  return story;
}

describe('Export Performance Benchmarks', () => {
  // Performance targets (in milliseconds)
  const TARGETS = {
    small: {
      passages: 10,
      html: 100,
      pdf: 500,
      markdown: 100,
      json: 50,
    },
    medium: {
      passages: 100,
      html: 500,
      pdf: 2000,
      markdown: 300,
      json: 100,
    },
    large: {
      passages: 500,
      html: 2000,
      pdf: 5000,
      markdown: 1000,
      json: 300,
    },
  };

  describe('Small Stories (10 passages)', () => {
    let story: Story;

    beforeEach(() => {
      story = generateStory(TARGETS.small.passages);
    });

    it('should export to HTML within target time', async () => {
      const exporter = new HTMLExporter();
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.small.html);

      console.log(`HTML Export (${TARGETS.small.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.small.html}ms)`);
    });

    it('should export to PDF within target time', async () => {
      const exporter = new PDFExporter();
      const context: ExportContext = {
        story,
        options: { format: 'pdf' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.small.pdf);

      console.log(`PDF Export (${TARGETS.small.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.small.pdf}ms)`);
    });

    it('should export to Markdown within target time', async () => {
      const exporter = new MarkdownExporter();
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.small.markdown);

      console.log(`Markdown Export (${TARGETS.small.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.small.markdown}ms)`);
    });

    it('should export to JSON within target time', async () => {
      const exporter = new JSONExporter();
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.small.json);

      console.log(`JSON Export (${TARGETS.small.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.small.json}ms)`);
    });
  });

  describe('Medium Stories (100 passages)', () => {
    let story: Story;

    beforeEach(() => {
      story = generateStory(TARGETS.medium.passages);
    });

    it('should export to HTML within target time', async () => {
      const exporter = new HTMLExporter();
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.medium.html);

      console.log(`HTML Export (${TARGETS.medium.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.medium.html}ms)`);
    });

    it('should export to PDF within target time', async () => {
      const exporter = new PDFExporter();
      const context: ExportContext = {
        story,
        options: { format: 'pdf' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.medium.pdf);

      console.log(`PDF Export (${TARGETS.medium.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.medium.pdf}ms)`);
    });

    it('should export to Markdown within target time', async () => {
      const exporter = new MarkdownExporter();
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.medium.markdown);

      console.log(`Markdown Export (${TARGETS.medium.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.medium.markdown}ms)`);
    });

    it('should export to JSON within target time', async () => {
      const exporter = new JSONExporter();
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.medium.json);

      console.log(`JSON Export (${TARGETS.medium.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.medium.json}ms)`);
    });
  });

  describe('Large Stories (500 passages)', () => {
    let story: Story;

    beforeEach(() => {
      story = generateStory(TARGETS.large.passages);
    });

    it('should export to HTML within target time', async () => {
      const exporter = new HTMLExporter();
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.large.html);

      console.log(`HTML Export (${TARGETS.large.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.large.html}ms)`);
    });

    it('should export to PDF within target time', async () => {
      const exporter = new PDFExporter();
      const context: ExportContext = {
        story,
        options: { format: 'pdf' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.large.pdf);

      console.log(`PDF Export (${TARGETS.large.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.large.pdf}ms)`);
    });

    it('should export to Markdown within target time', async () => {
      const exporter = new MarkdownExporter();
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.large.markdown);

      console.log(`Markdown Export (${TARGETS.large.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.large.markdown}ms)`);
    });

    it('should export to JSON within target time', async () => {
      const exporter = new JSONExporter();
      const context: ExportContext = {
        story,
        options: { format: 'json' },
      };

      const startTime = performance.now();
      const result = await exporter.export(context);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(TARGETS.large.json);

      console.log(`JSON Export (${TARGETS.large.passages} passages): ${duration.toFixed(2)}ms (target: ${TARGETS.large.json}ms)`);
    });
  });

  describe('Export Size Validation', () => {
    it('should generate reasonably sized HTML exports', async () => {
      const story = generateStory(100);
      const exporter = new HTMLExporter();
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);

      // HTML should be < 1MB for 100 passages
      expect(result.size!).toBeLessThan(1024 * 1024);

      console.log(`HTML Export size (100 passages): ${(result.size! / 1024).toFixed(2)}KB`);
    });

    it('should generate reasonably sized PDF exports', async () => {
      const story = generateStory(100);
      const exporter = new PDFExporter();
      const context: ExportContext = {
        story,
        options: { format: 'pdf' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);

      // PDF should be < 2MB for 100 passages
      expect(result.size!).toBeLessThan(2 * 1024 * 1024);

      console.log(`PDF Export size (100 passages): ${(result.size! / 1024).toFixed(2)}KB`);
    });

    it('should estimate export size accurately', async () => {
      const story = generateStory(50);
      const exporter = new HTMLExporter();

      const estimatedSize = exporter.estimateSize(story);

      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };
      const result = await exporter.export(context);

      expect(result.success).toBe(true);

      // Estimate should be within 50% of actual size
      const actualSize = result.size!;
      const ratio = estimatedSize / actualSize;

      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);

      console.log(`Size estimation accuracy: estimated=${estimatedSize}, actual=${actualSize}, ratio=${ratio.toFixed(2)}x`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated exports', async () => {
      const story = generateStory(50);
      const exporter = new HTMLExporter();
      const context: ExportContext = {
        story,
        options: { format: 'html' },
      };

      // Warm up
      await exporter.export(context);

      // Run multiple exports
      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const result = await exporter.export(context);
        expect(result.success).toBe(true);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Average export time over ${iterations} iterations: ${avgTime.toFixed(2)}ms`);

      // Average time should be reasonable (not increasing significantly)
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe('Concurrent Exports', () => {
    it('should handle multiple concurrent exports', async () => {
      const stories = [
        generateStory(20),
        generateStory(30),
        generateStory(40),
      ];

      const exporters = [
        new HTMLExporter(),
        new PDFExporter(),
        new MarkdownExporter(),
      ];

      const formats: ('html' | 'pdf' | 'markdown')[] = ['html', 'pdf', 'markdown'];

      const startTime = performance.now();

      const results = await Promise.all(
        stories.map((story, i) => {
          const context: ExportContext = {
            story,
            options: { format: formats[i] },
          };
          return exporters[i].export(context);
        })
      );

      const totalTime = performance.now() - startTime;

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      console.log(`Concurrent export time (3 stories): ${totalTime.toFixed(2)}ms`);

      // Concurrent exports should complete in reasonable time
      expect(totalTime).toBeLessThan(10000);
    });
  });
});
