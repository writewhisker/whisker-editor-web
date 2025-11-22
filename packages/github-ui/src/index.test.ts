import { describe, it, expect } from 'vitest';
import * as GitHubUIModule from './index';

describe('@writewhisker/github-ui', () => {
  describe('module exports', () => {
    const expectedExports = ['CommitHistory', 'BranchSelector', 'SyncStatus'];

    expectedExports.forEach(name => {
      it(`should export ${name} component`, () => {
        expect(GitHubUIModule[name as keyof typeof GitHubUIModule]).toBeDefined();
      });
    });

    it('should export all expected components', () => {
      const exports = Object.keys(GitHubUIModule);
      expectedExports.forEach(exp => {
        expect(exports).toContain(exp);
      });
    });
  });
});
