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
</script>

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
      {#if migrationProgress}
        <div class="migration-progress text-sm text-gray-600 dark:text-gray-400 mt-2">
          {migrationProgress}
        </div>
      {/if}
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
