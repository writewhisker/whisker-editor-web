import { describe, it, expect } from 'vitest';
import * as ValidationUIModule from './index';

describe('@writewhisker/validation-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['ErrorPanel', 'WarningList', 'FixSuggestion'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(ValidationUIModule[name as keyof typeof ValidationUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(ValidationUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
