/**
 * AI Service
 *
 * Abstract service for AI-powered writing assistance.
 */

import type { AIConfig, AIRequest, AIResponse } from './types';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Generate text completion
   */
  async complete(request: AIRequest): Promise<AIResponse> {
    // Validate API key
    if (!this.config.apiKey && this.config.provider !== 'local') {
      return {
        text: '',
        error: 'API key not configured',
      };
    }

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.completeOpenAI(request);
        case 'anthropic':
          return await this.completeAnthropic(request);
        case 'local':
          return await this.completeLocal(request);
        default:
          return {
            text: '',
            error: 'Unknown provider',
          };
      }
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete using OpenAI API
   */
  private async completeOpenAI(request: AIRequest): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
    };
  }

  /**
   * Complete using Anthropic API
   */
  private async completeAnthropic(request: AIRequest): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 1000,
        messages: [
          { role: 'user', content: request.prompt },
        ],
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.content[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
    };
  }

  /**
   * Complete using local/custom API
   */
  private async completeLocal(request: AIRequest): Promise<AIResponse> {
    const baseURL = this.config.baseURL || 'http://localhost:8080';

    const response = await fetch(`${baseURL}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.text || data.completion || '',
      model: 'local',
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}
