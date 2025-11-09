<script lang="ts">
  /**
   * Kids Export Dialog
   *
   * Simplified, colorful export dialog for kids to share their stories
   * for Minecraft or Roblox.
   */

  import { createEventDispatcher } from 'svelte';
  import { currentStory } from '../../stores/storyStateStore';
  import { PublishingService } from '../../services/kids/publishingService';
  import { notificationStore } from '../../stores/notificationStore';

  export let show = false;
  export let platform: 'minecraft' | 'roblox' = 'minecraft';

  let exporting = false;
  let filename = '';
  let showCelebration = false;

  const dispatch = createEventDispatcher();

  // Update filename when platform or story changes
  $: if ($currentStory) {
    if (platform === 'minecraft') {
      filename = $currentStory.metadata.title.toLowerCase().replace(/\s+/g, '_') + '_datapack.zip';
    } else {
      filename = $currentStory.metadata.title.toLowerCase().replace(/\s+/g, '_') + '_roblox.zip';
    }
  }

  async function handleExport() {
    if (!$currentStory) return;

    exporting = true;

    try {
      let blob: Blob;

      if (platform === 'minecraft') {
        blob = await PublishingService.exportForMinecraft($currentStory);
      } else {
        blob = await PublishingService.exportForRoblox($currentStory);
      }

      // Download the file
      PublishingService.downloadBlob(blob, filename);

      // Show celebration
      showCelebration = true;
      setTimeout(() => {
        showCelebration = false;
        show = false;
      }, 2000);

      notificationStore.success(`${platform === 'minecraft' ? 'Minecraft' : 'Roblox'} story exported!`);
    } catch (error) {
      console.error('Export failed:', error);
      notificationStore.error('Oops! Export failed. Please try again.');
    } finally {
      exporting = false;
    }
  }

  function handleClose() {
    if (!exporting) {
      show = false;
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-dialog-title"
  >
    <div
      class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 transform transition-all"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      {#if showCelebration}
        <!-- Celebration Screen -->
        <div class="text-center py-12">
          <div class="text-9xl animate-bounce mb-6">🎉</div>
          <h2 class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
            Amazing Work!
          </h2>
          <p class="text-2xl text-gray-700 font-bold">
            Your story is ready to share!
          </p>
        </div>
      {:else}
        <!-- Export Dialog -->
        <div class="text-center mb-6">
          <div class="text-7xl mb-4">
            {platform === 'minecraft' ? '⛏️' : '🎮'}
          </div>
          <h2 id="export-dialog-title" class="text-4xl font-black text-gray-800 mb-2">
            Share Your Story
          </h2>
          <p class="text-xl text-gray-600 font-semibold">
            Export for {platform === 'minecraft' ? 'Minecraft' : 'Roblox'}
          </p>
        </div>

        <!-- Preview Card -->
        {#if $currentStory}
          <div class="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 mb-6 border-4 border-purple-300">
            <h3 class="text-2xl font-black text-purple-900 mb-2">
              {$currentStory.metadata.title}
            </h3>
            <div class="flex gap-4 text-lg font-bold text-purple-700">
              <span>📄 {$currentStory.passages.size} Story Pages</span>
              {#if $currentStory.metadata.author}
                <span>✍️ by {$currentStory.metadata.author}</span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Filename Input -->
        <div class="mb-6">
          <label class="block text-lg font-black text-gray-700 mb-2" for="export-filename">
            File Name:
          </label>
          <input
            id="export-filename"
            type="text"
            bind:value={filename}
            class="w-full px-4 py-3 text-xl rounded-xl border-4 border-gray-300 focus:border-purple-500 focus:outline-none font-bold"
            disabled={exporting}
          />
        </div>

        <!-- Platform-specific info -->
        <div class="bg-blue-50 rounded-2xl p-6 mb-6 border-4 border-blue-300">
          <h4 class="text-lg font-black text-blue-900 mb-3">
            {platform === 'minecraft' ? '📦 What you\'ll get:' : '📦 What you\'ll get:'}
          </h4>
          {#if platform === 'minecraft'}
            <ul class="space-y-2 text-blue-800 font-bold">
              <li>✓ Minecraft datapack (ZIP file)</li>
              <li>✓ Story dialogue system</li>
              <li>✓ Clickable choices in-game</li>
              <li>✓ Installation instructions</li>
            </ul>
          {:else}
            <ul class="space-y-2 text-blue-800 font-bold">
              <li>✓ Roblox Lua scripts (ZIP file)</li>
              <li>✓ Story module with all your pages</li>
              <li>✓ Dialogue system & GUI</li>
              <li>✓ Badge & save system</li>
              <li>✓ Installation instructions</li>
            </ul>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-4">
          <button
            type="button"
            class="flex-1 px-8 py-4 rounded-2xl text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl hover:scale-105 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={handleExport}
            disabled={exporting || !$currentStory}
          >
            {#if exporting}
              <span class="animate-pulse">⏳ Exporting...</span>
            {:else}
              <span>🚀 Export Now!</span>
            {/if}
          </button>
          <button
            type="button"
            class="px-8 py-4 rounded-2xl text-xl font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all disabled:opacity-50"
            on:click={handleClose}
            disabled={exporting}
          >
            Cancel
          </button>
        </div>

        <!-- Tip -->
        <div class="mt-6 text-center text-gray-600 font-semibold">
          💡 Tip: The ZIP file will download to your computer!
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }
</style>
