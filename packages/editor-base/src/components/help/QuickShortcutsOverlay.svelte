<script lang="ts">
  /**
   * Quick Shortcuts Overlay Component
   *
   * A compact overlay showing the most essential keyboard shortcuts.
   * Appears when user presses '?' key and provides quick reference.
   * Different from the full help dialog - more compact and focused.
   */

  export let show = false;

  interface QuickShortcut {
    keys: string;
    description: string;
  }

  interface ShortcutGroup {
    title: string;
    shortcuts: QuickShortcut[];
  }

  // Detect if user is on Mac
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

  function formatKey(key: string): string {
    if (!isMac) return key;
    // Replace Ctrl with ⌘ and Alt with ⌥ for Mac
    return key
      .replace(/Ctrl/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧');
  }

  // Most essential shortcuts grouped by category
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'File',
      shortcuts: [
        { keys: 'Ctrl+N', description: 'New Project' },
        { keys: 'Ctrl+O', description: 'Open' },
        { keys: 'Ctrl+S', description: 'Save' },
        { keys: 'Ctrl+Shift+S', description: 'Save As' },
      ]
    },
    {
      title: 'Edit',
      shortcuts: [
        { keys: 'Ctrl+Z', description: 'Undo' },
        { keys: 'Ctrl+Shift+Z', description: 'Redo' },
        { keys: 'Ctrl+D', description: 'Duplicate Passage' },
        { keys: 'Ctrl+F', description: 'Find' },
      ]
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: 'Ctrl+K', description: 'Command Palette' },
        { keys: '↑/↓', description: 'Navigate Passages' },
        { keys: 'Ctrl+1/2/3/4', description: 'Switch View Mode' },
      ]
    },
    {
      title: 'View',
      shortcuts: [
        { keys: 'Ctrl+Shift+M', description: 'Focus Mode' },
        { keys: '?', description: 'This Overlay' },
        { keys: 'Esc', description: 'Close Dialog' },
      ]
    }
  ];

  function handleKeydown(e: KeyboardEvent) {
    // Close on ? or Escape
    if (e.key === '?' || e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function close() {
    show = false;
  }
</script>

{#if show}
  <!-- Backdrop with semi-transparent overlay -->
  <div
    class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="presentation"
    aria-hidden="true"
  >
    <!-- Compact overlay centered -->
    <div
      class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 animate-scale-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-shortcuts-title"
    >
      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div class="flex items-center justify-between">
          <div>
            <h2 id="quick-shortcuts-title" class="text-xl font-bold flex items-center gap-2">
              <span>⚡</span>
              <span>Quick Keyboard Shortcuts</span>
            </h2>
            <p class="text-sm text-blue-50 mt-1">Press ? or Esc to close</p>
          </div>
          <button
            onclick={close}
            class="text-white hover:bg-white/20 transition-colors p-2 rounded-lg"
            aria-label="Close quick shortcuts"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="p-6 grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900">
        {#each shortcutGroups as group}
          <div class="space-y-2">
            <h3 class="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              {group.title}
            </h3>
            <div class="space-y-2">
              {#each group.shortcuts as shortcut}
                <div class="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow">
                  <span class="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                  <kbd class="kbd-key">
                    {formatKey(shortcut.keys)}
                  </kbd>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          For complete list, see
          <button
            onclick={close}
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Help → Keyboard Shortcuts
          </button>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .kbd-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    color: #1f2937;
    background: linear-gradient(to bottom, #ffffff, #f3f4f6);
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    min-width: 2rem;
    text-align: center;
  }

  :global(.dark) .kbd-key {
    color: #e5e7eb;
    background: linear-gradient(to bottom, #374151, #1f2937);
    border-color: #4b5563;
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-scale-in {
    animation: scale-in 0.15s ease-out;
  }

  @keyframes bounce-slow {
    0%, 100% {
      transform: translateY(-5%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
</style>
