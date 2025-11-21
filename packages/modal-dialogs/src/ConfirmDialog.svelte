<script lang="ts">
  import type { ConfirmDialogOptions } from './types';

  interface Props {
    open?: boolean;
    options?: ConfirmDialogOptions;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }

  let {
    open = false,
    options = { title: 'Confirm', message: 'Are you sure?' },
    onConfirm,
    onCancel,
  }: Props = $props();

  async function handleConfirm() {
    await onConfirm?.();
  }

  function getVariantClass() {
    switch (options.variant) {
      case 'danger':
        return 'variant-danger';
      case 'warning':
        return 'variant-warning';
      default:
        return 'variant-info';
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && onCancel?.()}>
    <div class="confirm-dialog {getVariantClass()}">
      <div class="dialog-header">
        <h2 class="dialog-title">{options.title}</h2>
      </div>
      <div class="dialog-body">
        <p>{options.message}</p>
      </div>
      <div class="dialog-footer">
        <button class="button-cancel" onclick={onCancel}>
          {options.cancelLabel || 'Cancel'}
        </button>
        <button class="button-confirm" onclick={handleConfirm}>
          {options.confirmLabel || 'Confirm'}
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

  .confirm-dialog {
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

  .variant-danger .dialog-title {
    color: #dc2626;
  }

  .variant-warning .dialog-title {
    color: #f59e0b;
  }

  .dialog-body {
    padding: 20px;
  }

  .dialog-body p {
    margin: 0;
    line-height: 1.6;
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

  .variant-danger .button-confirm {
    background: #ef4444;
  }

  .variant-danger .button-confirm:hover {
    background: #dc2626;
  }

  .variant-warning .button-confirm {
    background: #f59e0b;
  }

  .variant-warning .button-confirm:hover {
    background: #d97706;
  }
</style>
