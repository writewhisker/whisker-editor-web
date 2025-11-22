import { describe, it, expect } from 'vitest';
import * as AnalyticsCollectorsModule from './index';

describe('@writewhisker/analytics-collectors', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(AnalyticsCollectorsModule).toBeDefined();
      expect(Object.keys(AnalyticsCollectorsModule).length).toBeGreaterThan(0);
    });
  });
});
