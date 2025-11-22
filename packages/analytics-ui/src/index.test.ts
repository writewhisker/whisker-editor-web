import { describe, it, expect } from 'vitest';
import * as AnalyticsUIModule from './index';

describe('@writewhisker/analytics-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['MetricsDashboard', 'StatsCard', 'ChartWidget'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(AnalyticsUIModule[name as keyof typeof AnalyticsUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(AnalyticsUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
