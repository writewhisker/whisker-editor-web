import { describe, it, expect } from 'vitest';
import * as AnalyticsCoreModule from './index';

describe('@writewhisker/analytics-core', () => {
  describe('module exports', () => {
    it('should export AnalyticsEngine', () => {
      expect(AnalyticsCoreModule.AnalyticsEngine).toBeDefined();
      expect(typeof AnalyticsCoreModule.AnalyticsEngine).toBe('function');
    });

    it('should export all expected classes', () => {
      const exports = Object.keys(AnalyticsCoreModule);
      expect(exports).toContain('AnalyticsEngine');
    });
  });

  describe('AnalyticsEngine instantiation', () => {
    it('should create AnalyticsEngine instance', () => {
      const { AnalyticsEngine } = AnalyticsCoreModule;
      const engine = new AnalyticsEngine();
      expect(engine).toBeInstanceOf(AnalyticsEngine);
    });
  });
});
