<script lang="ts">
  /**
   * Minecraft Asset Picker
   *
   * Visual picker for Minecraft items, mobs, biomes, and locations.
   */

  import { createEventDispatcher } from 'svelte';
  import {
    minecraftItems,
    minecraftMobs,
    minecraftBiomes,
    minecraftLocations,
    searchMinecraftItems,
    searchMinecraftMobs,
    type MinecraftItem,
    type MinecraftMob,
    type MinecraftBiome,
    type MinecraftLocation,
  } from '../../data/minecraftAssets';

  export let show = false;
  export let assetType: 'item' | 'mob' | 'biome' | 'location' = 'item';

  const dispatch = createEventDispatcher<{
    close: void;
    select: { asset: MinecraftItem | MinecraftMob | MinecraftBiome | MinecraftLocation };
  }>();

  let searchQuery = '';
  let selectedCategory: string = 'all';

  $: filteredAssets = getFilteredAssets();

  function getFilteredAssets() {
    let assets: any[] = [];

    switch (assetType) {
      case 'item':
        assets = searchQuery
          ? searchMinecraftItems(searchQuery)
          : selectedCategory === 'all'
          ? minecraftItems
          : minecraftItems.filter(item => item.category === selectedCategory);
        break;
      case 'mob':
        assets = searchQuery
          ? searchMinecraftMobs(searchQuery)
          : selectedCategory === 'all'
          ? minecraftMobs
          : minecraftMobs.filter(mob => (mob as any).type === selectedCategory);
        break;
      case 'biome':
        assets = selectedCategory === 'all'
          ? minecraftBiomes
          : minecraftBiomes.filter(biome => (biome as any).climate === selectedCategory);
        break;
      case 'location':
        assets = selectedCategory === 'all'
          ? minecraftLocations
          : minecraftLocations.filter(loc => (loc as any).type === selectedCategory);
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
        return ['all', 'tool', 'weapon', 'food', 'block', 'treasure', 'other'];
      case 'mob':
        return ['all', 'hostile', 'neutral', 'passive'];
      case 'biome':
        return ['all', 'hot', 'cold', 'temperate', 'ocean'];
      case 'location':
        return ['all', 'structure', 'dimension', 'custom'];
      default:
        return ['all'];
    }
  }

  function getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  function getTitle(): string {
    switch (assetType) {
      case 'item':
        return 'Choose a Minecraft Item';
      case 'mob':
        return 'Choose a Minecraft Mob';
      case 'biome':
        return 'Choose a Minecraft Biome';
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
      class="bg-gradient-to-br from-green-100 via-lime-100 to-emerald-100 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-8 border-green-600"
      on:click|stopPropagation
      role="dialog" tabindex="-1"
      aria-labelledby="asset-picker-title"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-800 px-8 py-6">
        <div class="flex items-center justify-between">
          <h2 id="asset-picker-title" class="text-4xl font-black text-white flex items-center gap-3">
            <span class="text-5xl">⛏️</span>
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
      <div class="px-8 py-6 border-b-4 border-green-400 bg-white">
        <!-- Search Box -->
        <div class="mb-4">
          <input
            type="text"
            placeholder="🔍 Search..."
            bind:value={searchQuery}
            class="w-full px-6 py-4 text-xl border-4 border-green-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500 font-semibold"
          />
        </div>

        <!-- Category Filter -->
        <div class="flex flex-wrap gap-3">
          {#each getCategories() as category}
            <button
              type="button"
              class="px-6 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-md
                {selectedCategory === category
                  ? 'bg-gradient-to-r from-green-500 to-green-700 text-white border-4 border-green-800'
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
                class="bg-white rounded-2xl p-6 border-4 border-green-300 hover:border-green-500 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-center"
                on:click={() => handleSelect(asset)}
              >
                <!-- Asset Emoji -->
                <div class="text-6xl mb-3">{asset.emoji}</div>

                <!-- Asset Name -->
                <h3 class="text-xl font-black text-gray-900">{asset.name}</h3>

                <!-- Asset Type/Category Badge -->
                <div class="mt-3">
                  <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    {#if asset.category}
                      {asset.category}
                    {:else if asset.type}
                      {asset.type}
                    {:else if asset.climate}
                      {asset.climate}
                    {/if}
                  </span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="bg-gradient-to-r from-green-100 to-lime-100 px-8 py-6 border-t-4 border-green-400">
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
