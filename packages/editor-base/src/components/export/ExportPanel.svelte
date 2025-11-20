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
  import { currentStory } from '../../stores/storyStateStore';
  import { JSONExporter } from '../../export/formats/JSONExporter';
  import { HTMLExporter } from '../../export/formats/HTMLExporter';
  import { MarkdownExporter } from '../../export/formats/MarkdownExporter';
  import { TwineExporter } from '../../export/formats/TwineExporter';
  import { EPUBExporter } from '../../export/formats/EPUBExporter';

  export let show = false;

  const dispatch = createEventDispatcher();

  let selectedFormat: ExportFormat = $exportPreferences.lastFormat;
  let includeValidation = $exportPreferences.includeValidation;
  let includeMetrics = $exportPreferences.includeMetrics;
  let includeTestScenarios = $exportPreferences.includeTestScenarios;
  let prettyPrint = $exportPreferences.prettyPrint;
  let htmlTheme: 'light' | 'dark' | 'auto' = $exportPreferences.htmlTheme;
  let minifyHTML = $exportPreferences.minifyHTML;
  let customTheme = '';
  let language = 'en';
  let customFilename = '';

  // Preview state
  let showPreview = false;
  let isGeneratingPreview = false;
  let previewContent: string = '';
  let previewFormat: ExportFormat | null = null;
  let previewError: string | null = null;

  // Update default filename when story or format changes
  $: if ($currentStory) {
    const storyTitle = $currentStory.metadata.title.replace(/[^a-zA-Z0-9-_]/g, '_');
    const extensions: Record<ExportFormat, string> = {
      json: '.json',
      'whisker-core': '.json',
      html: '.html',
      'html-standalone': '.html',
      markdown: '.md',
      package: '.zip',
      epub: '.epub',
      twine: '.html',
      pdf: '.pdf'
    };
    customFilename = `${storyTitle}${extensions[selectedFormat]}`;
  }

  function close() {
    show = false;
  }

  function closePreview() {
    showPreview = false;
    previewContent = '';
    previewFormat = null;
    previewError = null;
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
      customTheme: customTheme || undefined,
      language: language || 'en',
      minifyHTML,
      filename: customFilename.trim() || undefined,
    };

    const success = await exportActions.exportStory($currentStory, selectedFormat, options);

    if (success) {
      close();
      dispatch('export', { format: selectedFormat });
    }
  }

  async function handlePreview(format: ExportFormat) {
    if (!$currentStory) {
      return;
    }

    isGeneratingPreview = true;
    previewError = null;
    previewFormat = format;
    showPreview = true;

    try {
      const options = {
        format,
        includeValidation,
        includeMetrics,
        includeTestScenarios,
        prettyPrint,
        theme: htmlTheme,
        customTheme: customTheme || undefined,
        language: language || 'en',
        minifyHTML,
      };

      // Get appropriate exporter
      let exporter;
      switch (format) {
        case 'json':
          exporter = new JSONExporter();
          break;
        case 'html':
          exporter = new HTMLExporter();
          break;
        case 'markdown':
          exporter = new MarkdownExporter();
          break;
        case 'twine':
          exporter = new TwineExporter();
          break;
        case 'epub':
          exporter = new EPUBExporter();
          break;
        default:
          throw new Error(`Preview not supported for format: ${format}`);
      }

      // Export story to get content
      const result = await exporter.export({
        story: $currentStory,
        options,
      });

      if (!result.success) {
        throw new Error(result.error || 'Preview generation failed');
      }

      // Handle content
      let content = result.content;
      if (content instanceof Blob) {
        // For binary formats like EPUB, read as text
        content = await content.text();
      }

      // Limit preview for large content (except HTML which renders in iframe)
      if (format !== 'html' && typeof content === 'string') {
        const lines = content.split('\n');
        if (lines.length > 500) {
          previewContent = lines.slice(0, 500).join('\n') + '\n\n... (truncated to 500 lines)';
        } else {
          previewContent = content;
        }
      } else {
        previewContent = content as string;
      }

      isGeneratingPreview = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      previewError = message;
      isGeneratingPreview = false;
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(previewContent);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  async function downloadPreview() {
    if (!previewFormat || !$currentStory) return;

    const options = {
      includeValidation,
      includeMetrics,
      includeTestScenarios,
      prettyPrint,
      theme: htmlTheme,
      customTheme: customTheme || undefined,
      language: language || 'en',
      minifyHTML,
      filename: customFilename.trim() || undefined,
    };

    await exportActions.exportStory($currentStory, previewFormat, options);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showPreview) {
        closePreview();
      } else {
        close();
      }
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
        <div class="grid grid-cols-4 gap-2">
          <div class="relative">
            <button
              class="w-full px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'json' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
              on:click={() => selectedFormat = 'json'}
            >
              <div class="font-semibold">JSON</div>
              <div class="text-xs text-gray-600">Complete data</div>
            </button>
            <button
              class="absolute top-1 right-1 p-1 text-xs text-blue-600 hover:text-blue-800 bg-white rounded border border-gray-300 hover:bg-gray-50"
              on:click|stopPropagation={() => handlePreview('json')}
              title="Preview JSON export"
            >
              👁
            </button>
          </div>
          <div class="relative">
            <button
              class="w-full px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'html' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
              on:click={() => selectedFormat = 'html'}
            >
              <div class="font-semibold">HTML</div>
              <div class="text-xs text-gray-600">Playable file</div>
            </button>
            <button
              class="absolute top-1 right-1 p-1 text-xs text-blue-600 hover:text-blue-800 bg-white rounded border border-gray-300 hover:bg-gray-50"
              on:click|stopPropagation={() => handlePreview('html')}
              title="Preview HTML export"
            >
              👁
            </button>
          </div>
          <div class="relative">
            <button
              class="w-full px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'epub' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
              on:click={() => selectedFormat = 'epub'}
            >
              <div class="font-semibold">EPUB</div>
              <div class="text-xs text-gray-600">E-reader</div>
            </button>
            <button
              class="absolute top-1 right-1 p-1 text-xs text-blue-600 hover:text-blue-800 bg-white rounded border border-gray-300 hover:bg-gray-50"
              on:click|stopPropagation={() => handlePreview('epub')}
              title="Preview EPUB export"
            >
              👁
            </button>
          </div>
          <div class="relative">
            <button
              class="w-full px-4 py-3 rounded border-2 transition-colors {selectedFormat === 'markdown' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
              on:click={() => selectedFormat = 'markdown'}
            >
              <div class="font-semibold">Markdown</div>
              <div class="text-xs text-gray-600">Documentation</div>
            </button>
            <button
              class="absolute top-1 right-1 p-1 text-xs text-blue-600 hover:text-blue-800 bg-white rounded border border-gray-300 hover:bg-gray-50"
              on:click|stopPropagation={() => handlePreview('markdown')}
              title="Preview Markdown export"
            >
              👁
            </button>
          </div>
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
              <label for="custom-theme" class="block mb-1">Custom Theme</label>
              <select id="custom-theme" bind:value={customTheme} class="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="">Default</option>
                <option value="dark">Dark</option>
                <option value="sepia">Sepia</option>
                <option value="forest">Forest</option>
                <option value="ocean">Ocean</option>
                <option value="midnight">Midnight</option>
                <option value="sunset">Sunset</option>
                <option value="highContrast">High Contrast</option>
                <option value="paper">Paper</option>
                <option value="cyberpunk">Cyberpunk</option>
              </select>
            </div>
            <div>
              <label for="html-theme" class="block mb-1">Base Theme (if no custom theme)</label>
              <select id="html-theme" bind:value={htmlTheme} class="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (system preference)</option>
              </select>
            </div>
            <div>
              <label for="language" class="block mb-1">Language</label>
              <select id="language" bind:value={language} class="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <label class="flex items-center">
              <input type="checkbox" bind:checked={minifyHTML} class="mr-2" />
              <span>Minify HTML output</span>
            </label>
          </div>
        {:else if selectedFormat === 'epub'}
          <div class="space-y-2">
            <div>
              <label for="epub-language" class="block mb-1">Language</label>
              <select id="epub-language" bind:value={language} class="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
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

<!-- Preview Modal -->
{#if showPreview}
  <div
    class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]"
    on:click={closePreview}
    on:keydown={(e) => e.key === 'Escape' && closePreview()}
    role="presentation"
  >
    <div
      class="bg-white rounded-lg shadow-2xl w-[90vw] h-[85vh] flex flex-col"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      tabindex="-1"
    >
      <!-- Preview Header -->
      <div class="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 id="preview-title" class="text-xl font-bold">
          {previewFormat?.toUpperCase()} Export Preview
        </h3>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            on:click={copyToClipboard}
            disabled={isGeneratingPreview || !!previewError || previewFormat === 'html'}
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            class="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
            on:click={downloadPreview}
            disabled={isGeneratingPreview || !!previewError}
          >
            Download
          </button>
          <button
            class="p-1.5 hover:bg-gray-100 rounded transition-colors"
            on:click={closePreview}
            aria-label="Close preview"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Preview Content -->
      <div class="flex-1 overflow-hidden p-4">
        {#if isGeneratingPreview}
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <svg class="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-gray-600">Generating preview...</p>
            </div>
          </div>
        {:else if previewError}
          <div class="h-full flex items-center justify-center">
            <div class="text-center max-w-md">
              <div class="text-red-500 text-4xl mb-4">⚠</div>
              <h4 class="text-lg font-semibold mb-2">Preview Error</h4>
              <p class="text-gray-600">{previewError}</p>
            </div>
          </div>
        {:else if previewFormat === 'html'}
          <!-- HTML Preview: Render in iframe -->
          <div class="h-full border border-gray-300 rounded bg-white">
            <iframe
              title="HTML Preview"
              srcdoc={previewContent}
              class="w-full h-full rounded"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          </div>
        {:else if previewFormat === 'json'}
          <!-- JSON Preview: Syntax highlighted -->
          <div class="h-full overflow-auto bg-gray-900 rounded p-4">
            <pre class="text-sm text-green-400 font-mono whitespace-pre-wrap break-words">{previewContent}</pre>
          </div>
        {:else if previewFormat === 'markdown'}
          <!-- Markdown Preview: Formatted with basic styling -->
          <div class="h-full overflow-auto bg-white border border-gray-300 rounded">
            <div class="p-6">
              <div class="prose prose-sm max-w-none">
                <pre class="whitespace-pre-wrap break-words font-sans text-gray-800">{previewContent}</pre>
              </div>
            </div>
          </div>
        {:else}
          <!-- Other formats: Plain text -->
          <div class="h-full overflow-auto bg-gray-50 rounded p-4 border border-gray-300">
            <pre class="text-sm font-mono whitespace-pre-wrap break-words">{previewContent}</pre>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Additional custom styles if needed */
</style>
