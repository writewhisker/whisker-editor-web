<script lang="ts">
  import { shortcutCategories, showShortcutsHelp } from '$lib/stores/keyboardShortcutsStore';
  import { trapFocus } from '$lib/utils/accessibility';
  import { onMount } from 'svelte';

  let dialogElement: HTMLDivElement;
  let cleanupFocusTrap: (() => void) | null = null;

  $: if ($showShortcutsHelp && dialogElement) {
    // Setup focus trap when modal opens
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  function close() {
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
    showShortcutsHelp.set(false);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }

  onMount(() => {
    return () => {
      if (cleanupFocusTrap) {
        cleanupFocusTrap();
      }
    };
  });

  // Detect if user is on Mac
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

  function formatShortcut(keys: string): string {
    if (!isMac) return keys;
    // Replace Ctrl with Cmd and Alt with Option for Mac
    return keys
      .replace(/Ctrl/g, 'Cmd')
      .replace(/Alt/g, 'Option');
  }
</script>

{#if $showShortcutsHelp}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="presentation"
  >
    <!-- Modal -->
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 id="shortcuts-title" class="text-2xl font-bold text-gray-900">
          Keyboard Shortcuts
        </h2>
        <button
          onclick={close}
          class="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded hover:bg-gray-100"
          aria-label="Close shortcuts help"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto flex-1 px-6 py-4">
        <div class="space-y-6">
          {#each shortcutCategories as category}
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-3">
                {category.name}
              </h3>
              <div class="space-y-2">
                {#each category.shortcuts as shortcut}
                  <div class="flex items-center justify-between py-2 hover:bg-gray-50 px-3 rounded transition-colors">
                    <span class="text-gray-700">{shortcut.description}</span>
                    <kbd class="px-3 py-1.5 text-sm font-mono bg-gray-100 border border-gray-300 rounded shadow-sm text-gray-800 whitespace-nowrap">
                      {formatShortcut(shortcut.keys)}
                    </kbd>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <!-- Footer tips -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Tips</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Most shortcuts work even when typing in text fields</li>
            <li>• Press <kbd class="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">?</kbd> anytime to show this help</li>
            <li>• Press <kbd class="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">Escape</kbd> to close this dialog</li>
            {#if isMac}
              <li>• On Mac, use <kbd class="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">Cmd</kbd> instead of Ctrl</li>
            {/if}
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <a
          href="/docs/KEYBOARD_SHORTCUTS.md"
          class="text-sm text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          View full documentation
        </a>
        <button
          onclick={close}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  kbd {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  }
</style>
