<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;
  export let title = 'Dialog';
  export let message = '';
  export let showInput = false;
  export let inputPlaceholder = '';
  export let inputValue = '';

  const dispatch = createEventDispatcher();

  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;

  function handleConfirm() {
    const value = inputValue;
    close();
    // Dispatch after closing to avoid race condition with parent re-renders
    dispatch('confirm', { value });
  }

  function handleCancel() {
    close();
    dispatch('cancel');
  }

  function close() {
    show = false;
    inputValue = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && showInput) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }

  // Set up focus trap when dialog opens
  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  // Clean up focus trap when dialog closes
  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={handleCancel} role="presentation">
    <div
      bind:this={dialogElement}
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 min-w-[400px]"
      on:click|stopPropagation
      role="dialog" tabindex="-1"
      aria-modal="true"
      aria-labelledby="file-dialog-title"
      aria-describedby={message ? 'file-dialog-message' : undefined}
      tabindex="-1"
    >
      <h2 id="file-dialog-title" class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>

      {#if message}
        <p id="file-dialog-message" class="mb-4 text-gray-700 dark:text-gray-300">{message}</p>
      {/if}

      {#if showInput}
        <label for="file-dialog-input" class="sr-only">{inputPlaceholder || 'Input value'}</label>
        <input
          id="file-dialog-input"
          type="text"
          bind:value={inputValue}
          placeholder={inputPlaceholder}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          on:keydown={handleKeydown}
        />
      {/if}

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          on:click={handleCancel}
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={handleConfirm}
          aria-label="Confirm"
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}
