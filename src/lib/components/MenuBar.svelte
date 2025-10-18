<script lang="ts">
  import { currentStory } from '../stores/projectStore';

  export let onNew: () => void;
  export let onOpen: () => void;
  export let onSave: () => void;
  export let onSaveAs: () => void;

  let showFileMenu = false;

  function toggleFileMenu() {
    showFileMenu = !showFileMenu;
  }

  function closeMenus() {
    showFileMenu = false;
  }
</script>

<nav class="bg-gray-800 text-white h-10 flex items-center px-4 border-b border-gray-700">
  <div class="flex gap-4">
    <!-- File Menu -->
    <div class="relative">
      <button
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleFileMenu}
      >
        File
      </button>
      {#if showFileMenu}
        <div
          class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
        >
          <button class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={onNew}>
            New Project
            <span class="text-xs text-gray-400">Ctrl+N</span>
          </button>
          <button class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={onOpen}>
            Open...
            <span class="text-xs text-gray-400">Ctrl+O</span>
          </button>
          <div class="border-t border-gray-700 my-1"></div>
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={onSave}
            disabled={!$currentStory}
          >
            Save
            <span class="text-xs text-gray-400">Ctrl+S</span>
          </button>
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-700"
            on:click={onSaveAs}
            disabled={!$currentStory}
          >
            Save As...
          </button>
        </div>
      {/if}
    </div>

    <button class="px-3 py-1 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
      Edit
    </button>
    <button class="px-3 py-1 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
      View
    </button>
    <button class="px-3 py-1 hover:bg-gray-700 rounded opacity-50 cursor-not-allowed">
      Test
    </button>
  </div>
</nav>

<svelte:window on:click={() => showFileMenu = false} />
