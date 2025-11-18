<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Story } from '@writewhisker/core-ts';
  import {
    compareStories,
    type StoryComparison,
    type PassageDiff
  } from '../../utils/storyComparison';

  export let leftStory: Story | null = null;
  export let rightStory: Story | null = null;
  export let leftLabel = 'Current Version';
  export let rightLabel = 'Imported Version';
  export let leftDate: Date | null = null;
  export let rightDate: Date | null = null;

  const dispatch = createEventDispatcher();

  let comparison: StoryComparison | null = null;
  let selectedPassages: Set<string> = new Set();
  let showMetadataDetails = false;
  let showStatistics = true;
  let showPassageList = true;
  let filterMode: 'all' | 'added' | 'removed' | 'modified' = 'all';

  $: {
    if (leftStory && rightStory) {
      comparison = compareStories(leftStory, rightStory);
    } else {
      comparison = null;
    }
  }

  $: filteredPassages = filterPassages(comparison?.passageDiffs || [], filterMode);

  function filterPassages(diffs: PassageDiff[], mode: typeof filterMode): PassageDiff[] {
    if (mode === 'all') return diffs;
    return diffs.filter(diff => diff.status === mode);
  }

  function formatDate(date: Date | null): string {
    if (!date) return 'Unknown';
    return date.toLocaleString();
  }

  function formatWordCount(count: number): string {
    return count.toLocaleString();
  }

  function togglePassageSelection(passageId: string) {
    const newSelection = new Set(selectedPassages);
    if (newSelection.has(passageId)) {
      newSelection.delete(passageId);
    } else {
      newSelection.add(passageId);
    }
    selectedPassages = newSelection;
  }

  function selectAllPassages(status: 'added' | 'removed' | 'modified') {
    const passagesToSelect = (comparison?.passageDiffs || [])
      .filter(diff => diff.status === status)
      .map(diff => diff.passageId);

    selectedPassages = new Set([...selectedPassages, ...passagesToSelect]);
  }

  function deselectAllPassages() {
    selectedPassages = new Set();
  }

  function acceptAllFromLeft() {
    dispatch('accept', {
      source: 'left',
      story: leftStory,
      selectedPassages: []
    });
  }

  function acceptAllFromRight() {
    dispatch('accept', {
      source: 'right',
      story: rightStory,
      selectedPassages: []
    });
  }

  function acceptSelected(source: 'left' | 'right') {
    dispatch('accept', {
      source,
      story: source === 'left' ? leftStory : rightStory,
      selectedPassages: Array.from(selectedPassages)
    });
  }

  function getStatusColor(status: 'added' | 'removed' | 'modified' | 'unchanged'): string {
    switch (status) {
      case 'added': return 'bg-green-100 text-green-800 border-green-300';
      case 'removed': return 'bg-red-100 text-red-800 border-red-300';
      case 'modified': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  function getStatusIcon(status: 'added' | 'removed' | 'modified' | 'unchanged'): string {
    switch (status) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      default: return '=';
    }
  }
</script>

<div class="story-comparison flex flex-col h-full bg-white dark:bg-gray-900">
  {#if !comparison}
    <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
      <p>No stories to compare</p>
    </div>
  {:else}
    <!-- Header with Actions -->
    <div class="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Story Comparison
        </h2>
        <div class="flex gap-2">
          <button
            on:click={acceptAllFromLeft}
            class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Accept all changes from {leftLabel}"
          >
            Accept All from Left
          </button>
          <button
            on:click={acceptAllFromRight}
            class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            title="Accept all changes from {rightLabel}"
          >
            Accept All from Right
          </button>
          {#if selectedPassages.size > 0}
            <button
              on:click={() => acceptSelected('left')}
              class="px-3 py-1.5 text-sm bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
            >
              Accept Selected from Left
            </button>
            <button
              on:click={() => acceptSelected('right')}
              class="px-3 py-1.5 text-sm bg-green-400 text-white rounded hover:bg-green-500 transition-colors"
            >
              Accept Selected from Right
            </button>
          {/if}
        </div>
      </div>

      <!-- Version Headers -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg p-3 border-2 border-blue-300 dark:border-blue-600">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">{leftLabel}</h3>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div>Modified: {formatDate(leftDate)}</div>
            {#if leftStory}
              <div>Passages: {leftStory.passages.size}</div>
              <div>Variables: {leftStory.variables.size}</div>
            {/if}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-900 rounded-lg p-3 border-2 border-green-300 dark:border-green-600">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">{rightLabel}</h3>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div>Modified: {formatDate(rightDate)}</div>
            {#if rightStory}
              <div>Passages: {rightStory.passages.size}</div>
              <div>Variables: {rightStory.variables.size}</div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Metadata Comparison -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <button
          on:click={() => showMetadataDetails = !showMetadataDetails}
          class="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="transform transition-transform {showMetadataDetails ? 'rotate-90' : ''}">
              ▶
            </span>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Metadata Comparison</h3>
            {#if comparison.metadataChanged}
              <span class="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Changed
              </span>
            {/if}
          </div>
        </button>

        {#if showMetadataDetails}
          <div class="px-4 pb-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Left</h4>
                <div class="space-y-1 text-sm">
                  <div><span class="font-medium">Title:</span> {leftStory?.metadata.title || 'N/A'}</div>
                  <div><span class="font-medium">Author:</span> {leftStory?.metadata.author || 'N/A'}</div>
                  <div><span class="font-medium">Version:</span> {leftStory?.metadata.version || 'N/A'}</div>
                  <div><span class="font-medium">IFID:</span> <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{leftStory?.metadata.ifid || 'N/A'}</code></div>
                  {#if leftStory?.metadata.description}
                    <div><span class="font-medium">Description:</span> {leftStory.metadata.description}</div>
                  {/if}
                </div>
              </div>
              <div>
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Right</h4>
                <div class="space-y-1 text-sm">
                  <div><span class="font-medium">Title:</span> {rightStory?.metadata.title || 'N/A'}</div>
                  <div><span class="font-medium">Author:</span> {rightStory?.metadata.author || 'N/A'}</div>
                  <div><span class="font-medium">Version:</span> {rightStory?.metadata.version || 'N/A'}</div>
                  <div><span class="font-medium">IFID:</span> <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{rightStory?.metadata.ifid || 'N/A'}</code></div>
                  {#if rightStory?.metadata.description}
                    <div><span class="font-medium">Description:</span> {rightStory.metadata.description}</div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Statistics -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <button
          on:click={() => showStatistics = !showStatistics}
          class="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="transform transition-transform {showStatistics ? 'rotate-90' : ''}">
              ▶
            </span>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Statistics</h3>
          </div>
        </button>

        {#if showStatistics}
          <div class="px-4 pb-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Left</h4>
                <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-1 text-sm">
                  <div>Passages: <span class="font-semibold">{comparison.leftStats.passageCount}</span></div>
                  <div>Variables: <span class="font-semibold">{comparison.leftStats.variableCount}</span></div>
                  <div>Total Words: <span class="font-semibold">{formatWordCount(comparison.leftStats.totalWords)}</span></div>
                  <div>Total Choices: <span class="font-semibold">{comparison.leftStats.totalChoices}</span></div>
                </div>
              </div>
              <div class="space-y-2">
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Right</h4>
                <div class="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-1 text-sm">
                  <div>Passages: <span class="font-semibold">{comparison.rightStats.passageCount}</span></div>
                  <div>Variables: <span class="font-semibold">{comparison.rightStats.variableCount}</span></div>
                  <div>Total Words: <span class="font-semibold">{formatWordCount(comparison.rightStats.totalWords)}</span></div>
                  <div>Total Choices: <span class="font-semibold">{comparison.rightStats.totalChoices}</span></div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Passage Differences -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="transform rotate-90">▶</span>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">Passage Differences</h3>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                ({comparison.passageDiffs.length} total)
              </span>
            </div>

            <div class="flex gap-2">
              <button
                on:click={deselectAllPassages}
                class="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                disabled={selectedPassages.size === 0}
              >
                Deselect All
              </button>
            </div>
          </div>

          <!-- Filter Buttons -->
          <div class="flex gap-2 mb-4">
            <button
              on:click={() => filterMode = 'all'}
              class="px-3 py-1 text-sm rounded {filterMode === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
            >
              All ({comparison.passageDiffs.length})
            </button>
            <button
              on:click={() => filterMode = 'added'}
              class="px-3 py-1 text-sm rounded {filterMode === 'added' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}"
            >
              Added ({typeof comparison.summary === 'object' ? comparison.summary.added : 0})
            </button>
            <button
              on:click={() => filterMode = 'removed'}
              class="px-3 py-1 text-sm rounded {filterMode === 'removed' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}"
            >
              Removed ({typeof comparison.summary === 'object' ? comparison.summary.removed : 0})
            </button>
            <button
              on:click={() => filterMode = 'modified'}
              class="px-3 py-1 text-sm rounded {filterMode === 'modified' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}"
            >
              Modified ({typeof comparison.summary === 'object' ? comparison.summary.modified : 0})
            </button>
          </div>

          <!-- Passage List -->
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#if filteredPassages.length === 0}
              <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                No {filterMode === 'all' ? '' : filterMode} passages
              </div>
            {:else}
              {#each filteredPassages as diff (diff.passageId)}
                <div class="border rounded-lg overflow-hidden {getStatusColor(diff.status)}">
                  <div class="p-3">
                    <div class="flex items-start gap-3">
                      <label class="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPassages.has(diff.passageId)}
                          on:change={() => togglePassageSelection(diff.passageId)}
                          class="mr-2"
                        />
                      </label>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-mono text-xs font-bold w-5 text-center">
                            {getStatusIcon(diff.status)}
                          </span>
                          <span class="font-semibold truncate">{diff.title}</span>
                          {#if diff.status === 'modified'}
                            <span class="text-xs">
                              ({diff.changes?.length || 0} change{(diff.changes?.length || 0) !== 1 ? 's' : ''})
                            </span>
                          {/if}
                        </div>

                        {#if diff.status === 'modified' && diff.changes}
                          <div class="text-xs space-y-0.5 mt-2">
                            {#each diff.changes as change}
                              <div class="flex items-start gap-1">
                                <span class="text-gray-600 dark:text-gray-400">•</span>
                                <span>{change}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}

                        {#if diff.status === 'added' || diff.status === 'removed'}
                          <div class="text-xs mt-1">
                            <div>Choices: {diff.status === 'added' ? diff.rightChoiceCount || 0 : diff.leftChoiceCount || 0}</div>
                            <div>Words: {diff.status === 'added' ? diff.rightWordCount || 0 : diff.leftWordCount || 0}</div>
                          </div>
                        {/if}
                      </div>

                      {#if diff.status !== 'unchanged'}
                        <button
                          on:click={() => selectAllPassages(diff.status as 'modified' | 'added' | 'removed')}
                          class="text-xs px-2 py-1 rounded hover:bg-black hover:bg-opacity-10"
                          title="Select all {diff.status} passages"
                        >
                          Select all {diff.status}
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- Variable Differences -->
      {#if comparison.variableDiffs.length > 0}
        <div class="p-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Variable Differences ({comparison.variableDiffs.length})
          </h3>
          <div class="space-y-2">
            {#each comparison.variableDiffs as varDiff}
              <div class="border rounded p-2 text-sm {getStatusColor(varDiff.status)}">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold w-5">
                    {getStatusIcon(varDiff.status)}
                  </span>
                  <span class="font-medium">{varDiff.name}</span>
                  {#if varDiff.status === 'modified'}
                    <span class="text-xs">
                      ({varDiff.changes?.join(', ')})
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer Summary -->
    <div class="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center justify-between text-sm">
        <div class="flex gap-4">
          <span class="text-green-600 dark:text-green-400 font-medium">
            +{typeof comparison.summary === 'object' ? comparison.summary.added : 0} added
          </span>
          <span class="text-red-600 dark:text-red-400 font-medium">
            -{typeof comparison.summary === 'object' ? comparison.summary.removed : 0} removed
          </span>
          <span class="text-yellow-600 dark:text-yellow-400 font-medium">
            ~{typeof comparison.summary === 'object' ? comparison.summary.modified : 0} modified
          </span>
        </div>
        {#if selectedPassages.size > 0}
          <div class="text-gray-600 dark:text-gray-400">
            {selectedPassages.size} passage{selectedPassages.size !== 1 ? 's' : ''} selected
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .story-comparison {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .dark .overflow-y-auto::-webkit-scrollbar-track {
    background: #374151;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .dark .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #6b7280;
  }

  .dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
</style>
