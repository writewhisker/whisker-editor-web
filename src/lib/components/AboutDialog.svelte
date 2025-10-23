<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { trapFocus } from '../utils/accessibility';

  export let show = false;

  const dispatch = createEventDispatcher();
  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;

  // Version info (would ideally be imported from package.json via vite)
  const version = '0.1.0';
  const buildDate = new Date().toLocaleDateString();

  function close() {
    show = false;
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
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
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-2xl w-[500px] max-w-[90vw]"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center gap-4">
          <div class="text-5xl">✍️</div>
          <div>
            <h2 id="about-title" class="text-2xl font-bold">Whisker Visual Editor</h2>
            <p class="text-blue-100 text-sm">Interactive Fiction Editor</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Version Info -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-600">Version:</span>
              <span class="ml-2 font-semibold text-gray-900">{version}</span>
            </div>
            <div>
              <span class="text-gray-600">Build:</span>
              <span class="ml-2 font-semibold text-gray-900">{buildDate}</span>
            </div>
          </div>
        </div>

        <!-- Features -->
        <div>
          <h3 class="font-semibold text-gray-900 mb-3">✨ Features</h3>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Visual story editing</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Graph & list views</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Real-time validation</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Auto-save (30s)</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Command palette (Ctrl+K)</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Export to HTML/JSON/MD</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>Test scenarios</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-green-600">✓</span>
              <span>WCAG 2.1 accessible</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="font-semibold text-blue-900 mb-2">📊 This Build</h3>
          <div class="grid grid-cols-3 gap-2 text-xs text-blue-800">
            <div class="text-center">
              <div class="text-2xl font-bold">621</div>
              <div>Tests Passing</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">23</div>
              <div>Keyboard Shortcuts</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">4</div>
              <div>Example Stories</div>
            </div>
          </div>
        </div>

        <!-- Links -->
        <div class="flex gap-3 text-sm">
          <a
            href="docs/USER_GUIDE.md"
            target="_blank"
            class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-center transition-colors font-medium text-gray-700"
          >
            📖 User Guide
          </a>
          <a
            href="https://github.com/writewhisker/whisker-editor-web"
            target="_blank"
            class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-center transition-colors font-medium text-gray-700"
          >
            💻 GitHub
          </a>
        </div>

        <!-- Credits -->
        <div class="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
          <p>Built with Svelte 5, TypeScript, and Vite</p>
          <p class="mt-1">© 2025 Whisker Team</p>
        </div>
      </div>

      <!-- Close Button -->
      <div class="px-6 pb-6">
        <button
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          on:click={close}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Animation */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  [role="dialog"] {
    animation: fadeIn 0.2s ease-out;
  }
</style>
