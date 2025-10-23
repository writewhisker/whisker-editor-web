<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    importHistory,
    isImporting,
    importError,
    recentImports,
    exportActions,
  } from '../../stores/exportStore';

  export let show = false;

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;

  function close() {
    show = false;
    selectedFile = null;
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      selectedFile = event.dataTransfer.files[0];
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async function handleImport() {
    if (!selectedFile) {
      return;
    }

    const story = await exportActions.importStory(selectedFile);

    if (story) {
      dispatch('import', { story });
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={close}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      class="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      tabindex="-1"
    >
      <h2 id="import-title" class="text-2xl font-bold mb-6">Import Story</h2>

      {#if $importError}
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p class="font-semibold">Import Error:</p>
          <p>{$importError}</p>
        </div>
      {/if}

      <!-- File Upload Area -->
      <div class="mb-6">
        <div class="block text-sm font-semibold mb-2">Select File</div>

        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          on:drop={handleDrop}
          on:dragover={handleDragOver}
          on:click={() => fileInput.click()}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } }}
          role="button"
          tabindex="0"
          aria-label="Drop file here or click to browse"
        >
          {#if selectedFile}
            <div class="text-blue-600 font-medium mb-2">
              📄 {selectedFile.name}
            </div>
            <div class="text-sm text-gray-600">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          {:else}
            <div class="text-gray-500 mb-2">
              <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="font-medium">Drop a file here or click to browse</p>
              <p class="text-sm mt-1">Supports: .json files</p>
            </div>
          {/if}
        </div>

        <input
          type="file"
          bind:this={fileInput}
          on:change={handleFileSelect}
          accept=".json,application/json"
          class="hidden"
        />
      </div>

      <!-- Import Options -->
      <div class="mb-6">
        <p class="text-sm text-gray-600">
          The imported story will replace the current story. Make sure you've saved your work before importing.
        </p>
      </div>

      <!-- Recent Imports -->
      {#if $recentImports.length > 0}
        <div class="mb-6">
          <div class="block text-sm font-semibold mb-2">Recent Imports</div>
          <div class="bg-gray-50 rounded border border-gray-200 max-h-[150px] overflow-y-auto">
            {#each $recentImports.slice(0, 5) as entry}
              <div class="px-3 py-2 border-b border-gray-200 last:border-b-0">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{entry.storyTitle}</div>
                    <div class="text-xs text-gray-600">
                      {entry.filename} • {entry.passageCount} passages • {formatDate(entry.timestamp)}
                    </div>
                  </div>
                  <div class="ml-2">
                    {#if entry.success}
                      <span class="text-green-600 text-xs">✓</span>
                    {:else}
                      <span class="text-red-600 text-xs" title={entry.error}>✗</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex justify-between items-center">
        <button
          class="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          on:click={() => exportActions.clearImportHistory()}
          disabled={$recentImports.length === 0}
        >
          Clear History
        </button>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
            on:click={close}
            disabled={$isImporting}
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            on:click={handleImport}
            disabled={$isImporting || !selectedFile}
          >
            {#if $isImporting}
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing...
            {:else}
              Import
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Additional custom styles if needed */
</style>
