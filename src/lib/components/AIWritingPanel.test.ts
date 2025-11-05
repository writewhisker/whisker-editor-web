import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AIWritingPanel from './AIWritingPanel.svelte';
import { aiWritingStore, isAILoading, lastAIResponse, aiError, aiHistory } from '../stores/aiWritingStore';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock alert
global.alert = vi.fn();

describe('AIWritingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiWritingStore.clearHistory();
    aiWritingStore.clearError();
  });

  afterEach(() => {
    aiWritingStore.clearHistory();
    aiWritingStore.clearError();
  });

  describe('rendering', () => {
    it('should render panel with title', () => {
      const { container } = render(AIWritingPanel);

      expect(container.textContent).toContain('AI Writing Assistant');
    });

    it('should render assistance type buttons', () => {
      const { container } = render(AIWritingPanel);

      expect(container.textContent).toContain('Continue Story');
      expect(container.textContent).toContain('Character Development');
      expect(container.textContent).toContain('Dialogue');
      expect(container.textContent).toContain('Description');
    });

    it('should render prompt textarea', () => {
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should render generate button', () => {
      const { container } = render(AIWritingPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate');
      expect(generateButton).toBeTruthy();
    });

    it('should render settings and history buttons', () => {
      const { container } = render(AIWritingPanel);

      const buttons = container.querySelectorAll('button[title]');
      const settingsButton = Array.from(buttons).find(btn => btn.getAttribute('title') === 'Settings');
      const historyButton = Array.from(buttons).find(btn => btn.getAttribute('title') === 'View History');

      expect(settingsButton).toBeTruthy();
      expect(historyButton).toBeTruthy();
    });

    it('should show help text', () => {
      const { container } = render(AIWritingPanel);

      expect(container.textContent).toContain('Get AI-powered help with your story');
    });
  });

  describe('assistance type selection', () => {
    it('should select continue_story by default', () => {
      const { container } = render(AIWritingPanel);

      const continueButton = Array.from(container.querySelectorAll('.border-blue-500')).length;
      expect(continueButton).toBeGreaterThan(0);
    });

    it('should change assistance type when button clicked', async () => {
      const { container } = render(AIWritingPanel);

      const dialogueButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Dialogue')) as HTMLButtonElement;

      await fireEvent.click(dialogueButton);

      expect(dialogueButton.className).toContain('border-blue-500');
    });

    it('should update placeholder when assistance type changes', async () => {
      const { container } = render(AIWritingPanel);

      const dialogueButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Dialogue')) as HTMLButtonElement;

      await fireEvent.click(dialogueButton);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.placeholder).toBeTruthy();
    });
  });

  describe('prompt input', () => {
    it('should allow typing in prompt textarea', async () => {
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      expect(textarea.value).toBe('Write about a hero');
    });

    it('should disable generate button when prompt is empty', () => {
      const { container } = render(AIWritingPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      expect(generateButton.disabled).toBe(true);
    });

    it('should enable generate button when prompt has text', async () => {
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      expect(generateButton.disabled).toBe(false);
    });

    it('should disable generate button when loading', async () => {
      isAILoading.set(true);
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Generating')) as HTMLButtonElement;

      expect(generateButton.disabled).toBe(true);

      isAILoading.set(false);
    });
  });

  describe('context toggle', () => {
    it('should show context toggle button', () => {
      const { container } = render(AIWritingPanel);

      const contextToggle = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add context'));
      expect(contextToggle).toBeTruthy();
    });

    it('should expand context textarea when toggle clicked', async () => {
      const { container } = render(AIWritingPanel);

      const contextToggle = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add context')) as HTMLButtonElement;

      await fireEvent.click(contextToggle);

      const contextTextarea = Array.from(container.querySelectorAll('textarea'))
        .find(ta => (ta as HTMLTextAreaElement).placeholder?.includes('additional context'));
      expect(contextTextarea).toBeTruthy();
    });

    it('should collapse context when toggle clicked again', async () => {
      const { container } = render(AIWritingPanel);

      const contextToggle = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add context')) as HTMLButtonElement;

      await fireEvent.click(contextToggle);
      await fireEvent.click(contextToggle);

      const contextTextarea = Array.from(container.querySelectorAll('textarea'))
        .find(ta => (ta as HTMLTextAreaElement).placeholder?.includes('additional context'));
      expect(contextTextarea).toBeFalsy();
    });

    it('should allow typing in context textarea', async () => {
      const { container } = render(AIWritingPanel);

      const contextToggle = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add context')) as HTMLButtonElement;

      await fireEvent.click(contextToggle);

      const contextTextarea = Array.from(container.querySelectorAll('textarea'))
        .find(ta => (ta as HTMLTextAreaElement).placeholder?.includes('additional context')) as HTMLTextAreaElement;

      await fireEvent.input(contextTextarea, { target: { value: 'Fantasy world' } });

      expect(contextTextarea.value).toBe('Fantasy world');
    });
  });

  describe('AI generation', () => {
    it('should call aiWritingStore when generate clicked', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance').mockResolvedValue({
        content: 'Generated text',
        alternatives: [],
      });

      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      await waitFor(() => {
        expect(requestSpy).toHaveBeenCalled();
      });

      requestSpy.mockRestore();
    });

    it('should display generated content', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance').mockResolvedValue({
        content: 'The brave hero stood tall',
        alternatives: [],
      });

      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      await waitFor(() => {
        expect(container.textContent).toContain('The brave hero stood tall');
      });

      requestSpy.mockRestore();
    });

    it('should show loading state during generation', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ content: 'Generated', alternatives: [] }), 100))
      );

      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      isAILoading.set(true);
      await fireEvent.click(generateButton);

      const loadingButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Generating'));

      expect(loadingButton).toBeTruthy();

      isAILoading.set(false);
      requestSpy.mockRestore();
    });

    it('should include context when provided', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance').mockResolvedValue({
        content: 'Generated text',
        alternatives: [],
      });

      const { container } = render(AIWritingPanel);

      const contextToggle = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add context')) as HTMLButtonElement;
      await fireEvent.click(contextToggle);

      const contextTextarea = Array.from(container.querySelectorAll('textarea'))
        .find(ta => (ta as HTMLTextAreaElement).placeholder?.includes('additional context')) as HTMLTextAreaElement;
      await fireEvent.input(contextTextarea, { target: { value: 'Fantasy setting' } });

      const textarea = container.querySelectorAll('textarea')[0] as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'Write about a hero' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      await waitFor(() => {
        expect(requestSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'Fantasy setting'
        );
      });

      requestSpy.mockRestore();
    });
  });

  describe('response display', () => {
    it('should show copy button for generated content', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        const copyButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Copy'));
        expect(copyButton).toBeTruthy();
      });
    });

    it('should show insert button for generated content', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        const insertButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Insert'));
        expect(insertButton).toBeTruthy();
      });
    });

    it('should copy content to clipboard when copy clicked', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const copyButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Copy')) as HTMLButtonElement;

        await fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content');
      });
    });

    it('should show alert when insert clicked', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const insertButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Insert')) as HTMLButtonElement;

        await fireEvent.click(insertButton);

        expect(global.alert).toHaveBeenCalled();
      });
    });

    it('should show New Request button after generation', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        const newRequestButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'New Request');
        expect(newRequestButton).toBeTruthy();
      });
    });

    it('should clear response when New Request clicked', async () => {
      lastAIResponse.set({ content: 'Test content', alternatives: [] });

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const newRequestButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'New Request') as HTMLButtonElement;

        await fireEvent.click(newRequestButton);

        expect(container.textContent).not.toContain('Test content');
      });
    });
  });

  describe('alternatives', () => {
    it('should display alternative buttons when alternatives exist', async () => {
      lastAIResponse.set({
        content: 'Original',
        alternatives: ['Alternative 1', 'Alternative 2'],
      });

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        expect(container.textContent).toContain('Alternative suggestions');
        expect(container.textContent).toContain('Original');
        expect(container.textContent).toContain('Alt 1');
        expect(container.textContent).toContain('Alt 2');
      });
    });

    it('should switch between alternatives when clicked', async () => {
      lastAIResponse.set({
        content: 'Original',
        alternatives: ['Alternative 1', 'Alternative 2'],
      });

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const alt1Button = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Alt 1') as HTMLButtonElement;

        await fireEvent.click(alt1Button);

        const contentDisplay = container.querySelector('.whitespace-pre-wrap');
        expect(contentDisplay?.textContent).toBe('Alternative 1');
      });
    });

    it('should copy alternative when copy clicked', async () => {
      lastAIResponse.set({
        content: 'Original',
        alternatives: ['Alternative 1'],
      });

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const alt1Button = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Alt 1') as HTMLButtonElement;

        await fireEvent.click(alt1Button);

        const copyButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Copy')) as HTMLButtonElement;

        await fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Alternative 1');
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when error occurs', async () => {
      aiError.set('Failed to generate content');

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        expect(container.textContent).toContain('Failed to generate content');
      });
    });

    it('should show dismiss button for errors', async () => {
      aiError.set('Failed to generate content');

      const { container } = render(AIWritingPanel);

      await waitFor(() => {
        const dismissButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Dismiss');
        expect(dismissButton).toBeTruthy();
      });
    });

    it('should clear error when dismiss clicked', async () => {
      aiError.set('Failed to generate content');

      const { container } = render(AIWritingPanel);

      await waitFor(async () => {
        const dismissButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Dismiss') as HTMLButtonElement;

        await fireEvent.click(dismissButton);

        expect(container.textContent).not.toContain('Failed to generate content');
      });
    });
  });

  describe('settings panel', () => {
    it('should show settings when settings button clicked', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      expect(container.textContent).toContain('Settings');
      expect(container.textContent).toContain('Provider');
      expect(container.textContent).toContain('Temperature');
      expect(container.textContent).toContain('Max Tokens');
    });

    it('should have provider options in settings', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      expect(container.textContent).toContain('Mock (Demo)');
      expect(container.textContent).toContain('OpenAI');
      expect(container.textContent).toContain('Anthropic Claude');
      expect(container.textContent).toContain('Custom Endpoint');
    });

    it('should show API key input for non-mock providers', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      const providerSelect = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(providerSelect, { target: { value: 'openai' } });

      const apiKeyInput = container.querySelector('input[type="password"]');
      expect(apiKeyInput).toBeTruthy();
    });

    it('should have temperature slider', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      const tempSlider = Array.from(container.querySelectorAll('input[type="range"]'))
        .find(input => (input as HTMLInputElement).min === '0') as HTMLInputElement;

      expect(tempSlider).toBeTruthy();
      expect(tempSlider.max).toBe('1');
    });

    it('should have max tokens slider', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      const tokensSlider = Array.from(container.querySelectorAll('input[type="range"]'))
        .find(input => (input as HTMLInputElement).min === '100') as HTMLInputElement;

      expect(tokensSlider).toBeTruthy();
      expect(tokensSlider.max).toBe('2000');
    });

    it('should close settings when Done clicked', async () => {
      const { container } = render(AIWritingPanel);

      const settingsButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'Settings') as HTMLButtonElement;

      await fireEvent.click(settingsButton);

      const doneButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Done') as HTMLButtonElement;

      await fireEvent.click(doneButton);

      expect(container.textContent).not.toContain('Temperature:');
    });
  });

  describe('history panel', () => {
    it('should show history when history button clicked', async () => {
      const { container } = render(AIWritingPanel);

      const historyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'View History') as HTMLButtonElement;

      await fireEvent.click(historyButton);

      expect(container.textContent).toContain('Request History');
    });

    it('should show empty state when no history', async () => {
      const { container } = render(AIWritingPanel);

      const historyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'View History') as HTMLButtonElement;

      await fireEvent.click(historyButton);

      expect(container.textContent).toContain('No requests yet');
    });

    it('should show clear button in history', async () => {
      const { container } = render(AIWritingPanel);

      const historyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'View History') as HTMLButtonElement;

      await fireEvent.click(historyButton);

      const clearButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Clear');
      expect(clearButton).toBeTruthy();
    });

    it('should close history when Done clicked', async () => {
      const { container } = render(AIWritingPanel);

      const historyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.getAttribute('title') === 'View History') as HTMLButtonElement;

      await fireEvent.click(historyButton);

      const doneButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Done') as HTMLButtonElement;

      await fireEvent.click(doneButton);

      expect(container.textContent).not.toContain('Request History');
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompt submission gracefully', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance');
      const { container } = render(AIWritingPanel);

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      expect(requestSpy).not.toHaveBeenCalled();

      requestSpy.mockRestore();
    });

    it('should handle very long prompts', async () => {
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const longText = 'a'.repeat(5000);
      await fireEvent.input(textarea, { target: { value: longText } });

      expect(textarea.value).toBe(longText);
    });

    it('should handle rapid assistance type changes', async () => {
      const { container } = render(AIWritingPanel);

      const buttons = Array.from(container.querySelectorAll('button'))
        .filter(btn => btn.className?.includes('p-3'));

      for (let i = 0; i < 10; i++) {
        await fireEvent.click(buttons[i % buttons.length]);
      }

      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle null response', async () => {
      lastAIResponse.set(null as any);

      const { container } = render(AIWritingPanel);

      expect(container.textContent).not.toContain('Generated Content');
    });

    it('should handle whitespace-only prompt', async () => {
      const requestSpy = vi.spyOn(aiWritingStore, 'requestAssistance');
      const { container } = render(AIWritingPanel);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: '   ' } });

      const generateButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Generate') as HTMLButtonElement;

      await fireEvent.click(generateButton);

      expect(requestSpy).not.toHaveBeenCalled();

      requestSpy.mockRestore();
    });
  });
});
