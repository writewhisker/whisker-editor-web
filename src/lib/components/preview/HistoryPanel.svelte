<script lang="ts">
  import {
    playthroughHistory,
    uniquePassagesVisited,
    playthroughDuration,
    playerActions,
  } from '../../stores/playerStore';

  function jumpToStep(index: number) {
    playerActions.jumpToStep(index);
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  function exportHistory() {
    const recording = playerActions.getPlaythrough();
    const json = JSON.stringify(recording, null, 2);

    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playthrough-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get current step index (last step)
  $: currentStepIndex = $playthroughHistory.length - 1;
</script>

<div class="history-panel">
  <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
    <span>📜</span>
    <span>History</span>
  </h4>

  {#if $playthroughHistory.length === 0}
    <p class="text-sm text-gray-500 italic">No history yet</p>
  {:else}
    <!-- Stats Summary -->
    <div class="stats-summary bg-blue-50 rounded p-2 mb-3 text-xs">
      <div class="flex justify-between mb-1">
        <span class="text-gray-600">Steps:</span>
        <span class="font-semibold text-gray-800">{$playthroughHistory.length}</span>
      </div>
      <div class="flex justify-between mb-1">
        <span class="text-gray-600">Unique Passages:</span>
        <span class="font-semibold text-gray-800">{$uniquePassagesVisited}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Duration:</span>
        <span class="font-semibold text-gray-800">{formatDuration($playthroughDuration)}</span>
      </div>
    </div>

    <!-- History List -->
    <div class="history-list space-y-1 mb-3 max-h-64 overflow-y-auto">
      {#each $playthroughHistory as step, index}
        <button
          class="history-step w-full text-left px-2 py-2 rounded text-sm transition-colors {index === currentStepIndex
            ? 'bg-blue-100 border-l-4 border-blue-500'
            : 'bg-gray-50 hover:bg-gray-100'}"
          on:click={() => jumpToStep(index)}
          title="Jump to this step"
        >
          <div class="flex items-start gap-2">
            <span class="text-gray-500 font-mono text-xs mt-0.5">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-800 truncate">
                {step.passageTitle}
              </div>
              {#if step.choiceText}
                <div class="text-xs text-gray-600 truncate">
                  → {step.choiceText}
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>

    <!-- Export Button -->
    <button
      class="w-full px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      on:click={exportHistory}
      title="Export playthrough as JSON"
    >
      💾 Export Log
    </button>
  {/if}
</div>

<style>
  .history-list::-webkit-scrollbar {
    width: 6px;
  }

  .history-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
