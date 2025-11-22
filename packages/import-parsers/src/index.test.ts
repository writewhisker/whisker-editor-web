import { describe, it, expect } from 'vitest';
import * as Module from './index';

describe('@writewhisker/import-parsers', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(Module).toBeDefined();
      const exports = Object.keys(Module);
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
