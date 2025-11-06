<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { currentStory, passageList } from '../stores/storyStateStore';
  import { selectedPassageId } from '../stores/selectionStore';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;

  const dispatch = createEventDispatcher();
  let dialogElement: HTMLElement;
  let inputElement: HTMLInputElement;
  let cleanupFocusTrap: (() => void) | null = null;
  let searchQuery = '';
  let selectedIndex = 0;

  // Command definitions
  interface Command {
    id: string;
    label: string;
    description?: string;
    category: string;
    shortcut?: string;
    action: () => void;
  }

  let commands: Command[] = [];

  // Build commands list
  $: if ($currentStory) {
    commands = [
      // File commands
      { id: 'new', label: 'New Project', category: 'File', shortcut: 'Ctrl+N', action: () => dispatch('new') },
      { id: 'open', label: 'Open Project', category: 'File', shortcut: 'Ctrl+O', action: () => dispatch('open') },
      { id: 'save', label: 'Save Project', category: 'File', shortcut: 'Ctrl+S', action: () => dispatch('save') },
      { id: 'saveas', label: 'Save As...', category: 'File', shortcut: 'Ctrl+Shift+S', action: () => dispatch('saveas') },
      { id: 'export', label: 'Export Story', category: 'File', shortcut: 'Ctrl+E', action: () => dispatch('export') },
      { id: 'import', label: 'Import Story', category: 'File', shortcut: 'Ctrl+I', action: () => dispatch('import') },

      // Edit commands
      { id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', action: () => dispatch('undo') },
      { id: 'redo', label: 'Redo', category: 'Edit', shortcut: 'Ctrl+Shift+Z', action: () => dispatch('redo') },
      { id: 'addpassage', label: 'Add New Passage', category: 'Edit', shortcut: 'Ctrl+Shift+N', action: () => dispatch('addpassage') },

      // View commands
      { id: 'view-list', label: 'Switch to List View', category: 'View', shortcut: 'Ctrl+1', action: () => dispatch('view', { mode: 'list' }) },
      { id: 'view-graph', label: 'Switch to Graph View', category: 'View', shortcut: 'Ctrl+2', action: () => dispatch('view', { mode: 'graph' }) },
      { id: 'view-split', label: 'Switch to Split View', category: 'View', shortcut: 'Ctrl+3', action: () => dispatch('view', { mode: 'split' }) },
      { id: 'view-preview', label: 'Switch to Preview Mode', category: 'View', shortcut: 'Ctrl+4', action: () => dispatch('view', { mode: 'preview' }) },
      { id: 'focus', label: 'Toggle Focus Mode', category: 'View', shortcut: 'Ctrl+F', action: () => dispatch('focus') },

      // Help commands
      { id: 'shortcuts', label: 'Show Keyboard Shortcuts', category: 'Help', shortcut: '?', action: () => dispatch('shortcuts') },

      // Passage navigation (add all passages)
      ...$passageList.map(passage => ({
        id: `goto-${passage.id}`,
        label: `Go to: ${passage.title}`,
        description: passage.content.slice(0, 60) + (passage.content.length > 60 ? '...' : ''),
        category: 'Navigate',
        action: () => {
          selectedPassageId.set(passage.id);
          close();
        }
      }))
    ];
  } else {
    commands = [
      { id: 'new', label: 'New Project', category: 'File', shortcut: 'Ctrl+N', action: () => dispatch('new') },
      { id: 'open', label: 'Open Project', category: 'File', shortcut: 'Ctrl+O', action: () => dispatch('open') },
      { id: 'example', label: 'Load Example: The Cave', category: 'File', action: () => dispatch('example') },
    ];
  }

  // Fuzzy search filter
  $: filteredCommands = commands.filter(cmd => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const labelMatch = cmd.label.toLowerCase().includes(query);
    const categoryMatch = cmd.category.toLowerCase().includes(query);
    const descMatch = cmd.description?.toLowerCase().includes(query);

    return labelMatch || categoryMatch || descMatch;
  });

  // Group by category
  $: groupedCommands = filteredCommands.reduce((groups, cmd) => {
    if (!groups[cmd.category]) {
      groups[cmd.category] = [];
    }
    groups[cmd.category].push(cmd);
    return groups;
  }, {} as Record<string, Command[]>);

  // Reset selection when filter changes
  $: if (searchQuery) {
    selectedIndex = 0;
  }

  function close() {
    show = false;
    searchQuery = '';
    selectedIndex = 0;
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
  }

  function executeCommand(cmd: Command) {
    cmd.action();
    if (!cmd.id.startsWith('goto-')) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
      scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollToSelected();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  }

  function scrollToSelected() {
    // Scroll selected item into view
    const listElement = document.querySelector('[data-command-list]');
    const selectedElement = document.querySelector('[data-command-index="' + selectedIndex + '"]');
    if (listElement && selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
    inputElement?.focus();
  }

  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-[20vh] z-50"
    on:click={close}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-2xl w-[600px] max-w-[90vw] max-h-[60vh] flex flex-col"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-title"
      tabindex="-1"
    >
      <!-- Search Input -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <span class="text-2xl">⚡</span>
          <input
            bind:this={inputElement}
            bind:value={searchQuery}
            type="text"
            placeholder="Type a command or search passages..."
            class="flex-1 text-lg outline-none"
            autocomplete="off"
          />
          <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
            Esc
          </kbd>
        </div>
      </div>

      <!-- Commands List -->
      <div
        data-command-list
        class="flex-1 overflow-y-auto"
      >
        {#if filteredCommands.length === 0}
          <div class="p-8 text-center text-gray-400">
            <p>No commands found</p>
            <p class="text-sm mt-2">Try a different search</p>
          </div>
        {:else}
          {#each Object.entries(groupedCommands) as [category, cmds], categoryIndex}
            <div class="py-2">
              <div class="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {category}
              </div>
              {#each cmds as cmd, cmdIndex}
                {@const globalIndex = filteredCommands.indexOf(cmd)}
                <button
                  data-command-index={globalIndex}
                  class="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between gap-4 transition-colors"
                  class:bg-blue-100={selectedIndex === globalIndex}
                  on:click={() => executeCommand(cmd)}
                  on:mouseenter={() => selectedIndex = globalIndex}
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm">
                      {cmd.label}
                    </div>
                    {#if cmd.description}
                      <div class="text-xs text-gray-500 truncate">
                        {cmd.description}
                      </div>
                    {/if}
                  </div>
                  {#if cmd.shortcut}
                    <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shrink-0">
                      {cmd.shortcut}
                    </kbd>
                  {/if}
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div class="flex items-center gap-4">
          <span>
            <kbd class="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd class="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">Enter</kbd> Select
          </span>
        </div>
        <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Smooth scroll in command list */
  [data-command-list] {
    scroll-behavior: smooth;
  }

  /* Animation */
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  [role="dialog"] {
    animation: slideDown 0.2s ease-out;
  }
</style>
