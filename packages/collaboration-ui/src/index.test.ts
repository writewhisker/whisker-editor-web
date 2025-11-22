import { describe, it, expect } from 'vitest';
import * as CollaborationUIModule from './index';

describe('@writewhisker/collaboration-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['CommentThread', 'DiffViewer', 'ConflictResolver'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(CollaborationUIModule[name as keyof typeof CollaborationUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(CollaborationUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
