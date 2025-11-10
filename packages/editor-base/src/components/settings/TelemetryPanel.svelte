<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getTelemetryService, type StorageMetrics, type PerformanceMetric, type ErrorEvent, type QuotaMetrics } from '../../services/TelemetryService';

  // Props
  let {
    refreshInterval = 1000,
  }: {
    refreshInterval?: number;
  } = $props();

  // State
  let telemetryEnabled = $state(true);
  let metrics = $state<StorageMetrics>({
    reads: 0,
    writes: 0,
    deletes: 0,
    errors: 0,
    totalReadTime: 0,
    totalWriteTime: 0,
    totalDeleteTime: 0,
    avgReadTime: 0,
    avgWriteTime: 0,
    avgDeleteTime: 0,
    lastOperation: null,
    lastOperationTime: null,
    used: 0,
    available: 0,
    total: 0,
  });
  let performanceHistory = $state<PerformanceMetric[]>([]);
  let errorHistory = $state<ErrorEvent[]>([]);
  let quotaHistory = $state<QuotaMetrics[]>([]);
  let currentQuota = $state<QuotaMetrics | null>(null);
  let performanceStats = $state({
    totalOperations: 0,
    successRate: 0,
    avgDuration: 0,
    minDuration: 0,
    maxDuration: 0,
    operationCounts: {} as Record<string, number>,
  });
  let operationsPerMinute = $state(0);
  let sessionDuration = $state(0);

  let updateInterval: number | null = null;

  const telemetryService = getTelemetryService();

  onMount(() => {
    loadTelemetryData();
    startUpdates();
  });

  onDestroy(() => {
    stopUpdates();
  });

  function loadTelemetryData() {
    metrics = telemetryService.getMetrics();
    performanceHistory = telemetryService.getPerformanceHistory();
    errorHistory = telemetryService.getErrorHistory();
    quotaHistory = telemetryService.getQuotaHistory();
    performanceStats = telemetryService.getPerformanceStats();
    operationsPerMinute = telemetryService.getOperationsPerMinute();

    const snapshot = telemetryService.getSnapshot();
    sessionDuration = snapshot.sessionDuration;

    // Get current quota
    currentQuota = telemetryService.getCurrentQuota();
  }

  function startUpdates() {
    updateInterval = window.setInterval(() => {
      loadTelemetryData();
    }, refreshInterval);
  }

  function stopUpdates() {
    if (updateInterval !== null) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  function handleToggleTelemetry() {
    telemetryEnabled = !telemetryEnabled;
    telemetryService.setEnabled(telemetryEnabled);
  }

  function handleReset() {
    if (confirm('Are you sure you want to reset all telemetry data?')) {
      telemetryService.reset();
      loadTelemetryData();
    }
  }

  function handleExport() {
    const data = telemetryService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = telemetryService.importData(text);

      if (success) {
        loadTelemetryData();
        alert('Telemetry data imported successfully!');
      } else {
        alert('Failed to import telemetry data. Invalid format.');
      }
    } catch (error) {
      alert(`Failed to import: ${error}`);
    }

    // Reset input
    input.value = '';
  }

  function formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function formatSessionDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function getOperationColor(operation: string): string {
    switch (operation) {
      case 'read': return 'text-blue-600 dark:text-blue-400';
      case 'write': return 'text-green-600 dark:text-green-400';
      case 'delete': return 'text-red-600 dark:text-red-400';
      case 'list': return 'text-purple-600 dark:text-purple-400';
      case 'sync': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }
</script>

<div class="telemetry-panel p-4 space-y-6">
  <div class="header flex items-center justify-between">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Telemetry & Monitoring</h2>

    <div class="controls flex gap-2">
      <button
        onclick={handleToggleTelemetry}
        class="px-3 py-1 text-sm {telemetryEnabled ? 'bg-green-500' : 'bg-gray-500'} text-white rounded hover:opacity-80 transition-opacity"
      >
        {telemetryEnabled ? '✓ Enabled' : '✗ Disabled'}
      </button>

      <button
        onclick={handleReset}
        class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Reset
      </button>

      <button
        onclick={handleExport}
        class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Export
      </button>

      <label class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors cursor-pointer">
        Import
        <input
          type="file"
          accept=".json"
          onchange={handleImport}
          class="hidden"
        />
      </label>
    </div>
  </div>

  <!-- Session Info -->
  <section class="session-info bg-gray-50 dark:bg-gray-800 rounded p-4">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Session Info</h3>
    <div class="grid grid-cols-3 gap-4">
      <div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Session Duration</div>
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSessionDuration(sessionDuration)}</div>
      </div>
      <div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Operations/Min</div>
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{operationsPerMinute.toFixed(2)}</div>
      </div>
      <div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Last Operation</div>
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {metrics.lastOperation || 'None'}
        </div>
        {#if metrics.lastOperationTime}
          <div class="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(metrics.lastOperationTime)}</div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Storage Metrics -->
  <section class="storage-metrics">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Storage Operations</h3>

    <div class="grid grid-cols-4 gap-4">
      <div class="metric-card bg-blue-50 dark:bg-blue-900 rounded p-3">
        <div class="text-xs text-blue-600 dark:text-blue-300">Reads</div>
        <div class="text-2xl font-bold text-blue-700 dark:text-blue-200">{metrics.reads}</div>
        <div class="text-xs text-blue-600 dark:text-blue-300 mt-1">
          Avg: {formatDuration(metrics.avgReadTime)}
        </div>
      </div>

      <div class="metric-card bg-green-50 dark:bg-green-900 rounded p-3">
        <div class="text-xs text-green-600 dark:text-green-300">Writes</div>
        <div class="text-2xl font-bold text-green-700 dark:text-green-200">{metrics.writes}</div>
        <div class="text-xs text-green-600 dark:text-green-300 mt-1">
          Avg: {formatDuration(metrics.avgWriteTime)}
        </div>
      </div>

      <div class="metric-card bg-red-50 dark:bg-red-900 rounded p-3">
        <div class="text-xs text-red-600 dark:text-red-300">Deletes</div>
        <div class="text-2xl font-bold text-red-700 dark:text-red-200">{metrics.deletes}</div>
        <div class="text-xs text-red-600 dark:text-red-300 mt-1">
          Avg: {formatDuration(metrics.avgDeleteTime)}
        </div>
      </div>

      <div class="metric-card bg-orange-50 dark:bg-orange-900 rounded p-3">
        <div class="text-xs text-orange-600 dark:text-orange-300">Errors</div>
        <div class="text-2xl font-bold text-orange-700 dark:text-orange-200">{metrics.errors}</div>
        <div class="text-xs text-orange-600 dark:text-orange-300 mt-1">
          Rate: {metrics.errors > 0 && performanceStats.totalOperations > 0 ? ((metrics.errors / performanceStats.totalOperations) * 100).toFixed(1) : 0}%
        </div>
      </div>
    </div>
  </section>

  <!-- Performance Stats -->
  <section class="performance-stats">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Performance Statistics</h3>

    <div class="grid grid-cols-2 gap-4">
      <div class="stats-card bg-gray-50 dark:bg-gray-800 rounded p-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overall</h4>
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Total Operations:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{performanceStats.totalOperations}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Success Rate:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{performanceStats.successRate.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Avg Duration:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(performanceStats.avgDuration)}</span>
          </div>
        </div>
      </div>

      <div class="stats-card bg-gray-50 dark:bg-gray-800 rounded p-4">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration Range</h4>
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Minimum:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(performanceStats.minDuration)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Maximum:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(performanceStats.maxDuration)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Average:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(performanceStats.avgDuration)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="operation-breakdown mt-4 bg-gray-50 dark:bg-gray-800 rounded p-4">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operation Breakdown</h4>
      <div class="grid grid-cols-5 gap-2">
        {#each Object.entries(performanceStats.operationCounts) as [operation, count]}
          <div class="text-center">
            <div class="text-xs text-gray-600 dark:text-gray-400">{operation}</div>
            <div class="text-lg font-semibold {getOperationColor(operation)}">{count}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Storage Quota -->
  {#if currentQuota}
    <section class="storage-quota">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Storage Quota</h3>

      <div class="quota-info bg-gray-50 dark:bg-gray-800 rounded p-4">
        <div class="flex justify-between mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">Used:</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatBytes(currentQuota.used)}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">Total:</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatBytes(currentQuota.total)}</span>
        </div>
        <div class="flex justify-between mb-3">
          <span class="text-sm text-gray-600 dark:text-gray-400">Available:</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatBytes(currentQuota.available)}</span>
        </div>

        <!-- Progress Bar -->
        <div class="quota-bar bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            class="h-full {currentQuota.usagePercentage > 80 ? 'bg-red-500' : currentQuota.usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'} transition-all duration-300"
            style="width: {currentQuota.usagePercentage}%"
          ></div>
        </div>
        <div class="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
          {currentQuota.usagePercentage.toFixed(1)}% used
        </div>
      </div>
    </section>
  {/if}

  <!-- Recent Performance -->
  <section class="recent-performance">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Recent Operations (Last 10)</h3>

    <div class="performance-list bg-gray-50 dark:bg-gray-800 rounded p-4 max-h-64 overflow-y-auto">
      {#if performanceHistory.length === 0}
        <div class="text-center text-gray-500 dark:text-gray-400 py-4">No operations recorded yet</div>
      {:else}
        <div class="space-y-2">
          {#each performanceHistory.slice(-10).reverse() as metric}
            <div class="operation-item flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded text-sm">
              <div class="flex items-center gap-2">
                <span class="font-medium {getOperationColor(metric.operation)}">{metric.operation}</span>
                {#if metric.key}
                  <span class="text-gray-600 dark:text-gray-400">({metric.key})</span>
                {/if}
              </div>
              <div class="flex items-center gap-3">
                <span class="text-gray-600 dark:text-gray-400">{formatDuration(metric.duration)}</span>
                <span class="{metric.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} text-xs font-semibold">
                  {metric.success ? '✓' : '✗'}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Recent Errors -->
  {#if errorHistory.length > 0}
    <section class="recent-errors">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Recent Errors</h3>

      <div class="error-list bg-red-50 dark:bg-red-900 rounded p-4 max-h-64 overflow-y-auto">
        <div class="space-y-2">
          {#each errorHistory.slice(-5).reverse() as error}
            <div class="error-item p-3 bg-white dark:bg-red-800 rounded">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-red-700 dark:text-red-300">{error.operation}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(error.timestamp)}</span>
              </div>
              <div class="text-sm text-red-600 dark:text-red-200">{error.error}</div>
              {#if error.key}
                <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Key: {error.key}</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}
</div>
