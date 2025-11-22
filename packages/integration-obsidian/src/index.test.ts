import { describe, it, expect } from 'vitest';
import * as ObsidianModule from './index';

describe('@writewhisker/integration-obsidian', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(ObsidianModule).toBeDefined();
      const exports = Object.keys(ObsidianModule);
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
