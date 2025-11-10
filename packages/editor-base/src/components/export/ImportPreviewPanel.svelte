<script lang="ts">
  import type { ImportResult } from '../../import/types';
  import type { Passage } from '@whisker/core-ts';

  export let result: ImportResult;
  export let onConfirm: () => void;
  export let onCancel: () => void;

  // Expand/collapse states
  let showWarnings = false;
  let showLossReport = true;
  let showPassageSamples = false;

  // Get sample passages (first 3)
  let samplePassages: Passage[] = [];
  $: samplePassages = result.story
    ? Array.from(result.story.passages.values()).slice(0, 3)
    : [];

  // Format quality percentage
  $: qualityPercent = result.lossReport?.conversionQuality
    ? Math.round(result.lossReport.conversionQuality * 100)
    : 100;

  // Quality color
  $: qualityColor = qualityPercent >= 80 ? 'text-green-600' :
                    qualityPercent >= 60 ? 'text-yellow-600' :
                    'text-red-600';

  // Count by severity
  $: criticalCount = result.lossReport?.critical.length || 0;
  $: warningCount = result.lossReport?.warnings.length || 0;
  $: infoCount = result.lossReport?.info.length || 0;
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="border-b pb-3">
    <h3 class="text-lg font-semibold">Import Preview</h3>
    <p class="text-sm text-gray-600">Review the import before confirming</p>
  </div>

  <!-- Story Metadata -->
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h4 class="font-semibold mb-2">Story Information</h4>
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span class="text-gray-600">Title:</span>
        <span class="ml-2 font-medium">{result.story?.metadata.title || 'Untitled'}</span>
      </div>
      <div>
        <span class="text-gray-600">Author:</span>
        <span class="ml-2">{result.story?.metadata.author || 'Unknown'}</span>
      </div>
      <div>
        <span class="text-gray-600">Passages:</span>
        <span class="ml-2 font-medium">{result.passageCount || 0}</span>
      </div>
      <div>
        <span class="text-gray-600">Variables:</span>
        <span class="ml-2">{result.variableCount || 0}</span>
      </div>
    </div>
  </div>

  <!-- Conversion Quality -->
  {#if result.lossReport}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold">Conversion Quality</h4>
        <span class={`text-2xl font-bold ${qualityColor}`}>
          {qualityPercent}%
        </span>
      </div>

      <!-- Quality Bar -->
      <div class="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          class="h-3 rounded-full transition-all {qualityPercent >= 80 ? 'bg-green-500' : qualityPercent >= 60 ? 'bg-yellow-500' : 'bg-red-500'}"
          style="width: {qualityPercent}%"
        ></div>
      </div>

      <!-- Issue Summary -->
      <div class="flex gap-4 text-sm">
        {#if criticalCount > 0}
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 bg-red-500 rounded-full"></span>
            <span class="font-medium">{criticalCount}</span>
            <span class="text-gray-600">Critical</span>
          </div>
        {/if}
        {#if warningCount > 0}
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span class="font-medium">{warningCount}</span>
            <span class="text-gray-600">Warnings</span>
          </div>
        {/if}
        {#if infoCount > 0}
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span class="font-medium">{infoCount}</span>
            <span class="text-gray-600">Info</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Loss Report Details -->
  {#if result.lossReport && result.lossReport.totalIssues > 0}
    <div class="border border-gray-200 rounded-lg">
      <button
        class="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        on:click={() => showLossReport = !showLossReport}
      >
        <span class="font-semibold">
          Conversion Issues ({result.lossReport.totalIssues})
        </span>
        <span class="transform transition-transform {showLossReport ? 'rotate-180' : ''}">
          ▼
        </span>
      </button>

      {#if showLossReport}
        <div class="border-t border-gray-200 p-3 max-h-64 overflow-y-auto space-y-2">
          <!-- Critical Issues -->
          {#if criticalCount > 0}
            <div>
              <h5 class="text-sm font-semibold text-red-600 mb-2">Critical Issues</h5>
              {#each result.lossReport.critical as issue}
                <div class="bg-red-50 border-l-4 border-red-500 p-2 mb-2 text-sm">
                  <div class="font-medium">{issue.feature}</div>
                  <div class="text-gray-700">{issue.message}</div>
                  {#if issue.passageName}
                    <div class="text-xs text-gray-600 mt-1">
                      In passage: <span class="font-medium">{issue.passageName}</span>
                    </div>
                  {/if}
                  {#if issue.suggestion}
                    <div class="text-xs text-gray-600 mt-1 italic">
                      💡 {issue.suggestion}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          <!-- Warnings -->
          {#if warningCount > 0}
            <div>
              <h5 class="text-sm font-semibold text-yellow-600 mb-2">Warnings</h5>
              {#each result.lossReport.warnings as issue}
                <div class="bg-yellow-50 border-l-4 border-yellow-500 p-2 mb-2 text-sm">
                  <div class="font-medium">{issue.feature}</div>
                  <div class="text-gray-700">{issue.message}</div>
                  {#if issue.passageName}
                    <div class="text-xs text-gray-600 mt-1">
                      In passage: <span class="font-medium">{issue.passageName}</span>
                    </div>
                  {/if}
                  {#if issue.suggestion}
                    <div class="text-xs text-gray-600 mt-1 italic">
                      💡 {issue.suggestion}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          <!-- Info -->
          {#if infoCount > 0}
            <div>
              <h5 class="text-sm font-semibold text-blue-600 mb-2">Information</h5>
              {#each result.lossReport.info as issue}
                <div class="bg-blue-50 border-l-4 border-blue-500 p-2 mb-2 text-sm">
                  <div class="font-medium">{issue.feature}</div>
                  <div class="text-gray-700">{issue.message}</div>
                  {#if issue.suggestion}
                    <div class="text-xs text-gray-600 mt-1 italic">
                      💡 {issue.suggestion}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- General Warnings -->
  {#if result.warnings && result.warnings.length > 0}
    <div class="border border-gray-200 rounded-lg">
      <button
        class="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        on:click={() => showWarnings = !showWarnings}
      >
        <span class="font-semibold">
          General Warnings ({result.warnings.length})
        </span>
        <span class="transform transition-transform {showWarnings ? 'rotate-180' : ''}">
          ▼
        </span>
      </button>

      {#if showWarnings}
        <div class="border-t border-gray-200 p-3 space-y-1">
          {#each result.warnings as warning}
            <div class="text-sm text-gray-700">• {warning}</div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Passage Samples -->
  {#if samplePassages.length > 0}
    <div class="border border-gray-200 rounded-lg">
      <button
        class="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        on:click={() => showPassageSamples = !showPassageSamples}
      >
        <span class="font-semibold">
          Sample Passages ({samplePassages.length} of {result.passageCount})
        </span>
        <span class="transform transition-transform {showPassageSamples ? 'rotate-180' : ''}">
          ▼
        </span>
      </button>

      {#if showPassageSamples}
        <div class="border-t border-gray-200 p-3 space-y-3 max-h-96 overflow-y-auto">
          {#each samplePassages as passage}
            <div class="bg-gray-50 rounded p-3">
              <div class="font-medium text-sm mb-1">{passage.title}</div>
              <div class="text-xs text-gray-600 mb-2">
                {passage.choices.length} choice{passage.choices.length !== 1 ? 's' : ''}
                {#if passage.tags.length > 0}
                  • Tags: {passage.tags.join(', ')}
                {/if}
              </div>
              <div class="text-sm text-gray-700 font-mono bg-white p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
                {passage.content.substring(0, 200)}{passage.content.length > 200 ? '...' : ''}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Action Buttons -->
  <div class="flex justify-between items-center pt-4 border-t">
    <button
      class="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
      on:click={onCancel}
    >
      ← Back
    </button>
    <button
      class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
      on:click={onConfirm}
    >
      Confirm Import
    </button>
  </div>
</div>

<style>
  /* Custom scrollbar for better UX */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
