<script lang="ts">
  import {
    filterState,
    filterActions,
    availableTags,
    hasActiveFilters,
    filteredPassages,
    filterCount,
  } from '../stores/filterStore';
  import { passageList } from '../stores/projectStore';

  let showTagDropdown = false;
  let showTypeDropdown = false;

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    filterActions.setSearchQuery(target.value);
  }

  function closeDropdowns() {
    showTagDropdown = false;
    showTypeDropdown = false;
  }
</script>

<svelte:window on:click={closeDropdowns} />

<div class="bg-white border-b border-gray-300 p-3">
  <!-- Search Input -->
  <div class="flex items-center gap-2 mb-2">
    <div class="flex-1 relative">
      <input
        type="text"
        placeholder="Search passages..."
        value={$filterState.searchQuery}
        on:input={handleSearchInput}
        class="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
      {#if $filterState.searchQuery}
        <button
          class="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          on:click={() => filterActions.clearSearchQuery()}
        >
          ✕
        </button>
      {/if}
    </div>

    {#if $hasActiveFilters}
      <button
        class="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        on:click={() => filterActions.clearAllFilters()}
        title="Clear all filters"
      >
        Clear All
      </button>
    {/if}
  </div>

  <!-- Filter Controls -->
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Tag Filter Dropdown -->
    {#if $availableTags.length > 0}
      <div class="relative">
        <button
          class="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
          class:bg-blue-50={$filterState.selectedTags.length > 0}
          class:border-blue-400={$filterState.selectedTags.length > 0}
          on:click|stopPropagation={() => (showTagDropdown = !showTagDropdown)}
        >
          🏷️ Tags
          {#if $filterState.selectedTags.length > 0}
            <span class="bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">
              {$filterState.selectedTags.length}
            </span>
          {/if}
        </button>

        {#if showTagDropdown}
          <div
            class="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto"
            on:click|stopPropagation
          >
            <div class="p-2">
              {#each $availableTags as tag}
                <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={$filterState.selectedTags.includes(tag)}
                    on:change={() => filterActions.toggleTag(tag)}
                    class="rounded"
                  />
                  <span class="text-sm">{tag}</span>
                </label>
              {/each}
            </div>
            {#if $filterState.selectedTags.length > 0}
              <div class="border-t border-gray-200 p-2">
                <button
                  class="w-full text-sm text-red-600 hover:bg-red-50 rounded px-2 py-1"
                  on:click={() => filterActions.clearTagFilters()}
                >
                  Clear Tag Filters
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Passage Type Filter Dropdown -->
    <div class="relative">
      <button
        class="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
        class:bg-blue-50={$filterState.passageTypes.length > 0}
        class:border-blue-400={$filterState.passageTypes.length > 0}
        on:click|stopPropagation={() => (showTypeDropdown = !showTypeDropdown)}
      >
        📊 Type
        {#if $filterState.passageTypes.length > 0}
          <span class="bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">
            {$filterState.passageTypes.length}
          </span>
        {/if}
      </button>

      {#if showTypeDropdown}
        <div
          class="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[180px]"
          on:click|stopPropagation
        >
          <div class="p-2">
            <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={$filterState.passageTypes.includes('start')}
                on:change={() => filterActions.togglePassageType('start')}
                class="rounded"
              />
              <span class="text-green-600">▶</span>
              <span class="text-sm">Start</span>
            </label>
            <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={$filterState.passageTypes.includes('orphan')}
                on:change={() => filterActions.togglePassageType('orphan')}
                class="rounded"
              />
              <span class="text-orange-500">⚠</span>
              <span class="text-sm">Orphaned</span>
            </label>
            <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={$filterState.passageTypes.includes('dead')}
                on:change={() => filterActions.togglePassageType('dead')}
                class="rounded"
              />
              <span class="text-gray-400">⏹</span>
              <span class="text-sm">Dead End</span>
            </label>
            <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={$filterState.passageTypes.includes('normal')}
                on:change={() => filterActions.togglePassageType('normal')}
                class="rounded"
              />
              <span class="text-blue-500">●</span>
              <span class="text-sm">Normal</span>
            </label>
          </div>
          {#if $filterState.passageTypes.length > 0}
            <div class="border-t border-gray-200 p-2">
              <button
                class="w-full text-sm text-red-600 hover:bg-red-50 rounded px-2 py-1"
                on:click={() => filterActions.clearPassageTypeFilters()}
              >
                Clear Type Filters
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Include Choice Text Toggle -->
    <label class="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={$filterState.includeChoiceText}
        on:change={() => filterActions.toggleIncludeChoiceText()}
        class="rounded"
      />
      <span>Search choices</span>
    </label>

    <!-- Results Count -->
    <div class="ml-auto text-sm text-gray-600">
      {#if $hasActiveFilters}
        <span class="font-medium">{$filteredPassages.length}</span> of
      {/if}
      <span class="font-medium">{$passageList.length}</span>
      passage{$passageList.length !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Active Filter Chips -->
  {#if $hasActiveFilters}
    <div class="flex items-center gap-2 mt-2 flex-wrap">
      <span class="text-xs text-gray-500">Active filters:</span>

      {#if $filterState.searchQuery}
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
          🔍 "{$filterState.searchQuery}"
          <button
            class="hover:text-blue-900"
            on:click={() => filterActions.clearSearchQuery()}
          >
            ✕
          </button>
        </span>
      {/if}

      {#each $filterState.selectedTags as tag}
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
          🏷️ {tag}
          <button class="hover:text-purple-900" on:click={() => filterActions.toggleTag(tag)}>
            ✕
          </button>
        </span>
      {/each}

      {#each $filterState.passageTypes as type}
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
          {#if type === 'start'}▶ Start
          {:else if type === 'orphan'}⚠ Orphaned
          {:else if type === 'dead'}⏹ Dead End
          {:else if type === 'normal'}● Normal
          {/if}
          <button
            class="hover:text-green-900"
            on:click={() => filterActions.togglePassageType(type)}
          >
            ✕
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>
