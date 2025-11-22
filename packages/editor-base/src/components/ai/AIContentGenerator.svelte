<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isGenerating, canGenerate, aiActions } from '../../stores/aiStore';
  import { currentStory } from '../../stores/storyStateStore';

  // Props
  let {
    open = $bindable(false),
  }: {
    open?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let generationType = $state<'passage' | 'choices' | 'story'>('passage');
  let passageTitle = $state('');
  let passageContent = $state('');
  let choiceCount = $state(3);
  let theme = $state('');
  let tone = $state('neutral');
  let length = $state('medium');
  let generatedContent = $state<any>(null);
  let error = $state<string | null>(null);

  const tones = ['humorous', 'serious', 'dramatic', 'mysterious', 'light', 'dark', 'neutral'];
  const lengths = ['short', 'medium', 'long'];

  async function handleGenerate() {
    if (!$canGenerate) return;

    error = null;
    generatedContent = null;

    try {
      let prompt = '';
      let systemPrompt = 'You are a creative writing assistant for interactive fiction.';

      switch (generationType) {
        case 'passage':
          prompt = buildPassagePrompt();
          break;
        case 'choices':
          prompt = buildChoicesPrompt();
          break;
        case 'story':
          prompt = buildStoryPrompt();
          break;
      }

      const response = await aiActions.generate({
        prompt,
        systemPrompt,
        temperature: 0.8,
        maxTokens: generationType === 'story' ? 2000 : 1000,
      });

      if (response.error) {
        error = response.error;
      } else {
        parseGeneratedContent(response.text);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Generation failed';
    }
  }

  function buildPassagePrompt(): string {
    const storyContext = $currentStory ? `Story: ${$currentStory.metadata.title}\n` : '';
    return `${storyContext}Generate a ${length} interactive fiction passage with the following:
Title: ${passageTitle || 'Untitled'}
Theme: ${theme || 'adventure'}
Tone: ${tone}

Format the response as:
TITLE: [passage title]
CONTENT: [passage text]`;
  }

  function buildChoicesPrompt(): string {
    return `Generate ${choiceCount} meaningful choices for the following passage:

Passage: ${passageContent || 'The passage content'}
Tone: ${tone}

Format each choice on a new line starting with a number.`;
  }

  function buildStoryPrompt(): string {
    return `Generate a complete interactive fiction story outline with:
Theme: ${theme || 'adventure'}
Tone: ${tone}
Length: ${length}

Include:
- Story title
- 5-7 passages with titles
- Choices connecting the passages
- A clear beginning, middle, and end

Format:
TITLE: [story title]
PASSAGE 1: [title]
Content: [text]
Choices: [choice 1], [choice 2]
...`;
  }

  function parseGeneratedContent(text: string) {
    switch (generationType) {
      case 'passage':
        const titleMatch = text.match(/TITLE:\s*(.+)/);
        const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/);
        generatedContent = {
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          content: contentMatch ? contentMatch[1].trim() : text,
        };
        break;
      case 'choices':
        const choices = text
          .split('\n')
          .filter((line) => /^\d+\./.test(line.trim()))
          .map((line) => line.replace(/^\d+\.\s*/, '').trim())
          .filter((choice) => choice.length > 0);
        generatedContent = { choices };
        break;
      case 'story':
        generatedContent = { text };
        break;
    }
  }

  function handleApply() {
    dispatch('apply', {
      type: generationType,
      content: generatedContent,
    });
    handleClose();
  }

  function handleClose() {
    open = false;
    generatedContent = null;
    error = null;
    passageTitle = '';
    passageContent = '';
    theme = '';
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog" tabindex="-1"
      aria-labelledby="generator-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="generator-title">🎯 AI Content Generator</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">×</button>
      </div>

      <div class="dialog-content">
        {#if !$canGenerate}
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>AI not configured</strong>
              <p>Please configure your AI settings to use the content generator.</p>
            </div>
          </div>
        {/if}

        <!-- Generation Type -->
        <div class="form-group">
          <div class="form-group-label">What do you want to generate?</div>
          <div class="type-buttons">
            <button
              class="type-btn"
              class:active={generationType === 'passage'}
              onclick={() => (generationType = 'passage')}
            >
              📄 Passage
            </button>
            <button
              class="type-btn"
              class:active={generationType === 'choices'}
              onclick={() => (generationType = 'choices')}
            >
              🔀 Choices
            </button>
            <button
              class="type-btn"
              class:active={generationType === 'story'}
              onclick={() => (generationType = 'story')}
            >
              📖 Full Story
            </button>
          </div>
        </div>

        {#if generationType === 'passage'}
          <div class="form-group">
            <label for="passage-title">Passage Title (optional)</label>
            <input
              type="text"
              id="passage-title"
              bind:value={passageTitle}
              placeholder="e.g., The Dark Forest"
              disabled={!$canGenerate}
            />
          </div>

          <div class="form-group">
            <label for="theme">Theme</label>
            <input
              type="text"
              id="theme"
              bind:value={theme}
              placeholder="e.g., adventure, mystery, romance"
              disabled={!$canGenerate}
            />
          </div>
        {:else if generationType === 'choices'}
          <div class="form-group">
            <label for="passage-content">Passage Content</label>
            <textarea
              id="passage-content"
              bind:value={passageContent}
              placeholder="Enter the passage text for which you want to generate choices..."
              rows="4"
              disabled={!$canGenerate}
            ></textarea>
          </div>

          <div class="form-group">
            <label for="choice-count">Number of Choices</label>
            <input
              type="number"
              id="choice-count"
              bind:value={choiceCount}
              min="2"
              max="6"
              disabled={!$canGenerate}
            />
          </div>
        {:else if generationType === 'story'}
          <div class="form-group">
            <label for="story-theme">Theme/Genre</label>
            <input
              type="text"
              id="story-theme"
              bind:value={theme}
              placeholder="e.g., sci-fi adventure, horror mystery"
              disabled={!$canGenerate}
            />
          </div>
        {/if}

        <!-- Common Options -->
        <div class="options-grid">
          <div class="form-group">
            <label for="tone">Tone</label>
            <select id="tone" bind:value={tone} disabled={!$canGenerate}>
              {#each tones as toneOption}
                <option value={toneOption}>{toneOption}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="length">Length</label>
            <select id="length" bind:value={length} disabled={!$canGenerate}>
              {#each lengths as lengthOption}
                <option value={lengthOption}>{lengthOption}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Generate Button -->
        <button class="btn btn-primary btn-large" onclick={handleGenerate} disabled={!$canGenerate}>
          {#if $isGenerating}
            <span class="spinner"></span>
            Generating...
          {:else}
            🎯 Generate Content
          {/if}
        </button>

        <!-- Error Display -->
        {#if error}
          <div class="error-message">
            <span class="error-icon">❌</span>
            <span>{error}</span>
          </div>
        {/if}

        <!-- Generated Content -->
        {#if generatedContent}
          <div class="generated-section">
            <h3>Generated Content:</h3>

            {#if generationType === 'passage'}
              <div class="generated-passage">
                <div class="passage-title-display">
                  <strong>Title:</strong> {generatedContent.title}
                </div>
                <div class="passage-content-display">{generatedContent.content}</div>
              </div>
            {:else if generationType === 'choices'}
              <div class="generated-choices">
                {#each generatedContent.choices as choice, index}
                  <div class="choice-item">
                    <span class="choice-number">{index + 1}</span>
                    <span class="choice-text">{choice}</span>
                  </div>
                {/each}
              </div>
            {:else if generationType === 'story'}
              <div class="generated-story">
                <pre class="story-text">{generatedContent.text}</pre>
              </div>
            {/if}

            <div class="generated-actions">
              <button class="btn btn-secondary" onclick={() => (generatedContent = null)}>
                Discard
              </button>
              <button class="btn btn-primary" onclick={handleApply}>
                Apply to Story
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

  .type-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .type-btn {
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-btn:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .type-btn.active {
    background: rgba(52, 152, 219, 0.1);
    border-color: var(--accent-color, #3498db);
    color: var(--accent-color, #3498db);
  }

  input[type='text'],
  input[type='number'],
  textarea,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  textarea {
    resize: vertical;
  }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .btn-large {
    width: 100%;
    padding: 14px 24px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .spinner {
    width: 18px;
    height: 18px;
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

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #ffebee;
    border: 1px solid #ffcdd2;
    border-radius: 6px;
    color: #c62828;
    font-size: 14px;
    margin-top: 16px;
  }

  .error-icon {
    font-size: 18px;
  }

  .generated-section {
    margin-top: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    border: 2px solid #4caf50;
    border-radius: 8px;
  }

  .generated-section h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .generated-passage {
    padding: 16px;
    background: white;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .passage-title-display {
    font-size: 14px;
    margin-bottom: 12px;
    color: var(--text-secondary, #666);
  }

  .passage-content-display {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-primary, #333);
  }

  .generated-choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .choice-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border-radius: 6px;
  }

  .choice-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--accent-color, #3498db);
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }

  .choice-text {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary, #333);
  }

  .generated-story {
    padding: 16px;
    background: white;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .story-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary, #333);
    white-space: pre-wrap;
    font-family: inherit;
  }

  .generated-actions {
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

  @media (max-width: 768px) {
    .type-buttons {
      grid-template-columns: 1fr;
    }

    .options-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
