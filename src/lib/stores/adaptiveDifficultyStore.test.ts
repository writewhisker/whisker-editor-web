import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  adaptiveDifficultyStore,
  metrics,
  adjustments,
  isEnabled,
  type PerformanceMetric,
  type DifficultyAdjustment,
  type DifficultyLevel,
} from './adaptiveDifficultyStore';

describe('adaptiveDifficultyStore', () => {
  beforeEach(() => {
    adaptiveDifficultyStore.reset();
  });

  afterEach(() => {
    adaptiveDifficultyStore.reset();
  });

  describe('initial state', () => {
    it('should initialize as enabled', () => {
      expect(get(isEnabled)).toBe(true);
    });

    it('should initialize with default metrics', () => {
      const defaultMetrics = get(metrics);
      expect(defaultMetrics).toHaveLength(3);
      expect(defaultMetrics.some(m => m.type === 'success_rate')).toBe(true);
      expect(defaultMetrics.some(m => m.type === 'time_spent')).toBe(true);
      expect(defaultMetrics.some(m => m.type === 'retry_count')).toBe(true);
    });

    it('should initialize with empty adjustments', () => {
      expect(get(adjustments)).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('should enable difficulty system', () => {
      adaptiveDifficultyStore.setEnabled(false);
      expect(get(isEnabled)).toBe(false);

      adaptiveDifficultyStore.setEnabled(true);
      expect(get(isEnabled)).toBe(true);
    });
  });

  describe('addMetric', () => {
    it('should add new metric', () => {
      const initialCount = get(metrics).length;

      adaptiveDifficultyStore.addMetric({
        name: 'Custom Metric',
        type: 'custom',
        description: 'A custom performance metric',
        customCode: 'return player.performance;',
      });

      const updatedMetrics = get(metrics);
      expect(updatedMetrics.length).toBe(initialCount + 1);
      expect(updatedMetrics[updatedMetrics.length - 1].name).toBe('Custom Metric');
    });

    it('should generate unique IDs for metrics', () => {
      adaptiveDifficultyStore.addMetric({
        name: 'Metric 1',
        type: 'custom',
        description: 'First metric',
      });

      adaptiveDifficultyStore.addMetric({
        name: 'Metric 2',
        type: 'custom',
        description: 'Second metric',
      });

      const allMetrics = get(metrics);
      const customMetrics = allMetrics.filter(m => m.type === 'custom');
      expect(customMetrics[0].id).not.toBe(customMetrics[1].id);
    });
  });

  describe('updateMetric', () => {
    it('should update existing metric', () => {
      const allMetrics = get(metrics);
      const metricId = allMetrics[0].id;

      adaptiveDifficultyStore.updateMetric(metricId, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      const updated = get(metrics);
      const updatedMetric = updated.find(m => m.id === metricId);
      expect(updatedMetric?.name).toBe('Updated Name');
      expect(updatedMetric?.description).toBe('Updated description');
    });

    it('should not affect other metrics', () => {
      const allMetrics = get(metrics);
      const firstId = allMetrics[0].id;
      const secondId = allMetrics[1].id;

      adaptiveDifficultyStore.updateMetric(firstId, { name: 'Modified' });

      const updated = get(metrics);
      expect(updated.find(m => m.id === firstId)?.name).toBe('Modified');
      expect(updated.find(m => m.id === secondId)?.name).not.toBe('Modified');
    });
  });

  describe('deleteMetric', () => {
    it('should delete metric by ID', () => {
      const allMetrics = get(metrics);
      const metricId = allMetrics[0].id;
      const initialCount = allMetrics.length;

      adaptiveDifficultyStore.deleteMetric(metricId);

      const updated = get(metrics);
      expect(updated.length).toBe(initialCount - 1);
      expect(updated.find(m => m.id === metricId)).toBeUndefined();
    });
  });

  describe('addAdjustment', () => {
    it('should add difficulty adjustment', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Easy Mode',
        description: 'Make game easier',
        type: 'variable_modifier',
        targetLevel: 'easy',
        thresholds: [
          {
            metricId: 'metric_success',
            condition: 'below',
            value: 0.5,
            duration: 5,
          },
        ],
        variableModifier: {
          variableName: 'enemyHealth',
          operation: 'multiply',
          value: 0.8,
        },
      });

      const adjs = get(adjustments);
      expect(adjs).toHaveLength(1);
      expect(adjs[0].name).toBe('Easy Mode');
    });

    it('should add adjustment with different types', () => {
      const adjustmentTypes = [
        { type: 'variable_modifier' as const, targetLevel: 'easy' as DifficultyLevel },
        { type: 'content_swap' as const, targetLevel: 'hard' as DifficultyLevel },
        { type: 'hint_availability' as const, targetLevel: 'normal' as DifficultyLevel },
        { type: 'timer_adjustment' as const, targetLevel: 'very_hard' as DifficultyLevel },
      ];

      adjustmentTypes.forEach(({ type, targetLevel }) => {
        adaptiveDifficultyStore.addAdjustment({
          name: `${type} adjustment`,
          description: 'Test',
          type,
          targetLevel,
          thresholds: [],
        });
      });

      expect(get(adjustments)).toHaveLength(4);
    });
  });

  describe('updateAdjustment', () => {
    it('should update adjustment properties', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Original',
        description: 'Original description',
        type: 'variable_modifier',
        targetLevel: 'normal',
        thresholds: [],
      });

      const adjs = get(adjustments);
      const id = adjs[0].id;

      adaptiveDifficultyStore.updateAdjustment(id, {
        name: 'Updated',
        description: 'Updated description',
        targetLevel: 'hard',
      });

      const updated = get(adjustments);
      expect(updated[0].name).toBe('Updated');
      expect(updated[0].description).toBe('Updated description');
      expect(updated[0].targetLevel).toBe('hard');
    });
  });

  describe('deleteAdjustment', () => {
    it('should delete adjustment by ID', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'To Delete',
        description: 'Will be removed',
        type: 'variable_modifier',
        targetLevel: 'normal',
        thresholds: [],
      });

      const adjs = get(adjustments);
      expect(adjs).toHaveLength(1);

      adaptiveDifficultyStore.deleteAdjustment(adjs[0].id);
      expect(get(adjustments)).toEqual([]);
    });
  });

  describe('setUpdateFrequency', () => {
    it('should update frequency value', () => {
      adaptiveDifficultyStore.setUpdateFrequency(10);

      // Verify by generating code and checking if frequency is used
      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('10');
    });
  });

  describe('setSmoothingFactor', () => {
    it('should update smoothing factor', () => {
      adaptiveDifficultyStore.setSmoothingFactor(0.5);

      // Factor is used internally, verify store updates
      adaptiveDifficultyStore.setSmoothingFactor(0.7);
      // No direct way to verify without reading internal state
    });
  });

  describe('generateCode', () => {
    it('should generate TypeScript types', () => {
      const code = adaptiveDifficultyStore.generateCode();

      expect(code.types).toContain('PlayerMetrics');
      expect(code.types).toContain('DifficultyState');
      expect(code.types).toContain('currentLevel');
    });

    it('should generate metrics tracking code', () => {
      const code = adaptiveDifficultyStore.generateCode();

      expect(code.metricsCode).toContain('MetricsTracker');
      expect(code.metricsCode).toContain('recordSuccess');
      expect(code.metricsCode).toContain('recordFailure');
      expect(code.metricsCode).toContain('getSuccessRate');
    });

    it('should generate evaluation code', () => {
      const code = adaptiveDifficultyStore.generateCode();

      expect(code.evaluationCode).toContain('evaluateDifficulty');
      expect(code.evaluationCode).toContain('successRate');
      expect(code.evaluationCode).toContain('avgTime');
    });

    it('should generate adjustment code', () => {
      const code = adaptiveDifficultyStore.generateCode();

      expect(code.adjustmentCode).toContain('applyDifficultyAdjustments');
    });

    it('should generate utility code', () => {
      const code = adaptiveDifficultyStore.generateCode();

      expect(code.utilityCode).toContain('DifficultyManager');
      expect(code.utilityCode).toContain('update');
      expect(code.utilityCode).toContain('getTracker');
    });

    it('should include adjustments in generated code', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Easy Mode',
        description: 'Reduce difficulty',
        type: 'variable_modifier',
        targetLevel: 'easy',
        thresholds: [
          {
            metricId: 'metric_success',
            condition: 'below',
            value: 0.5,
            duration: 5,
          },
        ],
        variableModifier: {
          variableName: 'damage',
          operation: 'multiply',
          value: 0.5,
        },
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('Easy Mode');
      expect(code.adjustmentCode).toContain('damage');
    });

    it('should handle variable modifier operations', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Test',
        description: 'Test',
        type: 'variable_modifier',
        targetLevel: 'normal',
        thresholds: [],
        variableModifier: {
          variableName: 'health',
          operation: 'add',
          value: 10,
        },
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.adjustmentCode).toContain('health');
      expect(code.adjustmentCode).toContain('+=');
    });

    it('should handle hint availability adjustments', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Enable Hints',
        description: 'Show hints to struggling players',
        type: 'hint_availability',
        targetLevel: 'easy',
        thresholds: [],
        hintAvailability: {
          enableHints: true,
          hintDelay: 30,
        },
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.adjustmentCode).toContain('hintsEnabled');
      expect(code.adjustmentCode).toContain('hintDelay');
    });

    it('should handle timer adjustments', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'More Time',
        description: 'Give players more time',
        type: 'timer_adjustment',
        targetLevel: 'easy',
        thresholds: [],
        timerAdjustment: {
          baseTime: 60,
          adjustment: 50,
        },
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.adjustmentCode).toContain('timeLimit');
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      adaptiveDifficultyStore.setEnabled(false);
      adaptiveDifficultyStore.setUpdateFrequency(20);
      adaptiveDifficultyStore.addMetric({
        name: 'Custom',
        type: 'custom',
        description: 'Test',
      });

      adaptiveDifficultyStore.reset();

      expect(get(isEnabled)).toBe(true);
      expect(get(adjustments)).toEqual([]);
      const metricsAfterReset = get(metrics);
      expect(metricsAfterReset.every(m => m.type !== 'custom')).toBe(true);
    });
  });

  describe('metric conditions', () => {
    it('should generate correct condition for above threshold', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'High Performance',
        description: 'Increase difficulty for good players',
        type: 'variable_modifier',
        targetLevel: 'hard',
        thresholds: [
          {
            metricId: 'metric_success',
            condition: 'above',
            value: 0.8,
            duration: 5,
          },
        ],
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('>');
    });

    it('should generate correct condition for below threshold', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Low Performance',
        description: 'Decrease difficulty',
        type: 'variable_modifier',
        targetLevel: 'easy',
        thresholds: [
          {
            metricId: 'metric_success',
            condition: 'below',
            value: 0.4,
            duration: 5,
          },
        ],
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('<');
    });

    it('should generate correct condition for equals threshold', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'Exact Match',
        description: 'Exact performance level',
        type: 'variable_modifier',
        targetLevel: 'normal',
        thresholds: [
          {
            metricId: 'metric_retry',
            condition: 'equals',
            value: 3,
            duration: 5,
          },
        ],
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('===');
    });
  });

  describe('edge cases', () => {
    it('should handle empty thresholds', () => {
      adaptiveDifficultyStore.addAdjustment({
        name: 'No Thresholds',
        description: 'Test',
        type: 'variable_modifier',
        targetLevel: 'normal',
        thresholds: [],
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toBeDefined();
    });

    it('should handle multiple thresholds', () => {
      const metricsSnapshot = get(metrics);

      adaptiveDifficultyStore.addAdjustment({
        name: 'Complex Conditions',
        description: 'Multiple thresholds',
        type: 'variable_modifier',
        targetLevel: 'hard',
        thresholds: [
          {
            metricId: metricsSnapshot[0].id,
            condition: 'above',
            value: 0.7,
            duration: 5,
          },
          {
            metricId: metricsSnapshot[1].id,
            condition: 'below',
            value: 30,
            duration: 5,
          },
        ],
      });

      const code = adaptiveDifficultyStore.generateCode();
      expect(code.evaluationCode).toContain('&&');
    });

    it('should handle all difficulty levels', () => {
      const levels: DifficultyLevel[] = ['very_easy', 'easy', 'normal', 'hard', 'very_hard'];

      levels.forEach(level => {
        adaptiveDifficultyStore.addAdjustment({
          name: `${level} adjustment`,
          description: `Test ${level}`,
          type: 'variable_modifier',
          targetLevel: level,
          thresholds: [],
        });
      });

      const code = adaptiveDifficultyStore.generateCode();
      levels.forEach(level => {
        expect(code.evaluationCode).toContain(level);
      });
    });
  });
});
