<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount, onDestroy } from 'svelte';

  // Props
  let {
    text,
    timeLimit = 10,
    autoSelect = true,
    disabled = false,
    defaultChoice = false,
    showProgress = true,
    warningThreshold = 3,
  }: {
    text: string;
    timeLimit?: number;
    autoSelect?: boolean;
    disabled?: boolean;
    defaultChoice?: boolean;
    showProgress?: boolean;
    warningThreshold?: number;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let timeRemaining = $state(timeLimit);
  let isExpired = $state(false);
  let isWarning = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Computed
  const progress = $derived((timeRemaining / timeLimit) * 100);
  const formattedTime = $derived(() => {
    const seconds = Math.ceil(timeRemaining);
    return `${seconds}s`;
  });

  onMount(() => {
    if (!disabled) {
      startTimer();
    }
  });

  onDestroy(() => {
    stopTimer();
  });

  function startTimer() {
    intervalId = setInterval(() => {
      timeRemaining -= 0.1;

      // Check for warning state
      if (timeRemaining <= warningThreshold && !isWarning) {
        isWarning = true;
      }

      // Check for expiration
      if (timeRemaining <= 0) {
        stopTimer();
        isExpired = true;

        if (autoSelect && defaultChoice) {
          dispatch('select', { autoSelected: true });
        } else {
          dispatch('expired');
        }
      }
    }, 100);
  }

  function stopTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function handleClick() {
    if (disabled || isExpired) return;

    stopTimer();
    dispatch('select', { autoSelected: false });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  // Cleanup on disabled change
  $effect(() => {
    if (disabled && intervalId) {
      stopTimer();
    }
  });
</script>

<button
  class="timed-choice"
  class:expired={isExpired}
  class:warning={isWarning && !isExpired}
  class:default={defaultChoice}
  onclick={handleClick}
  onkeydown={handleKeydown}
  disabled={disabled || isExpired}
  aria-label={`${text} - ${formattedTime()} remaining`}
>
  <div class="choice-content">
    <span class="choice-text">{text}</span>
    <span class="choice-timer" class:pulse={isWarning && !isExpired}>
      {formattedTime()}
    </span>
  </div>

  {#if showProgress && !isExpired}
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
  {/if}

  {#if isExpired && !autoSelect}
    <div class="expired-overlay">
      <span class="expired-text">Time's Up!</span>
    </div>
  {/if}
</button>

<style>
  .timed-choice {
    position: relative;
    width: 100%;
    padding: 16px 20px;
    background: var(--bg-primary, white);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    overflow: hidden;
  }

  .timed-choice:hover:not(:disabled) {
    background: var(--bg-hover, #f5f5f5);
    border-color: var(--accent-color, #3498db);
    transform: translateX(4px);
  }

  .timed-choice:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  .timed-choice.default {
    border-color: var(--accent-color, #3498db);
    background: linear-gradient(
      135deg,
      var(--bg-primary, white) 0%,
      rgba(52, 152, 219, 0.05) 100%
    );
  }

  .timed-choice.warning {
    border-color: #ff9800;
    animation: pulse-border 0.5s ease-in-out infinite;
  }

  @keyframes pulse-border {
    0%,
    100% {
      border-color: #ff9800;
    }
    50% {
      border-color: #ff5722;
    }
  }

  .timed-choice.expired {
    background: var(--bg-secondary, #f5f5f5);
    border-color: #f44336;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .timed-choice:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .choice-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  .choice-text {
    flex: 1;
    font-size: 16px;
    color: var(--text-primary, #333);
    font-weight: 500;
  }

  .choice-timer {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent-color, #3498db);
    font-family: monospace;
    min-width: 50px;
    text-align: right;
  }

  .choice-timer.pulse {
    color: #ff9800;
    animation: pulse-timer 0.5s ease-in-out infinite;
  }

  @keyframes pulse-timer {
    0%,
    100% {
      transform: scale(1);
      color: #ff9800;
    }
    50% {
      transform: scale(1.1);
      color: #ff5722;
    }
  }

  .progress-bar {
    height: 4px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #81c784);
    border-radius: 2px;
    transition: width 0.1s linear, background 0.3s;
  }

  .warning .progress-fill {
    background: linear-gradient(90deg, #ff9800, #ff5722);
  }

  .expired-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(244, 67, 54, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .expired-text {
    font-size: 18px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  @media (max-width: 768px) {
    .timed-choice {
      padding: 12px 16px;
    }

    .choice-text {
      font-size: 14px;
    }

    .choice-timer {
      font-size: 16px;
      min-width: 40px;
    }

    .expired-text {
      font-size: 16px;
    }
  }
</style>
