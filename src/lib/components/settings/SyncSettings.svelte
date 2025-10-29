<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CloudStorageAdapter, type CloudStorageConfig, type SyncStatus, type ConflictResolution } from '../../services/storage/CloudStorageAdapter';

  // Props
  let {
    userId = $bindable(''),
    apiEndpoint = $bindable(''),
    apiKey = $bindable(''),
  }: {
    userId?: string;
    apiEndpoint?: string;
    apiKey?: string;
  } = $props();

  // State
  let syncEnabled = $state(false);
  let conflictStrategy: 'local' | 'remote' | 'newest' | 'ask' = $state('newest');
  let syncInterval = $state(30);
  let adapter: CloudStorageAdapter | null = $state(null);
  let syncStatus: SyncStatus = $state({
    lastSync: null,
    pendingOperations: 0,
    syncing: false,
    online: true,
    error: null,
  });
  let statusMessage = $state('');
  let showConflictDialog = $state(false);
  let pendingConflicts: ConflictResolution[] = $state([]);

  let statusInterval: number | null = null;

  onMount(() => {
    loadSettings();
    startStatusPolling();
  });

  onDestroy(() => {
    stopStatusPolling();
    if (adapter) {
      adapter.close();
    }
  });

  function loadSettings() {
    try {
      const saved = localStorage.getItem('whisker-cloud-sync-config');
      if (saved) {
        const config = JSON.parse(saved);
        userId = config.userId || '';
        apiEndpoint = config.apiEndpoint || '';
        apiKey = config.apiKey || '';
        syncEnabled = config.syncEnabled || false;
        conflictStrategy = config.conflictStrategy || 'newest';
        syncInterval = config.syncInterval || 30;
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  }

  function saveSettings() {
    try {
      const config = {
        userId,
        apiEndpoint,
        apiKey,
        syncEnabled,
        conflictStrategy,
        syncInterval,
      };
      localStorage.setItem('whisker-cloud-sync-config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save sync settings:', error);
    }
  }

  async function handleToggleSync() {
    if (!syncEnabled && (!userId || !apiEndpoint)) {
      statusMessage = 'Please configure User ID and API Endpoint first';
      return;
    }

    syncEnabled = !syncEnabled;
    saveSettings();

    if (syncEnabled) {
      await initializeAdapter();
      statusMessage = 'Cloud sync enabled';
    } else {
      if (adapter) {
        adapter.setSyncEnabled(false);
        adapter.close();
        adapter = null;
      }
      statusMessage = 'Cloud sync disabled';
    }

    setTimeout(() => {
      statusMessage = '';
    }, 3000);
  }

  async function initializeAdapter() {
    try {
      const config: CloudStorageConfig = {
        userId,
        syncEnabled: true,
        conflictResolution: conflictStrategy,
        syncInterval: syncInterval * 1000,
        apiEndpoint,
        apiKey: apiKey || undefined,
      };

      adapter = new CloudStorageAdapter(config, handleConflicts);
      await adapter.initialize();

      statusMessage = 'Cloud sync initialized successfully';
    } catch (error) {
      statusMessage = `Failed to initialize sync: ${error}`;
      syncEnabled = false;
      console.error('Failed to initialize cloud sync:', error);
    }
  }

  async function handleManualSync() {
    if (!adapter) {
      statusMessage = 'Sync not initialized';
      return;
    }

    statusMessage = 'Syncing...';

    try {
      await adapter.sync();
      statusMessage = 'Sync completed successfully';
    } catch (error) {
      statusMessage = `Sync failed: ${error}`;
      console.error('Manual sync failed:', error);
    }

    setTimeout(() => {
      statusMessage = '';
    }, 3000);
  }

  function handleConflictStrategyChange() {
    saveSettings();
    if (adapter) {
      adapter.setConflictResolution(conflictStrategy);
    }
  }

  function handleSyncIntervalChange() {
    saveSettings();
    if (adapter && syncEnabled) {
      // Reinitialize with new interval
      adapter.close();
      initializeAdapter();
    }
  }

  async function handleConflicts(conflicts: ConflictResolution[]): Promise<ConflictResolution[]> {
    return new Promise((resolve) => {
      pendingConflicts = conflicts;
      showConflictDialog = true;

      // Store resolve function to call when dialog is closed
      (window as any).__conflictResolver = resolve;
    });
  }

  function resolveConflict(index: number, resolution: 'local' | 'remote') {
    pendingConflicts[index].resolution = resolution;
    pendingConflicts = [...pendingConflicts];
  }

  function applyConflictResolutions() {
    const resolver = (window as any).__conflictResolver;
    if (resolver) {
      resolver(pendingConflicts);
      delete (window as any).__conflictResolver;
    }
    showConflictDialog = false;
    pendingConflicts = [];
  }

  function startStatusPolling() {
    statusInterval = window.setInterval(() => {
      if (adapter) {
        syncStatus = adapter.getSyncStatus();
      }
    }, 1000);
  }

  function stopStatusPolling() {
    if (statusInterval !== null) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
  }

  function formatDate(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  function formatTimeSince(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
</script>

<div class="sync-settings p-4 space-y-6">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Cloud Sync Settings</h2>

  <!-- Configuration -->
  <section class="config-section space-y-4">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Configuration</h3>

    <div class="space-y-3">
      <!-- User ID -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          User ID
        </label>
        <input
          type="text"
          bind:value={userId}
          onchange={saveSettings}
          placeholder="user@example.com"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <!-- API Endpoint -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          API Endpoint
        </label>
        <input
          type="text"
          bind:value={apiEndpoint}
          onchange={saveSettings}
          placeholder="https://api.example.com"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <!-- API Key (optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          API Key (optional)
        </label>
        <input
          type="password"
          bind:value={apiKey}
          onchange={saveSettings}
          placeholder="Your API key"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <!-- Conflict Resolution Strategy -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Conflict Resolution
        </label>
        <select
          bind:value={conflictStrategy}
          onchange={handleConflictStrategyChange}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="newest">Use Newest (automatic)</option>
          <option value="local">Always Use Local</option>
          <option value="remote">Always Use Remote</option>
          <option value="ask">Ask Me (manual)</option>
        </select>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          How to handle conflicts between local and cloud data
        </p>
      </div>

      <!-- Sync Interval -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sync Interval (seconds)
        </label>
        <input
          type="number"
          bind:value={syncInterval}
          onchange={handleSyncIntervalChange}
          min="10"
          max="300"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  </section>

  <!-- Sync Control -->
  <section class="control-section space-y-3">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Sync Control</h3>

    <div class="flex gap-3">
      <button
        onclick={handleToggleSync}
        class="px-4 py-2 {syncEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded transition-colors"
      >
        {syncEnabled ? 'Disable Sync' : 'Enable Sync'}
      </button>

      {#if syncEnabled}
        <button
          onclick={handleManualSync}
          disabled={syncStatus.syncing}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncStatus.syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      {/if}
    </div>

    {#if statusMessage}
      <div class="status-message text-sm text-gray-600 dark:text-gray-400">
        {statusMessage}
      </div>
    {/if}
  </section>

  <!-- Sync Status -->
  {#if syncEnabled}
    <section class="status-section space-y-2">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Sync Status</h3>

      <div class="status-grid grid grid-cols-2 gap-4">
        <div class="status-item p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="text-xs text-gray-500 dark:text-gray-400">Connection</div>
          <div class="text-lg font-semibold {syncStatus.online ? 'text-green-600' : 'text-red-600'}">
            {syncStatus.online ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>

        <div class="status-item p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="text-xs text-gray-500 dark:text-gray-400">Last Sync</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatTimeSince(syncStatus.lastSync)}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(syncStatus.lastSync)}
          </div>
        </div>

        <div class="status-item p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="text-xs text-gray-500 dark:text-gray-400">Pending Operations</div>
          <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {syncStatus.pendingOperations}
          </div>
        </div>

        <div class="status-item p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="text-xs text-gray-500 dark:text-gray-400">Status</div>
          <div class="text-sm font-semibold {syncStatus.syncing ? 'text-blue-600' : 'text-green-600'}">
            {syncStatus.syncing ? '⏳ Syncing' : '✓ Idle'}
          </div>
        </div>
      </div>

      {#if syncStatus.error}
        <div class="error-message p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded">
          <div class="text-sm text-red-800 dark:text-red-200">
            Error: {syncStatus.error}
          </div>
        </div>
      {/if}
    </section>
  {/if}
</div>

<!-- Conflict Resolution Dialog -->
{#if showConflictDialog}
  <div class="conflict-dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="conflict-dialog bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      <div class="dialog-header p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Resolve Sync Conflicts</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Choose which version to keep for each conflicting preference
        </p>
      </div>

      <div class="dialog-content p-4 overflow-y-auto flex-1">
        <div class="conflicts-list space-y-4">
          {#each pendingConflicts as conflict, index}
            <div class="conflict-item border border-gray-200 dark:border-gray-700 rounded p-4">
              <div class="font-medium text-gray-900 dark:text-gray-100 mb-2">{conflict.key}</div>

              <div class="grid grid-cols-2 gap-4">
                <div class="local-value">
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local Value</div>
                  <div class="value-preview text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(conflict.localValue, null, 2)}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Modified: {formatDate(conflict.localTimestamp)}
                  </div>
                  <button
                    onclick={() => resolveConflict(index, 'local')}
                    class="mt-2 w-full px-3 py-2 {conflict.resolution === 'local' ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded hover:opacity-80 transition-opacity"
                  >
                    {conflict.resolution === 'local' ? '✓ Selected' : 'Use Local'}
                  </button>
                </div>

                <div class="remote-value">
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remote Value</div>
                  <div class="value-preview text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(conflict.remoteValue, null, 2)}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Modified: {formatDate(conflict.remoteTimestamp)}
                  </div>
                  <button
                    onclick={() => resolveConflict(index, 'remote')}
                    class="mt-2 w-full px-3 py-2 {conflict.resolution === 'remote' ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded hover:opacity-80 transition-opacity"
                  >
                    {conflict.resolution === 'remote' ? '✓ Selected' : 'Use Remote'}
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="dialog-footer p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onclick={applyConflictResolutions}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Apply Resolutions
        </button>
      </div>
    </div>
  </div>
{/if}
