<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Story } from '@whisker/core-ts';
  import StoryComparisonView from '../comparison/StoryComparisonView.svelte';

  export let show = false;
  export let localVersion: Story | null = null;
  export let remoteVersion: Story | null = null;
  export let localModified: Date | null = null;
  export let remoteModified: Date | null = null;

  const dispatch = createEventDispatcher();

  type ResolutionChoice = 'local' | 'remote' | 'manual';
  let selectedResolution: ResolutionChoice | null = null;
  let showComparison = false;

  function formatDate(date: Date | null): string {
    if (!date) return 'Unknown';
    return date.toLocaleString();
  }

  function getChangeSummary(local: Story | null, remote: Story | null): string {
    if (!local || !remote) return 'Unable to compare versions';

    const changes: string[] = [];

    // Check passages
    if (local.passages.size !== remote.passages.size) {
      changes.push(`Passages: ${local.passages.size} local vs ${remote.passages.size} remote`);
    }

    // Check variables
    const localVars = local.variables?.size || 0;
    const remoteVars = remote.variables?.size || 0;
    if (localVars !== remoteVars) {
      changes.push(`Variables: ${localVars} local vs ${remoteVars} remote`);
    }

    // Check tags
    const localTags = local.metadata?.tags?.length || 0;
    const remoteTags = remote.metadata?.tags?.length || 0;
    if (localTags !== remoteTags) {
      changes.push(`Tags: ${localTags} local vs ${remoteTags} remote`);
    }

    // Check metadata
    if (local.metadata?.title !== remote.metadata?.title) {
      changes.push(`Title changed`);
    }

    if (changes.length === 0) {
      return 'Content differences detected';
    }

    return changes.join(', ');
  }

  function selectResolution(choice: ResolutionChoice) {
    selectedResolution = choice;
  }

  function applyResolution() {
    if (!selectedResolution) return;

    dispatch('resolve', {
      resolution: selectedResolution,
      localVersion,
      remoteVersion,
    });

    close();
  }

  function close() {
    show = false;
    selectedResolution = null;
    showComparison = false;
  }

  function toggleComparison() {
    showComparison = !showComparison;
  }

  function handleComparisonAccept(event: CustomEvent) {
    const { source } = event.detail;

    // Map comparison source to resolution choice
    if (source === 'left') {
      selectedResolution = 'local';
    } else if (source === 'right') {
      selectedResolution = 'remote';
    }

    applyResolution();
  }

  $: changeSummary = getChangeSummary(localVersion, remoteVersion);
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="text-2xl text-yellow-500">⚠</span>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Sync Conflict Detected
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              The story has been modified both locally and on GitHub
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Conflict Summary -->
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 class="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            What happened?
          </h3>
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            {changeSummary}
          </p>
        </div>

        <!-- Version Comparison -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <!-- Local Version -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-blue-500">●</span>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                Your Local Version
              </h3>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>
                <span class="font-medium">Modified:</span> {formatDate(localModified)}
              </div>
              {#if localVersion}
                <div>
                  <span class="font-medium">Passages:</span> {localVersion.passages.size}
                </div>
                <div>
                  <span class="font-medium">Variables:</span> {localVersion.variables?.size || 0}
                </div>
                <div>
                  <span class="font-medium">Tags:</span> {localVersion.metadata?.tags?.length || 0}
                </div>
              {/if}
            </div>
          </div>

          <!-- Remote Version -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-green-500">●</span>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                GitHub Version
              </h3>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>
                <span class="font-medium">Modified:</span> {formatDate(remoteModified)}
              </div>
              {#if remoteVersion}
                <div>
                  <span class="font-medium">Passages:</span> {remoteVersion.passages.size}
                </div>
                <div>
                  <span class="font-medium">Variables:</span> {remoteVersion.variables?.size || 0}
                </div>
                <div>
                  <span class="font-medium">Tags:</span> {remoteVersion.metadata?.tags?.length || 0}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Resolution Options -->
        <div class="space-y-3 mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Choose how to resolve this conflict:
          </h3>

          <!-- Keep Local -->
          <button
            on:click={() => selectResolution('local')}
            class="w-full text-left p-4 border-2 rounded-lg transition-all {selectedResolution === 'local' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
          >
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center {selectedResolution === 'local' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}">
                {#if selectedResolution === 'local'}
                  <div class="w-2 h-2 bg-white rounded-full"></div>
                {/if}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  Keep My Local Changes
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Overwrite the GitHub version with your local changes. The remote changes will be lost.
                </div>
              </div>
            </div>
          </button>

          <!-- Use Remote -->
          <button
            on:click={() => selectResolution('remote')}
            class="w-full text-left p-4 border-2 rounded-lg transition-all {selectedResolution === 'remote' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
          >
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center {selectedResolution === 'remote' ? 'border-green-500 bg-green-500' : 'border-gray-300'}">
                {#if selectedResolution === 'remote'}
                  <div class="w-2 h-2 bg-white rounded-full"></div>
                {/if}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  Use GitHub Version
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Discard your local changes and use the version from GitHub. Your local changes will be lost.
                </div>
              </div>
            </div>
          </button>

          <!-- Manual Merge -->
          <button
            on:click={() => selectResolution('manual')}
            class="w-full text-left p-4 border-2 rounded-lg transition-all {selectedResolution === 'manual' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
          >
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center {selectedResolution === 'manual' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}">
                {#if selectedResolution === 'manual'}
                  <div class="w-2 h-2 bg-white rounded-full"></div>
                {/if}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  Manual Merge (Advanced)
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Review both versions and manually merge the changes. This will keep the conflict unresolved until you fix it.
                </div>
              </div>
            </div>
          </button>
        </div>

        <!-- View Comparison -->
        <button
          on:click={toggleComparison}
          class="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          {showComparison ? '▼' : '▶'} {showComparison ? 'Hide' : 'Show'} detailed comparison
        </button>

        {#if showComparison && localVersion && remoteVersion}
          <div class="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div class="h-[500px]">
              <StoryComparisonView
                leftStory={localVersion}
                rightStory={remoteVersion}
                leftLabel="Local Version"
                rightLabel="GitHub Version"
                leftDate={localModified}
                rightDate={remoteModified}
                on:accept={handleComparisonAccept}
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <button
          on:click={close}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          on:click={applyResolution}
          disabled={!selectedResolution}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply Resolution
        </button>
      </div>
    </div>
  </div>
{/if}
