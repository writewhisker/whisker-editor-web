<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ExportFormat } from '../../export/types';
  import {
    exportPreferences,
    exportHistory,
    isExporting,
    exportError,
    recentExports,
    exportActions,
  } from '../../stores/exportStore';
  import { currentStory } from '../../stores/projectStore';

  export let show = false;

  const dispatch = createEventDispatcher();

  let selectedFormat: ExportFormat = $exportPreferences.lastFormat;
  let includeValidation = $exportPreferences.includeValidation;
  let includeMetrics = $exportPreferences.includeMetrics;
  let includeTestScenarios = $exportPreferences.includeTestScenarios;
  let prettyPrint = $exportPreferences.prettyPrint;
  let htmlTheme: 'light' | 'dark' | 'auto' = $exportPreferences.htmlTheme;
  let minifyHTML = $exportPreferences.minifyHTML;
  let customFilename = '';

  // Update default filename when story or format changes
  $: if ($currentStory) {
    const storyTitle = $currentStory.metadata.title.replace(/[^a-zA-Z0-9-_]/g, '_');
    const extensions = { json: '.json', html: '.html', markdown: '.md' };
    customFilename = `${storyTitle}${extensions[selectedFormat]}`;
  }

  function close() {
    show = false;
  }

  async function handleExport() {
    if (!$currentStory) {
      return;
    }

    const options = {
      includeValidation,
      includeMetrics,
      includeTestScenarios,
      prettyPrint,
      theme: htmlTheme,
      minifyHTML,
      filename: customFilename.trim() || undefined,
    };

    const success = await exportActions.exportStory($currentStory, selectedFormat, options);

    if (success) {
      close();
      dispatch('export', { format: selectedFormat });
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

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      aria-labelledby="export-title"
      tabindex="-1"
    >
      <h2 id="export-title" class="text-2xl font-bold mb-6">Export Story</h2>

      {#if $exportError}
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p class="font-semibold">Export Error:</p>
          <p>{$exportError}</p>
        </div>
      {/if}

      <!-- Format Selection -->
      <div class="mb-6">
        <div class="block text-sm font-semibold mb-2">Export Format</div>
        <div class="grid grid-cols-3 gap-2">
          <button
            class="px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'json' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
            on:click={() => selectedFormat = 'json'}
          >
            <div class="font-semibold">JSON</div>
            <div class="text-xs text-gray-600">Complete data</div>
          </button>
          <button
            class="px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'html' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
            on:click={() => selectedFormat = 'html'}
          >
            <div class="font-semibold">HTML</div>
            <div class="text-xs text-gray-600">Playable file</div>
          </button>
          <button
            class="px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'markdown' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
            on:click={() => selectedFormat = 'markdown'}
          >
            <div class="font-semibold">Markdown</div>
            <div class="text-xs text-gray-600">Documentation</div>
          </button>
        </div>
      </div>

      <!-- Filename -->
      <div class="mb-6">
        <label for="export-filename" class="block text-sm font-semibold mb-2">
          Filename
        </label>
        <input
          id="export-filename"
          type="text"
          bind:value={customFilename}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter filename..."
        />
        <div class="mt-1 text-xs text-gray-600">
          File will be saved as: <span class="font-mono">{customFilename || 'story.export'}</span>
        </div>
      </div>

      <!-- Export Options -->
      <div class="mb-6">
        <div class="block text-sm font-semibold mb-3">Export Options</div>

        {#if selectedFormat === 'json'}
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" bind:checked={prettyPrint} class="mr-2" />
              <span>Pretty print JSON</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={includeValidation} class="mr-2" />
              <span>Include validation results</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={includeMetrics} class="mr-2" />
              <span>Include quality metrics</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={includeTestScenarios} class="mr-2" />
              <span>Include test scenarios</span>
            </label>
          </div>
        {:else if selectedFormat === 'html'}
          <div class="space-y-2">
            <div>
              <label for="html-theme" class="block mb-1">Theme</label>
              <select id="html-theme" bind:value={htmlTheme} class="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (system preference)</option>
              </select>
            </div>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={minifyHTML} class="mr-2" />
              <span>Minify HTML output</span>
            </label>
          </div>
        {:else if selectedFormat === 'markdown'}
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" bind:checked={includeValidation} class="mr-2" />
              <span>Include validation summary</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={includeMetrics} class="mr-2" />
              <span>Include quality metrics</span>
            </label>
          </div>
        {/if}
      </div>

      <!-- Recent Exports -->
      {#if $recentExports.length > 0}
        <div class="mb-6">
          <div class="block text-sm font-semibold mb-2">Recent Exports</div>
          <div class="bg-gray-50 rounded border border-gray-200 max-h-[150px] overflow-y-auto">
            {#each $recentExports.slice(0, 5) as entry}
              <div class="px-3 py-2 border-b border-gray-200 last:border-b-0">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{entry.storyTitle}</div>
                    <div class="text-xs text-gray-600">
                      {entry.format.toUpperCase()} • {formatSize(entry.size)} • {formatDate(entry.timestamp)}
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
          on:click={() => exportActions.clearExportHistory()}
          disabled={$recentExports.length === 0}
        >
          Clear History
        </button>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
            on:click={close}
            disabled={$isExporting}
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            on:click={handleExport}
            disabled={$isExporting || !$currentStory}
          >
            {#if $isExporting}
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            {:else}
              Export
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
