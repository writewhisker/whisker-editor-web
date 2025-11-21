<script lang="ts">
  import type { PromptDialogOptions } from './types';

  interface Props {
    open?: boolean;
    options?: PromptDialogOptions;
    onConfirm?: (value: string) => void | Promise<void>;
    onCancel?: () => void;
  }

  let {
    open = false,
    options = { title: 'Input', message: 'Enter a value:' },
    onConfirm,
    onCancel,
  }: Props = $props();

  let inputValue = $state(options.defaultValue || '');

  async function handleConfirm() {
    await onConfirm?.(inputValue);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && onCancel?.()}>
    <div class="prompt-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">{options.title}</h2>
      </div>
      <div class="dialog-body">
        <p class="message">{options.message}</p>
        <input
          type="text"
          class="input"
          bind:value={inputValue}
          placeholder={options.placeholder || ''}
          onkeydown={handleKeyDown}
          autofocus
        />
      </div>
      <div class="dialog-footer">
        <button class="button-cancel" onclick={onCancel}>
          {options.cancelLabel || 'Cancel'}
        </button>
        <button class="button-confirm" onclick={handleConfirm}>
          {options.confirmLabel || 'OK'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
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
  }

  .prompt-dialog {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
  }

  .dialog-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .dialog-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .dialog-body {
    padding: 20px;
  }

  .message {
    margin: 0 0 12px 0;
    line-height: 1.6;
  }

  .input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
  }

  .input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .dialog-footer button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .button-cancel {
    background: #e5e7eb;
    color: #374151;
  }

  .button-cancel:hover {
    background: #d1d5db;
  }

  .button-confirm {
    background: #3b82f6;
    color: white;
  }

  .button-confirm:hover {
    background: #2563eb;
  }
</style>
