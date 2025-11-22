import { describe, it, expect } from 'vitest';
import * as AnimationUIModule from './index';

describe('@writewhisker/animation-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['Timeline', 'KeyframeEditor', 'AnimationControls'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(AnimationUIModule[name as keyof typeof AnimationUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(AnimationUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
