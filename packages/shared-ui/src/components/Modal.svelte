<script lang="ts">
  /**
   * Modal - Store-agnostic modal dialog
   */
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  let {
    open = $bindable(false),
    title = '',
    size = 'medium',
    onClose = () => {},
    children,
    footer
  }: {
    open?: boolean;
    title?: string;
    size?: 'small' | 'medium' | 'large' | 'full';
    onClose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  } = $props();

  const sizeClasses = {
    small: 'whisker-modal-sm',
    medium: 'whisker-modal-md',
    large: 'whisker-modal-lg',
    full: 'whisker-modal-full',
  };

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleClose() {
    open = false;
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="whisker-modal-backdrop" transition:fade={{ duration: 200 }} onclick={handleBackdropClick}>
    <div
      class="whisker-modal {sizeClasses[size]}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      {#if title}
        <div class="whisker-modal-header">
          <h2 id="modal-title" class="whisker-modal-title">{title}</h2>
          <button
            class="whisker-modal-close"
            onclick={handleClose}
            aria-label="Close dialog"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}

      <div class="whisker-modal-body">
        {@render children?.()}
      </div>

      {#if footer}
        <div class="whisker-modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .whisker-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--whisker-z-modal-backdrop);
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--whisker-space-lg);
  }

  .whisker-modal {
    background-color: var(--whisker-color-background);
    border-radius: var(--whisker-radius-xl);
    box-shadow: var(--whisker-shadow-xl);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    z-index: var(--whisker-z-modal);
  }

  .whisker-modal-sm { max-width: 400px; }
  .whisker-modal-md { max-width: 600px; }
  .whisker-modal-lg { max-width: 800px; }
  .whisker-modal-full { max-width: 95vw; }

  .whisker-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--whisker-space-xl);
    border-bottom: 1px solid var(--whisker-color-border);
  }

  .whisker-modal-title {
    margin: 0;
    font-size: var(--whisker-font-size-xl);
    font-weight: var(--whisker-font-weight-semibold);
    color: var(--whisker-color-text);
  }

  .whisker-modal-close {
    padding: var(--whisker-space-xs);
    background: transparent;
    border: none;
    color: var(--whisker-color-text-secondary);
    cursor: pointer;
    border-radius: var(--whisker-radius-sm);
    transition: background-color var(--whisker-transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .whisker-modal-close:hover {
    background-color: var(--whisker-color-surface-hover);
  }

  .whisker-modal-body {
    flex: 1;
    padding: var(--whisker-space-xl);
    overflow-y: auto;
  }

  .whisker-modal-footer {
    padding: var(--whisker-space-xl);
    border-top: 1px solid var(--whisker-color-border);
    display: flex;
    gap: var(--whisker-space-sm);
    justify-content: flex-end;
  }
</style>
