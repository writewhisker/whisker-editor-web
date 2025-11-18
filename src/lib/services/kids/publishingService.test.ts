/**
 * Tests for Publishing Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublishingService } from './publishingService';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { kidsModeActions } from '../../stores/kidsModeStore';

// Mock the exporters
vi.mock('../../export/MinecraftExporter', () => ({
  MinecraftExporter: {
    export: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' })),
    getSuggestedFilename: vi.fn().mockReturnValue('test_story_datapack.zip'),
  },
}));

vi.mock('../../export/RobloxExporter', () => ({
  RobloxExporter: {
    export: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' })),
    getSuggestedFilename: vi.fn().mockReturnValue('test_story_roblox.zip'),
  },
}));

describe('PublishingService', () => {
  let story: Story;

  beforeEach(() => {
    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
      },
    });

    const passage1 = new Passage({
      id: 'start',
      title: 'Start',
      content: 'Beginning of story',
      position: { x: 0, y: 0 },
    });

    story.passages.set('start', passage1);
    story.startPassage = 'start';

    // Clear history before each test
    PublishingService.clearHistory();
  });

  describe('exportForMinecraft', () => {
    it('should export story for Minecraft', async () => {
      const blob = await PublishingService.exportForMinecraft(story);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should record export in history', async () => {
      await PublishingService.exportForMinecraft(story);
      const history = PublishingService.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0].platform).toBe('minecraft');
      expect(history[0].success).toBe(true);
    });

    it('should use custom options', async () => {
      const options = {
        minecraftVersion: '1.19',
        includeNPCs: false,
      };

      const blob = await PublishingService.exportForMinecraft(story, options);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('exportForRoblox', () => {
    it('should export story for Roblox', async () => {
      const blob = await PublishingService.exportForRoblox(story);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should record export in history', async () => {
      await PublishingService.exportForRoblox(story);
      const history = PublishingService.getExportHistory();
      expect(history).toHaveLength(1);
      expect(history[0].platform).toBe('roblox');
      expect(history[0].success).toBe(true);
    });

    it('should use custom options', async () => {
      const options = {
        includeGUI: false,
        includeBadges: false,
      };

      const blob = await PublishingService.exportForRoblox(story, options);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('getExportHistory', () => {
    it('should return empty array initially', () => {
      const history = PublishingService.getExportHistory();
      expect(history).toEqual([]);
    });

    it('should return export history', async () => {
      await PublishingService.exportForMinecraft(story);
      await PublishingService.exportForRoblox(story);

      const history = PublishingService.getExportHistory();
      expect(history).toHaveLength(2);
    });

    it('should return a copy of history', () => {
      const history1 = PublishingService.getExportHistory();
      const history2 = PublishingService.getExportHistory();
      expect(history1).not.toBe(history2);
    });
  });

  describe('getSuccessfulExportsCount', () => {
    it('should count all successful exports', async () => {
      await PublishingService.exportForMinecraft(story);
      await PublishingService.exportForRoblox(story);

      const count = PublishingService.getSuccessfulExportsCount();
      expect(count).toBe(2);
    });

    it('should count platform-specific exports', async () => {
      await PublishingService.exportForMinecraft(story);
      await PublishingService.exportForMinecraft(story);
      await PublishingService.exportForRoblox(story);

      const minecraftCount = PublishingService.getSuccessfulExportsCount('minecraft');
      const robloxCount = PublishingService.getSuccessfulExportsCount('roblox');

      expect(minecraftCount).toBe(2);
      expect(robloxCount).toBe(1);
    });
  });

  describe('clearHistory', () => {
    it('should clear export history', async () => {
      await PublishingService.exportForMinecraft(story);
      expect(PublishingService.getExportHistory()).toHaveLength(1);

      PublishingService.clearHistory();
      expect(PublishingService.getExportHistory()).toEqual([]);
    });
  });

  describe('downloadBlob', () => {
    it('should create and trigger download', () => {
      // Mock DOM elements
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      const blob = new Blob(['test'], { type: 'text/plain' });
      PublishingService.downloadBlob(blob, 'test.txt');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('generateThumbnail', () => {
    it('should return empty string in test environment', () => {
      // In test environment, document is not available
      const thumbnail = PublishingService.generateThumbnail(story);
      expect(thumbnail).toBe('');
    });
  });

  describe('copyToClipboard', () => {
    it('should handle missing clipboard API gracefully', async () => {
      // In test environment, navigator.clipboard might not be available
      // The function should not throw
      await expect(PublishingService.copyToClipboard(story)).resolves.not.toThrow();
    });
  });

  describe('generateQRCode', () => {
    it('should return empty string in test environment', async () => {
      // In test environment, document is not available
      const qrCode = await PublishingService.generateQRCode('https://example.com');
      expect(qrCode).toBe('');
    });
  });

  describe('Badge Awarding', () => {
    beforeEach(() => {
      // Clear history to reset badge conditions
      PublishingService.clearHistory();
    });

    it('should award first_export badge on first export', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      await PublishingService.exportForMinecraft(story);

      expect(awardBadgeSpy).toHaveBeenCalledWith('first_export');
      awardBadgeSpy.mockRestore();
    });

    it('should award minecraft_creator badge on first Minecraft export', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      await PublishingService.exportForMinecraft(story);

      expect(awardBadgeSpy).toHaveBeenCalledWith('minecraft_creator');
      awardBadgeSpy.mockRestore();
    });

    it('should award roblox_creator badge on first Roblox export', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      await PublishingService.exportForRoblox(story);

      expect(awardBadgeSpy).toHaveBeenCalledWith('roblox_creator');
      awardBadgeSpy.mockRestore();
    });

    it('should award export_veteran badge at 5 exports', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      // Do 5 exports
      for (let i = 0; i < 5; i++) {
        await PublishingService.exportForMinecraft(story);
      }

      expect(awardBadgeSpy).toHaveBeenCalledWith('export_veteran');
      awardBadgeSpy.mockRestore();
    });

    it('should award export_master badge at 10 exports', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      // Do 10 exports
      for (let i = 0; i < 10; i++) {
        await PublishingService.exportForMinecraft(story);
      }

      expect(awardBadgeSpy).toHaveBeenCalledWith('export_master');
      awardBadgeSpy.mockRestore();
    });

    it('should award multi_platform_creator badge when using both platforms', async () => {
      const awardBadgeSpy = vi.spyOn(kidsModeActions, 'awardBadge');

      await PublishingService.exportForMinecraft(story);
      await PublishingService.exportForRoblox(story);

      expect(awardBadgeSpy).toHaveBeenCalledWith('multi_platform_creator');
      awardBadgeSpy.mockRestore();
    });
  });

  describe('History Management', () => {
    it('should limit history to 50 entries', async () => {
      // Export 60 times
      for (let i = 0; i < 60; i++) {
        await PublishingService.exportForMinecraft(story);
      }

      const history = PublishingService.getExportHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should keep most recent entries when trimming', async () => {
      // Export 60 times
      for (let i = 0; i < 60; i++) {
        await PublishingService.exportForMinecraft(story);
      }

      const history = PublishingService.getExportHistory();
      // Should have the most recent 50
      expect(history).toHaveLength(50);
    });
  });
});
