import { describe, it, expect } from 'vitest';
import * as AudioUIModule from './index';

describe('@writewhisker/audio-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['AudioPlayer', 'Waveform', 'VolumeControl'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(AudioUIModule[name as keyof typeof AudioUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(AudioUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
