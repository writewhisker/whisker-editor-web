/**
 * AI Service
 *
 * Framework-agnostic AI provider abstraction.
 * Zero dependencies, works with OpenAI, Anthropic, local models, or custom providers.
 */

export type AIProviderType = 'openai' | 'anthropic' | 'local' | 'custom';

export interface AIConfig {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  messages?: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
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
  finishReason?: 'stop' | 'length' | 'error';
}

export interface AIProvider {
  complete(request: AIRequest): Promise<AIResponse>;
  stream?(request: AIRequest): AsyncIterableIterator<string>;
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider implements AIProvider {
  constructor(private config: AIConfig) {}

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.config.apiKey) {
      return { text: '', error: 'API key not configured' };
    }

    try {
      const messages: AIMessage[] = request.messages || [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        { role: 'user' as const, content: request.prompt },
      ];

      const response = await fetch(this.config.baseUrl || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { text: '', error: `OpenAI API error: ${error}` };
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        finishReason: data.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Anthropic Provider
 */
export class AnthropicProvider implements AIProvider {
  constructor(private config: AIConfig) {}

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.config.apiKey) {
      return { text: '', error: 'API key not configured' };
    }

    try {
      const messages: AIMessage[] = request.messages || [
        { role: 'user' as const, content: request.prompt },
      ];

      const response = await fetch(this.config.baseUrl || 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-sonnet-20240229',
          messages,
          system: request.systemPrompt,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { text: '', error: `Anthropic API error: ${error}` };
      }

      const data = await response.json();
      return {
        text: data.content[0]?.text || '',
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Local Model Provider (for testing or local inference)
 */
export class LocalProvider implements AIProvider {
  constructor(private config: AIConfig) {}

  async complete(request: AIRequest): Promise<AIResponse> {
    // Simple mock for local testing
    return {
      text: `[Local Model Response] Responding to: "${request.prompt.substring(0, 50)}..."`,
      usage: {
        promptTokens: Math.ceil(request.prompt.length / 4),
        completionTokens: 20,
        totalTokens: Math.ceil(request.prompt.length / 4) + 20,
      },
      finishReason: 'stop',
    };
  }
}

/**
 * AI Service Factory
 */
export class AIService {
  private provider: AIProvider;

  constructor(private config: AIConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: AIConfig): AIProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'local':
        return new LocalProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    return this.provider.complete(request);
  }

  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
    this.provider = this.createProvider(this.config);
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }
}

/**
 * Cost estimation utilities
 */
export function estimateCost(usage: AIUsage, provider: AIProviderType, model?: string): number {
  let inputCost = 0;
  let outputCost = 0;

  if (provider === 'openai') {
    if (model?.includes('gpt-4')) {
      inputCost = 30;
      outputCost = 60;
    } else {
      inputCost = 0.5;
      outputCost = 1.5;
    }
  } else if (provider === 'anthropic') {
    if (model?.includes('opus')) {
      inputCost = 15;
      outputCost = 75;
    } else {
      inputCost = 3;
      outputCost = 15;
    }
  }

  return (usage.promptTokens / 1_000_000) * inputCost +
         (usage.completionTokens / 1_000_000) * outputCost;
}

/**
 * Token counting utilities (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) return text;
  return text.substring(0, estimatedChars);
}
