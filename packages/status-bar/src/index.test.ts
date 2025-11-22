import { describe, it, expect } from 'vitest';
import * as StatusBarModule from './index';

describe('@writewhisker/status-bar', () => {
  describe('module exports', () => {
    const expectedExports = [
      'StatusBar',
      'StatusItem',
      'StatusMessage',
      'ProgressBar'
    ];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(StatusBarModule[name as keyof typeof StatusBarModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(StatusBarModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
