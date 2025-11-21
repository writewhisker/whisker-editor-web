<script lang="ts">
  import type { AlertDialogOptions } from './types';

  interface Props {
    open?: boolean;
    options?: AlertDialogOptions;
    onClose?: () => void;
  }

  let {
    open = false,
    options = { title: 'Alert', message: '' },
    onClose,
  }: Props = $props();
</script>

{#if open}
  <div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div class="alert-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">{options.title}</h2>
      </div>
      <div class="dialog-body">
        <p>{options.message}</p>
      </div>
      <div class="dialog-footer">
        <button class="button-ok" onclick={onClose}>
          {options.okLabel || 'OK'}
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

  .alert-dialog {
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

  .dialog-body p {
    margin: 0;
    line-height: 1.6;
  }

  .dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
  }

  .button-ok {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: #3b82f6;
    color: white;
    transition: background 0.15s;
  }

  .button-ok:hover {
    background: #2563eb;
  }
</style>
