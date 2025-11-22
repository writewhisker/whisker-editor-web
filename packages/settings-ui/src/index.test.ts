import { describe, it, expect } from 'vitest';
import * as SettingsUIModule from './index';

describe('@writewhisker/settings-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['SettingsPanel', 'PreferenceToggle', 'ThemeSelector'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(SettingsUIModule[name as keyof typeof SettingsUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(SettingsUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
