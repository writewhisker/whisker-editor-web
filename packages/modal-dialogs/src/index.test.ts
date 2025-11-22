import { describe, it, expect } from 'vitest';
import * as ModalDialogsModule from './index';

describe('@writewhisker/modal-dialogs', () => {
  describe('module exports', () => {
    const expectedExports = [
      'Modal',
      'Dialog',
      'ConfirmDialog',
      'AlertDialog',
      'PromptDialog'
    ];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(ModalDialogsModule[name as keyof typeof ModalDialogsModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(ModalDialogsModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
