import { describe, it, expect, beforeEach } from 'vitest';
import { AchievementSystem } from './AchievementSystem';

describe('AchievementSystem', () => {
  let achievements: AchievementSystem;

  beforeEach(() => {
    achievements = new AchievementSystem();
  });

  describe('addAchievement', () => {
    it('should add a new achievement', () => {
      const id = achievements.addAchievement({
        name: 'First Steps',
        description: 'Complete the tutorial',
      });

      expect(id).toBeDefined();
      expect(achievements.getAchievement(id)).toBeDefined();
    });

    it('should set default unlocked to false', () => {
      const id = achievements.addAchievement({
        name: 'Test Achievement',
        description: 'Test',
      });

      const achievement = achievements.getAchievement(id);
      expect(achievement?.unlocked).toBe(false);
    });

    it('should allow custom achievement ID', () => {
      const id = achievements.addAchievement({
        id: 'custom-achievement',
        name: 'Custom',
        description: 'Custom achievement',
      });

      expect(id).toBe('custom-achievement');
    });
  });

  describe('hidden achievements', () => {
    it('should hide achievement details until unlocked', () => {
      const id = achievements.addAchievement({
        name: 'Secret Discovery',
        description: 'Find the secret area',
        hidden: true,
      });

      const achievement = achievements.getAchievement(id);
      expect(achievement?.name).toBe('???');
      expect(achievement?.description).toBe('Hidden achievement');
    });

    it('should reveal hidden achievement when unlocked', () => {
      const id = achievements.addAchievement({
        name: 'Secret Discovery',
        description: 'Find the secret area',
        hidden: true,
      });

      achievements.unlock(id);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.name).toBe('Secret Discovery');
      expect(achievement?.description).toBe('Find the secret area');
    });
  });

  describe('unlock', () => {
    it('should unlock an achievement', () => {
      const id = achievements.addAchievement({
        name: 'Victory',
        description: 'Win the game',
      });

      const result = achievements.unlock(id);
      expect(result).toBe(true);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.unlocked).toBe(true);
      expect(achievement?.unlockedAt).toBeDefined();
    });

    it('should not unlock already unlocked achievement', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
      });

      achievements.unlock(id);
      const result = achievements.unlock(id);
      expect(result).toBe(false);
    });

    it('should return false for non-existent achievement', () => {
      const result = achievements.unlock('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('updateProgress', () => {
    it('should update achievement progress', () => {
      const id = achievements.addAchievement({
        name: 'Monster Slayer',
        description: 'Defeat 100 monsters',
        progress: 0,
        target: 100,
      });

      achievements.updateProgress(id, 50);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.progress).toBe(50);
      expect(achievement?.unlocked).toBe(false);
    });

    it('should auto-unlock when target reached', () => {
      const id = achievements.addAchievement({
        name: 'Collector',
        description: 'Collect 10 items',
        progress: 0,
        target: 10,
      });

      achievements.updateProgress(id, 10);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.unlocked).toBe(true);
    });

    it('should not update already unlocked achievement', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
        progress: 0,
        target: 10,
      });

      achievements.unlock(id);
      const result = achievements.updateProgress(id, 5);
      expect(result).toBe(false);
    });
  });

  describe('incrementProgress', () => {
    it('should increment progress by 1', () => {
      const id = achievements.addAchievement({
        name: 'Walker',
        description: 'Take 1000 steps',
        progress: 0,
        target: 1000,
      });

      achievements.incrementProgress(id);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.progress).toBe(1);
    });

    it('should increment progress by delta', () => {
      const id = achievements.addAchievement({
        name: 'Rich',
        description: 'Earn 10000 gold',
        progress: 0,
        target: 10000,
      });

      achievements.incrementProgress(id, 500);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.progress).toBe(500);
    });

    it('should auto-unlock when increment reaches target', () => {
      const id = achievements.addAchievement({
        name: 'Quick',
        description: 'Complete 5 tasks',
        progress: 4,
        target: 5,
      });

      achievements.incrementProgress(id, 1);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.unlocked).toBe(true);
    });
  });

  describe('isUnlocked', () => {
    it('should check if achievement is unlocked', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
      });

      expect(achievements.isUnlocked(id)).toBe(false);

      achievements.unlock(id);
      expect(achievements.isUnlocked(id)).toBe(true);
    });

    it('should return false for non-existent achievement', () => {
      expect(achievements.isUnlocked('nonexistent')).toBe(false);
    });
  });

  describe('getProgress', () => {
    it('should calculate progress percentage', () => {
      const id = achievements.addAchievement({
        name: 'Explorer',
        description: 'Visit 20 locations',
        progress: 10,
        target: 20,
      });

      expect(achievements.getProgress(id)).toBe(0.5); // 50%
    });

    it('should cap progress at 1.0', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
        progress: 15,
        target: 10,
      });

      expect(achievements.getProgress(id)).toBe(1.0);
    });

    it('should return 0 for achievement without target', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
      });

      expect(achievements.getProgress(id)).toBe(0);
    });
  });

  describe('getAchievementsByCategory', () => {
    beforeEach(() => {
      achievements.addAchievement({ name: 'A1', description: 'D1', category: 'combat' });
      achievements.addAchievement({ name: 'A2', description: 'D2', category: 'combat' });
      achievements.addAchievement({ name: 'A3', description: 'D3', category: 'exploration' });
    });

    it('should get achievements by category', () => {
      const combat = achievements.getAchievementsByCategory('combat');
      expect(combat).toHaveLength(2);
    });
  });

  describe('getAchievementsByRarity', () => {
    beforeEach(() => {
      achievements.addAchievement({ name: 'A1', description: 'D1', rarity: 'common' });
      achievements.addAchievement({ name: 'A2', description: 'D2', rarity: 'rare' });
      achievements.addAchievement({ name: 'A3', description: 'D3', rarity: 'rare' });
    });

    it('should get achievements by rarity', () => {
      const rare = achievements.getAchievementsByRarity('rare');
      expect(rare).toHaveLength(2);
    });
  });

  describe('getUnlockedAchievements', () => {
    it('should get only unlocked achievements', () => {
      const id1 = achievements.addAchievement({ name: 'A1', description: 'D1' });
      const id2 = achievements.addAchievement({ name: 'A2', description: 'D2' });
      achievements.addAchievement({ name: 'A3', description: 'D3' });

      achievements.unlock(id1);
      achievements.unlock(id2);

      const unlocked = achievements.getUnlockedAchievements();
      expect(unlocked).toHaveLength(2);
    });
  });

  describe('getLockedAchievements', () => {
    it('should get locked non-hidden achievements', () => {
      achievements.addAchievement({ name: 'A1', description: 'D1' });
      achievements.addAchievement({ name: 'A2', description: 'D2', hidden: true });
      const id3 = achievements.addAchievement({ name: 'A3', description: 'D3' });

      achievements.unlock(id3);

      const locked = achievements.getLockedAchievements();
      expect(locked).toHaveLength(1); // Only A1 (A2 is hidden, A3 is unlocked)
    });
  });

  describe('getTotalPoints', () => {
    it('should calculate total points from unlocked achievements', () => {
      const id1 = achievements.addAchievement({ name: 'A1', description: 'D1', points: 10 });
      const id2 = achievements.addAchievement({ name: 'A2', description: 'D2', points: 20 });
      achievements.addAchievement({ name: 'A3', description: 'D3', points: 30 });

      achievements.unlock(id1);
      achievements.unlock(id2);

      expect(achievements.getTotalPoints()).toBe(30); // 10 + 20
    });
  });

  describe('getMaxPoints', () => {
    it('should calculate maximum possible points', () => {
      achievements.addAchievement({ name: 'A1', description: 'D1', points: 10 });
      achievements.addAchievement({ name: 'A2', description: 'D2', points: 20 });
      achievements.addAchievement({ name: 'A3', description: 'D3', points: 30 });

      expect(achievements.getMaxPoints()).toBe(60);
    });
  });

  describe('getUnlockPercentage', () => {
    it('should calculate unlock percentage', () => {
      const id1 = achievements.addAchievement({ name: 'A1', description: 'D1' });
      achievements.addAchievement({ name: 'A2', description: 'D2' });
      achievements.addAchievement({ name: 'A3', description: 'D3' });
      achievements.addAchievement({ name: 'A4', description: 'D4' });

      achievements.unlock(id1);

      expect(achievements.getUnlockPercentage()).toBe(25); // 1 out of 4
    });

    it('should return 0 for empty achievements', () => {
      expect(achievements.getUnlockPercentage()).toBe(0);
    });
  });

  describe('removeAchievement', () => {
    it('should remove an achievement', () => {
      const id = achievements.addAchievement({ name: 'Test', description: 'Test' });

      const result = achievements.removeAchievement(id);
      expect(result).toBe(true);
      expect(achievements.getAchievement(id)).toBeUndefined();
    });
  });

  describe('resetAchievement', () => {
    it('should reset achievement to locked state', () => {
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
        progress: 0,
        target: 10,
      });

      achievements.updateProgress(id, 5);
      achievements.unlock(id);

      achievements.resetAchievement(id);

      const achievement = achievements.getAchievement(id);
      expect(achievement?.unlocked).toBe(false);
      expect(achievement?.progress).toBe(0);
      expect(achievement?.unlockedAt).toBeUndefined();
    });
  });

  describe('export and import', () => {
    it('should export achievement state', () => {
      achievements.addAchievement({ name: 'A1', description: 'D1' });
      achievements.addAchievement({ name: 'A2', description: 'D2' });

      const exported = achievements.export();
      expect(exported).toHaveLength(2);
    });

    it('should import achievement state', () => {
      const data = [
        {
          id: 'ach1',
          name: 'Imported',
          description: 'Test',
          unlocked: true,
          unlockedAt: Date.now(),
        },
      ];

      achievements.import(data);

      expect(achievements.getAllAchievements()).toHaveLength(1);
      expect(achievements.isUnlocked('ach1')).toBe(true);
    });

    it('should clear existing achievements on import', () => {
      achievements.addAchievement({ name: 'Old', description: 'Old' });

      const data = [
        {
          id: 'new',
          name: 'New',
          description: 'New',
          unlocked: false,
        },
      ];

      achievements.import(data);

      expect(achievements.getAllAchievements()).toHaveLength(1);
      expect(achievements.getAchievement('new')).toBeDefined();
    });
  });

  describe('events', () => {
    it('should emit achievementAdded event', () => {
      let eventFired = false;

      achievements.on('achievementAdded', (event) => {
        expect(event.type).toBe('achievementAdded');
        eventFired = true;
      });

      achievements.addAchievement({ name: 'Test', description: 'Test' });
      expect(eventFired).toBe(true);
    });

    it('should emit achievementUnlocked event', () => {
      let eventFired = false;
      const id = achievements.addAchievement({ name: 'Test', description: 'Test' });

      achievements.on('achievementUnlocked', (event) => {
        expect(event.type).toBe('achievementUnlocked');
        eventFired = true;
      });

      achievements.unlock(id);
      expect(eventFired).toBe(true);
    });

    it('should emit achievementProgressUpdated event', () => {
      let eventFired = false;
      const id = achievements.addAchievement({
        name: 'Test',
        description: 'Test',
        progress: 0,
        target: 10,
      });

      achievements.on('achievementProgressUpdated', (event) => {
        expect(event.type).toBe('achievementProgressUpdated');
        eventFired = true;
      });

      achievements.updateProgress(id, 5);
      expect(eventFired).toBe(true);
    });

    it('should support wildcard event handlers', () => {
      const events: string[] = [];

      achievements.on('*', (event) => {
        events.push(event.type);
      });

      const id = achievements.addAchievement({ name: 'Test', description: 'Test' });
      achievements.unlock(id);

      expect(events).toContain('achievementAdded');
      expect(events).toContain('achievementUnlocked');
    });
  });

  describe('clear', () => {
    it('should remove all achievements', () => {
      achievements.addAchievement({ name: 'A1', description: 'D1' });
      achievements.addAchievement({ name: 'A2', description: 'D2' });

      achievements.clear();

      expect(achievements.getAllAchievements()).toHaveLength(0);
    });
  });
});
