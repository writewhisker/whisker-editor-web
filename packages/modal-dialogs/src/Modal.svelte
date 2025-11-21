<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    onClose?: () => void;
    title?: string;
    children?: Snippet;
    footer?: Snippet;
  }

  let { open = false, onClose, title, children, footer }: Props = $props();

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={handleOverlayClick}>
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{title || 'Dialog'}</h2>
        <button class="close-button" onclick={onClose}>×</button>
      </div>
      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>
      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
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

  .modal {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .close-button:hover {
    background: #f3f4f6;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
