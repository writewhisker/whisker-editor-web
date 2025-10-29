<script lang="ts">
  import { aiConfig, isAIEnabled, usageStats, aiActions } from '$lib/stores/aiStore';
  import type { AIProvider } from '$lib/ai/types';

  // State
  let provider = $state<AIProvider>($aiConfig.provider);
  let apiKey = $state($aiConfig.apiKey || '');
  let model = $state($aiConfig.model || '');
  let baseURL = $state($aiConfig.baseURL || 'http://localhost:8080');
  let temperature = $state($aiConfig.temperature || 0.7);
  let maxTokens = $state($aiConfig.maxTokens || 1000);
  let showApiKey = $state(false);
  let saveSuccess = $state(false);

  const providers: { value: AIProvider; label: string; models: string[] }[] = [
    {
      value: 'openai',
      label: 'OpenAI',
      models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    },
    {
      value: 'anthropic',
      label: 'Anthropic (Claude)',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    },
    {
      value: 'local',
      label: 'Local/Custom API',
      models: [],
    },
  ];

  const selectedProvider = $derived(providers.find((p) => p.value === provider));

  function handleSave() {
    aiActions.updateConfig({
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model || undefined,
      baseURL: baseURL || undefined,
      temperature,
      maxTokens,
    });

    saveSuccess = true;
    setTimeout(() => {
      saveSuccess = false;
    }, 2000);
  }

  function handleReset() {
    provider = 'openai';
    apiKey = '';
    model = '';
    baseURL = 'http://localhost:8080';
    temperature = 0.7;
    maxTokens = 1000;
  }

  function handleResetStats() {
    if (confirm('Are you sure you want to reset usage statistics? This cannot be undone.')) {
      aiActions.resetStats();
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString();
  }

  function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }
</script>

<div class="ai-settings-panel">
  <div class="panel-header">
    <h3>🤖 AI Settings</h3>
    {#if $isAIEnabled}
      <span class="status-badge enabled">Enabled</span>
    {:else}
      <span class="status-badge disabled">Disabled</span>
    {/if}
  </div>

  <div class="panel-content">
    <!-- Provider Selection -->
    <div class="form-group">
      <label for="provider">AI Provider</label>
      <select id="provider" bind:value={provider}>
        {#each providers as prov}
          <option value={prov.value}>{prov.label}</option>
        {/each}
      </select>
      <p class="help-text">Choose your AI provider</p>
    </div>

    <!-- API Key -->
    {#if provider !== 'local'}
      <div class="form-group">
        <label for="api-key">API Key</label>
        <div class="api-key-input">
          <input
            type={showApiKey ? 'text' : 'password'}
            id="api-key"
            bind:value={apiKey}
            placeholder="sk-..."
          />
          <button class="toggle-visibility" onclick={() => (showApiKey = !showApiKey)}>
            {showApiKey ? '👁️' : '🙈'}
          </button>
        </div>
        <p class="help-text">
          {#if provider === 'openai'}
            Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>
          {:else if provider === 'anthropic'}
            Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a>
          {/if}
        </p>
      </div>
    {/if}

    <!-- Model Selection -->
    {#if selectedProvider && selectedProvider.models.length > 0}
      <div class="form-group">
        <label for="model">Model</label>
        <select id="model" bind:value={model}>
          <option value="">Default</option>
          {#each selectedProvider.models as modelOption}
            <option value={modelOption}>{modelOption}</option>
          {/each}
        </select>
        <p class="help-text">Select a specific model or use provider default</p>
      </div>
    {/if}

    <!-- Base URL (for local) -->
    {#if provider === 'local'}
      <div class="form-group">
        <label for="base-url">Base URL</label>
        <input
          type="text"
          id="base-url"
          bind:value={baseURL}
          placeholder="http://localhost:8080"
        />
        <p class="help-text">URL of your local AI API endpoint</p>
      </div>
    {/if}

    <!-- Advanced Settings -->
    <details class="advanced-settings">
      <summary>Advanced Settings</summary>

      <div class="form-group">
        <label for="temperature">
          Temperature: <span class="value-display">{temperature.toFixed(2)}</span>
        </label>
        <input
          type="range"
          id="temperature"
          bind:value={temperature}
          min="0"
          max="1"
          step="0.1"
          class="range-slider"
        />
        <p class="help-text">Higher = more creative, Lower = more focused (0-1)</p>
      </div>

      <div class="form-group">
        <label for="max-tokens">
          Max Tokens: <span class="value-display">{maxTokens}</span>
        </label>
        <input
          type="range"
          id="max-tokens"
          bind:value={maxTokens}
          min="100"
          max="4000"
          step="100"
          class="range-slider"
        />
        <p class="help-text">Maximum response length</p>
      </div>
    </details>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="btn btn-secondary" onclick={handleReset}>Reset</button>
      <button class="btn btn-primary" onclick={handleSave}>
        {saveSuccess ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>

    <!-- Usage Statistics -->
    <div class="usage-stats">
      <h4>Usage Statistics</h4>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{formatNumber($usageStats.totalRequests)}</div>
          <div class="stat-label">Requests</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{formatNumber($usageStats.totalTokens)}</div>
          <div class="stat-label">Tokens</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{formatCost($usageStats.totalCost)}</div>
          <div class="stat-label">Estimated Cost</div>
        </div>
      </div>
      <button class="btn btn-text" onclick={handleResetStats}>Reset Statistics</button>
    </div>

    <!-- Information -->
    <div class="info-box">
      <span class="info-icon">ℹ️</span>
      <div>
        <strong>Privacy Note</strong>
        <p>API keys are stored locally in your browser. They are never sent to our servers.</p>
      </div>
    </div>
  </div>
</div>

<style>
  .ai-settings-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.enabled {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-badge.disabled {
    background: #ffebee;
    color: #c62828;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 8px;
  }

  .value-display {
    font-weight: 700;
    color: var(--accent-color, #3498db);
  }

  input[type='text'],
  input[type='password'],
  select {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  .api-key-input {
    display: flex;
    gap: 8px;
  }

  .api-key-input input {
    flex: 1;
  }

  .toggle-visibility {
    padding: 10px 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-visibility:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .help-text {
    margin: 6px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .help-text a {
    color: var(--accent-color, #3498db);
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .advanced-settings {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
  }

  .advanced-settings summary {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
    cursor: pointer;
    user-select: none;
  }

  .advanced-settings[open] summary {
    margin-bottom: 16px;
  }

  .range-slider {
    width: 100%;
    height: 6px;
    appearance: none;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 3px;
    outline: none;
  }

  .range-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .range-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .btn {
    flex: 1;
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover, #2980b9);
  }

  .btn-text {
    background: none;
    color: var(--accent-color, #3498db);
    padding: 8px;
    font-size: 13px;
    flex: none;
  }

  .btn-text:hover {
    text-decoration: underline;
  }

  .usage-stats {
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .usage-stats h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  .stat-card {
    padding: 12px;
    background: var(--bg-primary, white);
    border-radius: 6px;
    text-align: center;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--accent-color, #3498db);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-secondary, #666);
  }

  .info-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #e3f2fd;
    border: 1px solid #90caf9;
    border-radius: 8px;
  }

  .info-icon {
    font-size: 24px;
  }

  .info-box strong {
    display: block;
    margin-bottom: 4px;
    color: #1565c0;
  }

  .info-box p {
    margin: 0;
    font-size: 13px;
    color: #1976d2;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }
  }
</style>
