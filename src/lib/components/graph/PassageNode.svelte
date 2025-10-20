<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { Passage } from '../../models/Passage';

  import type { ConnectionIssue } from '../../utils/connectionValidator';
  import { tagActions } from '../../stores/tagStore';
  import { breakpoints, currentPreviewPassage, visitedPassages, playerActions, debugMode } from '../../stores/playerStore';

  export let data: {
    passage: Passage;
    isStart: boolean;
    isOrphan: boolean;
    isDead: boolean;
    isFiltered?: boolean;
    validationIssues?: ConnectionIssue[];
  };

  $: passage = data.passage;
  $: isStart = data.isStart;
  $: isOrphan = data.isOrphan;
  $: isDead = data.isDead;
  $: isFiltered = data.isFiltered ?? true;
  $: validationIssues = data.validationIssues || [];
  $: hasErrors = validationIssues.some(i => i.severity === 'error');
  $: hasWarnings = validationIssues.some(i => i.severity === 'warning');
  $: errorCount = validationIssues.filter(i => i.severity === 'error').length;
  $: warningCount = validationIssues.filter(i => i.severity === 'warning').length;

  // Preview state
  $: hasBreakpoint = $breakpoints.has(passage.id);
  $: isCurrentPreview = $currentPreviewPassage?.id === passage.id;
  $: wasVisitedInPreview = ($visitedPassages.get(passage.id) || 0) > 0;

  function toggleBreakpoint(event: MouseEvent) {
    event.stopPropagation();
    playerActions.toggleBreakpoint(passage.id);
  }

  // Generate tooltip for validation issues
  $: validationTooltip = validationIssues.length > 0
    ? validationIssues.map(i => `${i.type}: ${i.message}`).join('\n')
    : '';

  // Truncate content for preview
  function truncateContent(text: string, maxLength: number = 80): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Get node color based on status
  function getNodeColor(): string {
    if (isCurrentPreview) return 'border-purple-500 bg-purple-100 shadow-purple-400';
    if (isStart) return 'border-green-500 bg-green-50';
    if (isDead) return 'border-red-300 bg-red-50';
    if (isOrphan) return 'border-orange-300 bg-orange-50';
    return 'border-blue-300 bg-white';
  }

  function getNodeOpacity(): string {
    if (wasVisitedInPreview && !isCurrentPreview) return 'opacity-70';
    return 'opacity-100';
  }
</script>

<div class="passage-node {getNodeColor()} {getNodeOpacity()} border-2 rounded-lg shadow-md hover:shadow-lg transition-all min-w-[200px] max-w-[300px] relative">
  <!-- Breakpoint Indicator -->
  {#if $debugMode}
    <button
      class="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all {hasBreakpoint ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600 hover:bg-red-400 hover:text-white'}"
      on:click={toggleBreakpoint}
      title={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
    >
      {hasBreakpoint ? '🔴' : '⚪'}
    </button>
  {/if}

  <!-- Current Preview Indicator -->
  {#if isCurrentPreview}
    <div class="absolute -top-1 -right-1 z-10">
      <span class="relative flex h-4 w-4">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
      </span>
    </div>
  {/if}

  <!-- Header -->
  <div class="p-2 border-b {isCurrentPreview ? 'bg-purple-100' : isStart ? 'bg-green-100' : isDead ? 'bg-red-100' : isOrphan ? 'bg-orange-100' : 'bg-gray-50'}">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        {#if isCurrentPreview}
          <span class="text-purple-600" title="Current passage in preview">▶️</span>
        {:else if isStart}
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
      <div class="flex items-center gap-1">
        {#if hasErrors}
          <span class="text-xs px-1 py-0.5 bg-red-200 text-red-700 rounded" title={validationTooltip}>
            {errorCount}❌
          </span>
        {/if}
        {#if hasWarnings}
          <span class="text-xs px-1 py-0.5 bg-yellow-200 text-yellow-700 rounded" title={validationTooltip}>
            {warningCount}⚠️
          </span>
        {/if}
        <span class="text-xs text-gray-500">{passage.choices.length}</span>
      </div>
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
          <span
            class="text-xs px-1.5 py-0.5 rounded font-medium text-white"
            style="background-color: {tagActions.getTagColor(tag)}"
          >
            {tag}
          </span>
        {/each}
        {#if passage.tags.length > 3}
          <span class="text-xs text-gray-500">+{passage.tags.length - 3}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Handles for connections -->
  <!-- Target handle (incoming connections) -->
  <Handle type="target" position={Position.Top} class="!bg-blue-500 !w-3 !h-3" />

  <!-- Source handles (one per choice + one for new connections) -->
  {#each passage.choices as choice, i (choice.id)}
    <Handle
      type="source"
      position={Position.Bottom}
      id={`choice-${choice.id}`}
      style="left: {((i + 1) * 100) / (passage.choices.length + 1)}%"
      class="!bg-green-500 !w-3 !h-3"
      title={choice.text || 'Untitled choice'}
    />
  {/each}

  <!-- Handle for creating new connections -->
  <Handle
    type="source"
    position={Position.Right}
    id="new-connection"
    class="!bg-blue-400 !w-4 !h-4 !border-2 !border-white"
    title="Drag to create new connection"
  />
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
