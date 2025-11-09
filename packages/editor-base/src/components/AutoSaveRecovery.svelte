<script lang="ts">
  import { onMount } from 'svelte';
  import { trapFocus } from '../utils/accessibility';
  import { loadFromLocalStorage, clearLocalStorage, formatAutoSaveTime, type AutoSaveData } from '../utils/autoSave';

  export let onRecover: (data: AutoSaveData) => void;
  export let onDismiss: () => void;

  let autoSaveData: AutoSaveData | null = null;
  let show = false;
  let dialogElement: HTMLDivElement;
  let cleanupFocusTrap: (() => void) | null = null;

  onMount(() => {
    // Check for auto-save on mount
    autoSaveData = loadFromLocalStorage();
    if (autoSaveData) {
      show = true;
    }

    return () => {
      if (cleanupFocusTrap) {
        cleanupFocusTrap();
      }
    };
  });

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  function handleRecover() {
    if (autoSaveData && cleanupFocusTrap) {
      cleanupFocusTrap();
      onRecover(autoSaveData);
      show = false;
      // Don't clear localStorage yet - will be cleared after successful load
    }
  }

  function handleDismiss() {
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
    }
    clearLocalStorage();
    onDismiss();
    show = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  }
</script>

{#if show && autoSaveData}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    onkeydown={handleKeydown}
    role="presentation"
  >
    <!-- Modal -->
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <!-- Header with icon -->
      <div class="px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-600">
        <div class="flex items-center gap-3">
          <div class="text-4xl">💾</div>
          <div>
            <h2 id="recovery-title" class="text-xl font-bold text-white">
              Unsaved Work Found
            </h2>
            <p class="text-blue-100 text-sm mt-0.5">
              {formatAutoSaveTime(autoSaveData.timestamp)}
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-5">
        <p class="text-gray-700 mb-4">
          We found an auto-saved version of <strong>"{autoSaveData.storyTitle}"</strong> that wasn't explicitly saved.
        </p>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">What happened?</p>
              <p>Your browser may have closed unexpectedly, or you refreshed the page. Whisker automatically saves your work every 30 seconds to prevent data loss.</p>
            </div>
          </div>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Would you like to recover this version?
        </p>
      </div>

      <!-- Actions -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
        <button
          onclick={handleDismiss}
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Discard
        </button>
        <button
          onclick={handleRecover}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          Recover My Work
        </button>
      </div>
    </div>
  </div>
{/if}
