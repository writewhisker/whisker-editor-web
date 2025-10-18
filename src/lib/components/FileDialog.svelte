<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let title = 'Dialog';
  export let message = '';
  export let showInput = false;
  export let inputPlaceholder = '';
  export let inputValue = '';

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm', { value: inputValue });
    close();
  }

  function handleCancel() {
    dispatch('cancel');
    close();
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
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={handleCancel}>
    <div class="bg-white rounded-lg shadow-xl p-6 min-w-[400px]" on:click|stopPropagation>
      <h2 class="text-xl font-bold mb-4">{title}</h2>

      {#if message}
        <p class="mb-4 text-gray-700">{message}</p>
      {/if}

      {#if showInput}
        <input
          type="text"
          bind:value={inputValue}
          placeholder={inputPlaceholder}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          on:keydown={handleKeydown}
          autofocus
        />
      {/if}

      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
          on:click={handleCancel}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          on:click={handleConfirm}
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}
