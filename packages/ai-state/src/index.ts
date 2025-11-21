/**
 * AI State
 *
 * Generic AI assistance state management for Svelte applications.
 * Provider-agnostic design - works with OpenAI, Anthropic, local models, etc.
 */

import { writable, derived } from 'svelte/store';

export type AIProvider = 'openai' | 'anthropic' | 'local' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResponse {
  text: string;
  error?: string;
  usage?: AIUsage;
}

export interface AISuggestion {
  type: string;
  text: string;
  confidence: number;
}

export interface AIUsageStats {
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
}

// Storage adapter
export interface AIStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultStorage: AIStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

let storage: AIStorage = defaultStorage;

export function configureAIStorage(adapter: AIStorage): void {
  storage = adapter;
}

// Load config
function loadConfig(): AIConfig {
  const saved = storage.getItem('ai-config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load AI config:', e);
    }
  }
  return {
    provider: 'openai',
    temperature: 0.7,
    maxTokens: 1000,
  };
}

function loadUsageStats(): AIUsageStats {
  const saved = storage.getItem('ai-usage-stats');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load AI usage stats:', e);
    }
  }
  return {
    totalTokens: 0,
    totalRequests: 0,
    totalCost: 0,
  };
}

// State stores
export const aiConfig = writable<AIConfig>(loadConfig());
export const isAIEnabled = writable<boolean>(false);
export const isGenerating = writable<boolean>(false);
export const lastResponse = writable<AIResponse | null>(null);
export const suggestions = writable<AISuggestion[]>([]);
export const usageStats = writable<AIUsageStats>(loadUsageStats());

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

/**
 * Update AI configuration
 */
export function updateAIConfig(config: Partial<AIConfig>): void {
  aiConfig.update(current => {
    const newConfig = { ...current, ...config };
    storage.setItem('ai-config', JSON.stringify(newConfig));
    return newConfig;
  });

  // Update enabled status based on API key
  aiConfig.subscribe($config => {
    isAIEnabled.set(!!$config.apiKey || $config.provider === 'local');
  })();
}

/**
 * Set generation state
 */
export function setGenerating(generating: boolean): void {
  isGenerating.set(generating);
}

/**
 * Set last response
 */
export function setLastResponse(response: AIResponse): void {
  lastResponse.set(response);

  // Update usage stats if available
  if (response.usage) {
    usageStats.update(stats => {
      const newStats = {
        totalTokens: stats.totalTokens + response.usage!.totalTokens,
        totalRequests: stats.totalRequests + 1,
        totalCost: stats.totalCost + estimateCost(response),
      };
      storage.setItem('ai-usage-stats', JSON.stringify(newStats));
      return newStats;
    });
  }
}

/**
 * Set suggestions
 */
export function setSuggestions(newSuggestions: AISuggestion[]): void {
  suggestions.set(newSuggestions);
}

/**
 * Clear suggestions
 */
export function clearSuggestions(): void {
  suggestions.set([]);
}

/**
 * Reset usage stats
 */
export function resetUsageStats(): void {
  const defaultStats = {
    totalTokens: 0,
    totalRequests: 0,
    totalCost: 0,
  };
  usageStats.set(defaultStats);
  storage.setItem('ai-usage-stats', JSON.stringify(defaultStats));
}

/**
 * Estimate cost based on usage
 */
function estimateCost(response: AIResponse): number {
  if (!response.usage) return 0;

  let config: AIConfig = { provider: 'openai', temperature: 0.7, maxTokens: 1000 };
  aiConfig.subscribe(c => { config = c; })();

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
}

/**
 * Disable AI
 */
export function disableAI(): void {
  isAIEnabled.set(false);
}

// Save config to storage when it changes
aiConfig.subscribe(($config) => {
  storage.setItem('ai-config', JSON.stringify($config));
});

// Save stats to storage when they change
usageStats.subscribe(($stats) => {
  storage.setItem('ai-usage-stats', JSON.stringify($stats));
});
