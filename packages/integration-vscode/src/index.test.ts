import { describe, it, expect } from 'vitest';
import * as VSCodeModule from './index';

describe('@writewhisker/integration-vscode', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(VSCodeModule).toBeDefined();
      const exports = Object.keys(VSCodeModule);
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
