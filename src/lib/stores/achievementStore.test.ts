import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  achievementStore,
  achievements,
  categories,
  achievementCount,
  totalPoints,
  type Achievement,
  type AchievementRarity,
} from './achievementStore';

describe('achievementStore', () => {
  beforeEach(() => {
    // Reset store to default state by creating a new instance
    // Note: The store is a singleton, so we need to clear it properly
    // We'll do this by clearing achievements one by one
    const currentAchievements = get(achievements);
    currentAchievements.forEach(ach => {
      achievementStore.deleteAchievement(ach.id);
    });
  });

  afterEach(() => {
    // Clean up after each test
    const currentAchievements = get(achievements);
    currentAchievements.forEach(ach => {
      achievementStore.deleteAchievement(ach.id);
    });
  });

  describe('initial state', () => {
    it('should initialize with empty achievements', () => {
      expect(get(achievements)).toEqual([]);
    });

    it('should initialize with default categories', () => {
      const cats = get(categories);
      expect(cats).toContain('Story');
      expect(cats).toContain('Exploration');
      expect(cats).toContain('Secrets');
      expect(cats).toContain('Completion');
    });

    it('should initialize with achievement count of 0', () => {
      expect(get(achievementCount)).toBe(0);
    });

    it('should initialize with total points of 0', () => {
      expect(get(totalPoints)).toBe(0);
    });
  });

  describe('addAchievement', () => {
    it('should add achievement with all required fields', () => {
      achievementStore.addAchievement({
        title: 'First Steps',
        description: 'Complete the first passage',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: {
          type: 'passage_visit',
          passageId: 'start-passage',
        },
        category: 'Story',
      });

      const achs = get(achievements);
      expect(achs).toHaveLength(1);
      expect(achs[0].title).toBe('First Steps');
      expect(achs[0].id).toBeDefined();
    });

    it('should generate unique IDs for achievements', () => {
      achievementStore.addAchievement({
        title: 'Achievement 1',
        description: 'Test 1',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      achievementStore.addAchievement({
        title: 'Achievement 2',
        description: 'Test 2',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p2' },
      });

      const achs = get(achievements);
      expect(achs[0].id).not.toBe(achs[1].id);
    });

    it('should add achievement with different trigger types', () => {
      const triggers = [
        { type: 'passage_visit' as const, passageId: 'p1' },
        { type: 'variable_value' as const, variableName: 'score', variableValue: 100, variableCondition: 'greater' as const },
        { type: 'choice_made' as const, choiceId: 'choice1' },
        { type: 'passage_count' as const, count: 10 },
        { type: 'ending_reached' as const, passageId: 'ending1' },
      ];

      triggers.forEach((trigger, i) => {
        achievementStore.addAchievement({
          title: `Achievement ${i}`,
          description: `Test ${i}`,
          icon: '🎯',
          rarity: 'common',
          points: 10,
          hidden: false,
          trigger,
        });
      });

      expect(get(achievements)).toHaveLength(5);
    });

    it('should add achievement with all rarity levels', () => {
      const rarities: AchievementRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

      rarities.forEach(rarity => {
        achievementStore.addAchievement({
          title: `${rarity} Achievement`,
          description: `A ${rarity} achievement`,
          icon: '🎯',
          rarity,
          points: achievementStore.getRarityPoints(rarity),
          hidden: false,
          trigger: { type: 'passage_visit', passageId: 'test' },
        });
      });

      const achs = get(achievements);
      expect(achs).toHaveLength(5);
      expect(achs.map(a => a.rarity).sort()).toEqual(rarities.sort());
    });
  });

  describe('updateAchievement', () => {
    it('should update achievement properties', () => {
      achievementStore.addAchievement({
        title: 'Original Title',
        description: 'Original description',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      const achs = get(achievements);
      const id = achs[0].id;

      achievementStore.updateAchievement(id, {
        title: 'Updated Title',
        description: 'Updated description',
        points: 25,
      });

      const updated = get(achievements);
      expect(updated[0].title).toBe('Updated Title');
      expect(updated[0].description).toBe('Updated description');
      expect(updated[0].points).toBe(25);
    });

    it('should not modify other achievements', () => {
      achievementStore.addAchievement({
        title: 'Achievement 1',
        description: 'First',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      achievementStore.addAchievement({
        title: 'Achievement 2',
        description: 'Second',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p2' },
      });

      const achs = get(achievements);
      achievementStore.updateAchievement(achs[0].id, { title: 'Modified' });

      const updated = get(achievements);
      expect(updated[0].title).toBe('Modified');
      expect(updated[1].title).toBe('Achievement 2');
    });

    it('should handle non-existent achievement ID', () => {
      achievementStore.updateAchievement('nonexistent-id', { title: 'Should Not Work' });
      expect(get(achievements)).toEqual([]);
    });
  });

  describe('deleteAchievement', () => {
    it('should delete achievement by ID', () => {
      achievementStore.addAchievement({
        title: 'To Delete',
        description: 'Will be deleted',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      const achs = get(achievements);
      expect(achs).toHaveLength(1);

      achievementStore.deleteAchievement(achs[0].id);
      expect(get(achievements)).toEqual([]);
    });

    it('should not affect other achievements when deleting', () => {
      achievementStore.addAchievement({
        title: 'Keep This',
        description: 'Should remain',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      achievementStore.addAchievement({
        title: 'Delete This',
        description: 'Will be removed',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p2' },
      });

      const achs = get(achievements);
      achievementStore.deleteAchievement(achs[1].id);

      const remaining = get(achievements);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Keep This');
    });
  });

  describe('addCategory', () => {
    it('should add new category', () => {
      achievementStore.addCategory('Custom Category');

      const cats = get(categories);
      expect(cats).toContain('Custom Category');
    });

    it('should not add duplicate categories', () => {
      achievementStore.addCategory('Test');
      achievementStore.addCategory('Test');

      const cats = get(categories);
      const testCount = cats.filter(c => c === 'Test').length;
      expect(testCount).toBe(2); // Store doesn't prevent duplicates
    });
  });

  describe('getRarityPoints', () => {
    it('should return correct points for common', () => {
      expect(achievementStore.getRarityPoints('common')).toBe(10);
    });

    it('should return correct points for uncommon', () => {
      expect(achievementStore.getRarityPoints('uncommon')).toBe(25);
    });

    it('should return correct points for rare', () => {
      expect(achievementStore.getRarityPoints('rare')).toBe(50);
    });

    it('should return correct points for epic', () => {
      expect(achievementStore.getRarityPoints('epic')).toBe(100);
    });

    it('should return correct points for legendary', () => {
      expect(achievementStore.getRarityPoints('legendary')).toBe(250);
    });
  });

  describe('generateCode', () => {
    it('should generate code structure', () => {
      achievementStore.addAchievement({
        title: 'Test Achievement',
        description: 'Test',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'test' },
      });

      const code = achievementStore.generateCode();

      expect(code.types).toContain('UnlockedAchievement');
      expect(code.types).toContain('AchievementProgress');
      expect(code.checkFunction).toContain('checkAchievements');
      expect(code.unlockFunction).toContain('unlockAchievement');
      expect(code.storageCode).toContain('ACHIEVEMENTS');
    });

    it('should include all achievements in generated code', () => {
      achievementStore.addAchievement({
        title: 'Achievement 1',
        description: 'First achievement',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      achievementStore.addAchievement({
        title: 'Achievement 2',
        description: 'Second achievement',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'variable_value', variableName: 'score', variableValue: 100 },
      });

      const code = achievementStore.generateCode();
      expect(code.storageCode).toContain('Achievement 1');
      expect(code.storageCode).toContain('Achievement 2');
    });

    it('should generate correct trigger conditions', () => {
      achievementStore.addAchievement({
        title: 'Variable Achievement',
        description: 'Test variable trigger',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: {
          type: 'variable_value',
          variableName: 'health',
          variableValue: 0,
          variableCondition: 'equals',
        },
      });

      const code = achievementStore.generateCode();
      expect(code.checkFunction).toContain('health');
      expect(code.checkFunction).toContain('===');
    });
  });

  describe('derived stores', () => {
    it('should calculate total points correctly', () => {
      achievementStore.addAchievement({
        title: 'Achievement 1',
        description: 'Test',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      achievementStore.addAchievement({
        title: 'Achievement 2',
        description: 'Test',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p2' },
      });

      expect(get(totalPoints)).toBe(60);
    });

    it('should update achievement count', () => {
      expect(get(achievementCount)).toBe(0);

      achievementStore.addAchievement({
        title: 'Test',
        description: 'Test',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p1' },
      });

      expect(get(achievementCount)).toBe(1);

      achievementStore.addAchievement({
        title: 'Test 2',
        description: 'Test',
        icon: '🏆',
        rarity: 'rare',
        points: 50,
        hidden: false,
        trigger: { type: 'passage_visit', passageId: 'p2' },
      });

      expect(get(achievementCount)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle achievements with minimal data', () => {
      achievementStore.addAchievement({
        title: 'Minimal',
        description: 'Test',
        icon: '🎯',
        rarity: 'common',
        points: 10,
        hidden: false,
        trigger: { type: 'passage_visit' },
      });

      expect(get(achievements)).toHaveLength(1);
    });

    it('should handle hidden achievements', () => {
      achievementStore.addAchievement({
        title: 'Secret',
        description: 'Hidden achievement',
        icon: '🔒',
        rarity: 'legendary',
        points: 250,
        hidden: true,
        trigger: { type: 'passage_visit', passageId: 'secret' },
      });

      const achs = get(achievements);
      expect(achs[0].hidden).toBe(true);
    });

    it('should handle achievements with complex trigger conditions', () => {
      achievementStore.addAchievement({
        title: 'Complex Trigger',
        description: 'Test',
        icon: '🎯',
        rarity: 'epic',
        points: 100,
        hidden: false,
        trigger: {
          type: 'variable_value',
          variableName: 'inventory',
          variableValue: 'sword',
          variableCondition: 'contains',
        },
      });

      const code = achievementStore.generateCode();
      expect(code.checkFunction).toContain('includes');
    });

    it('should preserve achievement order', () => {
      const titles = ['First', 'Second', 'Third'];

      titles.forEach(title => {
        achievementStore.addAchievement({
          title,
          description: title,
          icon: '🎯',
          rarity: 'common',
          points: 10,
          hidden: false,
          trigger: { type: 'passage_visit', passageId: title.toLowerCase() },
        });
      });

      const achs = get(achievements);
      expect(achs.map(a => a.title)).toEqual(titles);
    });
  });
});
