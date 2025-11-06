<script lang="ts">
  /**
   * Kids Menu Bar
   *
   * Simplified, colorful menu bar for kids mode with large, friendly buttons.
   */

  import { createEventDispatcher } from 'svelte';
  import { kidsModeActions, kidsTheme, getKidFriendlyTerm } from '../../stores/kidsModeStore';
  import { projectActions } from '../../stores/projectStore';

  const dispatch = createEventDispatcher<{
    openTemplates: void;
    newStory: void;
    openStory: void;
    saveStory: void;
    exportMinecraft: void;
    exportRoblox: void;
    showShare: void;
    showParentalControls: void;
  }>();

  // Menu visibility
  let showFileMenu = false;
  let showThemeMenu = false;
  let showHelpMenu = false;

  // Toggle menus
  function toggleFileMenu() {
    showFileMenu = !showFileMenu;
    showThemeMenu = false;
    showHelpMenu = false;
  }

  function toggleThemeMenu() {
    showThemeMenu = !showThemeMenu;
    showFileMenu = false;
    showHelpMenu = false;
  }

  function toggleHelpMenu() {
    showHelpMenu = !showHelpMenu;
    showFileMenu = false;
    showThemeMenu = false;
  }

  // Close all menus when clicking outside
  function closeAllMenus() {
    showFileMenu = false;
    showThemeMenu = false;
    showHelpMenu = false;
  }
</script>

<svelte:window on:click={closeAllMenus} />

<header class="kids-header flex items-center justify-between px-6 py-4 border-b-4 border-purple-600">
  <!-- Logo & Title -->
  <div class="flex items-center gap-3">
    <div class="text-5xl">📖</div>
    <h1 class="text-3xl font-black text-white">Story Creator</h1>
  </div>

  <!-- Menu Buttons -->
  <nav class="flex items-center gap-4">
    <!-- File Menu -->
    <div class="relative">
      <button
        type="button"
        class="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105"
        on:click|stopPropagation={toggleFileMenu}
      >
        <span class="text-2xl mr-2">📁</span>
        File
      </button>

      {#if showFileMenu}
        <div
          class="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border-4 border-purple-300 py-2 min-w-[200px] z-50"
          on:click|stopPropagation
        >
          <button
            type="button"
            class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3"
            on:click={() => { dispatch('newStory'); closeAllMenus(); }}
          >
            <span class="text-2xl">✨</span>
            New Story
          </button>
          <button
            type="button"
            class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3"
            on:click={() => { dispatch('openStory'); closeAllMenus(); }}
          >
            <span class="text-2xl">📂</span>
            Open Story
          </button>
          <button
            type="button"
            class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3"
            on:click={() => { dispatch('saveStory'); closeAllMenus(); }}
          >
            <span class="text-2xl">💾</span>
            Save Story
          </button>
          <div class="border-t-2 border-purple-200 my-2"></div>
          <button
            type="button"
            class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3"
            on:click={() => { dispatch('openTemplates'); closeAllMenus(); }}
          >
            <span class="text-2xl">🎨</span>
            Browse Templates
          </button>
        </div>
      {/if}
    </div>

    <!-- Share Menu (NEW) -->
    <div class="relative">
      <button
        type="button"
        class="px-6 py-3 bg-green-500 bg-opacity-90 hover:bg-opacity-100 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105 shadow-lg"
        on:click|stopPropagation={() => dispatch('showShare')}
      >
        <span class="text-2xl mr-2">🚀</span>
        Share
      </button>
    </div>

    <!-- Theme Selector -->
    <div class="relative">
      <button
        type="button"
        class="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105"
        on:click|stopPropagation={toggleThemeMenu}
      >
        <span class="text-2xl mr-2">🎨</span>
        Theme
      </button>

      {#if showThemeMenu}
        <div
          class="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border-4 border-purple-300 py-2 min-w-[220px] z-50"
          on:click|stopPropagation
        >
          <button
            class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3 {$kidsTheme === 'default' ? 'bg-purple-50' : ''}"
            on:click={() => kidsModeActions.setTheme('default')}
          >
            <span class="text-2xl">🌈</span>
            Colorful & Fun
          </button>
          <button
            class="w-full px-6 py-3 text-left hover:bg-green-100 font-semibold text-lg flex items-center gap-3 {$kidsTheme === 'minecraft' ? 'bg-green-50' : ''}"
            on:click={() => kidsModeActions.setTheme('minecraft')}
          >
            <span class="text-2xl">⛏️</span>
            Minecraft Style
          </button>
          <button
            class="w-full px-6 py-3 text-left hover:bg-red-100 font-semibold text-lg flex items-center gap-3 {$kidsTheme === 'roblox' ? 'bg-red-50' : ''}"
            on:click={() => kidsModeActions.setTheme('roblox')}
          >
            <span class="text-2xl">🎮</span>
            Roblox Style
          </button>
        </div>
      {/if}
    </div>

    <!-- Help Menu -->
    <div class="relative">
      <button
        type="button"
        class="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105"
        on:click|stopPropagation={toggleHelpMenu}
      >
        <span class="text-2xl mr-2">❓</span>
        Help
      </button>

      {#if showHelpMenu}
        <div
          class="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl border-4 border-purple-300 py-2 min-w-[200px] z-50"
          on:click|stopPropagation
        >
          <button class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3">
            <span class="text-2xl">📚</span>
            How to Use
          </button>
          <button class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3">
            <span class="text-2xl">🎓</span>
            Video Tutorials
          </button>
          <button class="w-full px-6 py-3 text-left hover:bg-purple-100 font-semibold text-lg flex items-center gap-3">
            <span class="text-2xl">🏆</span>
            My Achievements
          </button>
        </div>
      {/if}
    </div>

    <!-- Parental Controls (NEW) -->
    <button
      type="button"
      class="px-6 py-3 bg-orange-500 bg-opacity-80 hover:bg-opacity-100 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105"
      on:click={() => dispatch('showParentalControls')}
      title="Parental Controls (for parents/teachers)"
    >
      <span class="text-2xl mr-2">🔒</span>
      Parent
    </button>

    <!-- Exit Kids Mode -->
    <button
      type="button"
      class="px-6 py-3 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-2xl font-bold text-white text-lg transition-all transform hover:scale-105"
      on:click={() => kidsModeActions.setEnabled(false)}
      title="Exit Kids Mode (for parents/teachers)"
    >
      <span class="text-2xl mr-2">🚪</span>
      Exit
    </button>
  </nav>
</header>
