<script lang="ts">
  import { notificationStore } from '../stores/notificationStore';
  import { fly } from 'svelte/transition';

  function getIconAndStyles(type: string) {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          bg: 'bg-green-50 dark:bg-green-900',
          border: 'border-green-200 dark:border-green-700',
          text: 'text-green-800 dark:text-green-200',
          iconBg: 'bg-green-100 dark:bg-green-800',
        };
      case 'error':
        return {
          icon: '✕',
          bg: 'bg-red-50 dark:bg-red-900',
          border: 'border-red-200 dark:border-red-700',
          text: 'text-red-800 dark:text-red-200',
          iconBg: 'bg-red-100 dark:bg-red-800',
        };
      case 'warning':
        return {
          icon: '⚠',
          bg: 'bg-yellow-50 dark:bg-yellow-900',
          border: 'border-yellow-200 dark:border-yellow-700',
          text: 'text-yellow-800 dark:text-yellow-200',
          iconBg: 'bg-yellow-100 dark:bg-yellow-800',
        };
      default: // info
        return {
          icon: 'ℹ',
          bg: 'bg-blue-50 dark:bg-blue-900',
          border: 'border-blue-200 dark:border-blue-700',
          text: 'text-blue-800 dark:text-blue-200',
          iconBg: 'bg-blue-100 dark:bg-blue-800',
        };
    }
  }
</script>

<div class="fixed top-4 right-4 z-50 max-w-md space-y-2" role="region" aria-live="polite" aria-label="Notifications">
  {#each $notificationStore as notification (notification.id)}
    {@const styles = getIconAndStyles(notification.type)}
    <div
      transition:fly={{ x: 300, duration: 300 }}
      class="flex items-start gap-3 p-4 rounded-lg shadow-lg border {styles.bg} {styles.border}"
    >
      <div class="flex-shrink-0 w-6 h-6 rounded-full {styles.iconBg} flex items-center justify-center">
        <span class="{styles.text} text-sm font-bold">{styles.icon}</span>
      </div>
      <div class="flex-1 {styles.text}">
        <p class="text-sm font-medium">{notification.message}</p>
      </div>
      <button
        class="{styles.text} hover:opacity-70 transition-opacity"
        on:click={() => notificationStore.dismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
