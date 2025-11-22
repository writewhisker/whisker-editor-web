import { describe, it, expect } from 'vitest';
import * as KidsModeUIModule from './index';

describe('@writewhisker/kids-mode-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['KidsToolbar', 'AchievementBadge', 'TutorialPanel'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(KidsModeUIModule[name as keyof typeof KidsModeUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(KidsModeUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
