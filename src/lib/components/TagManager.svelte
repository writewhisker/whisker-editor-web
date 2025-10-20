<script lang="ts">
  import { tagRegistry, tagsByUsage, tagsByName, tagActions, type TagInfo } from '../stores/tagStore';
  import { currentStory, projectActions } from '../stores/projectStore';
  import { filterState } from '../stores/filterStore';

  let sortBy: 'name' | 'usage' | 'color' = 'usage';
  let searchQuery = '';
  let editingTag: string | null = null;
  let newTagName = '';
  let selectedTags = new Set<string>();
  let showMergeDialog = false;
  let mergeSource = '';
  let mergeTarget = '';
  let showColorPicker: string | null = null;

  // Reactive sorted and filtered tags
  $: sortedTags = sortBy === 'name' ? $tagsByName : $tagsByUsage;
  $: filteredTags = sortedTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  $: stats = tagActions.getTagStatistics();

  function startRename(tagName: string) {
    editingTag = tagName;
    newTagName = tagName;
  }

  function cancelRename() {
    editingTag = null;
    newTagName = '';
  }

  function confirmRename() {
    if (!editingTag || !newTagName || !$currentStory) return;
    if (newTagName === editingTag) {
      cancelRename();
      return;
    }

    // Check if new name already exists
    if ($tagRegistry.has(newTagName)) {
      alert(`Tag "${newTagName}" already exists. Use merge instead.`);
      return;
    }

    const count = tagActions.renameTag(editingTag, newTagName, $currentStory);
    currentStory.update(s => s);
    projectActions.markChanged();

    console.log(`Renamed "${editingTag}" to "${newTagName}" (${count} passages updated)`);
    cancelRename();
  }

  function deleteTag(tagName: string) {
    if (!$currentStory) return;

    const info = $tagRegistry.get(tagName);
    if (!info) return;

    const confirmed = confirm(
      `Delete tag "${tagName}"?\n\nThis will remove it from ${info.usageCount} passage(s).`
    );

    if (confirmed) {
      const count = tagActions.deleteTag(tagName, $currentStory);
      currentStory.update(s => s);
      projectActions.markChanged();

      console.log(`Deleted tag "${tagName}" from ${count} passages`);
    }
  }

  function filterByTag(tagName: string) {
    filterState.update(state => ({
      ...state,
      selectedTags: state.selectedTags.includes(tagName)
        ? state.selectedTags.filter(t => t !== tagName)
        : [...state.selectedTags, tagName],
    }));
  }

  function toggleTagSelection(tagName: string) {
    if (selectedTags.has(tagName)) {
      selectedTags.delete(tagName);
    } else {
      selectedTags.add(tagName);
    }
    selectedTags = selectedTags; // Trigger reactivity
  }

  function clearSelection() {
    selectedTags.clear();
    selectedTags = selectedTags;
  }

  function deleteSelected() {
    if (!$currentStory || selectedTags.size === 0) return;

    const confirmed = confirm(
      `Delete ${selectedTags.size} selected tag(s)?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      let totalCount = 0;
      selectedTags.forEach(tagName => {
        totalCount += tagActions.deleteTag(tagName, $currentStory!);
      });

      currentStory.update(s => s);
      projectActions.markChanged();
      clearSelection();

      console.log(`Deleted ${selectedTags.size} tags affecting ${totalCount} passages`);
    }
  }

  function openMergeDialog() {
    if (selectedTags.size !== 2) {
      alert('Please select exactly 2 tags to merge.');
      return;
    }

    const tags = Array.from(selectedTags);
    mergeSource = tags[0];
    mergeTarget = tags[1];
    showMergeDialog = true;
  }

  function closeMergeDialog() {
    showMergeDialog = false;
    mergeSource = '';
    mergeTarget = '';
  }

  function confirmMerge() {
    if (!$currentStory || !mergeSource || !mergeTarget) return;

    const count = tagActions.mergeTags(mergeSource, mergeTarget, $currentStory);
    currentStory.update(s => s);
    projectActions.markChanged();

    console.log(`Merged "${mergeSource}" into "${mergeTarget}" (${count} passages updated)`);
    closeMergeDialog();
    clearSelection();
  }

  function swapMergeTags() {
    [mergeSource, mergeTarget] = [mergeTarget, mergeSource];
  }

  function setTagColor(tagName: string, color: string) {
    tagActions.setTagColor(tagName, color);
    showColorPicker = null;
  }

  function resetTagColor(tagName: string) {
    tagActions.resetTagColor(tagName);
    showColorPicker = null;
  }
</script>

<div class="tag-manager flex flex-col h-full bg-white">
  <!-- Header -->
  <div class="border-b border-gray-300 p-4">
    <h2 class="text-xl font-bold mb-4">Tag Manager</h2>

    <!-- Statistics -->
    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
      <div class="bg-blue-50 p-3 rounded">
        <div class="text-blue-600 font-medium">Total Tags</div>
        <div class="text-2xl font-bold">{stats.totalTags}</div>
      </div>
      <div class="bg-green-50 p-3 rounded">
        <div class="text-green-600 font-medium">Total Usages</div>
        <div class="text-2xl font-bold">{stats.totalUsages}</div>
      </div>
      {#if stats.mostUsedTag}
        <div class="bg-purple-50 p-3 rounded col-span-2">
          <div class="text-purple-600 font-medium">Most Used Tag</div>
          <div class="flex items-center gap-2 mt-1">
            <span
              class="inline-block w-3 h-3 rounded"
              style="background-color: {stats.mostUsedTag.color}"
            ></span>
            <span class="font-bold">{stats.mostUsedTag.name}</span>
            <span class="text-sm text-gray-500">({stats.mostUsedTag.usageCount} uses)</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Search and Controls -->
    <div class="flex gap-2 mb-2">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search tags..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        bind:value={sortBy}
        class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="usage">Sort by Usage</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>

    <!-- Bulk Actions -->
    {#if selectedTags.size > 0}
      <div class="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
        <span class="font-medium">{selectedTags.size} selected</span>
        <button
          class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={clearSelection}
        >
          Clear
        </button>
        {#if selectedTags.size === 2}
          <button
            class="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            on:click={openMergeDialog}
          >
            Merge
          </button>
        {/if}
        <button
          class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          on:click={deleteSelected}
        >
          Delete
        </button>
      </div>
    {/if}
  </div>

  <!-- Tag List -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if filteredTags.length === 0}
      <div class="text-center text-gray-400 py-8">
        {searchQuery ? 'No tags match your search' : 'No tags yet'}
      </div>
    {:else}
      <div class="space-y-2">
        {#each filteredTags as tag (tag.name)}
          <div
            class="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
            class:bg-blue-50={selectedTags.has(tag.name)}
          >
            <!-- Selection Checkbox -->
            <input
              type="checkbox"
              checked={selectedTags.has(tag.name)}
              on:change={() => toggleTagSelection(tag.name)}
              class="w-4 h-4"
            />

            <!-- Color Indicator -->
            <div class="relative">
              <button
                class="w-6 h-6 rounded border-2 border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                style="background-color: {tag.color}"
                on:click={() => showColorPicker = showColorPicker === tag.name ? null : tag.name}
                title="Click to change color"
              ></button>

              {#if showColorPicker === tag.name}
                <div class="absolute z-10 left-0 top-8 bg-white border border-gray-300 rounded shadow-lg p-2">
                  <div class="grid grid-cols-4 gap-1 mb-2">
                    {#each [
                      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                      '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
                      '#84cc16', '#6366f1', '#14b8a6', '#a855f7'
                    ] as color}
                      <button
                        class="w-6 h-6 rounded border border-gray-300 hover:scale-110"
                        style="background-color: {color}"
                        on:click={() => setTagColor(tag.name, color)}
                      ></button>
                    {/each}
                  </div>
                  <button
                    class="w-full text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    on:click={() => resetTagColor(tag.name)}
                  >
                    Reset to Default
                  </button>
                </div>
              {/if}
            </div>

            <!-- Tag Name -->
            <div class="flex-1">
              {#if editingTag === tag.name}
                <input
                  type="text"
                  bind:value={newTagName}
                  class="px-2 py-1 border border-blue-500 rounded focus:outline-none"
                  on:keydown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  autofocus
                />
              {:else}
                <div class="flex items-center gap-2">
                  <span class="font-medium">{tag.name}</span>
                  <span class="text-sm text-gray-500">({tag.usageCount} {tag.usageCount === 1 ? 'use' : 'uses'})</span>
                </div>
              {/if}
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              {#if editingTag === tag.name}
                <button
                  class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  on:click={confirmRename}
                >
                  Save
                </button>
                <button
                  class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  on:click={cancelRename}
                >
                  Cancel
                </button>
              {:else}
                <button
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  on:click={() => filterByTag(tag.name)}
                  title="Filter passages by this tag"
                >
                  Filter
                </button>
                <button
                  class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  on:click={() => startRename(tag.name)}
                  title="Rename tag"
                >
                  Rename
                </button>
                <button
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  on:click={() => deleteTag(tag.name)}
                  title="Delete tag"
                >
                  Delete
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Merge Dialog -->
{#if showMergeDialog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-lg font-bold mb-4">Merge Tags</h3>

      <div class="mb-4">
        <p class="text-sm text-gray-600 mb-4">
          All instances of the source tag will be replaced with the target tag.
        </p>

        <div class="flex items-center gap-2 mb-2">
          <div class="flex-1 p-3 bg-gray-100 rounded">
            <div class="text-xs text-gray-500 mb-1">Source (will be deleted)</div>
            <div class="font-medium">{mergeSource}</div>
          </div>
          <button
            class="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            on:click={swapMergeTags}
            title="Swap source and target"
          >
            ↔
          </button>
          <div class="flex-1 p-3 bg-blue-50 rounded">
            <div class="text-xs text-blue-600 mb-1">Target (will be kept)</div>
            <div class="font-medium">{mergeTarget}</div>
          </div>
        </div>

        <div class="text-sm text-gray-600">
          {$tagRegistry.get(mergeSource)?.usageCount || 0} passage(s) will be updated.
        </div>
      </div>

      <div class="flex gap-2 justify-end">
        <button
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          on:click={closeMergeDialog}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={confirmMerge}
        >
          Merge Tags
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .tag-manager {
    max-height: 100vh;
  }
</style>
