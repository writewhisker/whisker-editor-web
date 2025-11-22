import { describe, it, expect } from 'vitest';
import * as AIUIModule from './index';

describe('@writewhisker/ai-ui', () => {
  describe('module exports', () => {
    it('should export AIAssistant component', () => {
      expect(AIUIModule.AIAssistant).toBeDefined();
    });

    it('should export SuggestionPanel component', () => {
      expect(AIUIModule.SuggestionPanel).toBeDefined();
    });

    it('should export PromptInput component', () => {
      expect(AIUIModule.PromptInput).toBeDefined();
    });

    it('should export all expected components', () => {
      const exports = Object.keys(AIUIModule);
      expect(exports).toContain('AIAssistant');
      expect(exports).toContain('SuggestionPanel');
      expect(exports).toContain('PromptInput');
    });

    it('should have exactly 3 exports', () => {
      const exports = Object.keys(AIUIModule);
      expect(exports.length).toBe(3);
    });
  });

  describe('component availability', () => {
    it('should make AIAssistant importable', () => {
      const { AIAssistant } = AIUIModule;
      expect(AIAssistant).not.toBeUndefined();
      expect(typeof AIAssistant).toBe('function');
    });

    it('should make SuggestionPanel importable', () => {
      const { SuggestionPanel } = AIUIModule;
      expect(SuggestionPanel).not.toBeUndefined();
      expect(typeof SuggestionPanel).toBe('function');
    });

    it('should make PromptInput importable', () => {
      const { PromptInput } = AIUIModule;
      expect(PromptInput).not.toBeUndefined();
      expect(typeof PromptInput).toBe('function');
    });
  });
});
