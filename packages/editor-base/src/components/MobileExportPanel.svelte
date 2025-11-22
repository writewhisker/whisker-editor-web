<script lang="ts">
  import { mobileExportStore, exportTarget, playerConfig, appMetadata } from '../stores/mobileExportStore';
  import { currentStory } from '../stores/storyStateStore';
  import type { ExportTarget, Orientation, ThemePreference } from '../stores/mobileExportStore';

  let selectedTarget = $state<ExportTarget>('pwa');
  let showPreview = $state(false);
  let exportResult = $state<{ files: Map<string, string>; instructions: string } | null>(null);

  // PWA settings
  let pwaName = $state('My Interactive Story');
  let pwaShortName = $state('Story');
  let pwaDescription = $state('An interactive fiction experience');
  let pwaThemeColor = $state('#2563eb');

  // Player settings
  let enableSwipeGestures = $state(true);
  let enableVibration = $state(true);
  let enableFullscreen = $state(false);
  let autoSave = $state(true);
  let fontSize = $state<'small' | 'medium' | 'large'>('medium');
  let theme = $state<ThemePreference>('auto');
  let transitions = $state(true);

  // Metadata
  let appTitle = $state('My Interactive Story');
  let appSubtitle = $state('An engaging tale');
  let appDescription = $state('Embark on an interactive adventure');
  let appKeywords = $state('interactive, fiction, story, adventure');
  let appCategory = $state('Entertainment');

  // Cordova/Capacitor settings
  let appId = $state('com.example.story');
  let appVersion = $state('1.0.0');
  let appAuthor = $state('');
  let appEmail = $state('');

  // Sync with store
  $effect(() => {
    const config = $exportTarget;
    selectedTarget = config;
  });

  function handleExport() {
    if (!$currentStory) {
      alert('No story loaded to export');
      return;
    }

    // Update store with current settings
    mobileExportStore.setTarget(selectedTarget);

    if (selectedTarget === 'pwa') {
      mobileExportStore.updatePWAConfig({
        name: pwaName,
        shortName: pwaShortName,
        description: pwaDescription,
        themeColor: pwaThemeColor,
      });
    }

    if (selectedTarget === 'cordova') {
      mobileExportStore.updateCordovaConfig({
        id: appId,
        version: appVersion,
        author: appAuthor,
        email: appEmail,
      });
    }

    if (selectedTarget === 'capacitor') {
      mobileExportStore.updateCapacitorConfig({
        appId,
        appName: appTitle,
      });
    }

    mobileExportStore.updatePlayerConfig({
      enableSwipeGestures,
      enableVibration,
      enableFullscreen,
      autoSave,
      fontSize,
      theme,
      transitions,
    });

    mobileExportStore.updateMetadata({
      title: appTitle,
      subtitle: appSubtitle,
      description: appDescription,
      keywords: appKeywords.split(',').map(k => k.trim()),
      category: appCategory,
    });

    // Generate export
    const result = mobileExportStore.generateExport($currentStory);
    exportResult = result;
    showPreview = true;
  }

  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    if (!exportResult) return;

    for (const [filename, content] of exportResult.files) {
      downloadFile(filename, content);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="p-4 border-b border-gray-300 dark:border-gray-700">
    <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200">Mobile Export</h2>
    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Export your story for mobile platforms</p>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-6">
    {#if !showPreview}
      <!-- Export Target Selection -->
      <div>
        <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Export Target
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="p-3 text-left border rounded {selectedTarget === 'pwa' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
            onclick={() => selectedTarget = 'pwa'}
          >
            <div class="font-medium text-sm">PWA</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Progressive Web App</div>
          </button>

          <button
            type="button"
            class="p-3 text-left border rounded {selectedTarget === 'cordova' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
            onclick={() => selectedTarget = 'cordova'}
          >
            <div class="font-medium text-sm">Cordova</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">iOS/Android apps</div>
          </button>

          <button
            type="button"
            class="p-3 text-left border rounded {selectedTarget === 'capacitor' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
            onclick={() => selectedTarget = 'capacitor'}
          >
            <div class="font-medium text-sm">Capacitor</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Modern native apps</div>
          </button>

          <button
            type="button"
            class="p-3 text-left border rounded {selectedTarget === 'standalone' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}"
            onclick={() => selectedTarget = 'standalone'}
          >
            <div class="font-medium text-sm">Standalone</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Single HTML file</div>
          </button>
        </div>
      </div>

      <!-- App Metadata -->
      <div class="space-y-3">
        <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">App Information</h3>

        <div>
          <label for="app-title" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">App Title</label>
          <input
            id="app-title"
            type="text"
            bind:value={appTitle}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            placeholder="My Interactive Story"
          />
        </div>

        <div>
          <label for="app-subtitle" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Subtitle</label>
          <input
            id="app-subtitle"
            type="text"
            bind:value={appSubtitle}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            placeholder="An engaging tale"
          />
        </div>

        <div>
          <label for="app-description" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <textarea
            id="app-description"
            bind:value={appDescription}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            rows="3"
            placeholder="Describe your story..."
          ></textarea>
        </div>

        <div>
          <label for="app-keywords" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Keywords (comma-separated)</label>
          <input
            id="app-keywords"
            type="text"
            bind:value={appKeywords}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            placeholder="interactive, fiction, story"
          />
        </div>

        <div>
          <label for="app-category" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Category</label>
          <select
            id="app-category"
            bind:value={appCategory}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option>Entertainment</option>
            <option>Games</option>
            <option>Education</option>
            <option>Books</option>
          </select>
        </div>
      </div>

      <!-- Platform-specific settings -->
      {#if selectedTarget === 'pwa'}
        <div class="space-y-3">
          <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">PWA Configuration</h3>

          <div>
            <label for="pwa-name" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">App Name</label>
            <input
              id="pwa-name"
              type="text"
              bind:value={pwaName}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="My Interactive Story"
            />
          </div>

          <div>
            <label for="pwa-short-name" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Short Name</label>
            <input
              id="pwa-short-name"
              type="text"
              bind:value={pwaShortName}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="Story"
              maxlength="12"
            />
          </div>

          <div>
            <label for="pwa-theme-color" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Theme Color</label>
            <input
              id="pwa-theme-color"
              type="color"
              bind:value={pwaThemeColor}
              class="w-full h-10 border border-gray-300 dark:border-gray-600 rounded"
            />
          </div>
        </div>
      {/if}

      {#if selectedTarget === 'cordova' || selectedTarget === 'capacitor'}
        <div class="space-y-3">
          <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">App Settings</h3>

          <div>
            <label for="app-id" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">App ID (reverse domain)</label>
            <input
              id="app-id"
              type="text"
              bind:value={appId}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="com.example.story"
            />
          </div>

          <div>
            <label for="app-version" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Version</label>
            <input
              id="app-version"
              type="text"
              bind:value={appVersion}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="1.0.0"
            />
          </div>

          <div>
            <label for="app-author" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Author Name</label>
            <input
              id="app-author"
              type="text"
              bind:value={appAuthor}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label for="app-email" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Contact Email</label>
            <input
              id="app-email"
              type="email"
              bind:value={appEmail}
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              placeholder="contact@example.com"
            />
          </div>
        </div>
      {/if}

      <!-- Player Configuration -->
      <div class="space-y-3">
        <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">Player Settings</h3>

        <div>
          <label for="font-size" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Font Size</label>
          <select
            id="font-size"
            bind:value={fontSize}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div>
          <label for="theme" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Theme</label>
          <select
            id="theme"
            bind:value={theme}
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (system preference)</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={enableSwipeGestures}
              class="rounded"
            />
            <span class="text-gray-700 dark:text-gray-300">Enable swipe gestures</span>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={enableVibration}
              class="rounded"
            />
            <span class="text-gray-700 dark:text-gray-300">Enable haptic feedback</span>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={autoSave}
              class="rounded"
            />
            <span class="text-gray-700 dark:text-gray-300">Auto-save progress</span>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={transitions}
              class="rounded"
            />
            <span class="text-gray-700 dark:text-gray-300">Smooth transitions</span>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={enableFullscreen}
              class="rounded"
            />
            <span class="text-gray-700 dark:text-gray-300">Fullscreen button</span>
          </label>
        </div>
      </div>

      <!-- Export Button -->
      <div class="pt-4">
        <button
          type="button"
          onclick={handleExport}
          disabled={!$currentStory}
          class="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Export Package
        </button>
      </div>
    {:else}
      <!-- Export Results -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">Export Package Ready</h3>
          <button
            type="button"
            onclick={() => showPreview = false}
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back
          </button>
        </div>

        <!-- Files -->
        <div class="border border-gray-300 dark:border-gray-600 rounded">
          <div class="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Generated Files</div>
          </div>
          <div class="p-3 space-y-2">
            {#if exportResult}
              {#each Array.from(exportResult.files.entries()) as [filename, content]}
                <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span class="text-sm font-mono">{filename}</span>
                  <button
                    type="button"
                    onclick={() => downloadFile(filename, content)}
                    class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download
                  </button>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Instructions -->
        <div class="border border-gray-300 dark:border-gray-600 rounded">
          <div class="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-300 dark:border-gray-600">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Setup Instructions</div>
          </div>
          <div class="p-3">
            {#if exportResult}
              <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">{exportResult.instructions}</pre>
              <button
                type="button"
                onclick={() => copyToClipboard(exportResult!.instructions)}
                class="mt-2 text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Copy to Clipboard
              </button>
            {/if}
          </div>
        </div>

        <!-- Download All Button -->
        <button
          type="button"
          onclick={downloadAll}
          class="w-full px-4 py-3 bg-green-600 text-white rounded font-medium hover:bg-green-700"
        >
          Download All Files
        </button>
      </div>
    {/if}
  </div>
</div>
