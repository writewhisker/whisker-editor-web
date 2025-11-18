<script lang="ts">
  /**
   * Toast - Store-agnostic notification toast
   * Accepts all state as props and uses callbacks for actions
   */
  import { fly } from 'svelte/transition';

  export interface ToastItem {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }

  let {
    notifications = [],
    onDismiss = (id: string) => {},
    position = 'top-right'
  }: {
    notifications?: ToastItem[];
    onDismiss?: (id: string) => void;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  } = $props();

  function getIconAndStyles(type: string) {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          className: 'whisker-toast-success',
        };
      case 'error':
        return {
          icon: '✕',
          className: 'whisker-toast-error',
        };
      case 'warning':
        return {
          icon: '⚠',
          className: 'whisker-toast-warning',
        };
      default: // info
        return {
          icon: 'ℹ',
          className: 'whisker-toast-info',
        };
    }
  }

  const positionClasses = {
    'top-left': 'whisker-toast-top-left',
    'top-right': 'whisker-toast-top-right',
    'bottom-left': 'whisker-toast-bottom-left',
    'bottom-right': 'whisker-toast-bottom-right',
  };
</script>

<div
  class="whisker-toast-container {positionClasses[position]}"
  role="region"
  aria-live="polite"
  aria-label="Notifications"
>
  {#each notifications as notification (notification.id)}
    {@const styles = getIconAndStyles(notification.type)}
    <div
      transition:fly={{ x: position.includes('right') ? 300 : -300, duration: 300 }}
      class="whisker-toast {styles.className}"
    >
      <div class="whisker-toast-icon">
        <span>{styles.icon}</span>
      </div>
      <div class="whisker-toast-content">
        <p>{notification.message}</p>
      </div>
      <button
        class="whisker-toast-close"
        onclick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .whisker-toast-container {
    position: fixed;
    z-index: var(--whisker-z-tooltip);
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: var(--whisker-space-sm);
  }

  .whisker-toast-top-left {
    top: var(--whisker-space-lg);
    left: var(--whisker-space-lg);
  }

  .whisker-toast-top-right {
    top: var(--whisker-space-lg);
    right: var(--whisker-space-lg);
  }

  .whisker-toast-bottom-left {
    bottom: var(--whisker-space-lg);
    left: var(--whisker-space-lg);
  }

  .whisker-toast-bottom-right {
    bottom: var(--whisker-space-lg);
    right: var(--whisker-space-lg);
  }

  .whisker-toast {
    display: flex;
    align-items: flex-start;
    gap: var(--whisker-space-md);
    padding: var(--whisker-space-lg);
    border-radius: var(--whisker-radius-lg);
    box-shadow: var(--whisker-shadow-lg);
    border: 1px solid;
    background-color: var(--whisker-color-surface);
  }

  .whisker-toast-info {
    border-color: var(--whisker-color-info);
  }

  .whisker-toast-success {
    border-color: var(--whisker-color-success);
  }

  .whisker-toast-warning {
    border-color: var(--whisker-color-warning);
  }

  .whisker-toast-error {
    border-color: var(--whisker-color-error);
  }

  .whisker-toast-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: var(--whisker-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--whisker-font-weight-bold);
    font-size: var(--whisker-font-size-sm);
  }

  .whisker-toast-info .whisker-toast-icon {
    background-color: var(--whisker-color-info);
    color: white;
  }

  .whisker-toast-success .whisker-toast-icon {
    background-color: var(--whisker-color-success);
    color: white;
  }

  .whisker-toast-warning .whisker-toast-icon {
    background-color: var(--whisker-color-warning);
    color: white;
  }

  .whisker-toast-error .whisker-toast-icon {
    background-color: var(--whisker-color-error);
    color: white;
  }

  .whisker-toast-content {
    flex: 1;
    min-width: 0;
  }

  .whisker-toast-content p {
    margin: 0;
    font-size: var(--whisker-font-size-sm);
    color: var(--whisker-color-text);
    font-weight: var(--whisker-font-weight-medium);
  }

  .whisker-toast-close {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--whisker-color-text-secondary);
    cursor: pointer;
    transition: opacity var(--whisker-transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .whisker-toast-close:hover {
    opacity: 0.7;
  }
</style>
