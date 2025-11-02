<script lang="ts">
  import {
    collaborationStore,
    currentUser,
    session,
    isCollaborating,
    activeCollaborators,
    pendingChanges,
    conflictedChanges,
    hasConflicts,
    type Collaborator,
  } from '../stores/collaborationStore';
  import { currentStory } from '../stores/projectStore';

  let userName = $state($currentUser?.name || 'Anonymous');
  let userColor = $state($currentUser?.color || '#3b82f6');
  let showSettings = $state(false);

  // Start/stop collaboration
  function toggleCollaboration() {
    if ($isCollaborating) {
      collaborationStore.leaveSession();
    } else if ($currentStory) {
      collaborationStore.initSession($currentStory);
    }
  }

  // Update user profile
  function updateProfile() {
    collaborationStore.updateUser({
      name: userName,
      color: userColor,
    });
    showSettings = false;
  }

  // Format time ago
  function timeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Get status color
  function getStatusColor(status: Collaborator['status']): string {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'away': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
    }
  }

  // Sync changes periodically
  let syncInterval: ReturnType<typeof setInterval>;
  $effect(() => {
    if ($isCollaborating) {
      syncInterval = setInterval(() => {
        collaborationStore.syncChanges();
      }, 2000); // Sync every 2 seconds

      return () => clearInterval(syncInterval);
    }
  });
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Collaboration
      </h2>
      <button
        onclick={() => showSettings = !showSettings}
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        title="Settings"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    <!-- Enable/Disable Collaboration -->
    <button
      onclick={toggleCollaboration}
      disabled={!$currentStory}
      class="w-full py-2 px-4 rounded font-medium transition-colors {$isCollaborating
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'}"
    >
      {$isCollaborating ? 'Leave Session' : 'Start Collaborating'}
    </button>
  </div>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Your Profile</h3>

      <div class="space-y-3">
        <div>
          <label for="user-name" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            id="user-name"
            type="text"
            bind:value={userName}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Your name"
          />
        </div>

        <div>
          <label for="user-color" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cursor Color
          </label>
          <input
            id="user-color"
            type="color"
            bind:value={userColor}
            class="w-full h-10 rounded cursor-pointer"
          />
        </div>

        <div class="flex gap-2">
          <button
            onclick={updateProfile}
            class="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Save
          </button>
          <button
            onclick={() => showSettings = false}
            class="flex-1 py-2 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if !$isCollaborating}
      <!-- Not Collaborating -->
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="text-sm">Start a collaboration session to work with others in real-time.</p>
        <p class="text-xs mt-2">Note: Demo mode uses local storage only.</p>
      </div>
    {:else}
      <!-- Active Collaborators -->
      <div>
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Active ({$activeCollaborators.length})
        </h3>
        <div class="space-y-2">
          {#each $activeCollaborators as collaborator (collaborator.id)}
            <div class="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-900">
              <div class="relative">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                  style="background-color: {collaborator.color}"
                >
                  {collaborator.name.charAt(0).toUpperCase()}
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 {getStatusColor(collaborator.status)}"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {collaborator.name}
                  </p>
                  {#if collaborator.id === $currentUser?.id}
                    <span class="text-xs text-gray-500 dark:text-gray-400">(you)</span>
                  {/if}
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {timeAgo(collaborator.lastSeen)}
                  {#if collaborator.currentPassage}
                    · editing
                  {/if}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Pending Changes -->
      {#if $pendingChanges.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Pending Changes ({$pendingChanges.length})
          </h3>
          <div class="space-y-2">
            {#each $pendingChanges as change (change.id)}
              <div class="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div class="text-xs text-gray-900 dark:text-gray-100">
                  <span class="font-medium">{change.action}</span> {change.type}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {$session?.collaborators[change.collaboratorId]?.name || 'Unknown'}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Conflicts -->
      {#if $hasConflicts}
        <div>
          <h3 class="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Conflicts ({$conflictedChanges.length})
          </h3>
          <div class="space-y-2">
            {#each $conflictedChanges as change (change.id)}
              <div class="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div class="text-xs text-gray-900 dark:text-gray-100">
                  <span class="font-medium">{change.action}</span> {change.type}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {$session?.collaborators[change.collaboratorId]?.name || 'Unknown'}
                </div>
                <div class="flex gap-2 mt-2">
                  <button
                    onclick={() => collaborationStore.resolveConflict(change.id, 'accept')}
                    class="flex-1 py-1 px-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                  >
                    Accept
                  </button>
                  <button
                    onclick={() => collaborationStore.resolveConflict(change.id, 'reject')}
                    class="flex-1 py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Session Info -->
      {#if $session}
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Session Info</h3>
          <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>Started: {new Date($session.started).toLocaleString()}</p>
            <p>ID: {$session.id.slice(0, 20)}...</p>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
