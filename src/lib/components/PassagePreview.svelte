<script lang="ts">
  import type { Passage } from '@whisker/core-ts';
  import { tagActions } from '../stores/tagStore';

  export let passage: Passage;
  export let x: number = 0;
  export let y: number = 0;
  export let show: boolean = false;

  // Calculate word count
  $: wordCount = passage.content.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Get first 100 characters of content for preview
  $: contentPreview = passage.content.length > 100
    ? passage.content.substring(0, 100) + '...'
    : passage.content || '(Empty passage)';

  // Position adjustment to keep tooltip on screen
  $: style = `left: ${x}px; top: ${y}px;`;
</script>

{#if show}
  <div
    class="fixed z-[100] pointer-events-none"
    style={style}
  >
    <div class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-4 max-w-sm animate-fade-in">
      <!-- Title -->
      <h4 class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <span class="truncate">{passage.title}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">#{passage.id.substring(0, 6)}</span>
      </h4>

      <!-- Content Preview -->
      <div class="text-xs text-gray-700 dark:text-gray-300 mb-3 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
        {contentPreview}
      </div>

      <!-- Tags -->
      {#if passage.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-3">
          {#each passage.tags.slice(0, 5) as tag}
            <span
              class="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
              style="background-color: {tagActions.getTagColor(tag)}"
            >
              {tag}
            </span>
          {/each}
          {#if passage.tags.length > 5}
            <span class="text-xs text-gray-500 dark:text-gray-400">+{passage.tags.length - 5}</span>
          {/if}
        </div>
      {/if}

      <!-- Stats -->
      <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div class="flex items-center gap-1">
          <span>📝</span>
          <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="flex items-center gap-1">
          <span>→</span>
          <span>{passage.choices.length} choice{passage.choices.length !== 1 ? 's' : ''}</span>
        </div>
        {#if passage.created}
          <div class="flex items-center gap-1">
            <span>🕒</span>
            <span>{new Date(passage.created).toLocaleDateString()}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.15s ease-out;
  }
</style>
