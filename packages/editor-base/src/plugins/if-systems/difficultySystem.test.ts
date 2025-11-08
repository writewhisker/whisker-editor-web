import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { difficultySystem } from './difficultySystem';

describe('Difficulty System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  const createContext = () => ({
    storyState: {
      difficulty: null,
    } as any,
    variables: new Map(),
    currentPassage: null,
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(difficultySystem);
      expect(pluginManager.hasPlugin('difficulty-system')).toBe(true);
    });

    it('should provide difficulty actions', async () => {
      await pluginStoreActions.register(difficultySystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('difficulty.set');
      expect(actionTypes).toContain('difficulty.setCustomModifier');
      expect(actionTypes).toContain('difficulty.recordPerformance');
      expect(actionTypes).toContain('difficulty.enableAdaptive');
      expect(actionTypes).toContain('difficulty.adjustAdaptive');
      expect(actionTypes).toContain('difficulty.getModifier');
    });

    it('should provide difficulty conditions', async () => {
      await pluginStoreActions.register(difficultySystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('difficulty.level');
      expect(conditionTypes).toContain('difficulty.modifierCompare');
      expect(conditionTypes).toContain('difficulty.performanceCheck');
      expect(conditionTypes).toContain('difficulty.adaptiveEnabled');
      expect(conditionTypes).toContain('difficulty.permadeath');
    });
  });

  describe('set action', () => {
    it('should set difficulty to easy', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const action = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;

      await action.execute(context, { level: 'easy' });

      expect(context.storyState.difficulty.currentLevel).toBe('easy');
      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(0.7);
      expect(context.storyState.difficulty.modifiers.damageDealt).toBe(1.3);
      expect(context.variables.get('difficulty')).toBe('easy');
    });

    it('should set difficulty to hard', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const action = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;

      await action.execute(context, { level: 'hard' });

      expect(context.storyState.difficulty.currentLevel).toBe('hard');
      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(1.3);
      expect(context.storyState.difficulty.modifiers.damageDealt).toBe(0.8);
    });

    it('should set difficulty to brutal with permadeath', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const action = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;

      await action.execute(context, { level: 'brutal' });

      expect(context.storyState.difficulty.currentLevel).toBe('brutal');
      expect(context.storyState.difficulty.modifiers.permadeath).toBe(true);
    });

    it('should initialize performance metrics', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const action = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;

      await action.execute(context, { level: 'normal' });

      expect(context.storyState.difficulty.performance).toBeDefined();
      expect(context.storyState.difficulty.performance.deaths).toBe(0);
      expect(context.storyState.difficulty.performance.combatsWon).toBe(0);
    });
  });

  describe('setCustomModifier action', () => {
    it('should set custom modifier', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const customAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.setCustomModifier'
      )!;

      await setAction.execute(context, { level: 'custom' });
      await customAction.execute(context, { modifier: 'damageTaken', value: 0.5 });

      expect(context.storyState.difficulty.customModifiers?.damageTaken).toBe(0.5);
      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(0.5);
    });

    it('should store custom modifier without applying if not on custom difficulty', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const customAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.setCustomModifier'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await customAction.execute(context, { modifier: 'damageTaken', value: 0.5 });

      expect(context.storyState.difficulty.customModifiers?.damageTaken).toBe(0.5);
      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(1.0); // Still normal
    });
  });

  describe('recordPerformance action', () => {
    it('should increment performance metric', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await recordAction.execute(context, { metric: 'combatsWon', value: 1, mode: 'increment' });
      await recordAction.execute(context, { metric: 'combatsWon', value: 1, mode: 'increment' });

      expect(context.storyState.difficulty.performance.combatsWon).toBe(2);
    });

    it('should set performance metric', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await recordAction.execute(context, { metric: 'averageHealth', value: 75, mode: 'set' });

      expect(context.storyState.difficulty.performance.averageHealth).toBe(75);
    });
  });

  describe('enableAdaptive action', () => {
    it('should enable adaptive difficulty', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const adaptiveAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.enableAdaptive'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await adaptiveAction.execute(context, { enabled: true });

      expect(context.storyState.difficulty.adaptiveEnabled).toBe(true);
      expect(context.variables.get('adaptive_difficulty')).toBe(true);
    });

    it('should disable adaptive difficulty', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const adaptiveAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.enableAdaptive'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await adaptiveAction.execute(context, { enabled: true });
      await adaptiveAction.execute(context, { enabled: false });

      expect(context.storyState.difficulty.adaptiveEnabled).toBe(false);
    });
  });

  describe('adjustAdaptive action', () => {
    it('should make game easier when player is struggling', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const adaptiveAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.enableAdaptive'
      )!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;
      const adjustAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.adjustAdaptive'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await adaptiveAction.execute(context, { enabled: true });

      // Simulate poor performance
      await recordAction.execute(context, { metric: 'deaths', value: 5, mode: 'set' });
      await recordAction.execute(context, { metric: 'combatsWon', value: 1, mode: 'set' });
      await recordAction.execute(context, { metric: 'combatsLost', value: 10, mode: 'set' });

      const damageTakenBefore = context.storyState.difficulty.modifiers.damageTaken;
      const damageDealtBefore = context.storyState.difficulty.modifiers.damageDealt;

      await adjustAction.execute(context, {});

      expect(context.storyState.difficulty.modifiers.damageTaken).toBeLessThan(damageTakenBefore);
      expect(context.storyState.difficulty.modifiers.damageDealt).toBeGreaterThan(
        damageDealtBefore
      );
    });

    it('should make game harder when player is dominating', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const adaptiveAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.enableAdaptive'
      )!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;
      const adjustAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.adjustAdaptive'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await adaptiveAction.execute(context, { enabled: true });

      // Simulate excellent performance
      await recordAction.execute(context, { metric: 'deaths', value: 0, mode: 'set' });
      await recordAction.execute(context, { metric: 'combatsWon', value: 20, mode: 'set' });
      await recordAction.execute(context, { metric: 'combatsLost', value: 1, mode: 'set' });

      const damageTakenBefore = context.storyState.difficulty.modifiers.damageTaken;
      const damageDealtBefore = context.storyState.difficulty.modifiers.damageDealt;

      await adjustAction.execute(context, {});

      expect(context.storyState.difficulty.modifiers.damageTaken).toBeGreaterThan(
        damageTakenBefore
      );
      expect(context.storyState.difficulty.modifiers.damageDealt).toBeLessThan(damageDealtBefore);
    });

    it('should not adjust when adaptive is disabled', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;
      const adjustAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.adjustAdaptive'
      )!;

      await setAction.execute(context, { level: 'normal' });

      await recordAction.execute(context, { metric: 'combatsWon', value: 20, mode: 'set' });

      const damageTakenBefore = context.storyState.difficulty.modifiers.damageTaken;

      await adjustAction.execute(context, {});

      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(damageTakenBefore);
    });
  });

  describe('getModifier action', () => {
    it('should get modifier value', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const getAction = difficultySystem.actions!.find(a => a.type === 'difficulty.getModifier')!;

      await setAction.execute(context, { level: 'hard' });
      await getAction.execute(context, { modifier: 'damageTaken', varName: 'test_damage' });

      expect(context.variables.get('test_damage')).toBe(1.3);
    });
  });

  describe('level condition', () => {
    it('should check difficulty level', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const condition = difficultySystem.conditions!.find(c => c.type === 'difficulty.level')!;

      await setAction.execute(context, { level: 'hard' });

      expect(condition.evaluate(context, { level: 'hard' })).toBe(true);
      expect(condition.evaluate(context, { level: 'easy' })).toBe(false);
    });
  });

  describe('modifierCompare condition', () => {
    it('should compare modifier values', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const condition = difficultySystem.conditions!.find(c => c.type === 'difficulty.modifierCompare')!;

      await setAction.execute(context, { level: 'easy' });

      expect(
        condition.evaluate(context, { modifier: 'damageTaken', operator: 'lt', value: 1.0 })
      ).toBe(true);
      expect(
        condition.evaluate(context, { modifier: 'damageDealt', operator: 'gt', value: 1.0 })
      ).toBe(true);
    });
  });

  describe('performanceCheck condition', () => {
    it('should check performance metrics', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const recordAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.recordPerformance'
      )!;
      const condition = difficultySystem.conditions!.find(
        c => c.type === 'difficulty.performanceCheck'
      )!;

      await setAction.execute(context, { level: 'normal' });
      await recordAction.execute(context, { metric: 'combatsWon', value: 10, mode: 'set' });

      expect(condition.evaluate(context, { metric: 'combatsWon', operator: 'gte', value: 10 })).toBe(
        true
      );
      expect(condition.evaluate(context, { metric: 'combatsWon', operator: 'lt', value: 5 })).toBe(
        false
      );
    });
  });

  describe('adaptiveEnabled condition', () => {
    it('should check if adaptive is enabled', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const adaptiveAction = difficultySystem.actions!.find(
        a => a.type === 'difficulty.enableAdaptive'
      )!;
      const condition = difficultySystem.conditions!.find(
        c => c.type === 'difficulty.adaptiveEnabled'
      )!;

      await setAction.execute(context, { level: 'normal' });

      expect(condition.evaluate(context, {})).toBe(false);

      await adaptiveAction.execute(context, { enabled: true });

      expect(condition.evaluate(context, {})).toBe(true);
    });
  });

  describe('permadeath condition', () => {
    it('should check if permadeath is active', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      const setAction = difficultySystem.actions!.find(a => a.type === 'difficulty.set')!;
      const condition = difficultySystem.conditions!.find(c => c.type === 'difficulty.permadeath')!;

      await setAction.execute(context, { level: 'normal' });

      expect(condition.evaluate(context, {})).toBe(false);

      await setAction.execute(context, { level: 'brutal' });

      expect(condition.evaluate(context, {})).toBe(true);
    });
  });

  describe('runtime hooks', () => {
    it('should initialize with normal difficulty', async () => {
      await pluginStoreActions.register(difficultySystem);

      const context = createContext();
      await pluginManager.executeHook('onInit', context);

      expect(context.storyState.difficulty).toBeDefined();
      expect(context.storyState.difficulty.currentLevel).toBe('normal');
      expect(context.storyState.difficulty.modifiers.damageTaken).toBe(1.0);
      expect(context.storyState.difficulty.adaptiveEnabled).toBe(false);
    });
  });
});
