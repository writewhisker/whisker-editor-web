<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  let {
    prompt = 'Enter text:',
    placeholder = '',
    initialValue = '',
    variableName,
    required = false,
    minLength = 0,
    maxLength = 500,
    pattern,
    multiline = false,
    rows = 3,
    disabled = false,
    showCharCount = true,
  }: {
    prompt?: string;
    placeholder?: string;
    initialValue?: string;
    variableName: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    showCharCount?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let value = $state(initialValue);
  let isValid = $state(true);
  let errorMessage = $state('');
  let isTouched = $state(false);
  let isFocused = $state(false);

  // Computed
  const charCount = $derived(value.length);
  const isAtMaxLength = $derived(charCount >= maxLength);
  const progressPercent = $derived((charCount / maxLength) * 100);

  function validate(): boolean {
    if (!isTouched) return true;

    // Required check
    if (required && value.trim().length === 0) {
      errorMessage = 'This field is required';
      isValid = false;
      return false;
    }

    // Min length check
    if (minLength > 0 && value.length < minLength) {
      errorMessage = `Must be at least ${minLength} characters`;
      isValid = false;
      return false;
    }

    // Max length check
    if (value.length > maxLength) {
      errorMessage = `Must not exceed ${maxLength} characters`;
      isValid = false;
      return false;
    }

    // Pattern check
    if (pattern && value.length > 0) {
      try {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          errorMessage = 'Invalid format';
          isValid = false;
          return false;
        }
      } catch (e) {
        console.error('Invalid regex pattern:', e);
      }
    }

    errorMessage = '';
    isValid = true;
    return true;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    value = target.value;

    // Enforce max length
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
      target.value = value;
    }

    validate();
    dispatch('input', { value, variableName, isValid });
  }

  function handleChange() {
    isTouched = true;
    validate();
    dispatch('change', { value, variableName, isValid });
  }

  function handleBlur() {
    isTouched = true;
    isFocused = false;
    validate();
    dispatch('blur', { value, variableName, isValid });
  }

  function handleFocus() {
    isFocused = true;
    dispatch('focus', { variableName });
  }

  function handleSubmit() {
    isTouched = true;
    const valid = validate();
    if (valid) {
      dispatch('submit', { value, variableName });
    }
  }

  function handleClear() {
    value = '';
    isTouched = false;
    isValid = true;
    errorMessage = '';
    dispatch('clear', { variableName });
  }
</script>

<div class="text-input-container" class:has-error={!isValid && isTouched}>
  <div class="input-header">
    <label for={variableName} class="input-label">
      {prompt}
      {#if required}
        <span class="required-indicator" aria-label="Required">*</span>
      {/if}
    </label>
    {#if showCharCount}
      <span class="char-count" class:warning={isAtMaxLength}>
        {charCount}/{maxLength}
      </span>
    {/if}
  </div>

  <div class="input-wrapper" class:focused={isFocused}>
    {#if multiline}
      <textarea
        id={variableName}
        name={variableName}
        {placeholder}
        {rows}
        {disabled}
        value={value}
        oninput={handleInput}
        onchange={handleChange}
        onblur={handleBlur}
        onfocus={handleFocus}
        aria-invalid={!isValid && isTouched}
        aria-describedby={errorMessage ? `${variableName}-error` : undefined}
        class="input-field textarea"
      ></textarea>
    {:else}
      <input
        type="text"
        id={variableName}
        name={variableName}
        {placeholder}
        {disabled}
        value={value}
        oninput={handleInput}
        onchange={handleChange}
        onblur={handleBlur}
        onfocus={handleFocus}
        aria-invalid={!isValid && isTouched}
        aria-describedby={errorMessage ? `${variableName}-error` : undefined}
        class="input-field"
      />
    {/if}

    {#if value.length > 0 && !disabled}
      <button class="clear-btn" onclick={handleClear} aria-label="Clear input" type="button">
        ×
      </button>
    {/if}
  </div>

  {#if showCharCount && maxLength}
    <div class="progress-bar">
      <div
        class="progress-fill"
        class:warning={progressPercent > 80}
        class:danger={progressPercent >= 100}
        style="width: {Math.min(progressPercent, 100)}%"
      ></div>
    </div>
  {/if}

  {#if errorMessage && isTouched}
    <div class="error-message" id="{variableName}-error" role="alert">
      <span class="error-icon">⚠️</span>
      {errorMessage}
    </div>
  {:else if minLength > 0 && !isTouched}
    <div class="help-text">Minimum {minLength} characters</div>
  {/if}

  <div class="input-actions">
    <button class="btn btn-primary" onclick={handleSubmit} disabled={disabled || (!isValid && isTouched)}>
      Submit
    </button>
  </div>
</div>

<style>
  .text-input-container {
    width: 100%;
    max-width: 600px;
  }

  .text-input-container.has-error .input-wrapper {
    border-color: #f44336;
  }

  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
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

  .char-count {
    font-size: 13px;
    color: var(--text-secondary, #666);
    font-family: monospace;
  }

  .char-count.warning {
    color: #ff9800;
    font-weight: 600;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    transition: all 0.2s;
    background: var(--bg-primary, white);
  }

  .input-wrapper.focused {
    border-color: var(--accent-color, #3498db);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  .input-wrapper:hover:not(.focused) {
    border-color: var(--border-hover, #ccc);
  }

  .input-field {
    flex: 1;
    padding: 12px 16px;
    border: none;
    background: transparent;
    font-size: 16px;
    color: var(--text-primary, #333);
    outline: none;
    font-family: inherit;
  }

  .input-field::placeholder {
    color: var(--text-secondary, #999);
  }

  .input-field:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .textarea {
    resize: vertical;
    min-height: 80px;
    line-height: 1.5;
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary, #f5f5f5);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    color: var(--text-secondary, #666);
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: var(--bg-hover, #e0e0e0);
    color: var(--text-primary, #333);
  }

  .progress-bar {
    height: 3px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 0 0 6px 6px;
    overflow: hidden;
    margin-top: -3px;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-color, #3498db);
    transition: width 0.2s, background 0.2s;
  }

  .progress-fill.warning {
    background: #ff9800;
  }

  .progress-fill.danger {
    background: #f44336;
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

    .input-field {
      font-size: 14px;
      padding: 10px 12px;
    }

    .char-count {
      font-size: 12px;
    }
  }
</style>
