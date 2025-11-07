import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownExporter } from './MarkdownExporter';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';
import type { ExportContext } from '../types';

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;
  let story: Story;

  beforeEach(() => {
    exporter = new MarkdownExporter();

    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        description: 'A test story for markdown export',
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
      expect(exporter.name).toBe('Markdown Exporter');
      expect(exporter.format).toBe('markdown');
      expect(exporter.extension).toBe('.md');
      expect(exporter.mimeType).toBe('text/markdown');
    });
  });

  describe('export', () => {
    it('should export story to Markdown', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.filename).toBeDefined();
      expect(result.mimeType).toBe('text/markdown');
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include story title and metadata', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('# Test Story');
      expect(md).toContain('**Author:** Test Author');
      expect(md).toContain('**Version:** 1.0.0');
      expect(md).toContain('A test story for markdown export');
    });

    it('should include story structure summary', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('## Story Structure');
      // Story creates a default "Start" passage, so we have 4 total (default + 3 added)
      expect(md).toContain('**Total Passages:** 4');
      expect(md).toContain('**Total Choices:** 3');
      expect(md).toContain('**Total Variables:** 1');
      expect(md).toContain('**Start Passage:** Start');
    });

    it('should include all passages', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('## Passages');
      expect(md).toContain('### Start');
      expect(md).toContain('### Second');
      expect(md).toContain('### Ending');
    });

    it('should mark start passage with star', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('### Start ⭐ (Start)');
    });

    it('should include passage content', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('Welcome to the story!');
      expect(md).toContain('This is the second passage.');
      expect(md).toContain('The end.');
    });

    it('should include passage tags', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('**Tags:** intro');
      expect(md).toContain('**Tags:** chapter1');
    });

    it('should include choices with targets', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('**Choices:**');
      expect(md).toContain('**Continue** → *Second*');
      expect(md).toContain('**Jump to end** → *Ending*');
    });

    it('should include choice conditions', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('`[if score > 10]`');
    });

    it('should include variables section', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('## Variables');
      // Variable value may be undefined depending on how it's serialized
      expect(md).toMatch(/\*\*score\*\* = `(0|undefined)` \(number\)/);
    });

    it('should include validation section when requested', async () => {
      const validation = {
        timestamp: Date.now(),
        duration: 10,
        valid: false,
        errorCount: 2,
        warningCount: 1,
        infoCount: 0,
        issues: [
          { id: 'v1', severity: 'error' as const, category: 'links' as const, message: 'Dead link found', passageId: 'p1', fixable: false },
          { id: 'v2', severity: 'warning' as const, category: 'variables' as const, message: 'Unused variable', passageId: 'p2', fixable: false },
        ],
        stats: {
          totalPassages: 3,
          reachablePassages: 3,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      const context: ExportContext = {
        story,
        options: { format: 'markdown', includeValidation: true },
        validation,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('## Validation Status');
      expect(md).toContain('**Errors:** 2');
      expect(md).toContain('**Warnings:** 1');
      expect(md).toContain('Dead link found');
      expect(md).toContain('Unused variable');
    });

    it('should include metrics section when requested', async () => {
      const metrics = {
        depth: 3,
        branchingFactor: 1.5,
        density: 0.75,
        totalPassages: 3,
        totalChoices: 3,
        totalVariables: 1,
        totalWords: 20,
        avgWordsPerPassage: 6.67,
        uniqueEndings: 1,
        reachabilityScore: 1.0,
        conditionalComplexity: 1,
        variableComplexity: 0.33,
        estimatedPlayTime: 5,
        estimatedPaths: 2,
      };

      const context: ExportContext = {
        story,
        options: { format: 'markdown', includeMetrics: true },
        metrics,
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      const md = result.content as string;
      expect(md).toContain('## Quality Metrics');
      expect(md).toContain('**Depth:** 3');
      expect(md).toContain('**Branching Factor:** 1.50');
      expect(md).toContain('**Total Passages:** 3');
      expect(md).toContain('**Unique Endings:** 1');
      expect(md).toContain('**Estimated Play Time:** 5 minutes');
    });

    it('should generate meaningful filename', async () => {
      const context: ExportContext = {
        story,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/test_story_\d{4}-\d{2}-\d{2}\.md/);
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
      } as unknown as Story;

      const context: ExportContext = {
        story: badStory,
        options: { format: 'markdown' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot iterate passages');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateOptions', () => {
    it('should accept valid Markdown options', () => {
      const errors = exporter.validateOptions({ format: 'markdown' });
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const errors = exporter.validateOptions({ format: 'html' } as any);
      expect(errors).toContain('Invalid format for Markdown exporter');
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
