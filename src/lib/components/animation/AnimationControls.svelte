<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TransitionType, EasingFunction } from '$lib/animations/types';

  // Props
  let {
    currentTransition = 'fade',
    currentEasing = 'ease',
    currentDuration = 300,
    enabled = true,
  }: {
    currentTransition?: TransitionType;
    currentEasing?: EasingFunction;
    currentDuration?: number;
    enabled?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let selectedTransition = $state<TransitionType>(currentTransition);
  let selectedEasing = $state<EasingFunction>(currentEasing);
  let duration = $state(currentDuration);
  let animationsEnabled = $state(enabled);
  let isExpanded = $state(true);
  let previewKey = $state(0);

  // Available options
  const transitions: { value: TransitionType; label: string; icon: string }[] = [
    { value: 'fade', label: 'Fade', icon: '◐' },
    { value: 'slide-left', label: 'Slide Left', icon: '←' },
    { value: 'slide-right', label: 'Slide Right', icon: '→' },
    { value: 'slide-up', label: 'Slide Up', icon: '↑' },
    { value: 'slide-down', label: 'Slide Down', icon: '↓' },
    { value: 'zoom-in', label: 'Zoom In', icon: '⊕' },
    { value: 'zoom-out', label: 'Zoom Out', icon: '⊖' },
    { value: 'none', label: 'None', icon: '○' },
  ];

  const easings: { value: EasingFunction; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease', label: 'Ease' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In Out' },
  ];

  function handleTransitionChange(transition: TransitionType) {
    selectedTransition = transition;
    dispatch('change', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
      enabled: animationsEnabled,
    });
  }

  function handleEasingChange(event: Event) {
    selectedEasing = (event.target as HTMLSelectElement).value as EasingFunction;
    dispatch('change', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
      enabled: animationsEnabled,
    });
  }

  function handleDurationChange(event: Event) {
    duration = parseInt((event.target as HTMLInputElement).value);
    dispatch('change', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
      enabled: animationsEnabled,
    });
  }

  function handleEnabledToggle() {
    animationsEnabled = !animationsEnabled;
    dispatch('change', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
      enabled: animationsEnabled,
    });
  }

  function triggerPreview() {
    previewKey += 1;
    dispatch('preview', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
    });
  }

  function resetToDefaults() {
    selectedTransition = 'fade';
    selectedEasing = 'ease';
    duration = 300;
    animationsEnabled = true;
    dispatch('change', {
      transition: selectedTransition,
      easing: selectedEasing,
      duration,
      enabled: animationsEnabled,
    });
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<div class="animation-controls" class:collapsed={!isExpanded}>
  <div class="controls-header" onclick={() => (isExpanded = !isExpanded)}>
    <div class="header-content">
      <span class="header-icon">✨</span>
      <h3>Animation Settings</h3>
      {#if !isExpanded}
        <span class="header-info">{transitions.find((t) => t.value === selectedTransition)?.label}</span>
      {/if}
    </div>
    <button class="expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
      {isExpanded ? '▼' : '▶'}
    </button>
  </div>

  {#if isExpanded}
    <div class="controls-content">
      <!-- Enable/Disable Toggle -->
      <div class="toggle-section">
        <label class="toggle-label">
          <input type="checkbox" checked={animationsEnabled} onchange={handleEnabledToggle} />
          <span class="toggle-text">Enable Animations</span>
        </label>
      </div>

      <div class="section-divider"></div>

      <!-- Transition Type Selection -->
      <div class="form-section">
        <label class="section-label">Transition Type</label>
        <div class="transition-grid">
          {#each transitions as transition}
            <button
              class="transition-card"
              class:active={selectedTransition === transition.value}
              disabled={!animationsEnabled}
              onclick={() => handleTransitionChange(transition.value)}
            >
              <span class="transition-icon">{transition.icon}</span>
              <span class="transition-label">{transition.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Easing Function -->
      <div class="form-section">
        <label for="easing-select" class="section-label">Easing Function</label>
        <select
          id="easing-select"
          value={selectedEasing}
          onchange={handleEasingChange}
          disabled={!animationsEnabled || selectedTransition === 'none'}
          class="easing-select"
        >
          {#each easings as easing}
            <option value={easing.value}>{easing.label}</option>
          {/each}
        </select>
      </div>

      <!-- Duration Slider -->
      <div class="form-section">
        <div class="slider-header">
          <label for="duration-slider" class="section-label">Duration</label>
          <span class="duration-value">{formatDuration(duration)}</span>
        </div>
        <div class="slider-container">
          <span class="slider-label">Fast</span>
          <input
            type="range"
            id="duration-slider"
            min="100"
            max="2000"
            step="50"
            value={duration}
            oninput={handleDurationChange}
            disabled={!animationsEnabled || selectedTransition === 'none'}
            class="duration-slider"
          />
          <span class="slider-label">Slow</span>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Preview Section -->
      <div class="preview-section">
        <div class="preview-header">
          <label class="section-label">Preview</label>
          <button
            class="btn btn-secondary"
            onclick={triggerPreview}
            disabled={!animationsEnabled || selectedTransition === 'none'}
          >
            Play Preview
          </button>
        </div>
        <div class="preview-container">
          {#key previewKey}
            <div
              class="preview-box"
              class:animate={previewKey > 0}
              style="
                animation-duration: {duration}ms;
                animation-timing-function: {selectedEasing};
                animation-name: preview-{selectedTransition};
              "
            >
              <span class="preview-text">Sample Text</span>
            </div>
          {/key}
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Action Buttons -->
      <div class="actions">
        <button class="btn btn-secondary" onclick={resetToDefaults}>Reset to Defaults</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .animation-controls {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    cursor: pointer;
    transition: background 0.2s;
  }

  .controls-header:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .header-icon {
    font-size: 24px;
  }

  .controls-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .header-info {
    font-size: 14px;
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  .expand-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 4px 8px;
  }

  .controls-content {
    padding: 20px;
  }

  .section-divider {
    height: 1px;
    background: var(--border-color, #e0e0e0);
    margin: 20px 0;
  }

  .toggle-section {
    margin-bottom: 0;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .toggle-label input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .toggle-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .form-section {
    margin-bottom: 0;
  }

  .section-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 12px;
  }

  .transition-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  .transition-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .transition-card:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .transition-card.active {
    background: rgba(52, 152, 219, 0.1);
    border-color: var(--accent-color, #3498db);
  }

  .transition-card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .transition-icon {
    font-size: 28px;
  }

  .transition-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary, #333);
    text-align: center;
  }

  .easing-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 6px;
    font-size: 14px;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    cursor: pointer;
  }

  .easing-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .duration-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--accent-color, #3498db);
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .slider-label {
    font-size: 12px;
    color: var(--text-secondary, #666);
    min-width: 35px;
    text-align: center;
  }

  .duration-slider {
    flex: 1;
    height: 6px;
    appearance: none;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 3px;
    outline: none;
  }

  .duration-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .duration-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .duration-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .duration-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  .duration-slider:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .preview-section {
    margin-bottom: 0;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .preview-container {
    height: 120px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px dashed var(--border-color, #e0e0e0);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-box {
    padding: 20px 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    font-weight: 600;
  }

  .preview-box.animate {
    animation-fill-mode: both;
  }

  @keyframes preview-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes preview-slide-left {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes preview-slide-right {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes preview-slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes preview-slide-down {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes preview-zoom-in {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes preview-zoom-out {
    from {
      transform: scale(2);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes preview-none {
    from {
      opacity: 1;
    }
    to {
      opacity: 1;
    }
  }

  .actions {
    display: flex;
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

  @media (max-width: 768px) {
    .transition-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }

    .transition-card {
      padding: 12px 4px;
    }

    .transition-icon {
      font-size: 24px;
    }

    .transition-label {
      font-size: 11px;
    }
  }
</style>
