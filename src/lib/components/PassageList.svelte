<script lang="ts">
  import { currentStory, selectedPassageId } from '../stores/projectStore';
  import { filteredPassages, isStartPassage, isOrphanPassage, isDeadEndPassage } from '../stores/filterStore';
  import { validationResult } from '../stores/validationStore';
  import type { Passage } from '../models/Passage';
  import type { Choice } from '../models/Choice';
  import SearchBar from './SearchBar.svelte';
  import { tagActions } from '../stores/tagStore';
  import VirtualList from 'svelte-virtual-list';
  import PassagePreview from './PassagePreview.svelte';
  import { onMount } from 'svelte';
  import { setupLongPress, isMobile, isTouch } from '../utils/mobile';

  export let onAddPassage: () => void;
  export let onDeletePassage: (id: string) => void;

  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuPassageId: string | null = null;
  let contextMenuElement: HTMLElement | null = null;
  let selectedMenuItemIndex = 0;
  const menuItems = ['Set as Start', 'Duplicate', 'Delete'];

  // Multi-select state
  let selectedPassages = new Set<string>();
  let lastSelectedIndex = -1;

  // Compact view mode
  let compactView = false;

  // Load compact view preference from localStorage or default to true on mobile
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('passageList.compactView');
    if (saved !== null) {
      compactView = saved === 'true';
    }
  }

  // Auto-enable compact view on mobile (unless explicitly set)
  $: if (typeof window !== 'undefined' && $isMobile) {
    const saved = localStorage.getItem('passageList.compactView');
    if (saved === null) {
      compactView = true;
    }
  }

  function toggleCompactView() {
    compactView = !compactView;
    if (typeof window !== 'undefined') {
      localStorage.setItem('passageList.compactView', String(compactView));
    }
  }

  // Passage preview on hover
  let hoveredPassage: Passage | null = null;
  let previewX = 0;
  let previewY = 0;
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleMouseEnter(passage: Passage, event: MouseEvent) {
    // Disable hover previews on touch devices
    if ($isTouch) return;

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Show preview after a short delay
    hoverTimeout = setTimeout(() => {
      hoveredPassage = passage;
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      previewX = rect.right + 10; // Position to the right of the item
      previewY = rect.top;
    }, 500); // 500ms delay before showing
  }

  function handleMouseLeave() {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    hoveredPassage = null;
  }

  // Long-press support for mobile context menu
  function handleLongPress(event: TouchEvent, passageId: string) {
    const touch = event.touches[0];
    contextMenuX = touch.clientX;
    contextMenuY = touch.clientY;
    contextMenuPassageId = passageId;
    showContextMenu = true;
    selectedMenuItemIndex = 0;
    event.preventDefault();
  }

  // Setup long-press for passage list items
  function setupPassageListeners(element: HTMLElement, passageId: string): { destroy: () => void } {
    if (!$isTouch) return { destroy: () => {} };

    const cleanup = setupLongPress(element, {
      onLongPress: (event) => handleLongPress(event, passageId),
      duration: 500,
      moveThreshold: 10,
    });

    return { destroy: cleanup };
  }

  function selectPassage(id: string, event?: MouseEvent) {
    if (!event) {
      // Simple click - clear multi-select and select single passage
      selectedPassages.clear();
      selectedPassageId.set(id);
      lastSelectedIndex = $filteredPassages.findIndex(p => p.id === id);
      return;
    }

    const currentIndex = $filteredPassages.findIndex(p => p.id === id);

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+Click: Toggle selection
      if (selectedPassages.has(id)) {
        selectedPassages.delete(id);
      } else {
        selectedPassages.add(id);
      }
      lastSelectedIndex = currentIndex;
      selectedPassages = selectedPassages; // Trigger reactivity
    } else if (event.shiftKey && lastSelectedIndex !== -1) {
      // Shift+Click: Range selection
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      selectedPassages.clear();
      for (let i = start; i <= end; i++) {
        selectedPassages.add($filteredPassages[i].id);
      }
      selectedPassages = selectedPassages; // Trigger reactivity
    } else {
      // Regular click: Clear multi-select and select single passage
      selectedPassages.clear();
      selectedPassageId.set(id);
      lastSelectedIndex = currentIndex;
    }
  }

  function clearSelection() {
    selectedPassages.clear();
    selectedPassages = selectedPassages;
    lastSelectedIndex = -1;
  }

  function bulkDelete() {
    if (selectedPassages.size === 0) return;

    const count = selectedPassages.size;
    if (confirm(`Delete ${count} selected passage${count !== 1 ? 's' : ''}?`)) {
      selectedPassages.forEach(id => {
        onDeletePassage(id);
      });
      clearSelection();
    }
  }

  function bulkAddTag() {
    if (selectedPassages.size === 0 || !$currentStory) return;

    const tagName = prompt('Enter tag name to add to selected passages:');
    if (!tagName || !tagName.trim()) return;

    const trimmedTag = tagName.trim();
    selectedPassages.forEach(id => {
      const passage = $currentStory.getPassage(id);
      if (passage && !passage.tags.includes(trimmedTag)) {
        passage.tags.push(trimmedTag);
      }
    });
    currentStory.set($currentStory);
    clearSelection();
  }

  // Use optimized helper functions from filterStore (with metadata caching)
  function isStart(passage: Passage): boolean {
    return isStartPassage(passage, $currentStory);
  }

  function isOrphan(passage: Passage): boolean {
    return isOrphanPassage(passage, $currentStory);
  }

  function hasNoChoices(passage: Passage): boolean {
    return isDeadEndPassage(passage, $currentStory);
  }

  function getPassageValidationSeverity(passageId: string): 'error' | 'warning' | 'info' | null {
    if (!$validationResult || !Array.isArray($validationResult.issues)) return null;

    const passageIssues = $validationResult.issues.filter(i => i.passageId === passageId);
    if (passageIssues.length === 0) return null;

    // Return highest severity
    if (passageIssues.some(i => i.severity === 'error')) return 'error';
    if (passageIssues.some(i => i.severity === 'warning')) return 'warning';
    return 'info';
  }

  function getPassageValidationCount(passageId: string): number {
    if (!$validationResult || !Array.isArray($validationResult.issues)) return 0;
    return $validationResult.issues.filter(i => i.passageId === passageId).length;
  }

  function handleContextMenu(event: MouseEvent, passageId: string) {
    event.preventDefault();
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    contextMenuPassageId = passageId;
    showContextMenu = true;
    selectedMenuItemIndex = 0;
  }

  function handlePassageKeydown(event: KeyboardEvent, passageId: string) {
    // Context Menu key or Shift+F10 to open context menu
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      contextMenuX = rect.left + rect.width / 2;
      contextMenuY = rect.top + rect.height / 2;
      contextMenuPassageId = passageId;
      showContextMenu = true;
      selectedMenuItemIndex = 0;

      // Focus the menu after opening
      setTimeout(() => {
        if (contextMenuElement) {
          const firstButton = contextMenuElement.querySelector('button');
          firstButton?.focus();
        }
      }, 0);
    }
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedMenuItemIndex = Math.min(selectedMenuItemIndex + 1, menuItems.length - 1);
        focusMenuItem(selectedMenuItemIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedMenuItemIndex = Math.max(selectedMenuItemIndex - 1, 0);
        focusMenuItem(selectedMenuItemIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        executeMenuItem(selectedMenuItemIndex);
        break;
      case 'Escape':
        event.preventDefault();
        closeContextMenu();
        break;
    }
  }

  function focusMenuItem(index: number) {
    if (contextMenuElement) {
      const buttons = contextMenuElement.querySelectorAll('button[role="menuitem"]');
      (buttons[index] as HTMLElement)?.focus();
    }
  }

  function executeMenuItem(index: number) {
    switch (index) {
      case 0:
        handleSetAsStart();
        break;
      case 1:
        handleDuplicate();
        break;
      case 2:
        handleDelete();
        break;
    }
  }

  function closeContextMenu() {
    showContextMenu = false;
    contextMenuPassageId = null;
    selectedMenuItemIndex = 0;
  }

  function handleDelete() {
    if (contextMenuPassageId) {
      onDeletePassage(contextMenuPassageId);
    }
    closeContextMenu();
  }

  function handleDuplicate() {
    if (contextMenuPassageId && $currentStory) {
      const passage = $currentStory.getPassage(contextMenuPassageId);
      if (passage) {
        const duplicate = passage.clone();
        $currentStory.addPassage(duplicate);
        currentStory.set($currentStory);
        selectedPassageId.set(duplicate.id);
      }
    }
    closeContextMenu();
  }

  function handleSetAsStart() {
    if (contextMenuPassageId && $currentStory) {
      $currentStory.startPassage = contextMenuPassageId;
      currentStory.set($currentStory);
    }
    closeContextMenu();
  }
</script>

<svelte:window on:click={closeContextMenu} />

<div class="flex flex-col h-full bg-white border-r border-gray-300">
  <!-- Header -->
  <div class="p-3 border-b border-gray-300">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-800">Passages</h3>
      <button
        class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 active:scale-95 transition-transform touch-manipulation"
        style="min-height: {$isMobile ? '44px' : 'auto'}"
        on:click={onAddPassage}
        title="Add new passage"
      >
        + Add
      </button>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1 px-3 py-2 text-xs rounded border transition-colors touch-manipulation {compactView ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
        style="min-height: {$isMobile ? '44px' : 'auto'}"
        on:click={toggleCompactView}
        title="Toggle compact view"
      >
        <span>{compactView ? '☰' : '≡'}</span>
        <span>Compact</span>
      </button>
    </div>
  </div>

  <!-- Search and Filter Bar -->
  <SearchBar />

  <!-- Bulk Actions Toolbar -->
  {#if selectedPassages.size > 0}
    <div class="bg-purple-100 border-b border-purple-300 px-3 py-2 flex items-center justify-between">
      <div class="text-sm font-semibold text-purple-800">
        {selectedPassages.size} passage{selectedPassages.size !== 1 ? 's' : ''} selected
      </div>
      <div class="flex gap-2">
        <button
          class="px-3 py-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 active:scale-95 transition-transform touch-manipulation"
          style="min-height: {$isMobile ? '44px' : 'auto'}"
          on:click={bulkAddTag}
          title="Add tag to selected passages"
        >
          Add Tag
        </button>
        <button
          class="px-3 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 active:scale-95 transition-transform touch-manipulation"
          style="min-height: {$isMobile ? '44px' : 'auto'}"
          on:click={bulkDelete}
          title="Delete selected passages"
        >
          Delete
        </button>
        <button
          class="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 active:scale-95 transition-transform touch-manipulation"
          style="min-height: {$isMobile ? '44px' : 'auto'}"
          on:click={clearSelection}
          title="Clear selection"
        >
          Clear
        </button>
      </div>
    </div>
  {/if}

  <!-- Passage List (Virtual Scrolling for Performance) -->
  <div class="flex-1 overflow-hidden">
    {#if $filteredPassages.length === 0}
      <div class="p-4 text-sm text-gray-400 text-center">
        No passages match your filters
      </div>
    {:else if $filteredPassages.length < 50}
      <!-- Regular rendering for small lists (avoids VirtualList mount issues) -->
      <div class="overflow-y-auto h-full">
        {#each $filteredPassages as passage}
          {@const validationSeverity = getPassageValidationSeverity(passage.id)}
          {@const validationCount = getPassageValidationCount(passage.id)}
          {@const mobilePadding = $isMobile ? 'px-3 py-3' : (compactView ? 'px-2 py-1' : 'px-3 py-2')}
          <button
            type="button"
            class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 touch-manipulation active:scale-[0.98] {mobilePadding}"
            style="min-height: {$isMobile ? '56px' : 'auto'}"
            class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-blue-500={$selectedPassageId === passage.id}
            class:border-l-purple-500={selectedPassages.has(passage.id)}
            on:click={(e) => selectPassage(passage.id, e)}
            on:contextmenu={(e) => handleContextMenu(e, passage.id)}
            on:keydown={(e) => handlePassageKeydown(e, passage.id)}
            on:mouseenter={(e) => handleMouseEnter(passage, e)}
            on:mouseleave={handleMouseLeave}
            use:setupPassageListeners={passage.id}
            aria-label="Passage: {passage.title}"
          >
          <div class="flex items-center {compactView ? 'gap-1' : 'gap-2'}">
            <!-- Color Indicator -->
            {#if passage.color}
              <div
                class="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                style="background-color: {passage.color};"
                title="Passage color: {passage.color}"
              ></div>
            {/if}

            <!-- Icons -->
            <div class="flex gap-1 {compactView ? 'text-xs' : ''}">
              {#if isStart(passage)}
                <span class="text-green-600" title="Start passage">▶</span>
              {/if}
              {#if isOrphan(passage)}
                <span class="text-orange-500" title="Orphaned passage">⚠</span>
              {/if}
              {#if hasNoChoices(passage)}
                <span class="text-gray-400" title="Dead end">⏹</span>
              {/if}
              {#if validationSeverity}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded {validationSeverity === 'error' ? 'bg-red-100 text-red-700' : validationSeverity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}"
                  title="{validationCount} validation issue{validationCount !== 1 ? 's' : ''}"
                  aria-label="{validationCount} validation {validationSeverity === 'error' ? 'error' : validationSeverity === 'warning' ? 'warning' : 'info'}{validationCount !== 1 ? 's' : ''}"
                >
                  {validationSeverity === 'error' ? '🔴' : validationSeverity === 'warning' ? '⚠️' : 'ℹ️'}
                  {validationCount}
                </span>
              {/if}
            </div>

            <!-- Title -->
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate {compactView ? 'text-xs' : 'text-sm'}">{passage.title}</div>
              {#if !compactView}
                <div class="text-xs text-gray-500 truncate">
                  {passage.content.slice(0, 50)}{passage.content.length > 50 ? '...' : ''}
                </div>
              {/if}

              <!-- Tags -->
              {#if passage.tags.length > 0 && !compactView}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each passage.tags.slice(0, 3) as tag}
                    <span
                      class="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
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

            <!-- Statistics -->
            {#if !compactView && !$isMobile}
              {@const wordCount = passage.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length}
              {@const incomingLinks = $currentStory ? Array.from($currentStory.passages.values()).filter((p: Passage) => p.choices.some((c: Choice) => c.target === passage.id)).length : 0}
              <div class="flex flex-col gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                <div title="Word count">📝 {wordCount}w</div>
                <div title="Outgoing choices">→ {passage.choices.length}</div>
                <div title="Incoming links">← {incomingLinks}</div>
              </div>
            {:else if compactView || $isMobile}
              <div class="flex items-center gap-1 text-[10px] text-gray-400">
                <span title="Outgoing choices">→{passage.choices.length}</span>
              </div>
            {/if}
          </div>
        </button>
        {/each}
      </div>
    {:else}
      <!-- Virtual scrolling for large lists (50+ passages) -->
      <VirtualList items={$filteredPassages} let:item={passage} height="100%">
        {@const validationSeverity = getPassageValidationSeverity(passage.id)}
        {@const validationCount = getPassageValidationCount(passage.id)}
        {@const mobilePadding = $isMobile ? 'px-3 py-3' : (compactView ? 'px-2 py-1' : 'px-3 py-2')}
        <button
          type="button"
          class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 touch-manipulation active:scale-[0.98] {mobilePadding}"
          style="min-height: {$isMobile ? '56px' : 'auto'}"
          class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-blue-500={$selectedPassageId === passage.id}
          class:border-l-purple-500={selectedPassages.has(passage.id)}
          on:click={(e) => selectPassage(passage.id, e)}
          on:contextmenu={(e) => handleContextMenu(e, passage.id)}
          on:keydown={(e) => handlePassageKeydown(e, passage.id)}
          aria-label="Passage: {passage.title}"
          on:mouseenter={(e) => handleMouseEnter(passage, e)}
          on:mouseleave={handleMouseLeave}
          use:setupPassageListeners={passage.id}
        >
          <div class="flex items-center {compactView ? 'gap-1' : 'gap-2'}">
            <!-- Color Indicator -->
            {#if passage.color}
              <div
                class="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                style="background-color: {passage.color};"
                title="Passage color: {passage.color}"
              ></div>
            {/if}

            <!-- Icons -->
            <div class="flex gap-1 {compactView ? 'text-xs' : ''}">
              {#if isStart(passage)}
                <span class="text-green-600" title="Start passage">▶</span>
              {/if}
              {#if isOrphan(passage)}
                <span class="text-orange-500" title="Orphaned passage">⚠</span>
              {/if}
              {#if hasNoChoices(passage)}
                <span class="text-gray-400" title="Dead end">⏹</span>
              {/if}
              {#if validationSeverity}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded {validationSeverity === 'error' ? 'bg-red-100 text-red-700' : validationSeverity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}"
                  title="{validationCount} validation issue{validationCount !== 1 ? 's' : ''}"
                  aria-label="{validationCount} validation {validationSeverity === 'error' ? 'error' : validationSeverity === 'warning' ? 'warning' : 'info'}{validationCount !== 1 ? 's' : ''}"
                >
                  {validationSeverity === 'error' ? '🔴' : validationSeverity === 'warning' ? '⚠️' : 'ℹ️'}
                  {validationCount}
                </span>
              {/if}
            </div>

            <!-- Title -->
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate {compactView ? 'text-xs' : 'text-sm'}">{passage.title}</div>
              {#if !compactView}
                <div class="text-xs text-gray-500 truncate">
                  {passage.content.slice(0, 50)}{passage.content.length > 50 ? '...' : ''}
                </div>
              {/if}

              <!-- Tags -->
              {#if passage.tags.length > 0 && !compactView}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each passage.tags.slice(0, 3) as tag}
                    <span
                      class="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
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

            <!-- Statistics -->
            {#if !compactView && !$isMobile}
              {@const wordCount = passage.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length}
              {@const incomingLinks = $currentStory ? Array.from($currentStory.passages.values()).filter((p: Passage) => p.choices.some((c: Choice) => c.target === passage.id)).length : 0}
              <div class="flex flex-col gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                <div title="Word count">📝 {wordCount}w</div>
                <div title="Outgoing choices">→ {passage.choices.length}</div>
                <div title="Incoming links">← {incomingLinks}</div>
              </div>
            {:else if compactView || $isMobile}
              <div class="flex items-center gap-1 text-[10px] text-gray-400">
                <span title="Outgoing choices">→{passage.choices.length}</span>
              </div>
            {/if}
          </div>
        </button>
      </VirtualList>
    {/if}
  </div>
</div>

<!-- Context Menu -->
{#if showContextMenu}
  <div
    bind:this={contextMenuElement}
    role="menu"
    aria-label="Passage options"
    class="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 py-1 min-w-[150px]"
    style="left: {contextMenuX}px; top: {contextMenuY}px;"
    on:click|stopPropagation
    on:touchend|stopPropagation
    on:keydown={handleMenuKeydown}
  >
    <button
      type="button"
      role="menuitem"
      class="w-full text-left px-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation active:scale-95"
      style="min-height: {$isMobile ? '44px' : 'auto'}; padding-top: {$isMobile ? '0.75rem' : '0.25rem'}; padding-bottom: {$isMobile ? '0.75rem' : '0.25rem'}"
      on:click={handleSetAsStart}
      aria-label="Make this the starting passage"
    >
      Set as Start
    </button>
    <button
      type="button"
      role="menuitem"
      class="w-full text-left px-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation active:scale-95"
      style="min-height: {$isMobile ? '44px' : 'auto'}; padding-top: {$isMobile ? '0.75rem' : '0.25rem'}; padding-bottom: {$isMobile ? '0.75rem' : '0.25rem'}"
      on:click={handleDuplicate}
      aria-label="Create a copy of this passage"
    >
      Duplicate
    </button>
    <div class="border-t border-gray-200 dark:border-gray-600 my-1" role="separator"></div>
    <button
      type="button"
      role="menuitem"
      class="w-full text-left px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 touch-manipulation active:scale-95"
      style="min-height: {$isMobile ? '44px' : 'auto'}; padding-top: {$isMobile ? '0.75rem' : '0.25rem'}; padding-bottom: {$isMobile ? '0.75rem' : '0.25rem'}"
      on:click={handleDelete}
      aria-label="Delete this passage"
    >
      Delete
    </button>
  </div>
{/if}

<!-- Passage Preview Tooltip -->
{#if hoveredPassage}
  <PassagePreview
    passage={hoveredPassage}
    x={previewX}
    y={previewY}
    show={true}
  />
{/if}
