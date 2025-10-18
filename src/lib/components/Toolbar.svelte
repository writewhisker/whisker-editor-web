<script lang="ts">
  import { currentStory, unsavedChanges, projectActions } from '../stores/projectStore';
  import { canUndo, canRedo, historyCount } from '../stores/historyStore';

  export let onNew: () => void;
  export let onOpen: () => void;
  export let onSave: () => void;
  export let onAddPassage: () => void;
</script>

<div class="bg-gray-100 border-b border-gray-300 h-12 flex items-center px-4 gap-2">
  <button
    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    on:click={onNew}
    title="New Project (Ctrl+N)"
  >
    📄 New
  </button>

  <button
    class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
    on:click={onOpen}
    title="Open Project (Ctrl+O)"
  >
    📁 Open
  </button>

  <button
    class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    on:click={onSave}
    disabled={!$currentStory}
    title="Save Project (Ctrl+S)"
  >
    💾 Save{#if $unsavedChanges}*{/if}
  </button>

  <div class="border-l border-gray-300 h-8 mx-2"></div>

  <button
    class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    on:click={onAddPassage}
    disabled={!$currentStory}
    title="Add Passage (Ctrl+Shift+N)"
  >
    ➕ Add Passage
  </button>

  <div class="border-l border-gray-300 h-8 mx-2"></div>

  <button
    class="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    on:click={() => projectActions.undo()}
    disabled={!$canUndo}
    title="Undo (Ctrl+Z)"
  >
    ↶
  </button>

  <button
    class="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    on:click={() => projectActions.redo()}
    disabled={!$canRedo}
    title="Redo (Ctrl+Shift+Z)"
  >
    ↷
  </button>

  {#if $historyCount > 0}
    <div class="text-xs text-gray-500" title="History depth">
      {$historyCount}
    </div>
  {/if}

  <div class="flex-1"></div>

  {#if $currentStory}
    <div class="text-sm text-gray-600">
      {$currentStory.metadata.title}
    </div>
  {:else}
    <div class="text-sm text-gray-400 italic">
      No project loaded
    </div>
  {/if}
</div>
