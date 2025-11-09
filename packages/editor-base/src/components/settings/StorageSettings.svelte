<script lang="ts">
  import { onMount } from 'svelte';
  import { getMigrationUtil } from '../../services/storage/migration';
  import { getPreferenceService } from '../../services/storage/PreferenceService';

  // State
  let loading = true;
  let quotaInfo = { used: 0, available: 0, total: 0 };
  let migrationStatus: 'pending' | 'complete' = 'complete';
  let migrationProgress = '';
  let usagePercent = 0;
  let importExportMessage = '';
  let fileInput: HTMLInputElement;
  let showImportPreview = false;
  let importPreviewData: Record<string, any> = {};
  let selectedPreferences: Set<string> = new Set();

  // Derived array for stable iteration
  $: importPreviewEntries = Object.entries(importPreviewData);

  onMount(async () => {
    await loadQuotaInfo();
    await checkMigrationStatus();
    loading = false;
  });

  async function loadQuotaInfo() {
    try {
      const migration = await getMigrationUtil();
      quotaInfo = await migration.getQuotaInfo();
      usagePercent = quotaInfo.total > 0 ? (quotaInfo.used / quotaInfo.total) * 100 : 0;
    } catch (e) {
      console.error('Failed to load quota info:', e);
    }
  }

  async function checkMigrationStatus() {
    try {
      const migration = await getMigrationUtil();
      const needed = await migration.needsMigration();
      migrationStatus = needed ? 'pending' : 'complete';
    } catch (e) {
      console.error('Failed to check migration status:', e);
    }
  }

  async function runMigration() {
    migrationProgress = 'Running migration...';
    try {
      const migration = await getMigrationUtil();
      const result = await migration.migrateAll();

      if (result.success) {
        migrationProgress = `Successfully migrated ${result.itemsMigrated} items`;
        migrationStatus = 'complete';
      } else {
        migrationProgress = `Migration completed with ${result.errors.length} errors`;
      }

      // Refresh quota after migration
      await loadQuotaInfo();

      // Clear progress after 3 seconds
      setTimeout(() => {
        migrationProgress = '';
      }, 3000);
    } catch (e) {
      migrationProgress = `Migration failed: ${e}`;
      console.error('Migration failed:', e);
    }
  }

  async function clearCache() {
    if (!confirm('Clear preference cache? This will not delete your data.')) {
      return;
    }

    try {
      const prefService = getPreferenceService();
      prefService.clearCache();
      migrationProgress = 'Cache cleared successfully';

      // Clear progress after 3 seconds
      setTimeout(() => {
        migrationProgress = '';
      }, 3000);
    } catch (e) {
      migrationProgress = `Failed to clear cache: ${e}`;
      console.error('Failed to clear cache:', e);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  async function exportPreferences() {
    importExportMessage = 'Exporting preferences...';

    try {
      const prefService = getPreferenceService();
      const allPrefs: Record<string, any> = {};

      // Load all global preferences
      const keys = await prefService.listPreferences('global');

      for (const key of keys) {
        const value = await prefService.getPreference(key, null);
        if (value !== null) {
          allPrefs[key] = value;
        }
      }

      // Create JSON file
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        preferences: allPrefs,
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `whisker-preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      importExportMessage = `Successfully exported ${keys.length} preferences`;

      // Clear message after 3 seconds
      setTimeout(() => {
        importExportMessage = '';
      }, 3000);
    } catch (error) {
      importExportMessage = `Export failed: ${error}`;
      console.error('Export failed:', error);
    }
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    importExportMessage = 'Reading file...';

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate file structure
      if (!data.preferences || typeof data.preferences !== 'object') {
        throw new Error('Invalid preferences file format');
      }

      // Store preview data
      importPreviewData = data.preferences;

      // Select all preferences by default
      selectedPreferences = new Set(Object.keys(data.preferences));

      // Show preview dialog
      showImportPreview = true;
      importExportMessage = '';
    } catch (error) {
      importExportMessage = `Failed to read file: ${error}`;
      console.error('Import file read failed:', error);

      setTimeout(() => {
        importExportMessage = '';
      }, 3000);
    }

    // Reset input
    input.value = '';
  }

  function togglePreferenceSelection(key: string) {
    if (selectedPreferences.has(key)) {
      selectedPreferences.delete(key);
    } else {
      selectedPreferences.add(key);
    }
    selectedPreferences = selectedPreferences; // Trigger reactivity
  }

  function selectAllPreferences() {
    selectedPreferences = new Set(Object.keys(importPreviewData));
  }

  function deselectAllPreferences() {
    selectedPreferences = new Set();
  }

  async function confirmImport() {
    importExportMessage = 'Importing preferences...';
    showImportPreview = false;

    try {
      const prefService = getPreferenceService();
      let importCount = 0;

      // Import only selected preferences
      for (const key of selectedPreferences) {
        const value = importPreviewData[key];
        if (value !== undefined) {
          await prefService.setPreference(key, value);
          importCount++;
        }
      }

      importExportMessage = `Successfully imported ${importCount} preferences`;

      // Refresh quota info after import
      await loadQuotaInfo();

      // Clear message after 3 seconds
      setTimeout(() => {
        importExportMessage = '';
      }, 3000);
    } catch (error) {
      importExportMessage = `Import failed: ${error}`;
      console.error('Import failed:', error);
    }
  }

  function cancelImport() {
    showImportPreview = false;
    importPreviewData = {};
    selectedPreferences = new Set();
    importExportMessage = '';
  }
</script>

<div class="storage-settings-wrapper relative">
<div class="storage-settings p-4 space-y-6">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Storage Settings</h2>

  {#if loading}
    <div class="loading text-gray-600 dark:text-gray-400">Loading storage info...</div>
  {:else}
    <!-- Quota Display -->
    <section class="quota-section space-y-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Storage Quota</h3>
      <div class="quota-bar w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="quota-used h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style="width: {usagePercent}%"
        ></div>
      </div>
      <div class="quota-stats flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>Used: {formatBytes(quotaInfo.used)}</span>
        <span>Available: {formatBytes(quotaInfo.available)}</span>
        <span>Total: {formatBytes(quotaInfo.total)}</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-500">
        {usagePercent.toFixed(1)}% used
      </div>
    </section>

    <!-- Migration Status -->
    <section class="migration-section space-y-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Migration Status</h3>
      <div class="migration-status flex items-center gap-3">
        {#if migrationStatus === 'pending'}
          <span class="status-pending text-orange-600 dark:text-orange-400 font-medium">
            ⚠️ Migration Pending
          </span>
          <button
            on:click={runMigration}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Run Migration
          </button>
        {:else}
          <span class="status-complete text-green-600 dark:text-green-400 font-medium">
            ✅ Up to Date
          </span>
        {/if}
      </div>
      <div class="migration-progress text-sm text-gray-600 dark:text-gray-400 mt-2" class:opacity-0={!migrationProgress} class:h-0={!migrationProgress}>
        {migrationProgress || '\u00A0'}
      </div>
    </section>

    <!-- Import/Export -->
    <section class="import-export-section space-y-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Backup & Restore</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Export your preferences to a JSON file for backup or sharing, or import preferences from a previous export.
      </p>
      <div class="flex gap-3">
        <button
          on:click={exportPreferences}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <span>📥</span> Export Preferences
        </button>
        <button
          on:click={triggerImport}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <span>📤</span> Import Preferences
        </button>
      </div>
      <div class="import-export-message text-sm text-gray-600 dark:text-gray-400 mt-2" class:opacity-0={!importExportMessage} class:h-0={!importExportMessage}>
        {importExportMessage || '\u00A0'}
      </div>
      <input
        bind:this={fileInput}
        type="file"
        accept=".json"
        on:change={handleImportFile}
        class="hidden"
      />
    </section>

    <!-- Actions -->
    <section class="actions-section space-y-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Actions</h3>
      <div class="flex gap-3">
        <button
          on:click={clearCache}
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Clear Cache
        </button>
        <button
          on:click={loadQuotaInfo}
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Refresh Info
        </button>
      </div>
    </section>
  {/if}
</div>
</div>

{#if showImportPreview}
<!-- Import Preview Dialog -->
<div class="import-preview-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="import-preview-overlay">
  <div class="import-preview-dialog bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="dialog-header p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Preview Import</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Select which preferences to import
        </p>
      </div>

      <!-- Content -->
      <div class="dialog-content p-4 overflow-y-auto flex-1">
        <div class="mb-4 flex gap-2">
          <button
            on:click={selectAllPreferences}
            class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Select All
          </button>
          <button
            on:click={deselectAllPreferences}
            class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Deselect All
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400 ml-auto self-center">
            {selectedPreferences.size} of {Object.keys(importPreviewData).length} selected
          </span>
        </div>

        {#if importPreviewEntries && importPreviewEntries.length > 0}
        <div class="preferences-list space-y-2">
            {#each importPreviewEntries as [key, value] (key)}
              <div class="preference-item border border-gray-200 dark:border-gray-700 rounded p-3">
                <label class="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPreferences.has(key)}
                    on:change={() => togglePreferenceSelection(key)}
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 dark:text-gray-100">{key}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                      {JSON.stringify(value, null, 2).substring(0, 200)}{JSON.stringify(value, null, 2).length > 200 ? '...' : ''}
                    </div>
                  </div>
                </label>
              </div>
            {/each}
        </div>
          {/if}
      </div>

      <!-- Footer -->
      <div class="dialog-footer p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
        <button
          on:click={cancelImport}
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={confirmImport}
          disabled={selectedPreferences.size === 0}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import Selected ({selectedPreferences.size})
        </button>
      </div>
    </div>
  </div>
{/if}
