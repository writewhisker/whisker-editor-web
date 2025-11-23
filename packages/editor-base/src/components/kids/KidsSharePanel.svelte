<script lang="ts">
  /**
   * Kids Share Panel
   *
   * Provides various sharing options for kids to share their stories.
   */

  import { currentStory } from '../../stores/storyStateStore';
  import { PublishingService } from '../../services/kids/publishingService';
  import { notificationStore } from '../../stores/notificationStore';
  import { parentalControlsStore } from '../../stores/parentalControlsStore';

  export let show = false;

  let copiedToClipboard = false;
  let qrCodeUrl = '';

  async function handleCopyStory() {
    if (!$currentStory) return;

    try {
      await PublishingService.copyToClipboard(JSON.stringify($currentStory.serialize(), null, 2));
      copiedToClipboard = true;
      notificationStore.success('Story copied to clipboard!');

      setTimeout(() => {
        copiedToClipboard = false;
      }, 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      notificationStore.error('Oops! Failed to copy story.');
    }
  }

  async function generateQRCode() {
    // Placeholder URL - in production this would be a real shareable link
    const shareUrl = `https://example.com/story/${$currentStory?.metadata.id || 'demo'}`;
    qrCodeUrl = await PublishingService.generateQRCode(shareUrl);
  }

  function handleClose() {
    show = false;
  }

  $: if (show && $currentStory) {
    generateQRCode();
  }

  // Check if sharing is allowed by parental controls
  $: sharingAllowed = !$parentalControlsStore.exportRestricted ||
                      $parentalControlsStore.allowLocalExport;
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="share-panel-title"
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 transform transition-all max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="text-7xl mb-4">🌟</div>
        <h2 id="share-panel-title" class="text-4xl font-black text-gray-800 mb-2">
          Share Your Story
        </h2>
        <p class="text-xl text-gray-600 font-semibold">
          Choose how you want to share your awesome story!
        </p>
      </div>

      {#if !sharingAllowed}
        <!-- Parental Controls Message -->
        <div class="bg-yellow-50 rounded-2xl p-6 mb-6 border-4 border-yellow-300">
          <div class="text-5xl mb-3 text-center">🔒</div>
          <p class="text-xl text-yellow-900 font-bold text-center">
            Sharing is restricted by parental controls.
            <br />
            Ask a parent to change the settings if you'd like to share!
          </p>
        </div>
      {:else}
        <!-- Sharing Options Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Copy Story Text -->
          <button
            type="button"
            class="bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 rounded-2xl p-6 border-4 border-blue-400 transform hover:scale-105 transition-all text-left"
            on:click={handleCopyStory}
          >
            <div class="text-5xl mb-3">📋</div>
            <h3 class="text-2xl font-black text-blue-900 mb-2">Copy Story</h3>
            <p class="text-blue-700 font-bold">
              Copy your story text to paste anywhere!
            </p>
            {#if copiedToClipboard}
              <div class="mt-3 text-green-600 font-black text-lg">✓ Copied!</div>
            {/if}
          </button>

          <!-- Download for Minecraft -->
          <button
            type="button"
            class="bg-gradient-to-br from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 rounded-2xl p-6 border-4 border-green-400 transform hover:scale-105 transition-all text-left"
            on:click={() => {
              show = false;
              // Trigger export dialog for Minecraft
              notificationStore.info('Opening Minecraft export...');
            }}
          >
            <div class="text-5xl mb-3">⛏️</div>
            <h3 class="text-2xl font-black text-green-900 mb-2">Minecraft</h3>
            <p class="text-green-700 font-bold">
              Export as a Minecraft datapack!
            </p>
          </button>

          <!-- Download for Roblox -->
          <button
            type="button"
            class="bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-2xl p-6 border-4 border-red-400 transform hover:scale-105 transition-all text-left"
            on:click={() => {
              show = false;
              // Trigger export dialog for Roblox
              notificationStore.info('Opening Roblox export...');
            }}
          >
            <div class="text-5xl mb-3">🎮</div>
            <h3 class="text-2xl font-black text-red-900 mb-2">Roblox</h3>
            <p class="text-red-700 font-bold">
              Export as Roblox Lua scripts!
            </p>
          </button>

          <!-- QR Code -->
          <div class="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 border-4 border-purple-400">
            <div class="text-5xl mb-3">📱</div>
            <h3 class="text-2xl font-black text-purple-900 mb-2">QR Code</h3>
            <p class="text-purple-700 font-bold mb-4">
              Scan to share with friends!
            </p>
            {#if qrCodeUrl}
              <img src={qrCodeUrl} alt="QR Code" class="w-32 h-32 mx-auto bg-white rounded-lg p-2" />
            {:else}
              <div class="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center">
                <span class="text-gray-400">Loading...</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Export History -->
        {#if PublishingService.getExportHistory().length > 0}
          <div class="bg-gray-50 rounded-2xl p-6 border-4 border-gray-300">
            <h3 class="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
              <span>📊</span>
              Your Export History
            </h3>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              {#each PublishingService.getExportHistory().slice(-5).reverse() as exportItem}
                <div class="flex items-center gap-3 text-sm font-bold">
                  <span class="text-2xl">
                    {exportItem.platform === 'minecraft' ? '⛏️' : '🎮'}
                  </span>
                  <span class="flex-1 text-gray-700">{exportItem.storyTitle}</span>
                  <span class="text-gray-500">
                    {new Date(exportItem.timestamp).toLocaleDateString()}
                  </span>
                  {#if exportItem.success}
                    <span class="text-green-600">✓</span>
                  {:else}
                    <span class="text-red-600">✗</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Close Button -->
      <div class="mt-8 text-center">
        <button
          type="button"
          class="px-10 py-4 rounded-2xl text-xl font-black bg-gray-200 text-gray-700 hover:bg-gray-300 transform hover:scale-105 transition-all"
          on:click={handleClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
