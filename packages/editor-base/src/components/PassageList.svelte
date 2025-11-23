<script lang="ts">
  import { currentStory } from '../stores/storyStateStore';
  import { selectedPassageId, selectionActions } from '../stores/selectionStore';
  import { passageOperations } from '../stores/passageOperationsStore';
  import { projectMetadataActions } from '../stores/projectMetadataStore';
  import { historyIntegration } from '../stores/historyIntegrationStore';
  import { filteredPassages, isStartPassage, isOrphanPassage, isDeadEndPassage } from '../stores/filterStore';
  import { validationResult } from '../stores/validationStore';
  import { passageOrderState, passageOrderActions, type SortOrder } from '../stores/passageOrderStore';
  import type { Passage } from '@writewhisker/core-ts';
  import type { Choice } from '@writewhisker/core-ts';
  import SearchBar from './SearchBar.svelte';
  import { tagActions } from '../stores/tagStore';
  import VirtualList from 'svelte-virtual-list';
  import PassagePreview from './PassagePreview.svelte';
  import { onMount } from 'svelte';
  import { setupLongPress, isMobile, isTouch } from '../utils/mobile';
  import { notificationStore } from '../stores/notificationStore';
  import { commentsByPassage } from '../stores/commentStore';
  import { kidsModeEnabled, kidsAgeGroup } from '../stores/kidsModeStore';
  import { getPassageLimit } from '../stores/ageGroupFeatures';

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
  let selectMode = false;

  // Compact view mode
  let compactView = false;

  // Load compact view preference from localStorage or default to true on mobile
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('passageList.compactView');
    if (saved !== null) {
      compactView = saved === 'true';
    }
  }

  // Drag-and-drop state
  let draggedIndex: number | null = null;
  let dragOverIndex: number | null = null;
  let isDragging = false;

  // Keyboard reordering state
  let focusedIndex: number = -1;

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
      if (!selectMode) {
        selectedPassages.clear();
        selectedPassageId.set(id);
      } else {
        // In select mode, toggle selection
        if (selectedPassages.has(id)) {
          selectedPassages.delete(id);
        } else {
          selectedPassages.add(id);
        }
        selectedPassages = selectedPassages;
      }
      lastSelectedIndex = $filteredPassages.findIndex(p => p.id === id);
      return;
    }

    const currentIndex = $filteredPassages.findIndex(p => p.id === id);

    if (selectMode || event.ctrlKey || event.metaKey) {
      // Select mode or Ctrl/Cmd+Click: Toggle selection
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

  function toggleSelectMode() {
    selectMode = !selectMode;
    if (!selectMode) {
      clearSelection();
    }
  }

  function selectAll() {
    selectedPassages.clear();
    $filteredPassages.forEach(p => {
      selectedPassages.add(p.id);
    });
    selectedPassages = selectedPassages;
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

  function bulkRemoveTag() {
    if (selectedPassages.size === 0 || !$currentStory) return;

    const tagName = prompt('Enter tag name to remove from selected passages:');
    if (!tagName || !tagName.trim()) return;

    const trimmedTag = tagName.trim();
    selectedPassages.forEach(id => {
      const passage = $currentStory.getPassage(id);
      if (passage) {
        passage.tags = passage.tags.filter(t => t !== trimmedTag);
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

  function getPassageCommentInfo(passageId: string): { total: number; unresolved: number } {
    const comments = $commentsByPassage.get(passageId) || [];
    const unresolved = comments.filter(c => !c.resolved).length;
    return { total: comments.length, unresolved };
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
    if (contextMenuPassageId) {
      const duplicated = passageOperations.duplicatePassage(contextMenuPassageId);
      if (duplicated) {
        projectMetadataActions.markChanged();
        historyIntegration.pushCurrentState();
      }
      if (duplicated) {
        notificationStore.success(`Passage "${duplicated.title}" duplicated successfully`);
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

  // Drag-and-drop handlers
  function handleDragStart(event: DragEvent, index: number) {
    if (selectMode || $passageOrderState.sortOrder !== 'custom') return;

    draggedIndex = index;
    isDragging = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex === null || $passageOrderState.sortOrder !== 'custom') return;

    dragOverIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, toIndex: number) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) {
      resetDragState();
      return;
    }

    // Perform the move
    passageOrderActions.movePassage(draggedIndex, toIndex, $filteredPassages);

    resetDragState();
  }

  function handleDragEnd() {
    resetDragState();
  }

  function resetDragState() {
    draggedIndex = null;
    dragOverIndex = null;
    isDragging = false;
  }

  // Initialize custom order when component mounts or passages change
  $: if ($filteredPassages.length > 0 && $passageOrderState.customOrder.length === 0) {
    passageOrderActions.initializeCustomOrder($filteredPassages);
  }

  // Reload passage order when story changes
  $: if ($currentStory) {
    passageOrderActions.reloadFromStory();
  }

  // Sort order selection
  function handleSortOrderChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    passageOrderActions.setSortOrder(target.value as SortOrder);
  }

  // Keyboard navigation for reordering
  function handleListKeydown(event: KeyboardEvent) {
    if ($passageOrderState.sortOrder !== 'custom' || selectMode) return;

    const target = event.target as HTMLElement;
    const passageButton = target.closest('[data-passage-index]');
    if (!passageButton) return;

    const index = parseInt(passageButton.getAttribute('data-passage-index') || '-1');
    if (index < 0) return;

    // Alt/Option + Arrow keys to move passages
    if ((event.altKey || event.metaKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();

      if (event.key === 'ArrowUp' && index > 0) {
        passageOrderActions.movePassage(index, index - 1, $filteredPassages);
        focusedIndex = index - 1;
      } else if (event.key === 'ArrowDown' && index < $filteredPassages.length - 1) {
        passageOrderActions.movePassage(index, index + 1, $filteredPassages);
        focusedIndex = index + 1;
      }

      // Refocus the moved passage
      setTimeout(() => {
        const buttons = document.querySelectorAll('[data-passage-index]');
        (buttons[focusedIndex] as HTMLElement)?.focus();
      }, 10);
    }
  }
</script>

<svelte:window on:click={closeContextMenu} />

<div class="flex flex-col h-full bg-white border-r border-gray-300">
  <!-- Header -->
  <div class="p-3 border-b border-gray-300">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-800">
        Passages
        {#if $kidsModeEnabled && $kidsAgeGroup && $currentStory}
          {@const passageLimit = getPassageLimit($kidsAgeGroup)}
          {#if passageLimit}
            <span class="text-xs font-normal text-gray-500">
              ({$currentStory.passages.size}/{passageLimit})
            </span>
          {/if}
        {/if}
      </h3>
      <button
        class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 active:scale-95 transition-transform touch-manipulation"
        style="min-height: {$isMobile ? '44px' : 'auto'}"
        on:click={onAddPassage}
        title="Add new passage"
      >
        + Add
      </button>
    </div>
    <div class="flex items-center gap-2 mb-2">
      <button
        class="flex items-center gap-1 px-3 py-2 text-xs rounded border transition-colors touch-manipulation {selectMode ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
        style="min-height: {$isMobile ? '44px' : 'auto'}"
        on:click={toggleSelectMode}
        title="Toggle select mode"
      >
        <span>{selectMode ? '☑' : '☐'}</span>
        <span>Select</span>
      </button>
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

    <!-- Sort Order Selector -->
    <div class="flex items-center gap-2">
      <label for="sort-order" class="text-xs text-gray-600 font-medium">Sort:</label>
      <select
        id="sort-order"
        class="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
        style="min-height: {$isMobile ? '44px' : 'auto'}"
        value={$passageOrderState.sortOrder}
        on:change={handleSortOrderChange}
        aria-label="Sort passages by"
      >
        <option value="custom">Custom Order</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
        <option value="modified">Date Modified</option>
        <option value="created">Date Created</option>
      </select>
    </div>
  </div>

  <!-- Search and Filter Bar -->
  <SearchBar />

  <!-- Bulk Actions Toolbar -->
  {#if selectMode || selectedPassages.size > 0}
    <div class="bg-purple-100 border-b border-purple-300 px-3 py-2">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold text-purple-800">
          {selectedPassages.size} passage{selectedPassages.size !== 1 ? 's' : ''} selected
        </div>
        <div class="flex gap-2">
          <button
            class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 active:scale-95 transition-transform touch-manipulation"
            style="min-height: {$isMobile ? '44px' : 'auto'}"
            on:click={selectAll}
            title="Select all passages"
          >
            Select All
          </button>
          <button
            class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 active:scale-95 transition-transform touch-manipulation"
            style="min-height: {$isMobile ? '44px' : 'auto'}"
            on:click={clearSelection}
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      </div>
      {#if selectedPassages.size > 0}
        <div class="flex gap-2 flex-wrap">
          <button
            class="px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 active:scale-95 transition-transform touch-manipulation"
            style="min-height: {$isMobile ? '44px' : 'auto'}"
            on:click={bulkAddTag}
            title="Add tag to selected passages"
          >
            + Add Tag
          </button>
          <button
            class="px-3 py-2 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 active:scale-95 transition-transform touch-manipulation"
            style="min-height: {$isMobile ? '44px' : 'auto'}"
            on:click={bulkRemoveTag}
            title="Remove tag from selected passages"
          >
            - Remove Tag
          </button>
          <button
            class="px-3 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 active:scale-95 transition-transform touch-manipulation"
            style="min-height: {$isMobile ? '44px' : 'auto'}"
            on:click={bulkDelete}
            title="Delete selected passages"
          >
            Delete
          </button>
        </div>
      {/if}
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
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div class="overflow-y-auto h-full" role="group" on:keydown={handleListKeydown}>
        {#each $filteredPassages as passage, i}
          {@const validationSeverity = getPassageValidationSeverity(passage.id)}
          {@const validationCount = getPassageValidationCount(passage.id)}
          {@const commentInfo = getPassageCommentInfo(passage.id)}
          {@const mobilePadding = $isMobile ? 'px-3 py-3' : (compactView ? 'px-2 py-1' : 'px-3 py-2')}
          {@const isDraggedOver = dragOverIndex === i}
          {@const isBeingDragged = draggedIndex === i}
          {@const canDrag = $passageOrderState.sortOrder === 'custom' && !selectMode}
          <button
            type="button"
            class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 touch-manipulation active:scale-[0.98] {mobilePadding}"
            style="min-height: {$isMobile ? '56px' : 'auto'}"
            class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-blue-500={$selectedPassageId === passage.id}
            class:border-l-purple-500={selectedPassages.has(passage.id)}
            class:opacity-50={isBeingDragged}
            class:border-t-2={isDraggedOver}
            class:border-t-blue-500={isDraggedOver}
            draggable={canDrag}
            data-passage-index={i}
            on:click={(e) => selectPassage(passage.id, e)}
            on:contextmenu={(e) => handleContextMenu(e, passage.id)}
            on:keydown={(e) => handlePassageKeydown(e, passage.id)}
            on:mouseenter={(e) => handleMouseEnter(passage, e)}
            on:mouseleave={handleMouseLeave}
            on:dragstart={(e) => handleDragStart(e, i)}
            on:dragover={(e) => handleDragOver(e, i)}
            on:dragleave={handleDragLeave}
            on:drop={(e) => handleDrop(e, i)}
            on:dragend={handleDragEnd}
            use:setupPassageListeners={passage.id}
            aria-label="Passage: {passage.title}"
          >
          <div class="flex items-center {compactView ? 'gap-1' : 'gap-2'}">
            <!-- Drag Handle (only in custom sort mode) -->
            {#if canDrag && !$isMobile}
              <span
                class="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                title="Drag to reorder"
                aria-label="Drag handle"
              >
                ☰
              </span>
            {/if}
            <!-- Checkbox in select mode -->
            {#if selectMode}
              <input
                type="checkbox"
                checked={selectedPassages.has(passage.id)}
                on:click|stopPropagation
                on:change={() => {
                  if (selectedPassages.has(passage.id)) {
                    selectedPassages.delete(passage.id);
                  } else {
                    selectedPassages.add(passage.id);
                  }
                  selectedPassages = selectedPassages;
                }}
                class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                aria-label="Select passage"
              />
            {/if}

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
              {#if commentInfo.unresolved > 0}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded bg-blue-100 text-blue-700"
                  title="{commentInfo.unresolved} unresolved comment{commentInfo.unresolved !== 1 ? 's' : ''}"
                  aria-label="{commentInfo.unresolved} unresolved comment{commentInfo.unresolved !== 1 ? 's' : ''}"
                >
                  💬{commentInfo.unresolved}
                </span>
              {:else if commentInfo.total > 0}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded bg-green-100 text-green-700"
                  title="All comments resolved"
                  aria-label="All comments resolved"
                >
                  ✓💬
                </span>
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
      <VirtualList items={$filteredPassages} let:item={passage} let:index={i} height="100%">
        {@const validationSeverity = getPassageValidationSeverity(passage.id)}
        {@const validationCount = getPassageValidationCount(passage.id)}
        {@const commentInfo = getPassageCommentInfo(passage.id)}
        {@const mobilePadding = $isMobile ? 'px-3 py-3' : (compactView ? 'px-2 py-1' : 'px-3 py-2')}
        {@const isDraggedOver = dragOverIndex === i}
        {@const isBeingDragged = draggedIndex === i}
        {@const canDrag = $passageOrderState.sortOrder === 'custom' && !selectMode}
        <button
          type="button"
          class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 touch-manipulation active:scale-[0.98] {mobilePadding}"
          style="min-height: {$isMobile ? '56px' : 'auto'}"
          class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-blue-500={$selectedPassageId === passage.id}
          class:border-l-purple-500={selectedPassages.has(passage.id)}
          class:opacity-50={isBeingDragged}
          class:border-t-2={isDraggedOver}
          class:border-t-blue-500={isDraggedOver}
          draggable={canDrag}
          data-passage-index={i}
          on:click={(e) => selectPassage(passage.id, e)}
          on:contextmenu={(e) => handleContextMenu(e, passage.id)}
          on:keydown={(e) => handlePassageKeydown(e, passage.id)}
          on:dragstart={(e) => handleDragStart(e, i)}
          on:dragover={(e) => handleDragOver(e, i)}
          on:dragleave={handleDragLeave}
          on:drop={(e) => handleDrop(e, i)}
          on:dragend={handleDragEnd}
          aria-label="Passage: {passage.title}"
          on:mouseenter={(e) => handleMouseEnter(passage, e)}
          on:mouseleave={handleMouseLeave}
          use:setupPassageListeners={passage.id}
        >
          <div class="flex items-center {compactView ? 'gap-1' : 'gap-2'}">
            <!-- Drag Handle (only in custom sort mode) -->
            {#if canDrag && !$isMobile}
              <span
                class="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                title="Drag to reorder"
                aria-label="Drag handle"
              >
                ☰
              </span>
            {/if}
            <!-- Checkbox in select mode -->
            {#if selectMode}
              <input
                type="checkbox"
                checked={selectedPassages.has(passage.id)}
                on:click|stopPropagation
                on:change={() => {
                  if (selectedPassages.has(passage.id)) {
                    selectedPassages.delete(passage.id);
                  } else {
                    selectedPassages.add(passage.id);
                  }
                  selectedPassages = selectedPassages;
                }}
                class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                aria-label="Select passage"
              />
            {/if}

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
              {#if commentInfo.unresolved > 0}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded bg-blue-100 text-blue-700"
                  title="{commentInfo.unresolved} unresolved comment{commentInfo.unresolved !== 1 ? 's' : ''}"
                  aria-label="{commentInfo.unresolved} unresolved comment{commentInfo.unresolved !== 1 ? 's' : ''}"
                >
                  💬{commentInfo.unresolved}
                </span>
              {:else if commentInfo.total > 0}
                <span
                  class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded bg-green-100 text-green-700"
                  title="All comments resolved"
                  aria-label="All comments resolved"
                >
                  ✓💬
                </span>
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
    role="menu" tabindex="0"
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
