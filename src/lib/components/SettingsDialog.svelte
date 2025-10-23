<script lang="ts">
  import { autoSaveManager, getAutoSaveInterval } from '../utils/autoSave';

  export let show = false;

  const FONT_SIZE_KEY = 'whisker-font-size';
  const FONT_SIZES = {
    small: 12,
    medium: 14,
    large: 16,
    'extra-large': 18,
  } as const;

  type FontSizeOption = keyof typeof FONT_SIZES;

  // Get saved font size from localStorage
  function getFontSize(): FontSizeOption {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY);
      return (saved as FontSizeOption) || 'medium';
    } catch (error) {
      return 'medium';
    }
  }

  // Set font size in localStorage and apply to document
  function setFontSize(size: FontSizeOption) {
    try {
      localStorage.setItem(FONT_SIZE_KEY, size);
      document.documentElement.style.fontSize = `${FONT_SIZES[size]}px`;
    } catch (error) {
      console.error('Failed to set font size:', error);
    }
  }

  // Auto-save settings
  let autoSaveInterval = getAutoSaveInterval();
  let autoSaveIntervalSeconds = Math.floor(autoSaveInterval / 1000);

  // Font size settings
  let fontSize: FontSizeOption = getFontSize();

  // Grid snap settings
  const GRID_SNAP_KEY = 'whisker-grid-snap-enabled';
  const GRID_SIZE_KEY = 'whisker-grid-size';

  function getGridSnapEnabled(): boolean {
    try {
      const saved = localStorage.getItem(GRID_SNAP_KEY);
      return saved === 'true';
    } catch (error) {
      return false;
    }
  }

  function getGridSize(): number {
    try {
      const saved = localStorage.getItem(GRID_SIZE_KEY);
      return saved ? parseInt(saved, 10) : 20;
    } catch (error) {
      return 20;
    }
  }

  function setGridSnapEnabled(enabled: boolean) {
    try {
      localStorage.setItem(GRID_SNAP_KEY, String(enabled));
    } catch (error) {
      console.error('Failed to save grid snap setting:', error);
    }
  }

  function setGridSize(size: number) {
    try {
      localStorage.setItem(GRID_SIZE_KEY, String(size));
    } catch (error) {
      console.error('Failed to save grid size:', error);
    }
  }

  let gridSnapEnabled = getGridSnapEnabled();
  let gridSize = getGridSize();

  // Update display when dialog is opened
  $: if (show) {
    autoSaveInterval = getAutoSaveInterval();
    autoSaveIntervalSeconds = Math.floor(autoSaveInterval / 1000);
    fontSize = getFontSize();
    gridSnapEnabled = getGridSnapEnabled();
    gridSize = getGridSize();
  }

  function close() {
    show = false;
  }

  function handleSave() {
    try {
      // Convert seconds to milliseconds
      const intervalMs = autoSaveIntervalSeconds * 1000;

      // Validate range (10 seconds to 10 minutes)
      if (autoSaveIntervalSeconds < 10 || autoSaveIntervalSeconds > 600) {
        alert('Auto-save interval must be between 10 and 600 seconds');
        return;
      }

      // Validate grid size
      if (gridSize < 5 || gridSize > 100) {
        alert('Grid size must be between 5 and 100 pixels');
        return;
      }

      // Update the auto-save interval
      autoSaveManager.updateInterval(intervalMs);

      // Update font size
      setFontSize(fontSize);

      // Update grid settings
      setGridSnapEnabled(gridSnapEnabled);
      setGridSize(gridSize);

      close();
    } catch (error) {
      alert('Failed to save settings: ' + (error as Error).message);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={close}
    on:keydown={handleKeydown}
    role="button"
    tabindex="-1"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      role="dialog"
      aria-labelledby="settings-title"
    >
      <!-- Header -->
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 id="settings-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            on:click={close}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        <!-- Auto-Save Settings -->
        <section>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Auto-Save
          </h3>

          <div class="space-y-4">
            <!-- Auto-Save Interval -->
            <div>
              <label for="autosave-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Save Interval (seconds)
              </label>
              <input
                id="autosave-interval"
                type="number"
                bind:value={autoSaveIntervalSeconds}
                min="10"
                max="600"
                step="5"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Your work will be automatically saved every {autoSaveIntervalSeconds} seconds.
                <br />
                (Range: 10 - 600 seconds)
              </div>
            </div>

            <!-- Quick Presets -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Presets
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  on:click={() => autoSaveIntervalSeconds = 15}
                >
                  15s (Fast)
                </button>
                <button
                  class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  on:click={() => autoSaveIntervalSeconds = 30}
                >
                  30s (Default)
                </button>
                <button
                  class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  on:click={() => autoSaveIntervalSeconds = 60}
                >
                  1m (Balanced)
                </button>
                <button
                  class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  on:click={() => autoSaveIntervalSeconds = 120}
                >
                  2m (Slow)
                </button>
                <button
                  class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  on:click={() => autoSaveIntervalSeconds = 300}
                >
                  5m (Very Slow)
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Interface Font Size Settings -->
        <section>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Interface Font Size
          </h3>

          <div class="space-y-4">
            <!-- Font Size Options -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Interface Font Size
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  class="px-4 py-3 text-sm rounded border transition-colors {fontSize === 'small' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}"
                  on:click={() => fontSize = 'small'}
                >
                  <div class="font-semibold">Small</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{FONT_SIZES.small}px</div>
                </button>
                <button
                  class="px-4 py-3 text-sm rounded border transition-colors {fontSize === 'medium' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}"
                  on:click={() => fontSize = 'medium'}
                >
                  <div class="font-semibold">Medium</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{FONT_SIZES.medium}px (Default)</div>
                </button>
                <button
                  class="px-4 py-3 text-sm rounded border transition-colors {fontSize === 'large' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}"
                  on:click={() => fontSize = 'large'}
                >
                  <div class="font-semibold">Large</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{FONT_SIZES.large}px</div>
                </button>
                <button
                  class="px-4 py-3 text-sm rounded border transition-colors {fontSize === 'extra-large' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}"
                  on:click={() => fontSize = 'extra-large'}
                >
                  <div class="font-semibold">Extra Large</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{FONT_SIZES['extra-large']}px</div>
                </button>
              </div>
              <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Changes the base font size for the entire interface. Save to apply.
              </div>
            </div>
          </div>
        </section>

        <!-- Grid Snap Settings -->
        <section>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Graph Editor
          </h3>

          <div class="space-y-4">
            <!-- Grid Snap Toggle -->
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Grid Snap</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Snap passages to grid when dragging</div>
              </div>
              <button
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {gridSnapEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
                on:click={() => gridSnapEnabled = !gridSnapEnabled}
                role="switch"
                aria-checked={gridSnapEnabled}
              >
                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {gridSnapEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>

            <!-- Grid Size -->
            {#if gridSnapEnabled}
              <div>
                <label for="grid-size" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grid Size (pixels)
                </label>
                <input
                  id="grid-size"
                  type="number"
                  bind:value={gridSize}
                  min="5"
                  max="100"
                  step="5"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" on:click={() => gridSize = 10}>10px</button>
                  <button class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" on:click={() => gridSize = 15}>15px</button>
                  <button class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" on:click={() => gridSize = 20}>20px (Default)</button>
                  <button class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" on:click={() => gridSize = 25}>25px</button>
                  <button class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700" on:click={() => gridSize = 50}>50px</button>
                </div>
                <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Smaller grids provide finer control, larger grids make alignment easier.
                </div>
              </div>
            {/if}
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            on:click={close}
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
            on:click={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
