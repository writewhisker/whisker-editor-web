import { describe, it, expect, beforeEach } from 'vitest';
import { WLSExporter } from './WLSExporter';
import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';
import type { ExportContext } from '../types';

describe('WLSExporter', () => {
  let exporter: WLSExporter;

  beforeEach(() => {
    exporter = new WLSExporter();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(exporter.name).toBe('WLS Exporter');
      expect(exporter.format).toBe('wls');
      expect(exporter.extension).toBe('.ws');
      expect(exporter.mimeType).toBe('text/plain');
    });
  });

  describe('export', () => {
    it('should export simple story', async () => {
      const story = new Story({
        metadata: {
          title: 'Simple Story',
          author: 'Test Author',
        },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Welcome to the story!',
      });
      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('@title: Simple Story');
      expect(result.content).toContain('@author: Test Author');
      expect(result.content).toContain(':: Start');
      expect(result.content).toContain('Welcome to the story!');
    });

    it('should export story with @vars block', async () => {
      const story = new Story({
        metadata: { title: 'Variable Story' },
      });

      story.addVariable(new Variable({
        name: 'gold',
        value: 100,
        scope: 'story',
      }));

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('@vars');
      expect(result.content).toContain('@/vars');
      expect(result.content).toContain('gold');
    });

    it('should export story with choices', async () => {
      const story = new Story({
        metadata: { title: 'Choice Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Choose your path:',
      });

      passage.addChoice(new Choice({
        text: 'Go left',
        target: 'Left',
        choiceType: 'once',
      }));

      passage.addChoice(new Choice({
        text: 'Go right',
        target: 'Right',
        choiceType: 'sticky',
      }));

      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('+ [Go left] -> Left');
      expect(result.content).toContain('* [Go right] -> Right');
    });

    it('should export choice with condition', async () => {
      const story = new Story({
        metadata: { title: 'Conditional Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'What do you do?',
      });

      passage.addChoice(new Choice({
        text: 'Buy sword',
        target: 'Shop',
        condition: 'gold >= 50',
        choiceType: 'once',
      }));

      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('+ [Buy sword]{if gold >= 50} -> Shop');
    });

    it('should export choice with action', async () => {
      const story = new Story({
        metadata: { title: 'Action Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Find treasure?',
      });

      passage.addChoice(new Choice({
        text: 'Take gold',
        target: 'Next',
        action: 'gold += 100',
        choiceType: 'once',
      }));

      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('+ [Take gold]{$ gold += 100} -> Next');
    });

    it('should export passage tags', async () => {
      const story = new Story({
        metadata: { title: 'Tagged Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'A battle scene.',
        tags: ['battle', 'combat'],
      });

      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain(':: Start [battle, combat]');
    });

    it('should export @start directive', async () => {
      const story = new Story({
        metadata: { title: 'Start Story' },
      });

      const intro = new Passage({
        title: 'Introduction',
        content: 'Welcome!',
      });
      story.addPassage(intro);

      const other = new Passage({
        title: 'Other',
        content: 'Other passage.',
      });
      story.addPassage(other);

      story.startPassage = intro.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('@start: Introduction');
    });

    it('should export story metadata directives', async () => {
      const story = new Story({
        metadata: {
          title: 'Full Metadata Story',
          author: 'Test Author',
          version: '2.0',
          ifid: 'abc-123-def',
          description: 'A test story',
        },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Hello!',
      });
      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('@title: Full Metadata Story');
      expect(result.content).toContain('@author: Test Author');
      expect(result.content).toContain('@version: 2.0');
      expect(result.content).toContain('@ifid: abc-123-def');
      expect(result.content).toContain('@description: A test story');
    });

    it('should export story structure correctly', async () => {
      const story = new Story({
        metadata: { title: 'Structure Test' },
      });

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('@title: Structure Test');
      expect(result.content).toContain('::');
    });

    it('should include duration in result', async () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Hello!',
      });
      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should generate correct filename', async () => {
      const story = new Story({
        metadata: { title: 'My Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Hello!',
      });
      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/^my_story_\d{4}-\d{2}-\d{2}\.ws$/);
    });

    it('should use custom filename if provided', async () => {
      const story = new Story({
        metadata: { title: 'My Story' },
      });

      const passage = new Passage({
        title: 'Start',
        content: 'Hello!',
      });
      story.addPassage(passage);
      story.startPassage = passage.id;

      const context: ExportContext = {
        story,
        options: { format: 'wls', filename: 'custom_name' },
      };

      const result = await exporter.export(context);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('custom_name.ws');
    });
  });

  describe('validateOptions', () => {
    it('should accept wls format', () => {
      const errors = exporter.validateOptions({ format: 'wls' });
      expect(errors).toHaveLength(0);
    });

    it('should reject non-wls format', () => {
      const errors = exporter.validateOptions({ format: 'json' as any });
      expect(errors.some(e => e.includes('Invalid format'))).toBe(true);
    });
  });

  describe('estimateSize', () => {
    it('should estimate export size', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });

      story.addVariable(new Variable({
        name: 'test',
        value: 123,
        scope: 'story',
      }));

      const passage = new Passage({
        title: 'Start',
        content: 'Hello world!',
      });

      passage.addChoice(new Choice({
        text: 'Continue',
        target: 'Next',
        choiceType: 'once',
      }));

      story.addPassage(passage);

      const size = exporter.estimateSize(story);
      expect(size).toBeGreaterThan(0);
    });
  });
});
