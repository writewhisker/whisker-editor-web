/**
 * AI Service Types
 *
 * Type definitions for AI integration.
 */

export type AIProvider = 'openai' | 'anthropic' | 'local';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseURL?: string; // For local or custom endpoints
  temperature?: number; // 0-1, creativity
  maxTokens?: number;
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, any>;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  error?: string;
}

export interface WritingSuggestion {
  type: 'content' | 'choice' | 'dialogue' | 'improvement';
  text: string;
  confidence?: number; // 0-1
  reasoning?: string;
}

export interface StoryAnalysisResult {
  plotConsistency: number; // 0-1
  characterConsistency: number; // 0-1
  themes: string[];
  pacing: 'slow' | 'moderate' | 'fast';
  tone: string;
  suggestions: string[];
  issues: string[];
}
