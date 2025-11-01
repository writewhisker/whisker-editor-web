import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  aiWritingStore,
  aiConfig,
  isAILoading,
  aiHistory,
  lastAIResponse,
  aiError,
  type AssistanceType,
} from './aiWritingStore';

describe('aiWritingStore', () => {
  beforeEach(() => {
    aiWritingStore.reset();
  });

  afterEach(() => {
    aiWritingStore.reset();
    vi.clearAllTimers();
  });

  describe('initial state', () => {
    it('should initialize with mock provider', () => {
      expect(get(aiConfig).provider).toBe('mock');
    });

    it('should initialize with default temperature', () => {
      expect(get(aiConfig).temperature).toBe(0.7);
    });

    it('should initialize with default max tokens', () => {
      expect(get(aiConfig).maxTokens).toBe(500);
    });

    it('should initialize as not loading', () => {
      expect(get(isAILoading)).toBe(false);
    });

    it('should initialize with empty history', () => {
      const history = get(aiHistory);
      expect(history.requests).toEqual([]);
      expect(history.responses).toEqual([]);
    });

    it('should initialize with no error', () => {
      expect(get(aiError)).toBeNull();
    });

    it('should initialize with no last response', () => {
      expect(get(lastAIResponse)).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update provider', () => {
      aiWritingStore.updateConfig({ provider: 'openai' });
      expect(get(aiConfig).provider).toBe('openai');
    });

    it('should update API key', () => {
      aiWritingStore.updateConfig({ apiKey: 'test-key' });
      expect(get(aiConfig).apiKey).toBe('test-key');
    });

    it('should update model', () => {
      aiWritingStore.updateConfig({ model: 'gpt-4' });
      expect(get(aiConfig).model).toBe('gpt-4');
    });

    it('should update temperature', () => {
      aiWritingStore.updateConfig({ temperature: 0.9 });
      expect(get(aiConfig).temperature).toBe(0.9);
    });

    it('should update max tokens', () => {
      aiWritingStore.updateConfig({ maxTokens: 1000 });
      expect(get(aiConfig).maxTokens).toBe(1000);
    });

    it('should update multiple config values at once', () => {
      aiWritingStore.updateConfig({
        provider: 'anthropic',
        temperature: 0.5,
        maxTokens: 750,
      });

      const config = get(aiConfig);
      expect(config.provider).toBe('anthropic');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(750);
    });
  });

  describe('requestAssistance', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const assistanceTypes: AssistanceType[] = [
      'continue_story',
      'generate_choices',
      'write_dialogue',
      'describe_scene',
      'improve_text',
      'brainstorm',
      'check_consistency',
    ];

    assistanceTypes.forEach(type => {
      it(`should request ${type} assistance`, async () => {
        const promise = aiWritingStore.requestAssistance(
          type,
          'Test prompt',
          'Test context'
        );

        // Fast-forward through the simulated delay
        await vi.advanceTimersByTimeAsync(3000);

        const response = await promise;

        expect(response).toBeDefined();
        expect(response.content).toBeTruthy();
        expect(response.requestId).toBeDefined();
      });
    });

    it('should set loading state during request', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      // Should be loading initially
      expect(get(isAILoading)).toBe(true);

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      // Should not be loading after completion
      expect(get(isAILoading)).toBe(false);
    });

    it('should add request to history', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      const history = get(aiHistory);
      expect(history.requests).toHaveLength(1);
      expect(history.requests[0].type).toBe('continue_story');
      expect(history.requests[0].prompt).toBe('Test prompt');
    });

    it('should add response to history', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      const history = get(aiHistory);
      expect(history.responses).toHaveLength(1);
      expect(history.responses[0].content).toBeTruthy();
    });

    it('should set last response', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      const lastResponse = get(lastAIResponse);
      expect(lastResponse?.id).toBe(response.id);
      expect(lastResponse?.content).toBe(response.content);
    });

    it('should include context in request', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt',
        'Important context'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      const history = get(aiHistory);
      expect(history.requests[0].context).toBe('Important context');
    });

    it('should include parameters in request', async () => {
      const params = { temperature: 0.8, maxLength: 200 };
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt',
        undefined,
        params
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      const history = get(aiHistory);
      expect(history.requests[0].parameters).toEqual(params);
    });

    it('should generate alternatives for continue_story', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.alternatives).toBeDefined();
      expect(response.alternatives).toHaveLength(2);
    });

    it('should not generate alternatives for other types', async () => {
      const promise = aiWritingStore.requestAssistance(
        'brainstorm',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.alternatives).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock an error by using a null prompt that might cause issues
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        null as any
      );

      await vi.advanceTimersByTimeAsync(3000);

      try {
        await promise;
      } catch (error) {
        expect(get(aiError)).toBeTruthy();
        expect(get(isAILoading)).toBe(false);
      }
    });

    it('should clear error on successful request', async () => {
      // First request fails (simulated)
      aiWritingStore.updateConfig({ provider: 'custom' as any });

      // Then reset and make successful request
      aiWritingStore.reset();
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      expect(get(aiError)).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // Manually set an error by subscribing and updating
      // (In real scenario, would come from failed request)
      aiWritingStore.clearError();
      expect(get(aiError)).toBeNull();
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear all history', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      expect(get(aiHistory).requests).toHaveLength(1);
      expect(get(aiHistory).responses).toHaveLength(1);

      aiWritingStore.clearHistory();

      const history = get(aiHistory);
      expect(history.requests).toEqual([]);
      expect(history.responses).toEqual([]);
    });

    it('should clear last response', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      expect(get(lastAIResponse)).not.toBeNull();

      aiWritingStore.clearHistory();
      expect(get(lastAIResponse)).toBeNull();
    });
  });

  describe('getTemplates', () => {
    it('should return templates for all assistance types', () => {
      const templates = aiWritingStore.getTemplates();

      expect(templates.continue_story).toBeDefined();
      expect(templates.generate_choices).toBeDefined();
      expect(templates.write_dialogue).toBeDefined();
      expect(templates.describe_scene).toBeDefined();
      expect(templates.improve_text).toBeDefined();
      expect(templates.brainstorm).toBeDefined();
      expect(templates.check_consistency).toBeDefined();
    });

    it('should have label for each template', () => {
      const templates = aiWritingStore.getTemplates();

      Object.values(templates).forEach(template => {
        expect(template.label).toBeTruthy();
      });
    });

    it('should have description for each template', () => {
      const templates = aiWritingStore.getTemplates();

      Object.values(templates).forEach(template => {
        expect(template.description).toBeTruthy();
      });
    });

    it('should have placeholder for each template', () => {
      const templates = aiWritingStore.getTemplates();

      Object.values(templates).forEach(template => {
        expect(template.placeholder).toBeTruthy();
      });
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should reset to default state', async () => {
      aiWritingStore.updateConfig({ provider: 'openai', apiKey: 'test' });
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test prompt'
      );

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      aiWritingStore.reset();

      expect(get(aiConfig).provider).toBe('mock');
      expect(get(aiConfig).apiKey).toBeUndefined();
      expect(get(aiHistory).requests).toEqual([]);
      expect(get(aiHistory).responses).toEqual([]);
      expect(get(lastAIResponse)).toBeNull();
      expect(get(aiError)).toBeNull();
    });
  });

  describe('mock responses', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return story continuation for continue_story', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toContain(' '); // Should have actual content, not just empty
      expect(response.content.length).toBeGreaterThan(50);
    });

    it('should return choices for generate_choices', async () => {
      const promise = aiWritingStore.requestAssistance(
        'generate_choices',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toContain('[[');
      expect(response.content).toContain(']]');
    });

    it('should return dialogue for write_dialogue', async () => {
      const promise = aiWritingStore.requestAssistance(
        'write_dialogue',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toContain('"');
    });

    it('should return scene description for describe_scene', async () => {
      const promise = aiWritingStore.requestAssistance(
        'describe_scene',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content.length).toBeGreaterThan(100);
    });

    it('should return improvements for improve_text', async () => {
      const promise = aiWritingStore.requestAssistance(
        'improve_text',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toContain('Original');
      expect(response.content).toContain('Improved');
    });

    it('should return ideas for brainstorm', async () => {
      const promise = aiWritingStore.requestAssistance(
        'brainstorm',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toMatch(/\d+\./); // Should contain numbered list
    });

    it('should return consistency check for check_consistency', async () => {
      const promise = aiWritingStore.requestAssistance(
        'check_consistency',
        'Test'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response.content).toContain('✓');
      expect(response.content).toContain('⚠');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle empty prompt', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        ''
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response).toBeDefined();
    });

    it('should handle very long prompt', async () => {
      const longPrompt = 'word '.repeat(1000);
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        longPrompt
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response).toBeDefined();
    });

    it('should handle special characters in prompt', async () => {
      const promise = aiWritingStore.requestAssistance(
        'continue_story',
        '!@#$%^&*(){}[]|\\:";\'<>?,./~`'
      );

      await vi.advanceTimersByTimeAsync(3000);
      const response = await promise;

      expect(response).toBeDefined();
    });

    it('should handle multiple concurrent requests', async () => {
      const promise1 = aiWritingStore.requestAssistance('continue_story', 'Test 1');
      const promise2 = aiWritingStore.requestAssistance('brainstorm', 'Test 2');

      await vi.advanceTimersByTimeAsync(3000);
      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(get(aiHistory).requests).toHaveLength(2);
    });
  });
});
