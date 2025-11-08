<script lang="ts">
  import { isAuthenticated, githubUser } from '../../services/github/githubAuth';
  import { writable } from 'svelte/store';

  export let repositoryName: string | null = null;
  export let syncStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'idle';
  export let lastSyncTime: Date | null = null;
  export let errorMessage: string | null = null;

  function formatTimeSince(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function getStatusIcon() {
    if (!$isAuthenticated) return '○';

    switch (syncStatus) {
      case 'syncing':
        return '↻';
      case 'synced':
        return '✓';
      case 'error':
        return '✕';
      default:
        return '●';
    }
  }

  function getStatusColor() {
    if (!$isAuthenticated) return 'text-gray-400';

    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-500';
      case 'synced':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  function getStatusText() {
    if (!$isAuthenticated) return 'Not connected';
    if (!repositoryName) return 'No repository';

    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSyncTime ? `Synced ${formatTimeSince(lastSyncTime)}` : 'Synced';
      case 'error':
        return errorMessage || 'Sync error';
      default:
        return repositoryName;
    }
  }
</script>

<div class="flex items-center gap-2 text-sm">
  {#if $isAuthenticated}
    <span class="{getStatusColor()} {syncStatus === 'syncing' ? 'animate-spin' : ''}">
      {getStatusIcon()}
    </span>
    <span class="text-gray-700 dark:text-gray-300" title={repositoryName || 'No repository'}>
      {getStatusText()}
    </span>
  {:else}
    <span class="text-gray-400">
      {getStatusIcon()} GitHub
    </span>
  {/if}
</div>
