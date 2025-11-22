<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;

  let searchTerm = '';
  let replaceTerm = '';
  let caseSensitive = false;
  let matchWholeWord = false;
  let searchIn: 'content' | 'titles' | 'both' = 'content';

  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;
  let searchInputElement: HTMLInputElement;

  const dispatch = createEventDispatcher();

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
    // Auto-focus search input when dialog opens
    setTimeout(() => searchInputElement?.focus(), 0);
  } else if (cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFind();
    }
  }

  function handleFind() {
    dispatch('find', {
      searchTerm,
      caseSensitive,
      matchWholeWord,
      searchIn
    });
  }

  function handleReplace() {
    dispatch('replace', {
      searchTerm,
      replaceTerm,
      caseSensitive,
      matchWholeWord,
      searchIn
    });
  }

  function handleReplaceAll() {
    dispatch('replaceAll', {
      searchTerm,
      replaceTerm,
      caseSensitive,
      matchWholeWord,
      searchIn
    });
  }

  function handleClose() {
    show = false;
    dispatch('close');
  }

  onMount(() => {
    return () => {
      if (cleanupFocusTrap) {
        cleanupFocusTrap();
      }
    };
  });
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog" tabindex="-1"
    aria-labelledby="find-replace-title"
    aria-modal="true"
    on:click={handleClose}
    on:keydown={handleKeydown}
  >
    <div
      bind:this={dialogElement}
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h2 id="find-replace-title" class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Find & Replace
        </h2>
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          on:click={handleClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>

      <!-- Search Input -->
      <div class="mb-4">
        <label for="search-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Find
        </label>
        <input
          id="search-input"
          bind:this={searchInputElement}
          bind:value={searchTerm}
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search for..."
        />
      </div>

      <!-- Replace Input -->
      <div class="mb-4">
        <label for="replace-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Replace with
        </label>
        <input
          id="replace-input"
          bind:value={replaceTerm}
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Replace with..."
        />
      </div>

      <!-- Options -->
      <div class="mb-6 space-y-3">
        <div class="flex items-center gap-2">
          <input
            id="case-sensitive"
            type="checkbox"
            bind:checked={caseSensitive}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="case-sensitive" class="text-sm text-gray-700 dark:text-gray-300">
            Match case
          </label>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="whole-word"
            type="checkbox"
            bind:checked={matchWholeWord}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="whole-word" class="text-sm text-gray-700 dark:text-gray-300">
            Match whole word
          </label>
        </div>

        <div class="space-y-1">
          <div class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search in
          </div>
          <div class="flex gap-4">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={searchIn}
                value="content"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Content</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={searchIn}
                value="titles"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Titles</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={searchIn}
                value="both"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Both</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleFind}
          disabled={!searchTerm.trim()}
        >
          Find
        </button>
        <button
          class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleReplace}
          disabled={!searchTerm.trim()}
        >
          Replace
        </button>
        <button
          class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleReplaceAll}
          disabled={!searchTerm.trim()}
        >
          Replace All
        </button>
      </div>

      <!-- Info Text -->
      <p class="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Press Enter to find, Esc to close
      </p>
    </div>
  </div>
{/if}
