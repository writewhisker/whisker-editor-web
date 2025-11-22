import { describe, it, expect } from 'vitest';
import * as ContextMenusModule from './index';

describe('@writewhisker/context-menus', () => {
  describe('module exports', () => {
    const expectedExports = ['ContextMenu', 'Dropdown', 'DropdownMenu'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(ContextMenusModule[name as keyof typeof ContextMenusModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(ContextMenusModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
