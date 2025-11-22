import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  aiConfig,
  isAIEnabled,
  isGenerating,
  lastResponse,
  suggestions,
  usageStats,
  hasAPIKey,
  canGenerate,
  updateAIConfig,
  setGenerating,
  setLastResponse,
  setSuggestions,
  clearSuggestions,
  resetUsageStats,
  disableAI,
  configureAIStorage,
  type AIConfig,
  type AIResponse,
  type AISuggestion,
  type AIStorage,
} from './index';

describe('@writewhisker/ai-state', () => {
  let mockStorage: Map<string, string>;
  let storageAdapter: AIStorage;

  beforeEach(() => {
    mockStorage = new Map();
    storageAdapter = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
    };
    configureAIStorage(storageAdapter);

    // Reset state - explicitly clear apiKey and set defaults
    updateAIConfig({ provider: 'openai', apiKey: undefined, temperature: 0.7, maxTokens: 1000 });
    setGenerating(false);
    clearSuggestions();
    resetUsageStats();
    disableAI();
  });

  describe('AI configuration', () => {
    it('should initialize with default config', () => {
      const config = get(aiConfig);
      expect(config.provider).toBe('openai');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(1000);
    });

    it('should update configuration', () => {
      updateAIConfig({
        provider: 'anthropic',
        model: 'claude-3',
        apiKey: 'test-key',
      });

      const config = get(aiConfig);
      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-3');
      expect(config.apiKey).toBe('test-key');
    });

    it('should persist config to storage', () => {
      updateAIConfig({ provider: 'local', apiKey: 'test' });

      const saved = mockStorage.get('ai-config');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.provider).toBe('local');
    });
  });

  describe('AI enabled state', () => {
    it('should enable AI when API key is set', () => {
      updateAIConfig({ apiKey: 'test-key' });
      expect(get(isAIEnabled)).toBe(true);
    });

    it('should enable AI for local provider', () => {
      updateAIConfig({ provider: 'local' });
      expect(get(isAIEnabled)).toBe(true);
    });

    it('should disable AI manually', () => {
      updateAIConfig({ apiKey: 'test-key' });
      disableAI();
      expect(get(isAIEnabled)).toBe(false);
    });
  });

  describe('generation state', () => {
    it('should set generating state', () => {
      setGenerating(true);
      expect(get(isGenerating)).toBe(true);

      setGenerating(false);
      expect(get(isGenerating)).toBe(false);
    });
  });

  describe('responses', () => {
    it('should set last response', () => {
      const response: AIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      setLastResponse(response);
      const stored = get(lastResponse);
      expect(stored).toEqual(response);
    });

    it('should update usage stats on response', () => {
      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      setLastResponse(response);
      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(30);
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalCost).toBeGreaterThan(0);
    });
  });

  describe('suggestions', () => {
    it('should set suggestions', () => {
      const testSuggestions: AISuggestion[] = [
        { type: 'dialogue', text: 'Test suggestion', confidence: 0.9 },
      ];

      setSuggestions(testSuggestions);
      const stored = get(suggestions);
      expect(stored).toEqual(testSuggestions);
    });

    it('should clear suggestions', () => {
      setSuggestions([
        { type: 'test', text: 'Test', confidence: 0.5 },
      ]);

      clearSuggestions();
      const stored = get(suggestions);
      expect(stored).toEqual([]);
    });
  });

  describe('usage stats', () => {
    it('should initialize with zero stats', () => {
      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCost).toBe(0);
    });

    it('should reset usage stats', () => {
      setLastResponse({
        text: 'Test',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });

      resetUsageStats();
      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCost).toBe(0);
    });

    it('should persist stats to storage', () => {
      setLastResponse({
        text: 'Test',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });

      const saved = mockStorage.get('ai-usage-stats');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.totalTokens).toBe(30);
    });
  });

  describe('derived stores', () => {
    it('should derive hasAPIKey correctly', () => {
      expect(get(hasAPIKey)).toBe(false);
      updateAIConfig({ apiKey: 'test-key' });
      expect(get(hasAPIKey)).toBe(true);
    });

    it('should derive hasAPIKey true for local provider', () => {
      updateAIConfig({ provider: 'local' });
      expect(get(hasAPIKey)).toBe(true);
    });

    it('should derive canGenerate correctly', () => {
      expect(get(canGenerate)).toBe(false);

      updateAIConfig({ apiKey: 'test-key' });
      expect(get(canGenerate)).toBe(true);

      setGenerating(true);
      expect(get(canGenerate)).toBe(false);
    });
  });
});
