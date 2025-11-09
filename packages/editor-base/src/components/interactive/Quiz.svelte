<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback?: string;
  }

  // Props
  let {
    question,
    options = [],
    multipleChoice = false,
    showFeedback = true,
    allowRetry = true,
    variableName,
    disabled = false,
  }: {
    question: string;
    options?: QuizOption[];
    multipleChoice?: boolean;
    showFeedback?: boolean;
    allowRetry?: boolean;
    variableName: string;
    disabled?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let selectedOptions = $state<Set<string>>(new Set());
  let hasSubmitted = $state(false);
  let isCorrect = $state(false);
  let showResults = $state(false);

  // Computed
  const allCorrectIds = $derived(new Set(options.filter((o) => o.isCorrect).map((o) => o.id)));

  const correctCount = $derived(
    Array.from(selectedOptions).filter((id) => allCorrectIds.has(id)).length
  );

  const incorrectCount = $derived(
    Array.from(selectedOptions).filter((id) => !allCorrectIds.has(id)).length
  );

  function toggleOption(optionId: string) {
    if (disabled || (hasSubmitted && !allowRetry)) return;

    if (multipleChoice) {
      const newSet = new Set(selectedOptions);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      selectedOptions = newSet;
    } else {
      selectedOptions = new Set([optionId]);
    }

    hasSubmitted = false;
    showResults = false;
  }

  function handleSubmit() {
    if (selectedOptions.size === 0) return;

    hasSubmitted = true;
    showResults = true;

    // Check if all selected options are correct and all correct options are selected
    const allSelectedCorrect = Array.from(selectedOptions).every((id) => allCorrectIds.has(id));
    const allCorrectSelected = Array.from(allCorrectIds).every((id) => selectedOptions.has(id));

    isCorrect = allSelectedCorrect && allCorrectSelected;

    dispatch('submit', {
      variableName,
      selectedOptions: Array.from(selectedOptions),
      isCorrect,
      correctCount,
      incorrectCount,
    });
  }

  function handleRetry() {
    selectedOptions = new Set();
    hasSubmitted = false;
    showResults = false;
    isCorrect = false;
    dispatch('retry', { variableName });
  }

  function getOptionState(option: QuizOption): 'correct' | 'incorrect' | 'neutral' {
    if (!showResults || !hasSubmitted) return 'neutral';

    const isSelected = selectedOptions.has(option.id);

    if (option.isCorrect && isSelected) return 'correct';
    if (!option.isCorrect && isSelected) return 'incorrect';
    if (option.isCorrect && !isSelected) return 'correct'; // Show correct but not selected
    return 'neutral';
  }
</script>

<div class="quiz-container">
  <div class="quiz-header">
    <h3 class="quiz-question">{question}</h3>
    {#if multipleChoice}
      <p class="quiz-hint">Select all correct answers</p>
    {:else}
      <p class="quiz-hint">Select one answer</p>
    {/if}
  </div>

  <div class="options-list">
    {#each options as option (option.id)}
      <button
        class="option-card"
        class:selected={selectedOptions.has(option.id)}
        class:correct={showResults && getOptionState(option) === 'correct'}
        class:incorrect={showResults && getOptionState(option) === 'incorrect'}
        class:disabled={disabled || (hasSubmitted && !allowRetry)}
        onclick={() => toggleOption(option.id)}
        disabled={disabled || (hasSubmitted && !allowRetry)}
      >
        <div class="option-content">
          <div class="option-checkbox">
            {#if showResults}
              {#if option.isCorrect && selectedOptions.has(option.id)}
                <span class="icon correct-icon">✓</span>
              {:else if !option.isCorrect && selectedOptions.has(option.id)}
                <span class="icon incorrect-icon">✗</span>
              {:else if option.isCorrect}
                <span class="icon missed-icon">○</span>
              {:else}
                <span class="icon neutral-icon">○</span>
              {/if}
            {:else}
              <span class="icon neutral-icon">
                {selectedOptions.has(option.id) ? (multipleChoice ? '☑' : '⦿') : '○'}
              </span>
            {/if}
          </div>
          <div class="option-text">{option.text}</div>
        </div>

        {#if showFeedback && showResults && option.feedback && (selectedOptions.has(option.id) || option.isCorrect)}
          <div class="option-feedback">
            <span class="feedback-icon">
              {option.isCorrect ? '💡' : 'ℹ️'}
            </span>
            {option.feedback}
          </div>
        {/if}
      </button>
    {/each}
  </div>

  {#if showResults && hasSubmitted}
    <div class="results-panel" class:success={isCorrect} class:failure={!isCorrect}>
      <div class="results-header">
        <span class="results-icon">{isCorrect ? '🎉' : '❌'}</span>
        <h4 class="results-title">
          {isCorrect ? 'Correct!' : 'Not quite right'}
        </h4>
      </div>

      <div class="results-stats">
        <div class="stat-item">
          <span class="stat-value correct">{correctCount}</span>
          <span class="stat-label">Correct</span>
        </div>
        {#if incorrectCount > 0}
          <div class="stat-item">
            <span class="stat-value incorrect">{incorrectCount}</span>
            <span class="stat-label">Incorrect</span>
          </div>
        {/if}
        <div class="stat-item">
          <span class="stat-value total">{allCorrectIds.size}</span>
          <span class="stat-label">Total Correct</span>
        </div>
      </div>

      {#if allowRetry && !isCorrect}
        <button class="btn btn-retry" onclick={handleRetry}>Try Again</button>
      {/if}
    </div>
  {:else}
    <div class="quiz-actions">
      <button
        class="btn btn-primary"
        onclick={handleSubmit}
        disabled={disabled || selectedOptions.size === 0}
      >
        Submit Answer
      </button>
    </div>
  {/if}
</div>

<style>
  .quiz-container {
    width: 100%;
    max-width: 700px;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 12px;
    padding: 24px;
  }

  .quiz-header {
    margin-bottom: 24px;
  }

  .quiz-question {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #333);
    line-height: 1.4;
  }

  .quiz-hint {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .option-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .option-card:hover:not(:disabled):not(.disabled) {
    background: var(--bg-hover, #e0e0e0);
    border-color: var(--accent-color, #3498db);
    transform: translateX(4px);
  }

  .option-card.selected:not(.correct):not(.incorrect) {
    background: rgba(52, 152, 219, 0.1);
    border-color: var(--accent-color, #3498db);
  }

  .option-card.correct {
    background: #e8f5e9;
    border-color: #4caf50;
  }

  .option-card.incorrect {
    background: #ffebee;
    border-color: #f44336;
  }

  .option-card.disabled {
    cursor: default;
  }

  .option-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .option-checkbox {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .correct-icon {
    color: #4caf50;
    font-weight: 900;
  }

  .incorrect-icon {
    color: #f44336;
    font-weight: 900;
  }

  .missed-icon {
    color: #ff9800;
  }

  .neutral-icon {
    color: var(--text-secondary, #999);
  }

  .option-text {
    flex: 1;
    font-size: 16px;
    color: var(--text-primary, #333);
    line-height: 1.5;
  }

  .option-feedback {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 6px;
    font-size: 14px;
    color: var(--text-secondary, #666);
    line-height: 1.4;
  }

  .feedback-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .results-panel {
    padding: 20px;
    border-radius: 8px;
    border: 2px solid;
  }

  .results-panel.success {
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    border-color: #4caf50;
  }

  .results-panel.failure {
    background: linear-gradient(135deg, #ffebee, #ffcdd2);
    border-color: #f44336;
  }

  .results-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .results-icon {
    font-size: 32px;
  }

  .results-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary, #333);
  }

  .results-stats {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
  }

  .stat-value.correct {
    color: #4caf50;
  }

  .stat-value.incorrect {
    color: #f44336;
  }

  .stat-value.total {
    color: var(--accent-color, #3498db);
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-secondary, #666);
    font-weight: 500;
  }

  .quiz-actions {
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 12px 32px;
    border-radius: 8px;
    border: none;
    font-size: 16px;
    font-weight: 600;
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
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3);
  }

  .btn-retry {
    background: #ff9800;
    color: white;
    width: 100%;
  }

  .btn-retry:hover {
    background: #f57c00;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
  }

  @media (max-width: 768px) {
    .quiz-container {
      padding: 16px;
    }

    .quiz-question {
      font-size: 18px;
    }

    .option-card {
      padding: 12px;
    }

    .option-text {
      font-size: 14px;
    }

    .results-stats {
      flex-wrap: wrap;
      gap: 16px;
    }
  }
</style>
