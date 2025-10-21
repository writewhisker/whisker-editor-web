<script lang="ts">
  import { currentStory, selectedPassageId } from '../stores/projectStore';
  import { filteredPassages } from '../stores/filterStore';
  import { validationResult } from '../stores/validationStore';
  import type { Passage } from '../models/Passage';
  import SearchBar from './SearchBar.svelte';
  import { tagActions } from '../stores/tagStore';

  export let onAddPassage: () => void;
  export let onDeletePassage: (id: string) => void;

  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuPassageId: string | null = null;

  function selectPassage(id: string) {
    selectedPassageId.set(id);
  }

  function isStartPassage(passage: Passage): boolean {
    return $currentStory?.startPassage === passage.id;
  }

  function isOrphan(passage: Passage): boolean {
    if (!$currentStory || isStartPassage(passage)) return false;

    // Check if any other passage has a choice pointing to this one
    return !Array.from($currentStory.passages.values()).some(p =>
      p.choices.some(c => c.target === passage.id)
    );
  }

  function hasNoChoices(passage: Passage): boolean {
    return passage.choices.length === 0;
  }

  function getPassageValidationSeverity(passageId: string): 'error' | 'warning' | 'info' | null {
    if (!$validationResult) return null;

    const passageIssues = $validationResult.issues.filter(i => i.passageId === passageId);
    if (passageIssues.length === 0) return null;

    // Return highest severity
    if (passageIssues.some(i => i.severity === 'error')) return 'error';
    if (passageIssues.some(i => i.severity === 'warning')) return 'warning';
    return 'info';
  }

  function getPassageValidationCount(passageId: string): number {
    if (!$validationResult) return 0;
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
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-gray-800">Passages</h3>
      <button
        class="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        on:click={onAddPassage}
        title="Add new passage"
      >
        + Add
      </button>
    </div>
  </div>

  <!-- Search and Filter Bar -->
  <SearchBar />

  <!-- Passage List -->
  <div class="flex-1 overflow-y-auto">
    {#if $filteredPassages.length === 0}
      <div class="p-4 text-sm text-gray-400 text-center">
        No passages match your filters
      </div>
    {:else}
      {#each $filteredPassages as passage (passage.id)}
        <button
          class="w-full text-left px-3 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          class:bg-blue-50={$selectedPassageId === passage.id}
          class:border-l-4={$selectedPassageId === passage.id}
          class:border-l-blue-500={$selectedPassageId === passage.id}
          on:click={() => selectPassage(passage.id)}
          on:contextmenu={(e) => handleContextMenu(e, passage.id)}
        >
          <div class="flex items-center gap-2">
            <!-- Icons -->
            <div class="flex gap-1">
              {#if isStartPassage(passage)}
                <span class="text-green-600" title="Start passage">▶</span>
              {/if}
              {#if isOrphan(passage)}
                <span class="text-orange-500" title="Orphaned passage">⚠</span>
              {/if}
              {#if hasNoChoices(passage)}
                <span class="text-gray-400" title="Dead end">⏹</span>
              {/if}
              {@const validationSeverity = getPassageValidationSeverity(passage.id)}
              {@const validationCount = getPassageValidationCount(passage.id)}
              {#if validationSeverity}
                <span
                  class="text-xs font-medium px-1 rounded {validationSeverity === 'error' ? 'bg-red-100 text-red-700' : validationSeverity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}"
                  title="{validationCount} validation issue{validationCount !== 1 ? 's' : ''}"
                >
                  {validationSeverity === 'error' ? '🔴' : validationSeverity === 'warning' ? '⚠️' : 'ℹ️'}
                  {validationCount}
                </span>
              {/if}
            </div>

            <!-- Title -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{passage.title}</div>
              <div class="text-xs text-gray-500 truncate">
                {passage.content.slice(0, 50)}{passage.content.length > 50 ? '...' : ''}
              </div>

              <!-- Tags -->
              {#if passage.tags.length > 0}
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

            <!-- Choice count -->
            <div class="text-xs text-gray-400">
              {passage.choices.length} choice{passage.choices.length !== 1 ? 's' : ''}
            </div>
          </div>
        </button>
      {/each}
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
    >
      Set as Start
    </button>
    <button
      class="w-full text-left px-3 py-1 text-sm hover:bg-gray-100"
      on:click={handleDuplicate}
    >
      Duplicate
    </button>
    <div class="border-t border-gray-200 my-1"></div>
    <button
      class="w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50"
      on:click={handleDelete}
    >
      Delete
    </button>
  </div>
{/if}
