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

  export let onAddPassage: () => void;
  export let onDeletePassage: (id: string) => void;

  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuPassageId: string | null = null;

  // Multi-select state
  let selectedPassages = new Set<string>();
  let lastSelectedIndex = -1;

  // Compact view mode
  let compactView = false;

  // Load compact view preference from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('passageList.compactView');
    if (saved !== null) {
      compactView = saved === 'true';
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
  }

  function closeContextMenu() {
    showContextMenu = false;
    contextMenuPassageId = null;
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
        class="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        on:click={onAddPassage}
        title="Add new passage"
      >
        + Add
      </button>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors {compactView ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
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
          class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
          on:click={bulkAddTag}
          title="Add tag to selected passages"
        >
          Add Tag
        </button>
        <button
          class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          on:click={bulkDelete}
          title="Delete selected passages"
        >
          Delete
        </button>
        <button
          class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
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
          <button
            class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 {compactView ? 'px-2 py-1' : 'px-3 py-2'}"
            class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
            class:border-l-blue-500={$selectedPassageId === passage.id}
            class:border-l-purple-500={selectedPassages.has(passage.id)}
            on:click={(e) => selectPassage(passage.id, e)}
            on:contextmenu={(e) => handleContextMenu(e, passage.id)}
            on:mouseenter={(e) => handleMouseEnter(passage, e)}
            on:mouseleave={handleMouseLeave}
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
              {#if true}
                {@const validationSeverity = getPassageValidationSeverity(passage.id)}
                {@const validationCount = getPassageValidationCount(passage.id)}
                {#if validationSeverity}
                  <span
                    class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded {validationSeverity === 'error' ? 'bg-red-100 text-red-700' : validationSeverity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}"
                    title="{validationCount} validation issue{validationCount !== 1 ? 's' : ''}"
                  >
                    {validationSeverity === 'error' ? '🔴' : validationSeverity === 'warning' ? '⚠️' : 'ℹ️'}
                    {validationCount}
                  </span>
                {/if}
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
            {#if !compactView}
              {@const wordCount = passage.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length}
              {@const incomingLinks = $currentStory ? Array.from($currentStory.passages.values()).filter((p: Passage) => p.choices.some((c: Choice) => c.target === passage.id)).length : 0}
              <div class="flex flex-col gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                <div title="Word count">📝 {wordCount}w</div>
                <div title="Outgoing choices">→ {passage.choices.length}</div>
                <div title="Incoming links">← {incomingLinks}</div>
              </div>
            {:else}
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
        <button
          class="w-full text-left border-b border-gray-200 hover:bg-gray-50 motion-safe:transition-colors motion-safe:duration-150 {compactView ? 'px-2 py-1' : 'px-3 py-2'}"
          class:bg-blue-50={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-4={$selectedPassageId === passage.id || selectedPassages.has(passage.id)}
          class:border-l-blue-500={$selectedPassageId === passage.id}
          class:border-l-purple-500={selectedPassages.has(passage.id)}
          on:click={(e) => selectPassage(passage.id, e)}
          on:contextmenu={(e) => handleContextMenu(e, passage.id)}
          on:mouseenter={(e) => handleMouseEnter(passage, e)}
          on:mouseleave={handleMouseLeave}
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
              {#if true}
                {@const validationSeverity = getPassageValidationSeverity(passage.id)}
                {@const validationCount = getPassageValidationCount(passage.id)}
                {#if validationSeverity}
                  <span
                    class="{compactView ? 'text-[10px]' : 'text-xs'} font-medium px-1 rounded {validationSeverity === 'error' ? 'bg-red-100 text-red-700' : validationSeverity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}"
                    title="{validationCount} validation issue{validationCount !== 1 ? 's' : ''}"
                  >
                    {validationSeverity === 'error' ? '🔴' : validationSeverity === 'warning' ? '⚠️' : 'ℹ️'}
                    {validationCount}
                  </span>
                {/if}
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
            {#if !compactView}
              {@const wordCount = passage.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length}
              {@const incomingLinks = $currentStory ? Array.from($currentStory.passages.values()).filter((p: Passage) => p.choices.some((c: Choice) => c.target === passage.id)).length : 0}
              <div class="flex flex-col gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                <div title="Word count">📝 {wordCount}w</div>
                <div title="Outgoing choices">→ {passage.choices.length}</div>
                <div title="Incoming links">← {incomingLinks}</div>
              </div>
            {:else}
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
    class="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-[150px]"
    style="left: {contextMenuX}px; top: {contextMenuY}px;"
    on:click|stopPropagation
  >
    <button
      class="w-full text-left px-3 py-1 text-sm hover:bg-gray-100"
      on:click={handleSetAsStart}
      title="Make this the starting passage"
    >
      Set as Start
    </button>
    <button
      class="w-full text-left px-3 py-1 text-sm hover:bg-gray-100"
      on:click={handleDuplicate}
      title="Create a copy of this passage"
    >
      Duplicate
    </button>
    <div class="border-t border-gray-200 my-1"></div>
    <button
      class="w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50"
      on:click={handleDelete}
      title="Delete this passage"
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
