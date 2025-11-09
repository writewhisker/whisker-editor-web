<script lang="ts">
  /**
   * Roblox Asset Picker
   *
   * Visual picker for Roblox items, badges, sounds, and locations.
   */

  import { createEventDispatcher } from 'svelte';
  import {
    robloxItems,
    robloxBadges,
    robloxSounds,
    robloxLocations,
    searchRobloxItems,
    searchRobloxBadges,
    type RobloxItem,
    type RobloxBadge,
    type RobloxSound,
    type RobloxLocation,
  } from '../../data/robloxAssets';

  export let show = false;
  export let assetType: 'item' | 'badge' | 'sound' | 'location' = 'item';

  const dispatch = createEventDispatcher<{
    close: void;
    select: { asset: RobloxItem | RobloxBadge | RobloxSound | RobloxLocation };
  }>();

  let searchQuery = '';
  let selectedCategory: string = 'all';

  $: filteredAssets = getFilteredAssets();

  function getFilteredAssets() {
    let assets: any[] = [];

    switch (assetType) {
      case 'item':
        assets = searchQuery
          ? searchRobloxItems(searchQuery)
          : selectedCategory === 'all'
          ? robloxItems
          : robloxItems.filter(item => item.category === selectedCategory);
        break;
      case 'badge':
        assets = searchQuery
          ? searchRobloxBadges(searchQuery)
          : selectedCategory === 'all'
          ? robloxBadges
          : robloxBadges.filter(badge => badge.type === selectedCategory);
        break;
      case 'sound':
        assets = selectedCategory === 'all'
          ? robloxSounds
          : robloxSounds.filter(sound => sound.type === selectedCategory);
        break;
      case 'location':
        assets = selectedCategory === 'all'
          ? robloxLocations
          : robloxLocations.filter(loc => loc.type === selectedCategory);
        break;
    }

    return assets;
  }

  function handleSelect(asset: any) {
    dispatch('select', { asset });
    show = false;
  }

  function handleClose() {
    dispatch('close');
    show = false;
  }

  function getCategories(): string[] {
    switch (assetType) {
      case 'item':
        return ['all', 'tool', 'gear', 'accessory', 'gamepass', 'other'];
      case 'badge':
        return ['all', 'achievement', 'milestone', 'special'];
      case 'sound':
        return ['all', 'music', 'effect', 'ambient'];
      case 'location':
        return ['all', 'game_type', 'environment', 'custom'];
      default:
        return ['all'];
    }
  }

  function getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  }

  function getTitle(): string {
    switch (assetType) {
      case 'item':
        return 'Choose a Roblox Item';
      case 'badge':
        return 'Choose a Badge';
      case 'sound':
        return 'Choose a Sound';
      case 'location':
        return 'Choose a Location';
      default:
        return 'Choose an Asset';
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  >
    <div
      class="bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-8 border-red-600"
      on:click|stopPropagation
      role="dialog" tabindex="-1"
      aria-labelledby="roblox-asset-picker-title"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-red-600 to-red-800 px-8 py-6">
        <div class="flex items-center justify-between">
          <h2 id="roblox-asset-picker-title" class="text-4xl font-black text-white flex items-center gap-3">
            <span class="text-5xl">🎮</span>
            {getTitle()}
          </h2>
          <button
            type="button"
            class="text-white hover:text-gray-200 text-5xl leading-none"
            on:click={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="px-8 py-6 border-b-4 border-red-400 bg-white">
        <!-- Search Box -->
        <div class="mb-4">
          <input
            type="text"
            placeholder="🔍 Search..."
            bind:value={searchQuery}
            class="w-full px-6 py-4 text-xl border-4 border-red-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500 font-semibold"
          />
        </div>

        <!-- Category Filter -->
        <div class="flex flex-wrap gap-3">
          {#each getCategories() as category}
            <button
              type="button"
              class="px-6 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-md
                {selectedCategory === category
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white border-4 border-red-800'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-4 border-gray-300'}"
              on:click={() => selectedCategory = category}
            >
              {getCategoryLabel(category)}
            </button>
          {/each}
        </div>
      </div>

      <!-- Asset Grid -->
      <div class="px-8 py-6 overflow-y-auto max-h-[50vh]">
        {#if filteredAssets.length === 0}
          <div class="text-center py-12">
            <div class="text-6xl mb-4">🔍</div>
            <p class="text-2xl font-bold text-gray-600">No assets found</p>
            <p class="text-lg text-gray-500 mt-2">Try a different search or category</p>
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-4">
            {#each filteredAssets as asset}
              <button
                type="button"
                class="bg-white rounded-2xl p-6 border-4 border-red-300 hover:border-red-500 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-center"
                on:click={() => handleSelect(asset)}
              >
                <!-- Asset Emoji -->
                <div class="text-6xl mb-3">{asset.emoji}</div>

                <!-- Asset Name -->
                <h3 class="text-xl font-black text-gray-900">{asset.name}</h3>

                <!-- Asset Type/Category Badge -->
                <div class="mt-3">
                  <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                    {#if asset.category}
                      {asset.category}
                    {:else if asset.type}
                      {asset.type}
                    {/if}
                  </span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="bg-gradient-to-r from-red-100 to-orange-100 px-8 py-6 border-t-4 border-red-400">
        <div class="flex items-center justify-between">
          <p class="text-gray-700 font-semibold">
            💡 Tip: Click on an asset to add it to your story!
          </p>
          <button
            type="button"
            class="px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-2xl font-bold text-lg shadow-lg"
            on:click={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
