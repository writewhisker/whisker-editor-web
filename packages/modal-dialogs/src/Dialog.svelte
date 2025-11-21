<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { DialogButton } from './types';

  interface Props {
    open?: boolean;
    onClose?: () => void;
    title?: string;
    buttons?: DialogButton[];
    children?: Snippet;
  }

  let { open = false, onClose, title, buttons = [], children }: Props = $props();

  async function handleButtonClick(button: DialogButton) {
    await button.action();
  }

  function getButtonClass(variant?: string) {
    switch (variant) {
      case 'primary':
        return 'button-primary';
      case 'danger':
        return 'button-danger';
      default:
        return 'button-secondary';
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div class="dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">{title || 'Dialog'}</h2>
        <button class="close-button" onclick={onClose}>×</button>
      </div>
      <div class="dialog-body">
        {#if children}
          {@render children()}
        {/if}
      </div>
      <div class="dialog-footer">
        {#each buttons as button}
          <button
            class={getButtonClass(button.variant)}
            onclick={() => handleButtonClick(button)}
          >
            {button.label}
          </button>
        {/each}
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

  .dialog {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .dialog-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }

  .close-button:hover {
    background: #f3f4f6;
  }

  .dialog-body {
    padding: 20px;
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

  .button-primary {
    background: #3b82f6;
    color: white;
  }

  .button-primary:hover {
    background: #2563eb;
  }

  .button-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .button-secondary:hover {
    background: #d1d5db;
  }

  .button-danger {
    background: #ef4444;
    color: white;
  }

  .button-danger:hover {
    background: #dc2626;
  }
</style>
