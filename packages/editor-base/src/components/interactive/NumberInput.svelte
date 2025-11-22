<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  let {
    prompt = 'Enter a number:',
    initialValue = 0,
    variableName,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    required = false,
    disabled = false,
    showSlider = false,
    showButtons = true,
    prefix = '',
    suffix = '',
  }: {
    prompt?: string;
    initialValue?: number;
    variableName: string;
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
    disabled?: boolean;
    showSlider?: boolean;
    showButtons?: boolean;
    prefix?: string;
    suffix?: string;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let value = $state(initialValue);
  let inputValue = $state(String(initialValue));
  let isValid = $state(true);
  let errorMessage = $state('');
  let isTouched = $state(false);
  let isFocused = $state(false);

  // Computed
  const progressPercent = $derived(() => {
    if (min === Number.MIN_SAFE_INTEGER || max === Number.MAX_SAFE_INTEGER) {
      return 50;
    }
    return ((value - min) / (max - min)) * 100;
  });

  const hasValidRange = $derived(
    min !== Number.MIN_SAFE_INTEGER && max !== Number.MAX_SAFE_INTEGER
  );

  function validate(newValue: number): boolean {
    if (!isTouched) return true;

    // Required check
    if (required && isNaN(newValue)) {
      errorMessage = 'This field is required';
      isValid = false;
      return false;
    }

    // Min check
    if (newValue < min) {
      errorMessage = `Must be at least ${min}`;
      isValid = false;
      return false;
    }

    // Max check
    if (newValue > max) {
      errorMessage = `Must not exceed ${max}`;
      isValid = false;
      return false;
    }

    errorMessage = '';
    isValid = true;
    return true;
  }

  function updateValue(newValue: number) {
    // Clamp to min/max
    newValue = Math.max(min, Math.min(max, newValue));

    value = newValue;
    inputValue = String(newValue);
    validate(newValue);
    dispatch('change', { value, variableName, isValid });
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    inputValue = target.value;

    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      value = parsed;
      validate(parsed);
    } else {
      isValid = false;
      errorMessage = 'Please enter a valid number';
    }

    dispatch('input', { value, variableName, isValid });
  }

  function handleBlur() {
    isTouched = true;
    isFocused = false;

    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      updateValue(parsed);
    } else if (required) {
      updateValue(initialValue);
    }

    dispatch('blur', { value, variableName, isValid });
  }

  function handleFocus() {
    isFocused = true;
    dispatch('focus', { variableName });
  }

  function handleSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    updateValue(parseFloat(target.value));
  }

  function increment() {
    updateValue(value + step);
  }

  function decrement() {
    updateValue(value - step);
  }

  function handleSubmit() {
    isTouched = true;
    const valid = validate(value);
    if (valid) {
      dispatch('submit', { value, variableName });
    }
  }

  function handleReset() {
    updateValue(initialValue);
    isTouched = false;
    dispatch('reset', { variableName });
  }
</script>

<div class="number-input-container" class:has-error={!isValid && isTouched}>
  <div class="input-header">
    <label for={variableName} class="input-label">
      {prompt}
      {#if required}
        <span class="required-indicator" aria-label="Required">*</span>
      {/if}
    </label>
    <div class="value-display">
      {prefix}{value}{suffix}
    </div>
  </div>

  <div class="input-controls">
    <div class="input-wrapper" class:focused={isFocused}>
      {#if showButtons}
        <button
          class="stepper-btn"
          onclick={decrement}
          disabled={disabled || value <= min}
          aria-label="Decrease"
          type="button"
        >
          −
        </button>
      {/if}

      <input
        type="number"
        id={variableName}
        name={variableName}
        {min}
        {max}
        {step}
        {disabled}
        value={inputValue}
        oninput={handleInput}
        onblur={handleBlur}
        onfocus={handleFocus}
        aria-invalid={!isValid && isTouched}
        aria-describedby={errorMessage ? `${variableName}-error` : undefined}
        class="number-field"
      />

      {#if showButtons}
        <button
          class="stepper-btn"
          onclick={increment}
          disabled={disabled || value >= max}
          aria-label="Increase"
          type="button"
        >
          +
        </button>
      {/if}
    </div>

    {#if showSlider && hasValidRange}
      <div class="slider-wrapper">
        <span class="slider-label">{min}</span>
        <input
          type="range"
          {min}
          {max}
          {step}
          {disabled}
          value={value}
          onchange={handleSliderChange}
          class="range-slider"
          aria-label={`${prompt} slider`}
        />
        <span class="slider-label">{max}</span>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressPercent()}%"></div>
        <div class="progress-marker" style="left: {progressPercent()}%"></div>
      </div>
    {/if}
  </div>

  {#if errorMessage && isTouched}
    <div class="error-message" id="{variableName}-error" role="alert">
      <span class="error-icon">⚠️</span>
      {errorMessage}
    </div>
  {:else if hasValidRange && !isTouched}
    <div class="help-text">Range: {min} to {max}</div>
  {/if}

  <div class="input-actions">
    <button class="btn btn-secondary" onclick={handleReset} disabled={disabled} type="button">
      Reset
    </button>
    <button
      class="btn btn-primary"
      onclick={handleSubmit}
      disabled={disabled || (!isValid && isTouched)}
      type="button"
    >
      Submit
    </button>
  </div>
</div>

<style>
  .number-input-container {
    width: 100%;
    max-width: 500px;
  }

  .number-input-container.has-error .input-wrapper {
    border-color: #f44336;
  }

  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .input-label {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .required-indicator {
    color: #f44336;
    margin-left: 4px;
  }

  .value-display {
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-color, #3498db);
    font-family: monospace;
  }

  .input-controls {
    margin-bottom: 12px;
  }

  .input-wrapper {
    display: flex;
    align-items: stretch;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    transition: all 0.2s;
    background: var(--bg-primary, white);
    overflow: hidden;
  }

  .input-wrapper.focused {
    border-color: var(--accent-color, #3498db);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  .input-wrapper:hover:not(.focused) {
    border-color: var(--border-hover, #ccc);
  }

  .stepper-btn {
    width: 48px;
    background: var(--bg-secondary, #f5f5f5);
    border: none;
    font-size: 24px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-primary, #333);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stepper-btn:hover:not(:disabled) {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .stepper-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .stepper-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .number-field {
    flex: 1;
    padding: 12px 16px;
    border: none;
    background: transparent;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #333);
    text-align: center;
    outline: none;
    font-family: monospace;
  }

  .number-field:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Remove number input spinners */
  .number-field::-webkit-outer-spin-button,
  .number-field::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .number-field[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .slider-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
  }

  .slider-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary, #666);
    min-width: 40px;
    text-align: center;
  }

  .range-slider {
    flex: 1;
    height: 8px;
    appearance: none;
    background: transparent;
    outline: none;
  }

  .range-slider::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }

  .range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .range-slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background: var(--accent-color, #3498db);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }

  .range-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  .range-slider:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .progress-bar {
    position: relative;
    height: 8px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    margin-top: 8px;
    overflow: visible;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, var(--accent-color, #3498db));
    border-radius: 4px;
    transition: width 0.2s;
  }

  .progress-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: var(--accent-color, #3498db);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: left 0.2s;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 12px;
    background: #ffebee;
    border: 1px solid #ffcdd2;
    border-radius: 4px;
    color: #c62828;
    font-size: 14px;
  }

  .error-icon {
    font-size: 16px;
  }

  .help-text {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .input-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .btn {
    padding: 10px 24px;
    border-radius: 6px;
    border: none;
    font-size: 15px;
    font-weight: 600;
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
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  }

  @media (max-width: 768px) {
    .input-label {
      font-size: 14px;
    }

    .value-display {
      font-size: 20px;
    }

    .number-field {
      font-size: 16px;
      padding: 10px 12px;
    }

    .stepper-btn {
      width: 40px;
      font-size: 20px;
    }
  }
</style>
