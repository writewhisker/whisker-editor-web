<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { Passage } from '../../models/Passage';

  export let data: {
    passage: Passage;
    isStart: boolean;
    isOrphan: boolean;
    isDead: boolean;
  };

  $: passage = data.passage;
  $: isStart = data.isStart;
  $: isOrphan = data.isOrphan;
  $: isDead = data.isDead;

  // Truncate content for preview
  function truncateContent(text: string, maxLength: number = 80): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Get node color based on status
  function getNodeColor(): string {
    if (isStart) return 'border-green-500 bg-green-50';
    if (isDead) return 'border-red-300 bg-red-50';
    if (isOrphan) return 'border-orange-300 bg-orange-50';
    return 'border-blue-300 bg-white';
  }
</script>

<div class="passage-node {getNodeColor()} border-2 rounded-lg shadow-md hover:shadow-lg transition-shadow min-w-[200px] max-w-[300px]">
  <!-- Header -->
  <div class="p-2 border-b {isStart ? 'bg-green-100' : isDead ? 'bg-red-100' : isOrphan ? 'bg-orange-100' : 'bg-gray-50'}">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        {#if isStart}
          <span class="text-green-600" title="Start passage">⭐</span>
        {/if}
        {#if isOrphan}
          <span class="text-orange-600" title="Orphaned passage">⚠️</span>
        {/if}
        {#if isDead}
          <span class="text-red-600" title="Dead end">🔚</span>
        {/if}
        <h3 class="font-semibold text-sm truncate">{passage.title}</h3>
      </div>
      <span class="text-xs text-gray-500">{passage.choices.length}</span>
    </div>
  </div>

  <!-- Content Preview -->
  <div class="p-3">
    <p class="text-xs text-gray-600 line-clamp-3">
      {truncateContent(passage.content || 'Empty passage')}
    </p>

    {#if passage.tags.length > 0}
      <div class="flex flex-wrap gap-1 mt-2">
        {#each passage.tags.slice(0, 3) as tag}
          <span class="text-xs px-1.5 py-0.5 bg-gray-200 rounded">{tag}</span>
        {/each}
        {#if passage.tags.length > 3}
          <span class="text-xs text-gray-500">+{passage.tags.length - 3}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Handles for connections -->
  <Handle type="target" position={Position.Top} class="!bg-blue-500 !w-3 !h-3" />
  <Handle type="source" position={Position.Bottom} class="!bg-blue-500 !w-3 !h-3" />
</div>

<style>
  .passage-node {
    cursor: pointer;
  }

  .passage-node:hover {
    transform: translateY(-1px);
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
