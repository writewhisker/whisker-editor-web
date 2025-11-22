<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isGenerating, canGenerate, aiActions } from '../../stores/aiStore';
  import { currentStory } from '../../stores/storyStateStore';
  import type { StoryAnalysisResult } from '../../ai/types';
  import type { Passage, Choice } from '@writewhisker/core-ts';

  // Props
  let {
    open = $bindable(false),
  }: {
    open?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let analysisResult = $state<StoryAnalysisResult | null>(null);
  let error = $state<string | null>(null);
  let selectedAnalysis = $state<'full' | 'plot' | 'characters' | 'pacing'>('full');

  const analysisTypes = [
    { value: 'full' as const, label: 'Full Analysis', icon: '📊', description: 'Comprehensive story analysis' },
    { value: 'plot' as const, label: 'Plot', icon: '📖', description: 'Plot consistency and structure' },
    { value: 'characters' as const, label: 'Characters', icon: '👤', description: 'Character development and consistency' },
    { value: 'pacing' as const, label: 'Pacing', icon: '⏱️', description: 'Story pacing and flow' },
  ];

  async function handleAnalyze() {
    if (!$canGenerate || !$currentStory) return;

    error = null;
    analysisResult = null;

    try {
      const storyText = buildStoryText();
      const prompt = buildAnalysisPrompt(storyText);

      const response = await aiActions.generate({
        prompt,
        systemPrompt: 'You are a professional story editor and analyst for interactive fiction.',
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (response.error) {
        error = response.error;
      } else {
        analysisResult = parseAnalysisResult(response.text);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Analysis failed';
    }
  }

  function buildStoryText(): string {
    if (!$currentStory) return '';

    const passages = Array.from($currentStory.passages.values()).map((p: Passage) => {
      const choices = p.choices.map((c: Choice) => `  - ${c.text}`).join('\n');
      return `PASSAGE: ${p.title}\n${p.content}\nCHOICES:\n${choices}\n`;
    }).join('\n\n');

    return `STORY: ${$currentStory.metadata.title}\nDESCRIPTION: ${$currentStory.metadata.description || 'N/A'}\n\n${passages}`;
  }

  function buildAnalysisPrompt(storyText: string): string {
    const basePrompt = `Analyze this interactive fiction story:\n\n${storyText}\n\n`;

    switch (selectedAnalysis) {
      case 'full':
        return `${basePrompt}Provide a comprehensive analysis covering:
1. Plot consistency and coherence
2. Character consistency and development
3. Story pacing (slow/moderate/fast)
4. Overall tone
5. Main themes
6. Specific issues or problems
7. Suggestions for improvement

Format your response as:
PLOT_CONSISTENCY: [0-1 score]
CHARACTER_CONSISTENCY: [0-1 score]
PACING: [slow/moderate/fast]
TONE: [tone description]
THEMES: [theme1, theme2, theme3]
ISSUES:
- [issue 1]
- [issue 2]
SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]`;

      case 'plot':
        return `${basePrompt}Analyze the plot for:
- Consistency and logical flow
- Plot holes or contradictions
- Story structure
- Branching quality

Provide a score (0-1) and detailed feedback.`;

      case 'characters':
        return `${basePrompt}Analyze the characters for:
- Consistency in voice and behavior
- Character development
- Distinct personalities
- Realistic motivations

Provide a score (0-1) and detailed feedback.`;

      case 'pacing':
        return `${basePrompt}Analyze the story pacing:
- Overall pace (slow/moderate/fast)
- Pacing consistency
- Action vs. exposition balance
- Tension and release

Provide detailed feedback.`;

      default:
        return basePrompt;
    }
  }

  function parseAnalysisResult(text: string): StoryAnalysisResult {
    const result: StoryAnalysisResult = {
      plotConsistency: 0.7,
      characterConsistency: 0.7,
      themes: [],
      pacing: 'moderate',
      tone: 'neutral',
      suggestions: [],
      issues: [],
    };

    // Parse plot consistency
    const plotMatch = text.match(/PLOT_CONSISTENCY:\s*([0-9.]+)/i);
    if (plotMatch) {
      result.plotConsistency = parseFloat(plotMatch[1]);
    }

    // Parse character consistency
    const charMatch = text.match(/CHARACTER_CONSISTENCY:\s*([0-9.]+)/i);
    if (charMatch) {
      result.characterConsistency = parseFloat(charMatch[1]);
    }

    // Parse pacing
    const pacingMatch = text.match(/PACING:\s*(\w+)/i);
    if (pacingMatch) {
      const pace = pacingMatch[1].toLowerCase();
      if (pace === 'slow' || pace === 'moderate' || pace === 'fast') {
        result.pacing = pace;
      }
    }

    // Parse tone
    const toneMatch = text.match(/TONE:\s*(.+)/i);
    if (toneMatch) {
      result.tone = toneMatch[1].trim();
    }

    // Parse themes
    const themesMatch = text.match(/THEMES:\s*(.+)/i);
    if (themesMatch) {
      result.themes = themesMatch[1].split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    }

    // Parse issues
    const issuesSection = text.match(/ISSUES:([\s\S]*?)(?:SUGGESTIONS:|$)/i);
    if (issuesSection) {
      result.issues = issuesSection[1]
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter((issue) => issue.length > 0);
    }

    // Parse suggestions
    const suggestionsSection = text.match(/SUGGESTIONS:([\s\S]*?)$/i);
    if (suggestionsSection) {
      result.suggestions = suggestionsSection[1]
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter((suggestion) => suggestion.length > 0);
    }

    // If no structured parsing worked, treat full text as suggestions
    if (result.suggestions.length === 0 && result.issues.length === 0) {
      result.suggestions = [text];
    }

    return result;
  }

  function handleClose() {
    open = false;
    analysisResult = null;
    error = null;
  }

  function getScoreColor(score: number): string {
    if (score >= 0.8) return '#4caf50';
    if (score >= 0.6) return '#ff9800';
    return '#f44336';
  }

  function getPacingColor(pacing: string): string {
    switch (pacing) {
      case 'fast':
        return '#f44336';
      case 'slow':
        return '#2196f3';
      default:
        return '#4caf50';
    }
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} onkeydown={(e) => (e.key === 'Escape' ? handleClose() : null)} role="button" tabindex="0">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog" tabindex="-1"
      aria-labelledby="analyzer-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="analyzer-title">📊 Story Analyzer</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">×</button>
      </div>

      <div class="dialog-content">
        {#if !$canGenerate}
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>AI not configured</strong>
              <p>Please configure your AI settings to use the story analyzer.</p>
            </div>
          </div>
        {:else if !$currentStory}
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>No story loaded</strong>
              <p>Load a story to analyze it.</p>
            </div>
          </div>
        {/if}

        <!-- Analysis Type Selection -->
        <div class="analysis-types">
          {#each analysisTypes as type}
            <button
              class="type-card"
              class:active={selectedAnalysis === type.value}
              onclick={() => (selectedAnalysis = type.value)}
              disabled={!$canGenerate || !$currentStory}
            >
              <span class="type-icon">{type.icon}</span>
              <div class="type-info">
                <div class="type-label">{type.label}</div>
                <div class="type-description">{type.description}</div>
              </div>
            </button>
          {/each}
        </div>

        <!-- Analyze Button -->
        <button
          class="btn btn-primary btn-large"
          onclick={handleAnalyze}
          disabled={!$canGenerate || !$currentStory}
        >
          {#if $isGenerating}
            <span class="spinner"></span>
            Analyzing...
          {:else}
            📊 Analyze Story
          {/if}
        </button>

        <!-- Error Display -->
        {#if error}
          <div class="error-message">
            <span class="error-icon">❌</span>
            <span>{error}</span>
          </div>
        {/if}

        <!-- Analysis Results -->
        {#if analysisResult}
          <div class="results-section">
            <h3>Analysis Results</h3>

            {#if selectedAnalysis === 'full'}
              <!-- Scores -->
              <div class="scores-grid">
                <div class="score-card">
                  <div class="score-label">Plot Consistency</div>
                  <div class="score-value" style="color: {getScoreColor(analysisResult.plotConsistency)}">
                    {Math.round(analysisResult.plotConsistency * 100)}%
                  </div>
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      style="width: {analysisResult.plotConsistency * 100}%; background: {getScoreColor(analysisResult.plotConsistency)}"
                    ></div>
                  </div>
                </div>

                <div class="score-card">
                  <div class="score-label">Character Consistency</div>
                  <div class="score-value" style="color: {getScoreColor(analysisResult.characterConsistency)}">
                    {Math.round(analysisResult.characterConsistency * 100)}%
                  </div>
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      style="width: {analysisResult.characterConsistency * 100}%; background: {getScoreColor(analysisResult.characterConsistency)}"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Story Properties -->
              <div class="properties-grid">
                <div class="property-card">
                  <div class="property-label">Pacing</div>
                  <div class="property-value" style="color: {getPacingColor(analysisResult.pacing)}">
                    {analysisResult.pacing}
                  </div>
                </div>

                <div class="property-card">
                  <div class="property-label">Tone</div>
                  <div class="property-value">{analysisResult.tone}</div>
                </div>
              </div>

              <!-- Themes -->
              {#if analysisResult.themes.length > 0}
                <div class="themes-section">
                  <h4>Themes</h4>
                  <div class="themes-list">
                    {#each analysisResult.themes as theme}
                      <span class="theme-tag">{theme}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}

            <!-- Issues -->
            {#if analysisResult.issues.length > 0}
              <div class="issues-section">
                <h4>⚠️ Issues Found</h4>
                <ul class="issues-list">
                  {#each analysisResult.issues as issue}
                    <li>{issue}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- Suggestions -->
            {#if analysisResult.suggestions.length > 0}
              <div class="suggestions-section">
                <h4>💡 Suggestions</h4>
                <ul class="suggestions-list">
                  {#each analysisResult.suggestions as suggestion}
                    <li>{suggestion}</li>
                  {/each}
                </ul>
              </div>
            {/if}
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
    max-width: 800px;
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

  .analysis-types {
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

  .btn-large {
    width: 100%;
    padding: 14px 24px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
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
  }

  .error-icon {
    font-size: 18px;
  }

  .results-section {
    padding: 20px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .results-section h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: var(--text-primary, #333);
  }

  .results-section h4 {
    margin: 20px 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .scores-grid,
  .properties-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .score-card,
  .property-card {
    padding: 16px;
    background: var(--bg-primary, white);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .score-label,
  .property-label {
    font-size: 13px;
    color: var(--text-secondary, #666);
    margin-bottom: 8px;
    font-weight: 500;
  }

  .score-value,
  .property-value {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .score-bar {
    height: 8px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    transition: width 0.3s;
  }

  .property-value {
    text-transform: capitalize;
    font-size: 24px;
  }

  .themes-section {
    margin-bottom: 20px;
  }

  .themes-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .theme-tag {
    padding: 6px 12px;
    background: var(--accent-color, #3498db);
    color: white;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
  }

  .issues-section,
  .suggestions-section {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-primary, white);
    border-radius: 8px;
  }

  .issues-section {
    border-left: 4px solid #ff9800;
  }

  .suggestions-section {
    border-left: 4px solid #4caf50;
  }

  .issues-list,
  .suggestions-list {
    margin: 0;
    padding-left: 20px;
  }

  .issues-list li,
  .suggestions-list li {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 8px;
    color: var(--text-primary, #333);
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

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  @media (max-width: 768px) {
    .analysis-types {
      grid-template-columns: 1fr;
    }

    .scores-grid,
    .properties-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
