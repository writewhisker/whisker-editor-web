import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  aiActions,
} from './aiStore';
import { AIService } from '$lib/ai/AIService';
import type { AIResponse } from '$lib/ai/types';

// Mock AIService
vi.mock('$lib/ai/AIService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    complete: vi.fn(),
    updateConfig: vi.fn(),
  })),
}));

describe('aiStore', () => {
  beforeEach(() => {
    // Reset stores
    aiConfig.set({
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 1000,
    });
    isAIEnabled.set(false);
    isGenerating.set(false);
    lastResponse.set(null);
    suggestions.set([]);
    usageStats.set({
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
    });

    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should start with default config', () => {
      const config = get(aiConfig);
      expect(config.provider).toBe('openai');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(1000);
    });

    it('should start with AI disabled', () => {
      expect(get(isAIEnabled)).toBe(false);
    });

    it('should start with no suggestions', () => {
      expect(get(suggestions)).toEqual([]);
    });

    it('should start with zero usage stats', () => {
      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('derived stores', () => {
    describe('hasAPIKey', () => {
      it('should be false without API key', () => {
        aiConfig.set({ provider: 'openai', temperature: 0.7, maxTokens: 1000 });
        expect(get(hasAPIKey)).toBe(false);
      });

      it('should be true with API key', () => {
        aiConfig.set({
          provider: 'openai',
          apiKey: 'sk-test',
          temperature: 0.7,
          maxTokens: 1000,
        });
        expect(get(hasAPIKey)).toBe(true);
      });

      it('should be true for local provider without API key', () => {
        aiConfig.set({
          provider: 'local',
          temperature: 0.7,
          maxTokens: 1000,
        });
        expect(get(hasAPIKey)).toBe(true);
      });
    });

    describe('canGenerate', () => {
      it('should be false when AI is disabled', () => {
        isAIEnabled.set(false);
        aiConfig.set({
          provider: 'openai',
          apiKey: 'sk-test',
          temperature: 0.7,
          maxTokens: 1000,
        });
        isGenerating.set(false);

        expect(get(canGenerate)).toBe(false);
      });

      it('should be false when no API key', () => {
        isAIEnabled.set(true);
        aiConfig.set({
          provider: 'openai',
          temperature: 0.7,
          maxTokens: 1000,
        });
        isGenerating.set(false);

        expect(get(canGenerate)).toBe(false);
      });

      it('should be false when generating', () => {
        isAIEnabled.set(true);
        aiConfig.set({
          provider: 'openai',
          apiKey: 'sk-test',
          temperature: 0.7,
          maxTokens: 1000,
        });
        isGenerating.set(true);

        expect(get(canGenerate)).toBe(false);
      });

      it('should be true when enabled, has key, and not generating', () => {
        isAIEnabled.set(true);
        aiConfig.set({
          provider: 'openai',
          apiKey: 'sk-test',
          temperature: 0.7,
          maxTokens: 1000,
        });
        isGenerating.set(false);

        expect(get(canGenerate)).toBe(true);
      });
    });
  });

  describe('aiActions.initialize', () => {
    it('should create AIService instance', () => {
      aiActions.initialize();
      expect(AIService).toHaveBeenCalled();
    });

    it('should enable AI when API key exists', () => {
      aiConfig.set({
        provider: 'openai',
        apiKey: 'sk-test',
        temperature: 0.7,
        maxTokens: 1000,
      });

      aiActions.initialize();
      expect(get(isAIEnabled)).toBe(true);
    });

    it('should enable AI for local provider', () => {
      aiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      aiActions.initialize();
      expect(get(isAIEnabled)).toBe(true);
    });

    it('should not enable AI without API key for cloud providers', () => {
      aiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 1000,
      });

      aiActions.initialize();
      expect(get(isAIEnabled)).toBe(false);
    });
  });

  describe('aiActions.updateConfig', () => {
    it('should update config', () => {
      aiActions.updateConfig({
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      });

      const config = get(aiConfig);
      expect(config.provider).toBe('anthropic');
      expect(config.apiKey).toBe('sk-ant-test');
      expect(config.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should merge partial config', () => {
      aiConfig.set({
        provider: 'openai',
        apiKey: 'sk-test',
        temperature: 0.7,
        maxTokens: 1000,
      });

      aiActions.updateConfig({ temperature: 0.9 });

      const config = get(aiConfig);
      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('sk-test');
      expect(config.temperature).toBe(0.9);
      expect(config.maxTokens).toBe(1000);
    });

    it('should enable AI when API key is added', () => {
      aiActions.updateConfig({ apiKey: 'sk-test' });
      expect(get(isAIEnabled)).toBe(true);
    });

    it('should update existing AIService', () => {
      aiActions.initialize();
      const mockService = vi.mocked(AIService).mock.results[0].value;

      aiActions.updateConfig({ temperature: 0.9 });

      expect(mockService.updateConfig).toHaveBeenCalledWith({ temperature: 0.9 });
    });

    it('should create new AIService if none exists', () => {
      vi.clearAllMocks();

      aiActions.updateConfig({ apiKey: 'sk-test' });

      expect(AIService).toHaveBeenCalled();
    });
  });

  describe('aiActions.generate', () => {
    let mockService: any;

    beforeEach(() => {
      mockService = {
        complete: vi.fn(),
        updateConfig: vi.fn(),
      };
      vi.mocked(AIService).mockReturnValue(mockService);
    });

    it('should generate AI completion', async () => {
      const mockResponse: AIResponse = {
        text: 'Generated content',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      mockService.complete.mockResolvedValue(mockResponse);

      const response = await aiActions.generate({
        prompt: 'Test prompt',
        systemPrompt: 'Test system',
      });

      expect(mockService.complete).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        systemPrompt: 'Test system',
      });
      expect(response).toEqual(mockResponse);
      expect(get(lastResponse)).toEqual(mockResponse);
    });

    it('should set generating flag during generation', async () => {
      const mockResponse: AIResponse = {
        text: 'Generated content',
      };

      mockService.complete.mockImplementation(async () => {
        expect(get(isGenerating)).toBe(true);
        return mockResponse;
      });

      await aiActions.generate({ prompt: 'Test' });

      expect(get(isGenerating)).toBe(false);
    });

    it('should update usage stats', async () => {
      const mockResponse: AIResponse = {
        text: 'Generated content',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      };

      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generate({ prompt: 'Test' });

      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(300);
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should accumulate usage stats across multiple requests', async () => {
      const mockResponse: AIResponse = {
        text: 'Generated content',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      };

      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generate({ prompt: 'Test 1' });
      await aiActions.generate({ prompt: 'Test 2' });

      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(600);
      expect(stats.totalRequests).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockService.complete.mockRejectedValue(new Error('API error'));

      const response = await aiActions.generate({ prompt: 'Test' });

      expect(response.text).toBe('');
      expect(response.error).toBe('API error');
      expect(get(lastResponse)).toEqual(response);
    });

    it('should handle non-Error exceptions', async () => {
      mockService.complete.mockRejectedValue('String error');

      const response = await aiActions.generate({ prompt: 'Test' });

      expect(response.error).toBe('Unknown error');
    });

    it('should initialize service if not exists', async () => {
      aiConfig.set({
        provider: 'openai',
        apiKey: 'sk-test',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const mockResponse: AIResponse = { text: 'Generated' };
      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generate({ prompt: 'Test' });

      expect(AIService).toHaveBeenCalled();
    });

    it('should clear generating flag even on error', async () => {
      mockService.complete.mockRejectedValue(new Error('API error'));

      await aiActions.generate({ prompt: 'Test' });

      expect(get(isGenerating)).toBe(false);
    });
  });

  describe('aiActions.generateSuggestions', () => {
    let mockService: any;

    beforeEach(() => {
      mockService = {
        complete: vi.fn(),
        updateConfig: vi.fn(),
      };
      vi.mocked(AIService).mockReturnValue(mockService);
    });

    it('should generate content suggestions', async () => {
      const mockResponse: AIResponse = {
        text: '1. First suggestion\n2. Second suggestion\n3. Third suggestion',
      };

      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generateSuggestions('Test context', 'content');

      const results = get(suggestions);
      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('content');
      expect(results[0].text).toBe('First suggestion');
      expect(results[0].confidence).toBe(0.9);
      expect(results[1].confidence).toBe(0.8);
      expect(results[2].confidence).toBe(0.7);
    });

    it('should use correct system prompt for each type', async () => {
      mockService.complete.mockResolvedValue({ text: '1. Test' });

      await aiActions.generateSuggestions('Context', 'dialogue');

      expect(mockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('dialogue specialist'),
        })
      );
    });

    it('should handle empty response', async () => {
      mockService.complete.mockResolvedValue({ text: '' });

      await aiActions.generateSuggestions('Context', 'content');

      expect(get(suggestions)).toEqual([]);
    });

    it('should handle error response', async () => {
      mockService.complete.mockResolvedValue({
        text: '',
        error: 'API error',
      });

      await aiActions.generateSuggestions('Context', 'content');

      expect(get(suggestions)).toEqual([]);
    });

    it('should limit to 3 suggestions', async () => {
      const mockResponse: AIResponse = {
        text: '1. First\n2. Second\n3. Third\n4. Fourth\n5. Fifth',
      };

      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generateSuggestions('Context', 'choice');

      const results = get(suggestions);
      expect(results).toHaveLength(3);
    });

    it('should strip numbering from suggestions', async () => {
      const mockResponse: AIResponse = {
        text: '1. First suggestion\n2. Second suggestion',
      };

      mockService.complete.mockResolvedValue(mockResponse);

      await aiActions.generateSuggestions('Context', 'content');

      const results = get(suggestions);
      expect(results[0].text).toBe('First suggestion');
      expect(results[1].text).toBe('Second suggestion');
    });
  });

  describe('aiActions.clearSuggestions', () => {
    it('should clear suggestions', () => {
      suggestions.set([
        { type: 'content', text: 'Test', confidence: 0.9 },
      ]);

      aiActions.clearSuggestions();

      expect(get(suggestions)).toEqual([]);
    });
  });

  describe('aiActions.resetStats', () => {
    it('should reset usage stats', () => {
      usageStats.set({
        totalTokens: 1000,
        totalRequests: 10,
        totalCost: 0.05,
      });

      aiActions.resetStats();

      const stats = get(usageStats);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('aiActions.disable', () => {
    it('should disable AI', () => {
      isAIEnabled.set(true);

      aiActions.disable();

      expect(get(isAIEnabled)).toBe(false);
    });
  });

  describe('aiActions.estimateCost', () => {
    it('should return 0 for no usage', () => {
      const response: AIResponse = { text: 'Test' };
      expect(aiActions.estimateCost(response)).toBe(0);
    });

    it('should estimate cost for OpenAI GPT-4', () => {
      aiConfig.set({
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000,
        },
      };

      const cost = aiActions.estimateCost(response);
      // 1000 * 30 / 1M + 2000 * 60 / 1M = 0.03 + 0.12 = 0.15
      expect(cost).toBeCloseTo(0.15, 4);
    });

    it('should estimate cost for OpenAI GPT-3.5', () => {
      aiConfig.set({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000,
        },
      };

      const cost = aiActions.estimateCost(response);
      // 1000 * 0.5 / 1M + 2000 * 1.5 / 1M = 0.0005 + 0.003 = 0.0035
      expect(cost).toBeCloseTo(0.0035, 4);
    });

    it('should estimate cost for Anthropic Claude Opus', () => {
      aiConfig.set({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000,
        },
      };

      const cost = aiActions.estimateCost(response);
      // 1000 * 15 / 1M + 2000 * 75 / 1M = 0.015 + 0.15 = 0.165
      expect(cost).toBeCloseTo(0.165, 4);
    });

    it('should estimate cost for Anthropic Claude Sonnet', () => {
      aiConfig.set({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000,
        },
      };

      const cost = aiActions.estimateCost(response);
      // 1000 * 3 / 1M + 2000 * 15 / 1M = 0.003 + 0.03 = 0.033
      expect(cost).toBeCloseTo(0.033, 4);
    });

    it('should return 0 for local provider', () => {
      aiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const response: AIResponse = {
        text: 'Test',
        usage: {
          promptTokens: 1000,
          completionTokens: 2000,
          totalTokens: 3000,
        },
      };

      const cost = aiActions.estimateCost(response);
      expect(cost).toBe(0);
    });
  });

  describe('aiActions.getSystemPromptForType', () => {
    it('should return content prompt', () => {
      const prompt = aiActions.getSystemPromptForType('content');
      expect(prompt).toContain('creative writing assistant');
    });

    it('should return choice prompt', () => {
      const prompt = aiActions.getSystemPromptForType('choice');
      expect(prompt).toContain('branching narrative expert');
    });

    it('should return dialogue prompt', () => {
      const prompt = aiActions.getSystemPromptForType('dialogue');
      expect(prompt).toContain('dialogue specialist');
    });

    it('should return improvement prompt', () => {
      const prompt = aiActions.getSystemPromptForType('improvement');
      expect(prompt).toContain('editor for interactive fiction');
    });
  });

  describe('localStorage persistence', () => {
    it('should save config to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');

      aiActions.updateConfig({
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
      });

      expect(spy).toHaveBeenCalledWith('ai-config', expect.any(String));

      const saved = localStorage.getItem('ai-config');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.provider).toBe('anthropic');
      expect(parsed.apiKey).toBe('sk-ant-test');
    });

    it('should save stats to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');

      usageStats.set({
        totalTokens: 1000,
        totalRequests: 5,
        totalCost: 0.05,
      });

      expect(spy).toHaveBeenCalledWith('ai-usage-stats', expect.any(String));

      const saved = localStorage.getItem('ai-usage-stats');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.totalTokens).toBe(1000);
      expect(parsed.totalRequests).toBe(5);
    });
  });
});
