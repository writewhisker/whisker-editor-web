import { describe, it, expect } from 'vitest';
import * as PassageEditorModule from './index';

describe('@writewhisker/passage-editor', () => {
  describe('module exports', () => {
    const expectedExports = [
      'PassageEditor',
      'TextEditor',
      'MarkdownPreview',
      'LinkInserter',
      'TagEditor'
    ];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(PassageEditorModule[name as keyof typeof PassageEditorModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(PassageEditorModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
