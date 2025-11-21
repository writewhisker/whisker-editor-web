<script lang="ts">
  import type { StatusMessage, StatusType } from './types';
  import { onMount } from 'svelte';

  interface Props {
    message?: StatusMessage;
    onDismiss?: () => void;
  }

  let { message, onDismiss }: Props = $props();

  onMount(() => {
    if (message?.duration && message.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, message.duration);
      return () => clearTimeout(timer);
    }
  });

  function getTypeClass(type?: StatusType) {
    switch (type) {
      case 'success':
        return 'type-success';
      case 'warning':
        return 'type-warning';
      case 'error':
        return 'type-error';
      default:
        return 'type-info';
    }
  }
</script>

{#if message}
  <div class="status-message {getTypeClass(message.type)}">
    <span class="message-text">{message.text}</span>
    <button class="dismiss-button" onclick={onDismiss}>×</button>
  </div>
{/if}

<style>
  .status-message {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    margin: 4px 8px;
  }

  .type-info {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  }

  .type-success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;
  }

  .type-warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
  }

  .type-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .message-text {
    flex: 1;
  }

  .dismiss-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 4px;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .dismiss-button:hover {
    opacity: 1;
  }
</style>
