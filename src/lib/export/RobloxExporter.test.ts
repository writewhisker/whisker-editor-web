/**
 * Tests for Roblox Exporter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RobloxExporter } from './RobloxExporter';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';

describe('RobloxExporter', () => {
  let story: Story;

  beforeEach(() => {
    // Create a simple test story
    story = new Story({
      metadata: {
        title: 'Test Game',
        author: 'Game Creator',
        version: '1.0.0',
      },
    });

    const passage1 = new Passage({
      id: 'start',
      title: 'Lobby',
      content: 'Welcome to the game!',
      position: { x: 0, y: 0 },
    });
    passage1.addChoice().text = 'Start playing';
    passage1.choices[0].target = 'game';

    const passage2 = new Passage({
      id: 'game',
      title: 'Game Area',
      content: 'You are now in the game.',
      position: { x: 100, y: 0 },
    });

    story.passages.set('start', passage1);
    story.passages.set('game', passage2);
    story.startPassage = 'start';
  });

  describe('export', () => {
    it('should export to a Blob', async () => {
      const options = {
        projectName: 'TestGame',
        description: 'Test Roblox game',
        includeGUI: true,
        includeDialogueSystem: true,
        includeBadges: true,
        includeDataStore: true,
      };

      const blob = await RobloxExporter.export(story, options);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should create a ZIP file', async () => {
      const options = {
        projectName: 'TestGame',
        description: 'Test Roblox game',
        includeGUI: true,
        includeDialogueSystem: true,
        includeBadges: false,
        includeDataStore: false,
      };

      const blob = await RobloxExporter.export(story, options);
      expect(blob.type).toBe('application/zip');
    });
  });

  describe('getSuggestedFilename', () => {
    it('should generate filename with roblox suffix', () => {
      const filename = RobloxExporter.getSuggestedFilename(story);
      expect(filename).toBe('test_game_roblox.zip');
    });

    it('should sanitize special characters', () => {
      const specialStory = new Story({
        metadata: {
          title: 'My Awesome Game!!!',
          author: 'Author',
        },
      });
      const filename = RobloxExporter.getSuggestedFilename(specialStory);
      expect(filename).toBe('my_awesome_game_roblox.zip');
    });
  });

  describe('sanitizeName', () => {
    it('should preserve case', () => {
      const result = (RobloxExporter as any).sanitizeName('TestName');
      expect(result).toBe('TestName');
    });

    it('should replace spaces with underscores', () => {
      const result = (RobloxExporter as any).sanitizeName('test name');
      expect(result).toBe('test_name');
    });

    it('should remove special characters', () => {
      const result = (RobloxExporter as any).sanitizeName('test-name!');
      expect(result).toBe('test_name');
    });

    it('should collapse multiple underscores', () => {
      const result = (RobloxExporter as any).sanitizeName('test___name');
      expect(result).toBe('test_name');
    });
  });

  describe('escapeString', () => {
    it('should escape backslashes', () => {
      const result = (RobloxExporter as any).escapeString('test\\text');
      expect(result).toBe('test\\\\text');
    });

    it('should escape double quotes', () => {
      const result = (RobloxExporter as any).escapeString('test "quoted" text');
      expect(result).toBe('test \\"quoted\\" text');
    });

    it('should escape newlines', () => {
      const result = (RobloxExporter as any).escapeString('line1\nline2');
      expect(result).toBe('line1\\nline2');
    });

    it('should replace tabs with spaces', () => {
      const result = (RobloxExporter as any).escapeString('test\ttabs');
      expect(result).toBe('test    tabs');
    });
  });

  describe('generateStoryModule', () => {
    it('should include story title', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('Test Game');
    });

    it('should include author name', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('Game Creator');
    });

    it('should include all passages', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('Lobby');
      expect(module).toContain('Game Area');
    });

    it('should include passage content', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('Welcome to the game');
    });

    it('should include choices', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('Start playing');
      expect(module).toContain('Choices');
    });

    it('should define helper functions', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('GetPassage');
      expect(module).toContain('IsEnding');
    });

    it('should return a module', () => {
      const module = (RobloxExporter as any).generateStoryModule(story);
      expect(module).toContain('return StoryModule');
    });
  });

  describe('generateDialogueSystem', () => {
    it('should require the story module', () => {
      const dialogueSystem = (RobloxExporter as any).generateDialogueSystem(story);
      expect(dialogueSystem).toContain('require');
      expect(dialogueSystem).toContain('StoryModule');
    });

    it('should have ShowPassage function', () => {
      const dialogueSystem = (RobloxExporter as any).generateDialogueSystem(story);
      expect(dialogueSystem).toContain('ShowPassage');
    });

    it('should have HandleChoice function', () => {
      const dialogueSystem = (RobloxExporter as any).generateDialogueSystem(story);
      expect(dialogueSystem).toContain('HandleChoice');
    });

    it('should have StartStory function', () => {
      const dialogueSystem = (RobloxExporter as any).generateDialogueSystem(story);
      expect(dialogueSystem).toContain('StartStory');
    });

    it('should create RemoteEvents', () => {
      const dialogueSystem = (RobloxExporter as any).generateDialogueSystem(story);
      expect(dialogueSystem).toContain('RemoteEvent');
      expect(dialogueSystem).toContain('ShowDialogue');
      expect(dialogueSystem).toContain('ChoiceSelected');
    });
  });

  describe('generateGUIScript', () => {
    it('should create ScreenGui', () => {
      const guiScript = (RobloxExporter as any).generateGUIScript(story);
      expect(guiScript).toContain('ScreenGui');
    });

    it('should create dialogue frame', () => {
      const guiScript = (RobloxExporter as any).generateGUIScript(story);
      expect(guiScript).toContain('DialogueFrame');
    });

    it('should have title label', () => {
      const guiScript = (RobloxExporter as any).generateGUIScript(story);
      expect(guiScript).toContain('titleLabel');
    });

    it('should have content label', () => {
      const guiScript = (RobloxExporter as any).generateGUIScript(story);
      expect(guiScript).toContain('contentLabel');
    });

    it('should create choice buttons', () => {
      const guiScript = (RobloxExporter as any).generateGUIScript(story);
      expect(guiScript).toContain('createChoiceButton');
      expect(guiScript).toContain('TextButton');
    });
  });

  describe('generateBadgeScript', () => {
    it('should use BadgeService', () => {
      const badgeScript = (RobloxExporter as any).generateBadgeScript(story);
      expect(badgeScript).toContain('BadgeService');
    });

    it('should have AwardBadge function', () => {
      const badgeScript = (RobloxExporter as any).generateBadgeScript(story);
      expect(badgeScript).toContain('AwardBadge');
    });

    it('should check if user has badge', () => {
      const badgeScript = (RobloxExporter as any).generateBadgeScript(story);
      expect(badgeScript).toContain('UserHasBadgeAsync');
    });
  });

  describe('generateDataStoreScript', () => {
    it('should use DataStoreService', () => {
      const dataStoreScript = (RobloxExporter as any).generateDataStoreScript(story);
      expect(dataStoreScript).toContain('DataStoreService');
    });

    it('should have SaveProgress function', () => {
      const dataStoreScript = (RobloxExporter as any).generateDataStoreScript(story);
      expect(dataStoreScript).toContain('SaveProgress');
    });

    it('should have LoadProgress function', () => {
      const dataStoreScript = (RobloxExporter as any).generateDataStoreScript(story);
      expect(dataStoreScript).toContain('LoadProgress');
    });
  });

  describe('generateReadme', () => {
    const options = {
      projectName: 'TestGame',
      description: 'Test Roblox game',
      includeGUI: true,
      includeDialogueSystem: true,
      includeBadges: true,
      includeDataStore: true,
    };

    it('should include story title', () => {
      const readme = (RobloxExporter as any).generateReadme(story, options);
      expect(readme).toContain('Test Game');
    });

    it('should include author', () => {
      const readme = (RobloxExporter as any).generateReadme(story, options);
      expect(readme).toContain('Game Creator');
    });

    it('should include installation instructions', () => {
      const readme = (RobloxExporter as any).generateReadme(story, options);
      expect(readme).toContain('INSTALLATION');
      expect(readme).toContain('Roblox Studio');
    });

    it('should list included scripts when options are enabled', () => {
      const readme = (RobloxExporter as any).generateReadme(story, options);
      expect(readme).toContain('Dialogue System');
      expect(readme).toContain('GUI Script');
      expect(readme).toContain('Badge System');
      expect(readme).toContain('DataStore');
    });

    it('should not list scripts when options are disabled', () => {
      const minimalOptions = {
        ...options,
        includeGUI: false,
        includeBadges: false,
        includeDataStore: false,
      };
      const readme = (RobloxExporter as any).generateReadme(story, minimalOptions);
      expect(readme).not.toContain('✓ GUI Script');
      expect(readme).not.toContain('✓ Badge System');
      expect(readme).not.toContain('✓ DataStore');
    });
  });
});
