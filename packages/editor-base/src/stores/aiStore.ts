/**
 * AI Store
 *
 * State management for AI features.
 */

import { writable, derived, get } from 'svelte/store';
import { AIService } from '../ai/AIService';
import type { AIConfig, AIRequest, AIResponse, WritingSuggestion } from '../ai/types';

// State
export const aiConfig = writable<AIConfig>({
  provider: 'openai',
  temperature: 0.7,
  maxTokens: 1000,
});

export const isAIEnabled = writable<boolean>(false);
export const isGenerating = writable<boolean>(false);
export const lastResponse = writable<AIResponse | null>(null);
export const suggestions = writable<WritingSuggestion[]>([]);
export const usageStats = writable({
  totalTokens: 0,
  totalRequests: 0,
  totalCost: 0,
});

// AI Service instance
let aiService: AIService | null = null;

// Derived stores
export const hasAPIKey = derived(aiConfig, ($config) => {
  return !!$config.apiKey || $config.provider === 'local';
});

export const canGenerate = derived(
  [isAIEnabled, hasAPIKey, isGenerating],
  ([$enabled, $hasKey, $generating]) => {
    return $enabled && $hasKey && !$generating;
  }
);

// Load config from localStorage
if (typeof window !== 'undefined') {
  const savedConfig = localStorage.getItem('ai-config');
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      aiConfig.set(parsed);
      isAIEnabled.set(!!parsed.apiKey || parsed.provider === 'local');
    } catch (e) {
      console.error('Failed to load AI config:', e);
    }
  }

  const savedStats = localStorage.getItem('ai-usage-stats');
  if (savedStats) {
    try {
      usageStats.set(JSON.parse(savedStats));
    } catch (e) {
      console.error('Failed to load AI usage stats:', e);
    }
  }
}

// Save config to localStorage
aiConfig.subscribe(($config) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ai-config', JSON.stringify($config));
  }
});

// Save stats to localStorage
usageStats.subscribe(($stats) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ai-usage-stats', JSON.stringify($stats));
  }
});

/**
 * AI Actions
 */
export const aiActions = {
  /**
   * Initialize AI service
   */
  initialize(): void {
    const config = get(aiConfig);
    aiService = new AIService(config);
    isAIEnabled.set(!!config.apiKey || config.provider === 'local');
  },

  /**
   * Update AI configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    const currentConfig = get(aiConfig);
    const newConfig = { ...currentConfig, ...config };
    aiConfig.set(newConfig);

    if (aiService) {
      aiService.updateConfig(config);
    } else {
      aiService = new AIService(newConfig);
    }

    isAIEnabled.set(!!newConfig.apiKey || newConfig.provider === 'local');
  },

  /**
   * Generate AI completion
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    if (!aiService) {
      this.initialize();
    }

    if (!aiService) {
      return {
        text: '',
        error: 'AI service not initialized',
      };
    }

    isGenerating.set(true);

    try {
      const response = await aiService.complete(request);
      lastResponse.set(response);

      // Update usage stats
      if (response.usage) {
        const stats = get(usageStats);
        usageStats.set({
          totalTokens: stats.totalTokens + response.usage.totalTokens,
          totalRequests: stats.totalRequests + 1,
          totalCost: stats.totalCost + this.estimateCost(response),
        });
      }

      return response;
    } catch (error) {
      const errorResponse = {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      lastResponse.set(errorResponse);
      return errorResponse;
    } finally {
      isGenerating.set(false);
    }
  },

  /**
   * Generate content suggestions
   */
  async generateSuggestions(context: string, type: WritingSuggestion['type']): Promise<void> {
    const systemPrompt = this.getSystemPromptForType(type);
    const prompt = `Context:\n${context}\n\nGenerate 3 ${type} suggestions:`;

    const response = await this.generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 500,
    });

    if (response.text && !response.error) {
      // Parse suggestions from response
      const newSuggestions: WritingSuggestion[] = response.text
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .slice(0, 3)
        .map((text, index) => ({
          type,
          text: text.replace(/^\d+\.\s*/, '').trim(),
          confidence: 0.9 - index * 0.1,
        }));

      suggestions.set(newSuggestions);
    }
  },

  /**
   * Clear suggestions
   */
  clearSuggestions(): void {
    suggestions.set([]);
  },

  /**
   * Reset usage stats
   */
  resetStats(): void {
    usageStats.set({
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
    });
  },

  /**
   * Disable AI
   */
  disable(): void {
    isAIEnabled.set(false);
  },

  /**
   * Estimate cost based on usage
   */
  estimateCost(response: AIResponse): number {
    if (!response.usage) return 0;

    const config = get(aiConfig);
    let inputCost = 0;
    let outputCost = 0;

    // Rough cost estimates (per 1M tokens)
    if (config.provider === 'openai') {
      if (config.model?.includes('gpt-4')) {
        inputCost = 30;
        outputCost = 60;
      } else {
        inputCost = 0.5;
        outputCost = 1.5;
      }
    } else if (config.provider === 'anthropic') {
      if (config.model?.includes('opus')) {
        inputCost = 15;
        outputCost = 75;
      } else {
        inputCost = 3;
        outputCost = 15;
      }
    }

    const cost =
      (response.usage.promptTokens / 1_000_000) * inputCost +
      (response.usage.completionTokens / 1_000_000) * outputCost;

    return cost;
  },

  /**
   * Get system prompt for suggestion type
   */
  getSystemPromptForType(type: WritingSuggestion['type']): string {
    const prompts = {
      content:
        'You are a creative writing assistant for interactive fiction. Generate engaging passage content that fits the story context.',
      choice:
        'You are a branching narrative expert. Generate meaningful choices that create interesting story branches.',
      dialogue:
        'You are a dialogue specialist. Generate natural, character-appropriate dialogue for interactive fiction.',
      improvement:
        'You are an editor for interactive fiction. Suggest improvements to enhance clarity, engagement, and narrative flow.',
    };

    return prompts[type];
  },
};

// Initialize on load
if (typeof window !== 'undefined') {
  aiActions.initialize();
}
