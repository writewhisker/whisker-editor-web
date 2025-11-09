<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    isGenerating,
    suggestions,
    canGenerate,
    aiActions,
  } from '../../stores/aiStore';
  import type { WritingSuggestion } from '../../ai/types';

  // Props
  let {
    context = '',
    passageId,
    open = $bindable(false),
  }: {
    context?: string;
    passageId?: string;
    open?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let selectedType = $state<WritingSuggestion['type']>('content');
  let customPrompt = $state('');
  let generatedText = $state('');
  let showCustomPrompt = $state(false);

  const suggestionTypes: { value: WritingSuggestion['type']; label: string; icon: string; description: string }[] = [
    {
      value: 'content',
      label: 'Content',
      icon: '📝',
      description: 'Generate passage content',
    },
    {
      value: 'choice',
      label: 'Choices',
      icon: '🔀',
      description: 'Generate choice options',
    },
    {
      value: 'dialogue',
      label: 'Dialogue',
      icon: '💬',
      description: 'Generate character dialogue',
    },
    {
      value: 'improvement',
      label: 'Improve',
      icon: '✨',
      description: 'Suggest improvements',
    },
  ];

  async function handleGenerate() {
    if (!$canGenerate) return;

    if (showCustomPrompt && customPrompt.trim()) {
      // Custom prompt generation
      const response = await aiActions.generate({
        prompt: customPrompt,
        systemPrompt: 'You are a creative writing assistant for interactive fiction.',
        temperature: 0.8,
      });

      if (response.text && !response.error) {
        generatedText = response.text;
      }
    } else {
      // Type-based suggestions
      await aiActions.generateSuggestions(context, selectedType);
    }
  }

  function handleApplySuggestion(suggestion: WritingSuggestion) {
    dispatch('apply', {
      text: suggestion.text,
      type: suggestion.type,
      passageId,
    });
    aiActions.clearSuggestions();
    generatedText = '';
  }

  function handleApplyGenerated() {
    dispatch('apply', {
      text: generatedText,
      type: 'content',
      passageId,
    });
    generatedText = '';
  }

  function handleClose() {
    open = false;
    aiActions.clearSuggestions();
    generatedText = '';
    customPrompt = '';
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog" tabindex="-1"
      aria-labelledby="ai-assistant-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="ai-assistant-title">✨ AI Writing Assistant</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">×</button>
      </div>

      <div class="dialog-content">
        {#if !$canGenerate}
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>AI not configured</strong>
              <p>Please configure your AI settings to use the writing assistant.</p>
            </div>
          </div>
        {/if}

        <!-- Mode Selection -->
        <div class="mode-toggle">
          <button
            class="toggle-btn"
            class:active={!showCustomPrompt}
            onclick={() => (showCustomPrompt = false)}
          >
            Quick Suggestions
          </button>
          <button
            class="toggle-btn"
            class:active={showCustomPrompt}
            onclick={() => (showCustomPrompt = true)}
          >
            Custom Prompt
          </button>
        </div>

        {#if !showCustomPrompt}
          <!-- Quick Suggestions Mode -->
          <div class="suggestion-types">
            {#each suggestionTypes as type}
              <button
                class="type-card"
                class:active={selectedType === type.value}
                onclick={() => (selectedType = type.value)}
                disabled={!$canGenerate}
              >
                <span class="type-icon">{type.icon}</span>
                <div class="type-info">
                  <div class="type-label">{type.label}</div>
                  <div class="type-description">{type.description}</div>
                </div>
              </button>
            {/each}
          </div>

          {#if context}
            <div class="context-preview">
              <label>Context:</label>
              <div class="context-text">{context.substring(0, 200)}{context.length > 200 ? '...' : ''}</div>
            </div>
          {/if}
        {:else}
          <!-- Custom Prompt Mode -->
          <div class="custom-prompt-section">
            <label for="custom-prompt">Your Prompt:</label>
            <textarea
              id="custom-prompt"
              bind:value={customPrompt}
              placeholder="Describe what you want the AI to generate..."
              rows="4"
              disabled={!$canGenerate}
            ></textarea>
            {#if context}
              <div class="context-note">
                <span class="note-icon">ℹ️</span>
                <span>The current passage context will be included automatically</span>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Generate Button -->
        <button
          class="btn btn-primary generate-btn"
          onclick={handleGenerate}
          disabled={!$canGenerate || (showCustomPrompt && !customPrompt.trim())}
        >
          {#if $isGenerating}
            <span class="spinner-small"></span>
            Generating...
          {:else}
            ✨ Generate
          {/if}
        </button>

        <!-- Results -->
        {#if $suggestions.length > 0}
          <div class="suggestions-list">
            <h4>Suggestions:</h4>
            {#each $suggestions as suggestion, index}
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <span class="suggestion-number">{index + 1}</span>
                  {#if suggestion.confidence}
                    <div class="confidence-bar">
                      <div
                        class="confidence-fill"
                        style="width: {suggestion.confidence * 100}%"
                      ></div>
                    </div>
                  {/if}
                </div>
                <div class="suggestion-text">{suggestion.text}</div>
                <button
                  class="btn btn-secondary btn-small"
                  onclick={() => handleApplySuggestion(suggestion)}
                >
                  Apply
                </button>
              </div>
            {/each}
          </div>
        {/if}

        {#if generatedText}
          <div class="generated-result">
            <h4>Generated Text:</h4>
            <div class="result-text">{generatedText}</div>
            <div class="result-actions">
              <button class="btn btn-secondary" onclick={() => (generatedText = '')}>
                Discard
              </button>
              <button class="btn btn-primary" onclick={handleApplyGenerated}>
                Apply to Passage
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: var(--bg-primary, white);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-width: 700px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .dialog-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .warning-message {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .warning-icon {
    font-size: 24px;
  }

  .warning-message strong {
    display: block;
    margin-bottom: 4px;
    color: #856404;
  }

  .warning-message p {
    margin: 0;
    font-size: 14px;
    color: #856404;
  }

  .mode-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    padding: 4px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .toggle-btn {
    flex: 1;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .toggle-btn.active {
    background: var(--bg-primary, white);
    color: var(--accent-color, #3498db);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .suggestion-types {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .type-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .type-card:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .type-card.active {
    background: rgba(52, 152, 219, 0.1);
    border-color: var(--accent-color, #3498db);
  }

  .type-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .type-icon {
    font-size: 28px;
  }

  .type-info {
    flex: 1;
  }

  .type-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 4px;
  }

  .type-description {
    font-size: 13px;
    color: var(--text-secondary, #666);
    line-height: 1.3;
  }

  .context-preview {
    margin-bottom: 20px;
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
  }

  .context-preview label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary, #666);
    margin-bottom: 6px;
  }

  .context-text {
    font-size: 14px;
    color: var(--text-primary, #333);
    line-height: 1.5;
  }

  .custom-prompt-section {
    margin-bottom: 20px;
  }

  .custom-prompt-section label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 8px;
  }

  .custom-prompt-section textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
  }

  .custom-prompt-section textarea:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  .context-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .note-icon {
    font-size: 16px;
  }

  .generate-btn {
    width: 100%;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .suggestions-list {
    margin-bottom: 20px;
  }

  .suggestions-list h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .suggestion-item {
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .suggestion-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--accent-color, #3498db);
    color: white;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
  }

  .confidence-bar {
    flex: 1;
    height: 6px;
    background: var(--border-color, #e0e0e0);
    border-radius: 3px;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #81c784);
    transition: width 0.3s;
  }

  .suggestion-text {
    font-size: 14px;
    color: var(--text-primary, #333);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .generated-result {
    padding: 16px;
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    border: 2px solid #4caf50;
    border-radius: 8px;
  }

  .generated-result h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .result-text {
    padding: 12px;
    background: white;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary, #333);
    margin-bottom: 12px;
    white-space: pre-wrap;
  }

  .result-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 13px;
  }

  @media (max-width: 768px) {
    .suggestion-types {
      grid-template-columns: 1fr;
    }

    .dialog-header h2 {
      font-size: 1.25rem;
    }
  }
</style>
