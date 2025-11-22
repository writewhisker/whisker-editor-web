import { describe, it, expect } from 'vitest';
import * as SidebarPanelsModule from './index';

describe('@writewhisker/sidebar-panels', () => {
  describe('module exports', () => {
    const expectedExports = [
      'Sidebar',
      'Panel',
      'PanelTabs',
      'TreeView',
      'PropertiesPanel'
    ];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(SidebarPanelsModule[name as keyof typeof SidebarPanelsModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(SidebarPanelsModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
