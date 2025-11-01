<script lang="ts">
  import { currentStory, passageList } from '../stores/projectStore';
  import { viewPreferencesActions } from '../stores/viewPreferencesStore';
  import { derived } from 'svelte/store';

  // Control widget visibility
  export let show = true;

  // Control widget expansion state
  let expanded = false;

  // Calculate basic statistics
  const stats = derived([currentStory, passageList], ([$story, $passages]) => {
    if (!$story || $passages.length === 0) return null;

    // Calculate word count
    const totalWords = $passages.reduce((sum, p) => {
      const words = p.content.trim().split(/\s+/).filter(w => w.length > 0).length;
      return sum + words;
    }, 0);

    // Calculate choice count
    const totalChoices = $passages.reduce((sum, p) => sum + p.choices.length, 0);

    return {
      passages: $passages.length,
      words: totalWords,
      choices: totalChoices,
    };
  });

  function toggleExpanded() {
    expanded = !expanded;
  }

  function openFullPanel() {
    viewPreferencesActions.setPanelVisibility({ statistics: true });
  }
</script>

{#if show && $stats}
  <div
    class="fixed top-20 right-4 z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transition-all duration-200"
    class:w-64={expanded}
    class:w-auto={!expanded}
    role="region"
    aria-label="Story statistics widget"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1 text-left"
        on:click={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse statistics' : 'Expand statistics'}
      >
        <span class="text-base">📊</span>
        <span>Stats</span>
        <svg
          class="w-3 h-3 transition-transform ml-auto"
          class:rotate-180={expanded}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <button
        type="button"
        class="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        on:click={() => show = false}
        aria-label="Close statistics widget"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    {#if expanded}
      <div class="p-3 space-y-2">
        <!-- Statistics Grid -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">{$stats.passages}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Passages</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 rounded p-2">
            <div class="text-lg font-bold text-green-600 dark:text-green-400">
              {$stats.words > 1000 ? `${($stats.words / 1000).toFixed(1)}k` : $stats.words}
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Words</div>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
            <div class="text-lg font-bold text-orange-600 dark:text-orange-400">{$stats.choices}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Choices</div>
          </div>
        </div>

        <!-- View Full Details Button -->
        <button
          type="button"
          class="w-full px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium"
          on:click={openFullPanel}
        >
          View Full Statistics
        </button>
      </div>
    {:else}
      <!-- Compact View -->
      <div class="px-3 py-2 flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
        <span class="flex items-center gap-1">
          <span class="font-semibold text-blue-600 dark:text-blue-400">{$stats.passages}</span>
          <span class="text-gray-500 dark:text-gray-400">P</span>
        </span>
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <span class="flex items-center gap-1">
          <span class="font-semibold text-green-600 dark:text-green-400">
            {$stats.words > 1000 ? `${($stats.words / 1000).toFixed(1)}k` : $stats.words}
          </span>
          <span class="text-gray-500 dark:text-gray-400">W</span>
        </span>
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <span class="flex items-center gap-1">
          <span class="font-semibold text-orange-600 dark:text-orange-400">{$stats.choices}</span>
          <span class="text-gray-500 dark:text-gray-400">C</span>
        </span>
      </div>
    {/if}
  </div>
{/if}
