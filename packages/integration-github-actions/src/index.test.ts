import { describe, it, expect } from 'vitest';
import * as GitHubActionsModule from './index';

describe('@writewhisker/integration-github-actions', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(GitHubActionsModule).toBeDefined();
      const exports = Object.keys(GitHubActionsModule);
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
