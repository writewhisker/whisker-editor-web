<script lang="ts">
  import { onMount } from 'svelte';
  import { currentStory } from '../stores/projectStore';
  import { getRecentFiles, formatLastOpened, clearRecentFiles, type RecentFile } from '../utils/recentFiles';
  import { theme, themeActions } from '../stores/themeStore';
  import { panelVisibility, viewPreferencesActions } from '../stores/viewPreferencesStore';

  export let onNew: () => void;
  export let onOpen: () => void;
  export let onSave: () => void;
  export let onSaveAs: () => void;
  export let onOpenRecent: ((file: RecentFile) => void) | undefined = undefined;
  export let onStoryInfo: (() => void) | undefined = undefined;
  export let onAbout: (() => void) | undefined = undefined;
  export let onSettings: (() => void) | undefined = undefined;

  let showFileMenu = false;
  let showEditMenu = false;
  let showViewMenu = false;
  let showTestMenu = false;
  let showHelpMenu = false;
  let recentFiles: RecentFile[] = [];

  let fileMenuElement: HTMLElement | null = null;
  let editMenuElement: HTMLElement | null = null;
  let viewMenuElement: HTMLElement | null = null;
  let testMenuElement: HTMLElement | null = null;
  let helpMenuElement: HTMLElement | null = null;

  export let onFind: (() => void) | undefined = undefined;
  export let onValidate: (() => void) | undefined = undefined;
  export let onCheckLinks: (() => void) | undefined = undefined;

  function toggleFileMenu() {
    showFileMenu = !showFileMenu;
    showEditMenu = false;
    showViewMenu = false;
    showTestMenu = false;
    showHelpMenu = false;
    if (showFileMenu) {
      // Reload recent files when opening menu
      recentFiles = getRecentFiles();
    }
  }

  function toggleEditMenu() {
    showEditMenu = !showEditMenu;
    showFileMenu = false;
    showViewMenu = false;
    showTestMenu = false;
    showHelpMenu = false;
  }

  function toggleViewMenu() {
    showViewMenu = !showViewMenu;
    showFileMenu = false;
    showEditMenu = false;
    showTestMenu = false;
    showHelpMenu = false;
  }

  function toggleTestMenu() {
    showTestMenu = !showTestMenu;
    showFileMenu = false;
    showEditMenu = false;
    showViewMenu = false;
    showHelpMenu = false;
  }

  function toggleHelpMenu() {
    showHelpMenu = !showHelpMenu;
    showFileMenu = false;
    showEditMenu = false;
    showViewMenu = false;
    showTestMenu = false;
  }

  function closeMenus() {
    showFileMenu = false;
    showEditMenu = false;
    showViewMenu = false;
    showTestMenu = false;
    showHelpMenu = false;
  }

  function handleClearRecent(e: MouseEvent) {
    e.stopPropagation();
    clearRecentFiles();
    recentFiles = [];
  }

  function handleOpenRecent(file: RecentFile) {
    if (onOpenRecent) {
      onOpenRecent(file);
    }
    closeMenus();
  }

  function handleMenuKeydown(menuType: 'file' | 'edit' | 'view' | 'test' | 'help', event: KeyboardEvent) {
    const menuElement = menuType === 'file' ? fileMenuElement :
                       menuType === 'edit' ? editMenuElement :
                       menuType === 'view' ? viewMenuElement :
                       menuType === 'test' ? testMenuElement :
                       helpMenuElement;

    if (!menuElement) return;

    const menuItems = Array.from(menuElement.querySelectorAll('button:not([disabled])')) as HTMLElement[];
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < menuItems.length - 1) {
          menuItems[currentIndex + 1]?.focus();
        } else {
          menuItems[0]?.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          menuItems[currentIndex - 1]?.focus();
        } else {
          menuItems[menuItems.length - 1]?.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeMenus();
        // Return focus to the menu button
        const buttonId = `${menuType}-menu-button`;
        document.getElementById(buttonId)?.focus();
        break;
      case 'Home':
        event.preventDefault();
        menuItems[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
    }
  }

  onMount(() => {
    recentFiles = getRecentFiles();
  });
</script>

<nav class="bg-gray-800 text-white h-10 flex items-center px-4 border-b border-gray-700">
  <div class="flex gap-4">
    <!-- File Menu -->
    <div class="relative">
      <button
        id="file-menu-button"
        type="button"
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleFileMenu}
        aria-expanded={showFileMenu}
        aria-controls="file-menu"
        aria-haspopup="true"
      >
        File
      </button>
      {#if showFileMenu}
        <div
          id="file-menu"
          bind:this={fileMenuElement}
          role="menu"
          tabindex="-1"
          aria-labelledby="file-menu-button"
          class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
          on:keydown={(e) => handleMenuKeydown('file', e)}
        >
          <button type="button" role="menuitem" class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={onNew}>
            New Project
            <span class="text-xs text-gray-400">Ctrl+N</span>
          </button>
          <button type="button" role="menuitem" class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={onOpen}>
            Open...
            <span class="text-xs text-gray-400">Ctrl+O</span>
          </button>

          <!-- Recent Files -->
          {#if recentFiles.length > 0}
            <div class="border-t border-gray-700 my-1" role="separator"></div>
            <div class="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">
              Recent Files
            </div>
            {#each recentFiles as file}
              <button
                type="button"
                role="menuitem"
                class="w-full text-left px-4 py-2 hover:bg-gray-700 flex flex-col gap-0.5"
                on:click={() => handleOpenRecent(file)}
              >
                <span class="text-sm">{file.name}</span>
                {#if file.storyTitle && file.storyTitle !== file.name}
                  <span class="text-xs text-gray-400">{file.storyTitle}</span>
                {/if}
                <span class="text-xs text-gray-500">{formatLastOpened(file.lastOpened)}</span>
              </button>
            {/each}
            <button
              type="button"
              role="menuitem"
              class="w-full text-left px-4 py-2 hover:bg-gray-700 text-xs text-gray-400"
              on:click={handleClearRecent}
            >
              Clear Recent Files
            </button>
          {/if}

          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={onSave}
            disabled={!$currentStory}
          >
            Save
            <span class="text-xs text-gray-400">Ctrl+S</span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700"
            on:click={onSaveAs}
            disabled={!$currentStory}
          >
            Save As...
          </button>
          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700"
            on:click={() => onStoryInfo && onStoryInfo()}
            disabled={!$currentStory}
          >
            Story Info...
          </button>
        </div>
      {/if}
    </div>

    <!-- Edit Menu -->
    <div class="relative">
      <button
        id="edit-menu-button"
        type="button"
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleEditMenu}
        aria-expanded={showEditMenu}
        aria-controls="edit-menu"
        aria-haspopup="true"
      >
        Edit
      </button>
      {#if showEditMenu}
        <div
          id="edit-menu"
          bind:this={editMenuElement}
          role="menu"
          tabindex="-1"
          aria-labelledby="edit-menu-button"
          class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
          on:keydown={(e) => handleMenuKeydown('edit', e)}
        >
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={() => onFind && onFind()}
            disabled={!$currentStory}
          >
            <span>Find & Replace...</span>
            <span class="text-xs text-gray-400">Ctrl+Shift+F</span>
          </button>
          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={() => {
              document.execCommand('selectAll');
              closeMenus();
            }}
            disabled={!$currentStory}
          >
            <span>Select All</span>
            <span class="text-xs text-gray-400">Ctrl+A</span>
          </button>
          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <div class="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">
            Clipboard
          </div>
          <div class="px-4 py-2 text-xs text-gray-500 italic">
            Copy/Paste work with standard keyboard shortcuts (Ctrl+C / Ctrl+V)
          </div>
        </div>
      {/if}
    </div>

    <!-- View Menu -->
    <div class="relative">
      <button
        id="view-menu-button"
        type="button"
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleViewMenu}
        aria-expanded={showViewMenu}
        aria-controls="view-menu"
        aria-haspopup="true"
      >
        View
      </button>
      {#if showViewMenu}
        <div
          id="view-menu"
          bind:this={viewMenuElement}
          role="menu"
          tabindex="-1"
          aria-labelledby="view-menu-button"
          class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
          on:keydown={(e) => handleMenuKeydown('view', e)}
        >
          <!-- Settings -->
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={() => onSettings && onSettings()}
          >
            <span>Settings...</span>
            <span class="text-xs text-gray-400">⚙️</span>
          </button>

          <div class="border-t border-gray-700 my-1" role="separator"></div>

          <!-- Panels Section -->
          <div class="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">
            Panels
          </div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$panelVisibility.passageList}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click|stopPropagation={() => viewPreferencesActions.togglePanel('passageList')}
            disabled={!$currentStory}
          >
            <span>Passage List</span>
            {#if $panelVisibility.passageList}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$panelVisibility.properties}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click|stopPropagation={() => viewPreferencesActions.togglePanel('properties')}
            disabled={!$currentStory}
          >
            <span>Properties</span>
            {#if $panelVisibility.properties}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$panelVisibility.variables}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click|stopPropagation={() => viewPreferencesActions.togglePanel('variables')}
            disabled={!$currentStory}
          >
            <span>Variables</span>
            {#if $panelVisibility.variables}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$panelVisibility.validation}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click|stopPropagation={() => viewPreferencesActions.togglePanel('validation')}
            disabled={!$currentStory}
          >
            <span>Validation</span>
            {#if $panelVisibility.validation}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$panelVisibility.statistics}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click|stopPropagation={() => viewPreferencesActions.togglePanel('statistics')}
            disabled={!$currentStory}
          >
            <span>Statistics</span>
            {#if $panelVisibility.statistics}
              <span class="text-green-400">✓</span>
            {/if}
          </button>

          <div class="border-t border-gray-700 my-1" role="separator"></div>

          <!-- Theme Section -->
          <div class="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">
            Theme
          </div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={$theme === 'light'}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={themeActions.setLight}
          >
            <span>Light</span>
            {#if $theme === 'light'}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={$theme === 'dark'}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={themeActions.setDark}
          >
            <span>Dark</span>
            {#if $theme === 'dark'}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={$theme === 'auto'}
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={themeActions.setAuto}
          >
            <span>Auto (System)</span>
            {#if $theme === 'auto'}
              <span class="text-green-400">✓</span>
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <!-- Test Menu -->
    <div class="relative">
      <button
        id="test-menu-button"
        type="button"
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleTestMenu}
        aria-expanded={showTestMenu}
        aria-controls="test-menu"
        aria-haspopup="true"
      >
        Test
      </button>
      {#if showTestMenu}
        <div
          id="test-menu"
          bind:this={testMenuElement}
          role="menu"
          aria-labelledby="test-menu-button"
          class="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
          on:keydown={(e) => handleMenuKeydown('test', e)}
        >
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={() => onValidate && onValidate()}
            disabled={!$currentStory}
          >
            <span>Run Validation</span>
            <span class="text-xs text-gray-400">🔍</span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center"
            on:click={() => onCheckLinks && onCheckLinks()}
            disabled={!$currentStory}
          >
            <span>Check All Links</span>
            <span class="text-xs text-gray-400">🔗</span>
          </button>
          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <div class="px-4 py-2 text-xs text-gray-500 italic">
            Use the Validation panel to see detailed results
          </div>
        </div>
      {/if}
    </div>

    <!-- Help Menu -->
    <div class="relative ml-auto">
      <button
        id="help-menu-button"
        type="button"
        class="px-3 py-1 hover:bg-gray-700 rounded"
        on:click={toggleHelpMenu}
        aria-expanded={showHelpMenu}
        aria-controls="help-menu"
        aria-haspopup="true"
      >
        Help
      </button>
      {#if showHelpMenu}
        <div
          id="help-menu"
          bind:this={helpMenuElement}
          role="menu"
          aria-labelledby="help-menu-button"
          class="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] z-50"
          on:click={closeMenus}
          on:keydown={(e) => handleMenuKeydown('help', e)}
        >
          <button type="button" role="menuitem" class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={() => window.open('docs/USER_GUIDE.md', '_blank')}>
            User Guide
            <span class="text-xs text-gray-400">📖</span>
          </button>
          <button type="button" role="menuitem" class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={() => window.open('docs/KEYBOARD_SHORTCUTS.md', '_blank')}>
            Keyboard Shortcuts
            <span class="text-xs text-gray-400">?</span>
          </button>
          <div class="border-t border-gray-700 my-1" role="separator"></div>
          <button type="button" role="menuitem" class="w-full text-left px-4 py-2 hover:bg-gray-700 flex justify-between items-center" on:click={() => onAbout && onAbout()}>
            About Whisker
            <span class="text-xs text-gray-400">ℹ️</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</nav>

<svelte:window on:click={closeMenus} />
