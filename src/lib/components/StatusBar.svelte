<script lang="ts">
  import { currentStory, passageList, variableList } from '../stores/storyStateStore';
  import { selectedPassageId } from '../stores/selectionStore';
  import { currentFilePath } from '../stores/projectMetadataStore';
  import { validationResult } from '../stores/validationStore';
  import { canUndo, canRedo, historyCount } from '../stores/historyStore';
  import { derived } from 'svelte/store';

  // Derived stats
  const stats = derived([currentStory, passageList], ([$story, $passages]) => {
    if (!$story) return null;

    // Count total words
    const wordCount = $passages.reduce((total, passage) => {
      const words = passage.content.trim().split(/\s+/).filter(w => w.length > 0).length;
      return total + words;
    }, 0);

    // Count total choices
    const choiceCount = $passages.reduce((total, passage) => {
      return total + passage.choices.length;
    }, 0);

    return { wordCount, choiceCount };
  });

  // Validation stats
  const validationStats = derived(validationResult, ($result) => {
    if (!$result) return { errors: 0, warnings: 0, info: 0 };

    const errors = $result.issues.filter(i => i.severity === 'error').length;
    const warnings = $result.issues.filter(i => i.severity === 'warning').length;
    const info = $result.issues.filter(i => i.severity === 'info').length;

    return { errors, warnings, info };
  });

  // Format file name
  $: fileName = $currentFilePath || 'Untitled';

  // Selected passage title
  $: selectedPassage = $selectedPassageId && $currentStory
    ? $currentStory.getPassage($selectedPassageId)
    : null;
</script>

<div class="bg-gray-800 text-white text-xs h-6 flex items-center px-4 gap-4 border-t border-gray-700">
  {#if $currentStory}
    <!-- File name -->
    <div class="flex items-center gap-1 font-semibold">
      <span class="text-blue-400">📄</span>
      <span>{fileName}</span>
    </div>

    <div class="h-4 w-px bg-gray-600"></div>

    <!-- Passage count -->
    <div class="flex items-center gap-1">
      <span class="text-gray-400">Passages:</span>
      <span class="font-semibold">{$passageList.length}</span>
    </div>

    <!-- Word count -->
    {#if $stats}
      <div class="flex items-center gap-1">
        <span class="text-gray-400">Words:</span>
        <span class="font-semibold">{$stats.wordCount.toLocaleString()}</span>
      </div>

      <!-- Choices count -->
      <div class="flex items-center gap-1">
        <span class="text-gray-400">Choices:</span>
        <span class="font-semibold">{$stats.choiceCount}</span>
      </div>
    {/if}

    <!-- Variables count -->
    <div class="flex items-center gap-1">
      <span class="text-gray-400">Variables:</span>
      <span class="font-semibold">{$variableList.length}</span>
    </div>

    <div class="h-4 w-px bg-gray-600"></div>

    <!-- Validation status -->
    {#if $validationStats}
      {#if $validationStats.errors > 0}
        <div class="flex items-center gap-1 text-red-400">
          <span>❌</span>
          <span class="font-semibold">{$validationStats.errors}</span>
        </div>
      {/if}
      {#if $validationStats.warnings > 0}
        <div class="flex items-center gap-1 text-yellow-400">
          <span>⚠️</span>
          <span class="font-semibold">{$validationStats.warnings}</span>
        </div>
      {/if}
      {#if $validationStats.errors === 0 && $validationStats.warnings === 0}
        <div class="flex items-center gap-1 text-green-400">
          <span>✓</span>
          <span>Valid</span>
        </div>
      {/if}
    {/if}

    <div class="flex-1"></div>

    <!-- Selected passage -->
    {#if selectedPassage}
      <div class="flex items-center gap-1 text-blue-300">
        <span class="text-gray-400">Selected:</span>
        <span class="font-semibold truncate max-w-[200px]">{selectedPassage.title}</span>
      </div>
      <div class="h-4 w-px bg-gray-600"></div>
    {/if}

    <!-- History (undo/redo) -->
    <div class="flex items-center gap-2" title="Undo/Redo history (Ctrl+Z / Ctrl+Shift+Z)">
      <div class="flex items-center gap-1" class:text-gray-600={!$canUndo} class:text-gray-300={$canUndo}>
        <span>↶</span>
        <span class="text-xs">{$historyCount}</span>
      </div>
      <div class="flex items-center gap-1" class:text-gray-600={!$canRedo} class:text-gray-300={$canRedo}>
        <span>↷</span>
      </div>
    </div>
    <div class="h-4 w-px bg-gray-600"></div>

    <!-- Modified time (relative) -->
    <div class="text-gray-400">
      Modified: {new Date($currentStory.metadata.modified).toLocaleTimeString()}
    </div>
  {:else}
    <div class="text-gray-400 italic">
      Ready to create or open a project
    </div>
  {/if}
</div>
