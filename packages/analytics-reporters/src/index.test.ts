import { describe, it, expect } from 'vitest';
import * as AnalyticsReportersModule from './index';

describe('@writewhisker/analytics-reporters', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(AnalyticsReportersModule).toBeDefined();
      expect(Object.keys(AnalyticsReportersModule).length).toBeGreaterThan(0);
    });
  });
});
