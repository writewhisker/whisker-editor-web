import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { writable, get } from 'svelte/store';
import AISettingsPanel from './AISettingsPanel.svelte';
import type { AIConfig } from '$lib/ai/types';

// Mock aiStore
const mockAiConfig = writable<AIConfig>({
  provider: 'openai',
  temperature: 0.7,
  maxTokens: 1000,
});

const mockIsAIEnabled = writable(false);
const mockUsageStats = writable({
  totalTokens: 0,
  totalRequests: 0,
  totalCost: 0,
});

const mockAiActions = {
  updateConfig: vi.fn(),
  resetStats: vi.fn(),
};

vi.mock('$lib/stores/aiStore', () => ({
  aiConfig: mockAiConfig,
  isAIEnabled: mockIsAIEnabled,
  usageStats: mockUsageStats,
  aiActions: mockAiActions,
}));

describe('AISettingsPanel', () => {
  beforeEach(() => {
    mockAiConfig.set({
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 1000,
    });
    mockIsAIEnabled.set(false);
    mockUsageStats.set({
      totalTokens: 0,
      totalRequests: 0,
      totalCost: 0,
    });
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render panel header', () => {
      render(AISettingsPanel);

      expect(screen.getByText('🤖 AI Settings')).toBeInTheDocument();
    });

    it('should show disabled status badge by default', () => {
      mockIsAIEnabled.set(false);
      render(AISettingsPanel);

      const badge = screen.getByText('Disabled');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-badge', 'disabled');
    });

    it('should show enabled status badge when AI is enabled', () => {
      mockIsAIEnabled.set(true);
      render(AISettingsPanel);

      const badge = screen.getByText('Enabled');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('status-badge', 'enabled');
    });

    it('should render provider selection', () => {
      render(AISettingsPanel);

      expect(screen.getByLabelText('AI Provider')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'OpenAI' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Anthropic (Claude)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Local/Custom API' })).toBeInTheDocument();
    });

    it('should render API key input for cloud providers', () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    it('should not render API key input for local provider', () => {
      mockAiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument();
    });

    it('should render base URL input for local provider', () => {
      mockAiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
    });

    it('should render model selection for cloud providers', () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByLabelText('Model')).toBeInTheDocument();
    });

    it('should render advanced settings section', () => {
      render(AISettingsPanel);

      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('should render usage statistics', () => {
      render(AISettingsPanel);

      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
      expect(screen.getByText('Requests')).toBeInTheDocument();
      expect(screen.getByText('Tokens')).toBeInTheDocument();
      expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    });

    it('should render privacy notice', () => {
      render(AISettingsPanel);

      expect(screen.getByText('Privacy Note')).toBeInTheDocument();
      expect(
        screen.getByText(/API keys are stored locally in your browser/i)
      ).toBeInTheDocument();
    });
  });

  describe('provider selection', () => {
    it('should update provider when changed', async () => {
      render(AISettingsPanel);

      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
        })
      );
    });

    it('should show OpenAI models when OpenAI selected', async () => {
      render(AISettingsPanel);

      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'openai' } });

      const modelSelect = screen.getByLabelText('Model');
      expect(within(modelSelect).getByText('gpt-4-turbo-preview')).toBeInTheDocument();
      expect(within(modelSelect).getByText('gpt-3.5-turbo')).toBeInTheDocument();
    });

    it('should show Anthropic models when Anthropic selected', async () => {
      render(AISettingsPanel);

      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

      const modelSelect = screen.getByLabelText('Model');
      expect(within(modelSelect).getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
      expect(within(modelSelect).getByText('claude-3-opus-20240229')).toBeInTheDocument();
    });

    it('should hide model selection for local provider', async () => {
      render(AISettingsPanel);

      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'local' } });

      expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
    });
  });

  describe('API key input', () => {
    it('should mask API key by default', () => {
      render(AISettingsPanel);

      const apiKeyInput = screen.getByLabelText('API Key');
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });

    it('should toggle API key visibility', async () => {
      render(AISettingsPanel);

      const apiKeyInput = screen.getByLabelText('API Key');
      const toggleButton = screen.getByRole('button', { name: /🙈|👁️/ });

      // Initially password
      expect(apiKeyInput).toHaveAttribute('type', 'password');

      // Click to show
      await fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'text');

      // Click to hide again
      await fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });

    it('should show OpenAI help text for OpenAI provider', () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByText(/Get your API key from/i)).toBeInTheDocument();
      expect(screen.getByText('OpenAI Platform')).toBeInTheDocument();
    });

    it('should show Anthropic help text for Anthropic provider', () => {
      mockAiConfig.set({
        provider: 'anthropic',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByText(/Get your API key from/i)).toBeInTheDocument();
      expect(screen.getByText('Anthropic Console')).toBeInTheDocument();
    });

    it('should update API key in config', async () => {
      render(AISettingsPanel);

      const apiKeyInput = screen.getByLabelText('API Key');
      await fireEvent.input(apiKeyInput, { target: { value: 'sk-test123' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-test123',
        })
      );
    });

    it('should trim API key whitespace', async () => {
      render(AISettingsPanel);

      const apiKeyInput = screen.getByLabelText('API Key');
      await fireEvent.input(apiKeyInput, { target: { value: '  sk-test123  ' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-test123',
        })
      );
    });
  });

  describe('advanced settings', () => {
    it('should display temperature value', () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.75,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByText('0.75')).toBeInTheDocument();
    });

    it('should update temperature', async () => {
      render(AISettingsPanel);

      const temperatureSlider = screen.getByLabelText(/Temperature:/i);
      await fireEvent.input(temperatureSlider, { target: { value: '0.9' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        })
      );
    });

    it('should display max tokens value', () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 2000,
      });

      render(AISettingsPanel);

      expect(screen.getByText('2000')).toBeInTheDocument();
    });

    it('should update max tokens', async () => {
      render(AISettingsPanel);

      const maxTokensSlider = screen.getByLabelText(/Max Tokens:/i);
      await fireEvent.input(maxTokensSlider, { target: { value: '2000' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 2000,
        })
      );
    });

    it('should show temperature help text', () => {
      render(AISettingsPanel);

      expect(screen.getByText(/Higher = more creative, Lower = more focused/i)).toBeInTheDocument();
    });

    it('should show max tokens help text', () => {
      render(AISettingsPanel);

      expect(screen.getByText(/Maximum response length/i)).toBeInTheDocument();
    });
  });

  describe('save and reset', () => {
    it('should save all settings', async () => {
      render(AISettingsPanel);

      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

      const apiKeyInput = screen.getByLabelText('API Key');
      await fireEvent.input(apiKeyInput, { target: { value: 'sk-ant-test' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
          apiKey: 'sk-ant-test',
        })
      );
    });

    it('should show success message after save', async () => {
      vi.useFakeTimers();
      render(AISettingsPanel);

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(screen.getByText('✓ Saved!')).toBeInTheDocument();

      // Success message should disappear after 2 seconds
      vi.advanceTimersByTime(2000);
      expect(screen.queryByText('✓ Saved!')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should reset settings to defaults', async () => {
      render(AISettingsPanel);

      // Change some settings
      const providerSelect = screen.getByLabelText('AI Provider');
      await fireEvent.change(providerSelect, { target: { value: 'anthropic' } });

      const apiKeyInput = screen.getByLabelText('API Key');
      await fireEvent.input(apiKeyInput, { target: { value: 'sk-test' } });

      // Click reset
      const resetButton = screen.getByText('Reset');
      await fireEvent.click(resetButton);

      // Should reset to defaults
      expect(providerSelect).toHaveValue('openai');
      expect(apiKeyInput).toHaveValue('');
    });
  });

  describe('usage statistics', () => {
    it('should display usage stats', () => {
      mockUsageStats.set({
        totalTokens: 15000,
        totalRequests: 25,
        totalCost: 0.0425,
      });

      render(AISettingsPanel);

      expect(screen.getByText('15,000')).toBeInTheDocument(); // Formatted tokens
      expect(screen.getByText('25')).toBeInTheDocument(); // Requests
      expect(screen.getByText('$0.0425')).toBeInTheDocument(); // Cost
    });

    it('should format large numbers with commas', () => {
      mockUsageStats.set({
        totalTokens: 1234567,
        totalRequests: 1000,
        totalCost: 1.5,
      });

      render(AISettingsPanel);

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });

    it('should format cost to 4 decimal places', () => {
      mockUsageStats.set({
        totalTokens: 100,
        totalRequests: 1,
        totalCost: 0.00015,
      });

      render(AISettingsPanel);

      expect(screen.getByText('$0.0002')).toBeInTheDocument(); // Rounded
    });

    it('should reset stats when confirmed', async () => {
      mockUsageStats.set({
        totalTokens: 15000,
        totalRequests: 25,
        totalCost: 0.0425,
      });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(AISettingsPanel);

      const resetStatsButton = screen.getByText('Reset Statistics');
      await fireEvent.click(resetStatsButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to reset usage statistics? This cannot be undone.'
      );
      expect(mockAiActions.resetStats).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not reset stats when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(AISettingsPanel);

      const resetStatsButton = screen.getByText('Reset Statistics');
      await fireEvent.click(resetStatsButton);

      expect(mockAiActions.resetStats).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('model selection', () => {
    it('should update model when changed', async () => {
      mockAiConfig.set({
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      const modelSelect = screen.getByLabelText('Model');
      await fireEvent.change(modelSelect, { target: { value: 'gpt-4' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      );
    });

    it('should handle default model selection', async () => {
      mockAiConfig.set({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      const modelSelect = screen.getByLabelText('Model');
      await fireEvent.change(modelSelect, { target: { value: '' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          model: undefined,
        })
      );
    });
  });

  describe('base URL for local provider', () => {
    it('should show default base URL', () => {
      mockAiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      const baseURLInput = screen.getByLabelText('Base URL');
      expect(baseURLInput).toHaveValue('http://localhost:8080');
    });

    it('should update base URL', async () => {
      mockAiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      const baseURLInput = screen.getByLabelText('Base URL');
      await fireEvent.input(baseURLInput, { target: { value: 'http://localhost:11434' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:11434',
        })
      );
    });

    it('should show help text for base URL', () => {
      mockAiConfig.set({
        provider: 'local',
        temperature: 0.7,
        maxTokens: 1000,
      });

      render(AISettingsPanel);

      expect(screen.getByText(/URL of your local AI API endpoint/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty API key gracefully', async () => {
      render(AISettingsPanel);

      const apiKeyInput = screen.getByLabelText('API Key');
      await fireEvent.input(apiKeyInput, { target: { value: '' } });

      const saveButton = screen.getByText('Save Settings');
      await fireEvent.click(saveButton);

      expect(mockAiActions.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: undefined,
        })
      );
    });

    it('should handle zero usage stats', () => {
      mockUsageStats.set({
        totalTokens: 0,
        totalRequests: 0,
        totalCost: 0,
      });

      render(AISettingsPanel);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('$0.0000')).toBeInTheDocument();
    });

    it('should handle very large usage numbers', () => {
      mockUsageStats.set({
        totalTokens: 999999999,
        totalRequests: 1000000,
        totalCost: 9999.99,
      });

      render(AISettingsPanel);

      expect(screen.getByText('999,999,999')).toBeInTheDocument();
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.getByText('$9999.9900')).toBeInTheDocument();
    });
  });
});
