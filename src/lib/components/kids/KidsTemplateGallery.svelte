<script lang="ts">
  /**
   * Kids Template Gallery
   *
   * Colorful, kid-friendly template selection dialog.
   */

  import { createEventDispatcher } from 'svelte';
  import { kidsTemplates, type KidsTemplate } from '../../templates/kidsTemplates';
  import { projectActions } from '../../stores/storyStateStore';
  import { notificationStore } from '../../stores/notificationStore';

  export let show = false;

  const dispatch = createEventDispatcher<{
    close: void;
    selectTemplate: { template: KidsTemplate };
  }>();

  let selectedPlatform: 'all' | 'minecraft' | 'roblox' = 'all';

  $: filteredTemplates = selectedPlatform === 'all'
    ? kidsTemplates
    : kidsTemplates.filter(t => t.platform === selectedPlatform || t.platform === 'both');

  function handleSelectTemplate(template: KidsTemplate) {
    try {
      // For now, just create a new project and show a message
      projectActions.newProject();
      notificationStore.success(`"${template.name}" template selected! (Template loading coming soon)`);
      dispatch('selectTemplate', { template });
      show = false;
    } catch (error) {
      console.error('Failed to load template:', error);
      notificationStore.error('Failed to load template. Please try again.');
    }
  }

  function handleClose() {
    dispatch('close');
    show = false;
  }

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 border-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-700 border-red-400';
      default: return 'bg-gray-100 text-gray-700 border-gray-400';
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
      class="bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border-8 border-purple-400"
      on:click|stopPropagation
      role="dialog" tabindex="-1"
      aria-labelledby="template-gallery-title"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 px-8 py-6">
        <div class="flex items-center justify-between">
          <h2 id="template-gallery-title" class="text-4xl font-black text-white flex items-center gap-3">
            <span class="text-5xl">🎨</span>
            Choose Your Story Template
          </h2>
          <button
            type="button"
            class="text-white hover:text-gray-200 text-5xl leading-none transition-transform hover:scale-110"
            on:click={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Platform Filter -->
      <div class="px-8 py-6 border-b-4 border-purple-300">
        <div class="flex items-center gap-4">
          <span class="text-xl font-bold text-gray-700">Choose Platform:</span>
          <div class="flex gap-3">
            <button
              type="button"
              class="px-6 py-3 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-md
                {selectedPlatform === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-4 border-purple-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-4 border-gray-300'}"
              on:click={() => selectedPlatform = 'all'}
            >
              🌟 All
            </button>
            <button
              type="button"
              class="px-6 py-3 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-md
                {selectedPlatform === 'minecraft'
                  ? 'bg-gradient-to-r from-green-500 to-green-700 text-white border-4 border-green-800'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-4 border-gray-300'}"
              on:click={() => selectedPlatform = 'minecraft'}
            >
              ⛏️ Minecraft
            </button>
            <button
              type="button"
              class="px-6 py-3 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-md
                {selectedPlatform === 'roblox'
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white border-4 border-red-800'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-4 border-gray-300'}"
              on:click={() => selectedPlatform = 'roblox'}
            >
              🎮 Roblox
            </button>
          </div>
        </div>
      </div>

      <!-- Template Grid -->
      <div class="px-8 py-6 overflow-y-auto max-h-[60vh]">
        {#if filteredTemplates.length === 0}
          <div class="text-center py-12">
            <div class="text-6xl mb-4">🔍</div>
            <p class="text-2xl font-bold text-gray-600">No templates found</p>
            <p class="text-lg text-gray-500 mt-2">Try selecting a different platform</p>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-6">
            {#each filteredTemplates as template}
              <button
                type="button"
                class="bg-white rounded-2xl p-6 border-4 border-purple-300 hover:border-purple-500 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-left"
                on:click={() => handleSelectTemplate(template)}
              >
                <!-- Template Icon -->
                <div class="text-6xl mb-4 text-center">{template.icon}</div>

                <!-- Template Name -->
                <h3 class="text-2xl font-black text-gray-900 mb-2">{template.name}</h3>

                <!-- Description -->
                <p class="text-gray-600 mb-4 font-semibold">{template.description}</p>

                <!-- Difficulty Badge -->
                <div class="flex items-center gap-2 mb-3">
                  <span class="px-3 py-1 rounded-full text-sm font-bold border-2 {getDifficultyColor(template.difficulty)}">
                    {template.difficulty.toUpperCase()}
                  </span>
                </div>

                <!-- Tags -->
                <div class="flex flex-wrap gap-2">
                  {#each template.tags as tag}
                    <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                      #{tag}
                    </span>
                  {/each}
                </div>

                <!-- Platform Badge -->
                <div class="mt-4 pt-4 border-t-2 border-gray-200">
                  <span class="text-sm font-bold text-gray-500">
                    {#if template.platform === 'minecraft'}
                      ⛏️ Minecraft
                    {:else if template.platform === 'roblox'}
                      🎮 Roblox
                    {:else}
                      🌟 Both Platforms
                    {/if}
                  </span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="bg-gradient-to-r from-blue-100 to-purple-100 px-8 py-6 border-t-4 border-purple-300">
        <div class="flex items-center justify-between">
          <p class="text-gray-700 font-semibold">
            💡 Tip: Start with a template and change it to make it your own!
          </p>
          <button
            type="button"
            class="px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all transform hover:scale-105"
            on:click={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
