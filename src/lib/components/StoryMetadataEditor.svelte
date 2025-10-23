<script lang="ts">
  import { currentStory, projectActions } from '../stores/projectStore';

  export let show = false;

  let title = '';
  let author = '';
  let version = '';
  let description = '';

  // Initialize with current story metadata when shown
  $: if (show && $currentStory) {
    title = $currentStory.metadata.title;
    author = $currentStory.metadata.author || '';
    version = $currentStory.metadata.version || '1.0.0';
    description = $currentStory.metadata.description || '';
  }

  function close() {
    show = false;
  }

  function handleSave() {
    if (!$currentStory) return;

    // Update story metadata
    $currentStory.metadata.title = title.trim() || 'Untitled Story';
    $currentStory.metadata.author = author.trim();
    $currentStory.metadata.version = version.trim() || '1.0.0';
    $currentStory.metadata.description = description.trim();
    $currentStory.updateModified();

    // Trigger store update
    currentStory.set($currentStory);
    projectActions.markChanged();

    close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={close}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="metadata-title"
      tabindex="-1"
    >
      <h2 id="metadata-title" class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Story Metadata
      </h2>

      <form on:submit|preventDefault={handleSave} class="space-y-4">
        <!-- Title -->
        <div>
          <label for="story-title" class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Story Title <span class="text-red-500">*</span>
          </label>
          <input
            id="story-title"
            type="text"
            bind:value={title}
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter story title..."
          />
        </div>

        <!-- Author -->
        <div>
          <label for="story-author" class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Author
          </label>
          <input
            id="story-author"
            type="text"
            bind:value={author}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter author name..."
          />
        </div>

        <!-- Version -->
        <div>
          <label for="story-version" class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Version
          </label>
          <input
            id="story-version"
            type="text"
            bind:value={version}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="e.g., 1.0.0"
          />
          <div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Semantic versioning recommended (e.g., 1.0.0, 2.1.3)
          </div>
        </div>

        <!-- Description -->
        <div>
          <label for="story-description" class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="story-description"
            bind:value={description}
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Brief description of your story..."
          ></textarea>
        </div>

        <!-- Metadata Info (Read-only) -->
        {#if $currentStory}
          <div class="pt-4 border-t border-gray-300 dark:border-gray-600">
            <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>
                <span class="font-semibold">Created:</span>
                {new Date($currentStory.metadata.created).toLocaleString()}
              </div>
              <div>
                <span class="font-semibold">Last Modified:</span>
                {new Date($currentStory.metadata.modified).toLocaleString()}
              </div>
            </div>
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
            on:click={close}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Additional custom styles if needed */
</style>
