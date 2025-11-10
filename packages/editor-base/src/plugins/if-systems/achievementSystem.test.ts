import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { achievementSystem, type Achievement } from './achievementSystem';

describe('Achievement System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  const mockAchievements: Achievement[] = [
    {
      id: 'first_steps',
      name: 'First Steps',
      description: 'Complete the tutorial',
      category: 'tutorial',
      tier: 'bronze',
      points: 10,
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Visit 10 locations',
      category: 'exploration',
      tier: 'silver',
      points: 25,
      requirement: {
        type: 'count',
        target: 'locations_visited',
        value: 10,
      },
    },
    {
      id: 'secret_finder',
      name: 'Secret Finder',
      description: 'Find the hidden treasure',
      category: 'secrets',
      tier: 'gold',
      points: 50,
      hidden: true,
    },
  ];

  const createContext = () => ({
    storyState: {
      achievements: null,
    } as any,
    variables: new Map(),
    currentPassage: null,
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(achievementSystem);
      expect(pluginManager.hasPlugin('achievement-system')).toBe(true);
    });

    it('should provide achievement actions', async () => {
      await pluginStoreActions.register(achievementSystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('achievement.define');
      expect(actionTypes).toContain('achievement.unlock');
      expect(actionTypes).toContain('achievement.progress');
      expect(actionTypes).toContain('achievement.reset');
      expect(actionTypes).toContain('achievement.resetAll');
    });

    it('should provide achievement conditions', async () => {
      await pluginStoreActions.register(achievementSystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('achievement.unlocked');
      expect(conditionTypes).toContain('achievement.progress');
      expect(conditionTypes).toContain('achievement.categoryComplete');
      expect(conditionTypes).toContain('achievement.completionPercent');
      expect(conditionTypes).toContain('achievement.pointsThreshold');
    });
  });

  describe('define action', () => {
    it('should define a new achievement', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const action = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;

      await action.execute(context, mockAchievements[0]);

      expect(context.storyState.achievements.definitions['first_steps']).toBeDefined();
      expect(context.storyState.achievements.definitions['first_steps'].name).toBe('First Steps');
      expect(context.storyState.achievements.progress['first_steps']).toBeDefined();
      expect(context.storyState.achievements.progress['first_steps'].unlocked).toBe(false);
    });

    it('should initialize achievement state', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const action = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;

      await action.execute(context, mockAchievements[0]);

      expect(context.storyState.achievements).toBeDefined();
      expect(context.storyState.achievements.totalPoints).toBe(0);
      expect(context.storyState.achievements.recentUnlocks).toEqual([]);
    });
  });

  describe('unlock action', () => {
    it('should unlock an achievement', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;

      await defineAction.execute(context, mockAchievements[0]);
      await unlockAction.execute(context, { id: 'first_steps' });

      expect(context.storyState.achievements.progress['first_steps'].unlocked).toBe(true);
      expect(context.storyState.achievements.progress['first_steps'].unlockedAt).toBeDefined();
      expect(context.variables.get('achievement_first_steps')).toBe(true);
    });

    it('should add points when unlocking', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;

      await defineAction.execute(context, mockAchievements[0]);
      await unlockAction.execute(context, { id: 'first_steps' });

      expect(context.storyState.achievements.totalPoints).toBe(10);
      expect(context.variables.get('total_achievement_points')).toBe(10);
    });

    it('should add to recent unlocks', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;

      await defineAction.execute(context, mockAchievements[0]);
      await unlockAction.execute(context, { id: 'first_steps' });

      expect(context.storyState.achievements.recentUnlocks).toContain('first_steps');
    });

    it('should not re-unlock already unlocked achievement', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;

      await defineAction.execute(context, mockAchievements[0]);
      await unlockAction.execute(context, { id: 'first_steps' });
      await unlockAction.execute(context, { id: 'first_steps' });

      expect(context.storyState.achievements.totalPoints).toBe(10); // Not doubled
    });
  });

  describe('progress action', () => {
    it('should increment achievement progress', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const progressAction = achievementSystem.actions!.find(
        a => a.type === 'achievement.progress'
      )!;

      await defineAction.execute(context, mockAchievements[1]); // Explorer with requirement
      await progressAction.execute(context, { id: 'explorer', amount: 3, mode: 'increment' });

      expect(context.storyState.achievements.progress['explorer'].progress).toBe(3);
    });

    it('should set achievement progress', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const progressAction = achievementSystem.actions!.find(
        a => a.type === 'achievement.progress'
      )!;

      await defineAction.execute(context, mockAchievements[1]);
      await progressAction.execute(context, { id: 'explorer', amount: 5, mode: 'set' });

      expect(context.storyState.achievements.progress['explorer'].progress).toBe(5);
    });

    it('should auto-unlock when progress reaches max', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const progressAction = achievementSystem.actions!.find(
        a => a.type === 'achievement.progress'
      )!;

      await defineAction.execute(context, mockAchievements[1]);
      await progressAction.execute(context, { id: 'explorer', amount: 10, mode: 'set' });

      expect(context.storyState.achievements.progress['explorer'].unlocked).toBe(true);
      expect(context.storyState.achievements.totalPoints).toBe(25);
    });
  });

  describe('reset action', () => {
    it('should reset achievement progress', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const resetAction = achievementSystem.actions!.find(a => a.type === 'achievement.reset')!;

      await defineAction.execute(context, mockAchievements[0]);
      await unlockAction.execute(context, { id: 'first_steps' });
      expect(context.storyState.achievements.totalPoints).toBe(10);

      await resetAction.execute(context, { id: 'first_steps' });

      expect(context.storyState.achievements.progress['first_steps'].unlocked).toBe(false);
      expect(context.storyState.achievements.progress['first_steps'].progress).toBe(0);
      expect(context.storyState.achievements.totalPoints).toBe(0);
    });
  });

  describe('resetAll action', () => {
    it('should reset all achievements', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const resetAllAction = achievementSystem.actions!.find(
        a => a.type === 'achievement.resetAll'
      )!;

      // Define and unlock multiple achievements
      for (const achievement of mockAchievements) {
        await defineAction.execute(context, achievement);
        await unlockAction.execute(context, { id: achievement.id });
      }

      expect(context.storyState.achievements.totalPoints).toBe(85); // 10 + 25 + 50

      await resetAllAction.execute(context, {});

      expect(context.storyState.achievements.totalPoints).toBe(0);
      expect(context.storyState.achievements.recentUnlocks).toEqual([]);
      expect(
        Object.values(context.storyState.achievements.progress).every((p: any) => !p.unlocked)
      ).toBe(true);
    });
  });

  describe('unlocked condition', () => {
    it('should check if achievement is unlocked', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const condition = achievementSystem.conditions!.find(c => c.type === 'achievement.unlocked')!;

      await defineAction.execute(context, mockAchievements[0]);

      expect(condition.evaluate(context, { id: 'first_steps' })).toBe(false);

      await unlockAction.execute(context, { id: 'first_steps' });

      expect(condition.evaluate(context, { id: 'first_steps' })).toBe(true);
    });
  });

  describe('progress condition', () => {
    it('should check achievement progress', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const progressAction = achievementSystem.actions!.find(
        a => a.type === 'achievement.progress'
      )!;
      const condition = achievementSystem.conditions!.find(c => c.type === 'achievement.progress')!;

      await defineAction.execute(context, mockAchievements[1]);
      await progressAction.execute(context, { id: 'explorer', amount: 5, mode: 'set' });

      expect(condition.evaluate(context, { id: 'explorer', operator: 'gte', value: 5 })).toBe(true);
      expect(condition.evaluate(context, { id: 'explorer', operator: 'lt', value: 10 })).toBe(true);
      expect(condition.evaluate(context, { id: 'explorer', operator: 'gt', value: 10 })).toBe(false);
    });
  });

  describe('categoryComplete condition', () => {
    it('should check if category is complete', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const condition = achievementSystem.conditions!.find(
        c => c.type === 'achievement.categoryComplete'
      )!;

      await defineAction.execute(context, mockAchievements[0]); // Tutorial category

      expect(condition.evaluate(context, { category: 'tutorial' })).toBe(false);

      await unlockAction.execute(context, { id: 'first_steps' });

      expect(condition.evaluate(context, { category: 'tutorial' })).toBe(true);
    });
  });

  describe('completionPercent condition', () => {
    it('should check completion percentage', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const condition = achievementSystem.conditions!.find(
        c => c.type === 'achievement.completionPercent'
      )!;

      // Define 3 achievements
      for (const achievement of mockAchievements) {
        await defineAction.execute(context, achievement);
      }

      expect(condition.evaluate(context, { operator: 'lt', percent: 50 })).toBe(true);

      // Unlock 1 achievement (33%)
      await unlockAction.execute(context, { id: 'first_steps' });
      expect(condition.evaluate(context, { operator: 'gte', percent: 33 })).toBe(true);

      // Unlock 2 achievements (66%)
      await unlockAction.execute(context, { id: 'explorer' });
      expect(condition.evaluate(context, { operator: 'gte', percent: 50 })).toBe(true);
    });
  });

  describe('pointsThreshold condition', () => {
    it('should check points threshold', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      const defineAction = achievementSystem.actions!.find(a => a.type === 'achievement.define')!;
      const unlockAction = achievementSystem.actions!.find(a => a.type === 'achievement.unlock')!;
      const condition = achievementSystem.conditions!.find(
        c => c.type === 'achievement.pointsThreshold'
      )!;

      await defineAction.execute(context, mockAchievements[0]);
      await defineAction.execute(context, mockAchievements[1]);

      expect(condition.evaluate(context, { operator: 'gte', points: 10 })).toBe(false);

      await unlockAction.execute(context, { id: 'first_steps' }); // 10 points

      expect(condition.evaluate(context, { operator: 'gte', points: 10 })).toBe(true);
      expect(condition.evaluate(context, { operator: 'lt', points: 50 })).toBe(true);

      await unlockAction.execute(context, { id: 'explorer' }); // +25 points = 35 total

      expect(condition.evaluate(context, { operator: 'gte', points: 30 })).toBe(true);
    });
  });

  describe('runtime hooks', () => {
    it('should initialize achievement state', async () => {
      await pluginStoreActions.register(achievementSystem);

      const context = createContext();
      await pluginManager.executeHook('onInit', context);

      expect(context.storyState.achievements).toBeDefined();
      expect(context.storyState.achievements.definitions).toEqual({});
      expect(context.storyState.achievements.totalPoints).toBe(0);
    });
  });
});
