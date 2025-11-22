import { describe, it, expect } from 'vitest';
import * as ToolbarUIModule from './index';

describe('@writewhisker/toolbar-ui', () => {
  describe('module exports', () => {
    const expectedExports = [
      'Toolbar',
      'ToolbarButton',
      'ToolbarGroup',
      'MenuBar',
      'CommandPalette'
    ];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(ToolbarUIModule[name as keyof typeof ToolbarUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(ToolbarUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
