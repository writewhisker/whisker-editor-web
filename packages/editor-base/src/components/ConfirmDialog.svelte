<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;
  export let title = 'Confirm';
  export let message = 'Are you sure?';
  export let confirmText = 'Confirm';
  export let cancelText = 'Cancel';
  export let variant: 'danger' | 'warning' | 'info' = 'info';

  const dispatch = createEventDispatcher();
  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;

  function handleConfirm() {
    dispatch('confirm');
    close();
  }

  function handleCancel() {
    dispatch('cancel');
    close();
  }

  function close() {
    show = false;
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  }

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }

  // Variant styles
  $: variantStyles = {
    danger: {
      icon: '⚠️',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      border: 'border-red-200',
    },
    warning: {
      icon: '⚡',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      border: 'border-yellow-200',
    },
    info: {
      icon: 'ℹ️',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
      border: 'border-blue-200',
    },
  }[variant];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={handleCancel}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-2xl p-6 w-[450px] max-w-[90vw] border-2 {variantStyles.border}"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      tabindex="-1"
    >
      <!-- Header with Icon -->
      <div class="flex items-start gap-4 mb-4">
        <div class="text-3xl flex-shrink-0">
          {variantStyles.icon}
        </div>
        <div class="flex-1">
          <h2 id="confirm-title" class="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <p id="confirm-message" class="text-gray-700 text-sm leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          class="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          on:click={handleCancel}
          type="button"
        >
          {cancelText}
        </button>
        <button
          class="px-5 py-2.5 rounded-lg transition-colors font-medium {variantStyles.confirmButton}"
          on:click={handleConfirm}
          type="button"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add subtle animation */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  [role="alertdialog"] {
    animation: fadeIn 0.15s ease-out;
  }
</style>
