import { describe, it, expect } from 'vitest';
import * as NotionModule from './index';

describe('@writewhisker/integration-notion', () => {
  describe('module exports', () => {
    it('should export module', () => {
      expect(NotionModule).toBeDefined();
      const exports = Object.keys(NotionModule);
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
