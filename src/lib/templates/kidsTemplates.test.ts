/**
 * Tests for Kids Templates
 */

import { describe, it, expect } from 'vitest';
import {
  kidsTemplates,
  getTemplatesByPlatform,
  getTemplateById,
  minecraftCaveAdventure,
  minecraftVillageQuest,
  robloxObbyAdventure,
  robloxRoleplaySchool,
} from './kidsTemplates';

describe('kidsTemplates', () => {
  describe('Template Structure', () => {
    it('should have at least 4 templates', () => {
      expect(kidsTemplates.length).toBeGreaterThanOrEqual(4);
    });

    it('should have valid template structure', () => {
      kidsTemplates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('platform');
        expect(template).toHaveProperty('difficulty');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('tags');
        expect(template).toHaveProperty('generateStory');
        expect(typeof template.generateStory).toBe('function');
      });
    });

    it('should have unique IDs', () => {
      const ids = kidsTemplates.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Minecraft Templates', () => {
    it('should include Minecraft Cave Adventure', () => {
      expect(minecraftCaveAdventure.id).toBe('minecraft-cave-adventure');
      expect(minecraftCaveAdventure.platform).toBe('minecraft');
      expect(minecraftCaveAdventure.difficulty).toBe('beginner');
      expect(minecraftCaveAdventure.icon).toBe('⛏️');
    });

    it('should include Minecraft Village Quest', () => {
      expect(minecraftVillageQuest.id).toBe('minecraft-village-quest');
      expect(minecraftVillageQuest.platform).toBe('minecraft');
      expect(minecraftVillageQuest.difficulty).toBe('beginner');
      expect(minecraftVillageQuest.icon).toBe('🏘️');
    });

    it('should generate valid Minecraft Cave Adventure story', () => {
      const story = minecraftCaveAdventure.generateStory();
      expect(story).toBeDefined();
      expect(story.metadata).toBeDefined();
      expect(story.metadata.title).toBe('My Cave Adventure');
      expect(story.passages).toBeDefined();
      expect(story.startPassage).toBeDefined();
    });

    it('should generate valid Minecraft Village Quest story', () => {
      const story = minecraftVillageQuest.generateStory();
      expect(story).toBeDefined();
      expect(story.metadata.title).toBe('Village Hero');
      expect(story.passages).toBeDefined();
    });
  });

  describe('Roblox Templates', () => {
    it('should include Roblox Obby Adventure', () => {
      expect(robloxObbyAdventure.id).toBe('roblox-obby-adventure');
      expect(robloxObbyAdventure.platform).toBe('roblox');
      expect(robloxObbyAdventure.difficulty).toBe('beginner');
      expect(robloxObbyAdventure.icon).toBe('🎮');
    });

    it('should include Roblox Roleplay School', () => {
      expect(robloxRoleplaySchool.id).toBe('roblox-roleplay-school');
      expect(robloxRoleplaySchool.platform).toBe('roblox');
      expect(robloxRoleplaySchool.difficulty).toBe('beginner');
      expect(robloxRoleplaySchool.icon).toBe('🏫');
    });

    it('should generate valid Roblox Obby story', () => {
      const story = robloxObbyAdventure.generateStory();
      expect(story).toBeDefined();
      expect(story.metadata.title).toBe('My Obby Adventure');
      expect(story.passages).toBeDefined();
    });

    it('should generate valid Roblox School story', () => {
      const story = robloxRoleplaySchool.generateStory();
      expect(story).toBeDefined();
      expect(story.metadata.title).toBe('School Day');
      expect(story.passages).toBeDefined();
    });
  });

  describe('Generated Stories', () => {
    it('should have multiple passages', () => {
      const story = minecraftCaveAdventure.generateStory();
      const passageCount = Object.keys(story.passages).length;
      expect(passageCount).toBeGreaterThan(1);
    });

    it('should have valid start passage', () => {
      const story = minecraftCaveAdventure.generateStory();
      expect(story.startPassage).toBeDefined();
      expect(story.passages[story.startPassage]).toBeDefined();
    });

    it('should have passages with content', () => {
      const story = minecraftCaveAdventure.generateStory();
      const startPassage = story.passages[story.startPassage];
      expect(startPassage.content).toBeTruthy();
      expect(startPassage.content.length).toBeGreaterThan(0);
    });

    it('should have passages with choices', () => {
      const story = minecraftCaveAdventure.generateStory();
      const startPassage = story.passages[story.startPassage];
      expect(startPassage.choices).toBeDefined();
      expect(Array.isArray(startPassage.choices)).toBe(true);
    });

    it('should have valid choice targets', () => {
      const story = minecraftCaveAdventure.generateStory();
      Object.values(story.passages).forEach((passage: any) => {
        if (passage.choices && passage.choices.length > 0) {
          passage.choices.forEach((choice: any) => {
            expect(choice.target).toBeDefined();
            // Target should exist in passages
            expect(story.passages[choice.target]).toBeDefined();
          });
        }
      });
    });
  });

  describe('getTemplatesByPlatform', () => {
    it('should return Minecraft templates', () => {
      const templates = getTemplatesByPlatform('minecraft');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(['minecraft', 'both']).toContain(t.platform);
      });
    });

    it('should return Roblox templates', () => {
      const templates = getTemplatesByPlatform('roblox');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(['roblox', 'both']).toContain(t.platform);
      });
    });

    it('should return both platform templates', () => {
      const templates = getTemplatesByPlatform('both');
      expect(templates.length).toBeGreaterThanOrEqual(0);
      templates.forEach(t => {
        expect(t.platform).toBe('both');
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', () => {
      const template = getTemplateById('minecraft-cave-adventure');
      expect(template).toBeDefined();
      expect(template?.id).toBe('minecraft-cave-adventure');
    });

    it('should return undefined for non-existent ID', () => {
      const template = getTemplateById('non-existent-template');
      expect(template).toBeUndefined();
    });
  });

  describe('Template Metadata', () => {
    it('should have appropriate tags', () => {
      kidsTemplates.forEach(template => {
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });

    it('should have valid difficulty levels', () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      kidsTemplates.forEach(template => {
        expect(validDifficulties).toContain(template.difficulty);
      });
    });

    it('should have valid platforms', () => {
      const validPlatforms = ['minecraft', 'roblox', 'both'];
      kidsTemplates.forEach(template => {
        expect(validPlatforms).toContain(template.platform);
      });
    });
  });
});
