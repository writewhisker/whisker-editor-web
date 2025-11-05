/**
 * Tests for Minecraft Exporter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MinecraftExporter } from './MinecraftExporter';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('MinecraftExporter', () => {
  let story: Story;

  beforeEach(() => {
    // Create a simple test story
    story = new Story({
      metadata: {
        title: 'Test Adventure',
        author: 'Test Author',
        version: '1.0.0',
      },
    });

    const passage1 = new Passage({
      id: 'start',
      title: 'Start',
      content: 'You are at the beginning of an adventure.',
      position: { x: 0, y: 0 },
    });
    passage1.addChoice().text = 'Go to cave';
    passage1.choices[0].target = 'cave';

    const passage2 = new Passage({
      id: 'cave',
      title: 'Cave',
      content: 'You enter a dark cave.',
      position: { x: 100, y: 0 },
    });

    story.passages.set('start', passage1);
    story.passages.set('cave', passage2);
    story.startPassage = 'start';
  });

  describe('export', () => {
    it('should export to a Blob', async () => {
      const options = {
        datapackName: 'TestPack',
        description: 'Test datapack',
        minecraftVersion: '1.20',
        includeNPCs: true,
        includeDialogue: true,
        includeCommands: true,
      };

      const blob = await MinecraftExporter.export(story, options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should create a ZIP file', async () => {
      const options = {
        datapackName: 'TestPack',
        description: 'Test datapack',
        minecraftVersion: '1.20',
        includeNPCs: true,
        includeDialogue: true,
        includeCommands: true,
      };

      const blob = await MinecraftExporter.export(story, options);
      expect(blob.type).toBe('application/zip');
    });
  });

  describe('getSuggestedFilename', () => {
    it('should generate filename with datapack suffix', () => {
      const filename = MinecraftExporter.getSuggestedFilename(story);
      expect(filename).toBe('test_adventure_datapack.zip');
    });

    it('should sanitize special characters', () => {
      const specialStory = new Story({
        metadata: {
          title: 'My Cool Story!!!',
          author: 'Author',
        },
      });
      const filename = MinecraftExporter.getSuggestedFilename(specialStory);
      expect(filename).toBe('my_cool_story_datapack.zip');
    });
  });

  describe('sanitizeName', () => {
    it('should convert to lowercase', () => {
      const result = (MinecraftExporter as any).sanitizeName('TestName');
      expect(result).toBe('testname');
    });

    it('should replace spaces with underscores', () => {
      const result = (MinecraftExporter as any).sanitizeName('test name');
      expect(result).toBe('test_name');
    });

    it('should remove special characters', () => {
      const result = (MinecraftExporter as any).sanitizeName('test-name!');
      expect(result).toBe('test_name');
    });

    it('should collapse multiple underscores', () => {
      const result = (MinecraftExporter as any).sanitizeName('test___name');
      expect(result).toBe('test_name');
    });

    it('should trim leading/trailing underscores', () => {
      const result = (MinecraftExporter as any).sanitizeName('_test_name_');
      expect(result).toBe('test_name');
    });
  });

  describe('getPackFormat', () => {
    it('should return correct pack format for 1.20', () => {
      const format = (MinecraftExporter as any).getPackFormat('1.20');
      expect(format).toBe(15);
    });

    it('should return correct pack format for 1.19', () => {
      const format = (MinecraftExporter as any).getPackFormat('1.19');
      expect(format).toBe(10);
    });

    it('should return default format for unknown version', () => {
      const format = (MinecraftExporter as any).getPackFormat('1.99');
      expect(format).toBe(15);
    });
  });

  describe('escapeText', () => {
    it('should escape backslashes', () => {
      const result = (MinecraftExporter as any).escapeText('test\\text');
      expect(result).toBe('test\\\\text');
    });

    it('should escape double quotes', () => {
      const result = (MinecraftExporter as any).escapeText('test "quoted" text');
      expect(result).toBe('test \\"quoted\\" text');
    });

    it('should escape newlines', () => {
      const result = (MinecraftExporter as any).escapeText('line1\nline2');
      expect(result).toBe('line1\\nline2');
    });

    it('should replace tabs with spaces', () => {
      const result = (MinecraftExporter as any).escapeText('test\ttabs');
      expect(result).toBe('test    tabs');
    });
  });

  describe('generateLoadFunction', () => {
    it('should include story title', () => {
      const loadFunc = (MinecraftExporter as any).generateLoadFunction(story);
      expect(loadFunc).toContain('Test Adventure');
    });

    it('should include author name', () => {
      const loadFunc = (MinecraftExporter as any).generateLoadFunction(story);
      expect(loadFunc).toContain('Test Author');
    });

    it('should create scoreboard objectives', () => {
      const loadFunc = (MinecraftExporter as any).generateLoadFunction(story);
      expect(loadFunc).toContain('scoreboard objectives add');
    });

    it('should start the story', () => {
      const loadFunc = (MinecraftExporter as any).generateLoadFunction(story);
      expect(loadFunc).toContain('function');
    });
  });

  describe('generateDialogueFunction', () => {
    it('should include passage title', () => {
      const passage = story.passages.get('start')!;
      const dialogueFunc = (MinecraftExporter as any).generateDialogueFunction(passage, story);
      expect(dialogueFunc).toContain('Start');
    });

    it('should include passage content', () => {
      const passage = story.passages.get('start')!;
      const dialogueFunc = (MinecraftExporter as any).generateDialogueFunction(passage, story);
      expect(dialogueFunc).toContain('beginning of an adventure');
    });

    it('should include choices as clickable text', () => {
      const passage = story.passages.get('start')!;
      const dialogueFunc = (MinecraftExporter as any).generateDialogueFunction(passage, story);
      expect(dialogueFunc).toContain('Go to cave');
      expect(dialogueFunc).toContain('tellraw');
    });

    it('should handle passages with no choices', () => {
      const passage = story.passages.get('cave')!;
      const dialogueFunc = (MinecraftExporter as any).generateDialogueFunction(passage, story);
      expect(dialogueFunc).toContain('THE END');
    });
  });

  describe('generateReadme', () => {
    const options = {
      datapackName: 'TestPack',
      description: 'Test datapack',
      minecraftVersion: '1.20',
      includeNPCs: true,
      includeDialogue: true,
      includeCommands: true,
    };

    it('should include story title', () => {
      const readme = (MinecraftExporter as any).generateReadme(story, options);
      expect(readme).toContain('Test Adventure');
    });

    it('should include author', () => {
      const readme = (MinecraftExporter as any).generateReadme(story, options);
      expect(readme).toContain('Test Author');
    });

    it('should include installation instructions', () => {
      const readme = (MinecraftExporter as any).generateReadme(story, options);
      expect(readme).toContain('INSTALLATION');
      expect(readme).toContain('datapacks');
      expect(readme).toContain('/reload');
    });

    it('should include Minecraft version', () => {
      const readme = (MinecraftExporter as any).generateReadme(story, options);
      expect(readme).toContain('1.20');
    });
  });
});
