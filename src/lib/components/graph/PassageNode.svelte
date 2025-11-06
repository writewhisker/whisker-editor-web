<script lang="ts">
  import { onMount } from 'svelte';
  import { Handle, Position } from '@xyflow/svelte';
  import type { Passage } from '../../models/Passage';
  import { currentStory, projectActions, selectedPassageId } from '../../stores/storyStateStore';

  import type { ValidationIssue } from '../../validation/types';
  import { tagActions } from '../../stores/tagStore';
  import { breakpoints, currentPreviewPassage, visitedPassages, playerActions, debugMode } from '../../stores/playerStore';
  import { setupLongPress, isTouch } from '../../utils/mobile';
  import { notificationStore } from '../../stores/notificationStore';
  import { commentsByPassage } from '../../stores/commentStore';

  export let data: {
    passage: Passage;
    isStart: boolean;
    isOrphan: boolean;
    isDead: boolean;
    isFiltered?: boolean;
    validationIssues?: ValidationIssue[];
    color?: string;
  };

  $: passage = data.passage;
  $: isStart = data.isStart;
  $: isOrphan = data.isOrphan;
  $: isDead = data.isDead;
  $: isFiltered = data.isFiltered ?? true;
  $: validationIssues = data.validationIssues || [];
  $: customColor = data.color;
  $: hasErrors = validationIssues.some(i => i.severity === 'error');
  $: hasWarnings = validationIssues.some(i => i.severity === 'warning');
  $: errorCount = validationIssues.filter(i => i.severity === 'error').length;
  $: warningCount = validationIssues.filter(i => i.severity === 'warning').length;

  // Preview state
  $: hasBreakpoint = $breakpoints.has(passage.id);
  $: isCurrentPreview = $currentPreviewPassage?.id === passage.id;
  $: wasVisitedInPreview = ($visitedPassages.get(passage.id) || 0) > 0;

  // Comment state
  $: passageComments = $commentsByPassage.get(passage.id) || [];
  $: unresolvedCommentCount = passageComments.filter(c => !c.resolved).length;
  $: hasComments = passageComments.length > 0;

  // Resize functionality
  let isResizing = false;
  let resizeDirection: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n' | null = null;
  let startMouseX = 0;
  let startMouseY = 0;
  let startWidth = 0;
  let startHeight = 0;

  function handleResizeStart(event: MouseEvent, direction: typeof resizeDirection) {
    event.stopPropagation();
    event.preventDefault();

    isResizing = true;
    resizeDirection = direction;
    startMouseX = event.clientX;
    startMouseY = event.clientY;
    startWidth = passage.size?.width || 200;
    startHeight = passage.size?.height || 150;

    document.body.style.cursor = getCursorStyle(direction);
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(event: MouseEvent) {
    if (!isResizing || !resizeDirection) return;

    const deltaX = event.clientX - startMouseX;
    const deltaY = event.clientY - startMouseY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Calculate new dimensions based on resize direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(150, startWidth + deltaX);
    }
    if (resizeDirection.includes('w')) {
      newWidth = Math.max(150, startWidth - deltaX);
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(100, startHeight + deltaY);
    }
    if (resizeDirection.includes('n')) {
      newHeight = Math.max(100, startHeight - deltaY);
    }

    // Update passage size
    if (!passage.size) {
      passage.size = { width: 200, height: 150 };
    }
    passage.size.width = newWidth;
    passage.size.height = newHeight;

    if ($currentStory) {
      currentStory.update(s => s);
    }
  }

  function handleResizeEnd() {
    if (!isResizing) return;

    isResizing = false;
    resizeDirection = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);

    if ($currentStory) {
      projectActions.markChanged();
    }
  }

  function getCursorStyle(direction: typeof resizeDirection): string {
    switch (direction) {
      case 'se': return 'nwse-resize';
      case 'nw': return 'nwse-resize';
      case 'ne': return 'nesw-resize';
      case 'sw': return 'nesw-resize';
      case 'e': return 'ew-resize';
      case 'w': return 'ew-resize';
      case 's': return 'ns-resize';
      case 'n': return 'ns-resize';
      default: return 'default';
    }
  }

  function toggleBreakpoint(event: MouseEvent) {
    event.stopPropagation();
    playerActions.toggleBreakpoint(passage.id);
  }

  // Context menu for touch devices
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let nodeElement: HTMLDivElement;

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    showContextMenu = true;
  }

  function handleLongPress(event: TouchEvent) {
    const touch = event.touches[0];
    contextMenuX = touch.clientX;
    contextMenuY = touch.clientY;
    showContextMenu = true;
    // Prevent default to avoid triggering other touch events
    event.preventDefault();
  }

  function closeContextMenu() {
    showContextMenu = false;
  }

  function handleDelete() {
    if (!$currentStory) return;
    const confirmMessage = isStart
      ? 'This is the start passage. Are you sure you want to delete it?'
      : `Delete passage "${passage.title}"?`;

    if (confirm(confirmMessage)) {
      $currentStory.removePassage(passage.id);
      projectActions.markChanged();
    }
    closeContextMenu();
  }

  function handleDuplicate() {
    const duplicated = projectActions.duplicatePassage(passage.id);
    if (duplicated) {
      notificationStore.success(`Passage "${duplicated.title}" duplicated successfully`);
    }
    closeContextMenu();
  }

  function handleSetAsStart() {
    if (!$currentStory) return;
    $currentStory.startPassage = passage.id;
    projectActions.markChanged();
    closeContextMenu();
  }

  // Setup long-press detection on touch devices
  onMount(() => {
    if (!nodeElement || !$isTouch) return;

    const cleanup = setupLongPress(nodeElement, {
      onLongPress: handleLongPress,
      duration: 500,
      moveThreshold: 10,
    });

    return cleanup;
  });

  // Generate tooltip for validation issues
  $: validationTooltip = validationIssues.length > 0
    ? validationIssues.map(i => `${i.category}: ${i.message}`).join('\n')
    : '';

  // Truncate content for preview
  function truncateContent(text: string, maxLength: number = 80): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Simple markdown-to-HTML converter for rich preview
  function renderMarkdown(text: string): string {
    if (!text) return '';

    let html = text;

    // Escape HTML tags first
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers (##, ###)
    html = html.replace(/^### (.+)$/gm, '<span class="text-xs font-semibold text-gray-800">$1</span>');
    html = html.replace(/^## (.+)$/gm, '<span class="text-sm font-bold text-gray-900">$1</span>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>');

    // Code
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded text-xs font-mono">$1</code>');

    // Links (simplified, just show as colored text)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<span class="text-blue-600 underline">$1</span>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // Get rich preview of content
  function getRichPreview(text: string): string {
    const truncated = truncateContent(text || 'Empty passage', 120);
    return renderMarkdown(truncated);
  }

  // Get node color based on status
  function getNodeColor(): string {
    // Custom color takes precedence if set
    if (customColor) return '';
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

  // Generate inline style for custom color
  function getCustomStyle(): string {
    if (!customColor) return '';
    // Lighter background version of the color
    return `border-color: ${customColor}; background-color: ${customColor}15;`;
  }

  // Handle keyboard interaction
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Trigger click event on the node (this will select it in the graph view)
      (event.target as HTMLElement).click();
    }
  }

  // Generate accessible label for the node
  function getAccessibleLabel(): string {
    const parts = [passage.title];
    if (isStart) parts.push('start passage');
    if (isOrphan) parts.push('orphaned');
    if (isDead) parts.push('dead end');
    if (isCurrentPreview) parts.push('currently previewing');
    if (hasErrors) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    if (hasWarnings) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    parts.push(`${passage.choices.length} choice${passage.choices.length !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }
</script>

<div
  bind:this={nodeElement}
  class="passage-node {getNodeColor()} {getNodeOpacity()} border-2 rounded-lg shadow-md hover:shadow-lg transition-all relative"
  style="{getCustomStyle()} width: {passage.size?.width || 200}px; height: {passage.size?.height || 150}px;"
  role="button"
  tabindex="0"
  aria-label={getAccessibleLabel()}
  on:keydown={handleKeydown}
  on:contextmenu={handleContextMenu}
>
  <!-- Breakpoint Indicator -->
  {#if $debugMode}
    <button
      type="button"
      class="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all {hasBreakpoint ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600 hover:bg-red-400 hover:text-white'}"
      on:click={toggleBreakpoint}
      title={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
      aria-label={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
      aria-pressed={hasBreakpoint}
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
        {#if unresolvedCommentCount > 0}
          <span class="text-xs px-1 py-0.5 bg-blue-200 text-blue-700 rounded" title="{unresolvedCommentCount} unresolved comment{unresolvedCommentCount !== 1 ? 's' : ''}" aria-label="{unresolvedCommentCount} unresolved comment{unresolvedCommentCount !== 1 ? 's' : ''}">
            💬{unresolvedCommentCount}
          </span>
        {:else if hasComments}
          <span class="text-xs px-1 py-0.5 bg-green-200 text-green-700 rounded" title="All comments resolved" aria-label="All comments resolved">
            ✓💬
          </span>
        {/if}
        {#if hasErrors}
          <span class="text-xs px-1 py-0.5 bg-red-200 text-red-700 rounded" title={validationTooltip} aria-label="{errorCount} validation error{errorCount !== 1 ? 's' : ''}">
            {errorCount}❌
          </span>
        {/if}
        {#if hasWarnings}
          <span class="text-xs px-1 py-0.5 bg-yellow-200 text-yellow-700 rounded" title={validationTooltip} aria-label="{warningCount} validation warning{warningCount !== 1 ? 's' : ''}">
            {warningCount}⚠️
          </span>
        {/if}
        <span class="text-xs text-gray-500">{passage.choices.length}</span>
      </div>
    </div>
  </div>

  <!-- Content Preview -->
  <div class="p-3">
    <div class="text-xs text-gray-600 line-clamp-3 rich-preview">
      {@html getRichPreview(passage.content)}
    </div>

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
    class="!bg-blue-400 !w-4 !h-4 !border-2 !border-white connection-handle"
    title="Drag to create new connection"
    aria-label="Drag to create new connection to another passage"
  />

  <!-- Resize Handles -->
  <div class="resize-handles">
    <!-- Corner handles -->
    <div
      class="resize-handle resize-se"
      on:mousedown={(e) => handleResizeStart(e, 'se')}
      title="Resize"
    />
    <div
      class="resize-handle resize-sw"
      on:mousedown={(e) => handleResizeStart(e, 'sw')}
      title="Resize"
    />
    <div
      class="resize-handle resize-ne"
      on:mousedown={(e) => handleResizeStart(e, 'ne')}
      title="Resize"
    />
    <div
      class="resize-handle resize-nw"
      on:mousedown={(e) => handleResizeStart(e, 'nw')}
      title="Resize"
    />

    <!-- Edge handles -->
    <div
      class="resize-handle resize-e"
      on:mousedown={(e) => handleResizeStart(e, 'e')}
      title="Resize"
    />
    <div
      class="resize-handle resize-w"
      on:mousedown={(e) => handleResizeStart(e, 'w')}
      title="Resize"
    />
    <div
      class="resize-handle resize-s"
      on:mousedown={(e) => handleResizeStart(e, 's')}
      title="Resize"
    />
    <div
      class="resize-handle resize-n"
      on:mousedown={(e) => handleResizeStart(e, 'n')}
      title="Resize"
    />
  </div>
</div>

<!-- Context Menu -->
{#if showContextMenu}
  <div
    class="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 py-1 min-w-[150px]"
    style="left: {contextMenuX}px; top: {contextMenuY}px;"
    on:click|stopPropagation
    on:touchend|stopPropagation
    role="menu" tabindex="0"
    tabindex="-1"
  >
    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
      on:click={handleSetAsStart}
      role="menuitem"
    >
      <span>⭐</span>
      <span>Set as Start</span>
    </button>

    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
      on:click={handleDuplicate}
      role="menuitem"
    >
      <span>📋</span>
      <span>Duplicate</span>
    </button>

    <button
      class="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
      on:click={handleDelete}
      role="menuitem"
    >
      <span>🗑️</span>
      <span>Delete</span>
    </button>
  </div>

  <!-- Overlay to close menu when clicking outside -->
  <div
    class="fixed inset-0 z-40"
    on:click={closeContextMenu}
    on:touchend={closeContextMenu}
    role="presentation"
  ></div>
{/if}

<style>
  .passage-node {
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .passage-node:hover {
    transform: translateY(-1px);
  }

  .passage-node:hover .resize-handles {
    opacity: 1;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Rich text preview styles */
  .rich-preview {
    word-wrap: break-word;
    white-space: normal;
  }

  .rich-preview :global(strong) {
    color: #1f2937;
  }

  .rich-preview :global(em) {
    color: #4b5563;
  }

  .rich-preview :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .rich-preview :global(.text-blue-600) {
    color: #2563eb;
  }

  /* Resize Handles */
  .resize-handles {
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: auto;
  }

  .resize-handle {
    position: absolute;
    background: #007bff;
    border: 1px solid white;
    z-index: 10;
    transition: background 0.2s;
  }

  .resize-handle:hover {
    background: #0056b3;
  }

  /* Corner handles */
  .resize-se,
  .resize-sw,
  .resize-ne,
  .resize-nw {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .resize-se {
    bottom: -4px;
    right: -4px;
    cursor: nwse-resize;
  }

  .resize-sw {
    bottom: -4px;
    left: -4px;
    cursor: nesw-resize;
  }

  .resize-ne {
    top: -4px;
    right: -4px;
    cursor: nesw-resize;
  }

  .resize-nw {
    top: -4px;
    left: -4px;
    cursor: nwse-resize;
  }

  /* Edge handles */
  .resize-e,
  .resize-w {
    width: 6px;
    height: 40px;
    border-radius: 3px;
    top: 50%;
    transform: translateY(-50%);
  }

  .resize-n,
  .resize-s {
    width: 40px;
    height: 6px;
    border-radius: 3px;
    left: 50%;
    transform: translateX(-50%);
  }

  .resize-e {
    right: -3px;
    cursor: ew-resize;
  }

  .resize-w {
    left: -3px;
    cursor: ew-resize;
  }

  .resize-s {
    bottom: -3px;
    cursor: ns-resize;
  }

  .resize-n {
    top: -3px;
    cursor: ns-resize;
  }

  /* Connection Handle Animation */
  :global(.connection-handle) {
    transition: all 0.3s ease;
  }

  .passage-node:hover :global(.connection-handle) {
    animation: pulse-connection 2s ease-in-out infinite;
  }

  @keyframes pulse-connection {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }

  /* Mobile & Touch Optimizations */
  @media (max-width: 768px) {
    .passage-node {
      /* Larger touch targets for mobile */
      min-width: 180px;
      min-height: 120px;
      -webkit-tap-highlight-color: transparent;
    }

    /* Always show resize handles on touch devices */
    @media (hover: none) {
      .resize-handles {
        opacity: 0.6;
      }
    }

    /* Larger resize handles for touch */
    .resize-handle {
      width: 12px;
      height: 12px;
    }

    /* Corner handles */
    .resize-se,
    .resize-sw,
    .resize-ne,
    .resize-nw {
      width: 16px;
      height: 16px;
    }

    /* Larger tap targets for edge handles */
    .resize-e,
    .resize-w {
      width: 12px;
      height: 50%;
      top: 25%;
    }

    .resize-n,
    .resize-s {
      height: 12px;
      width: 50%;
      left: 25%;
    }

    /* Increase padding for better readability on small screens */
    .passage-node :global(.nodrag) {
      padding: 12px 16px;
    }

    /* Larger font sizes for mobile */
    .passage-node :global(.passage-header) {
      font-size: 16px;
    }

    .passage-node :global(.passage-content) {
      font-size: 14px;
    }

    /* Add visual feedback for touch */
    .passage-node:active {
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }
  }

  /* Landscape mobile adjustments */
  @media (max-height: 500px) and (max-width: 900px) {
    .passage-node {
      min-width: 160px;
      min-height: 100px;
    }
  }
</style>
