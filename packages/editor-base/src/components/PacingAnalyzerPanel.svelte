<script lang="ts">
  import {
    pacingStore,
    pacingMetrics,
    pacingIssues,
    highSeverityIssues,
    shortestPath,
    longestPath,
    type PacingIssue,
  } from '../stores/pacingStore';
  import { currentStory } from '../stores/storyStateStore';

  let analyzing = $state(false);

  // Format time
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  // Analyze story
  function analyze() {
    if (!$currentStory) return;
    analyzing = true;
    try {
      pacingStore.analyze($currentStory);
    } finally {
      analyzing = false;
    }
  }

  // Get severity color
  function getSeverityColor(severity: PacingIssue['severity']): string {
    switch (severity) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
    }
  }

  // Get severity background
  function getSeverityBg(severity: PacingIssue['severity']): string {
    switch (severity) {
      case 'high': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  }

  // Auto-analyze when story changes
  $effect(() => {
    if ($currentStory) {
      analyze();
    }
  });
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Pacing Analyzer
      </h2>
      <button
        onclick={analyze}
        disabled={!$currentStory || analyzing}
        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
      >
        {analyzing ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
    {#if $pacingMetrics}
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Last analyzed: {new Date($pacingStore.lastAnalyzed!).toLocaleString()}
      </p>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if !$currentStory}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No story loaded</p>
      </div>
    {:else if !$pacingMetrics}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Click "Analyze" to check story pacing</p>
      </div>
    {:else}
      <!-- Overview Metrics -->
      <div>
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Overview</h3>
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div class="text-xs text-gray-500 dark:text-gray-400">Passages</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {$pacingMetrics.totalPassages}
            </div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div class="text-xs text-gray-500 dark:text-gray-400">Total Words</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {$pacingMetrics.totalWords.toLocaleString()}
            </div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div class="text-xs text-gray-500 dark:text-gray-400">Avg Words/Passage</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {Math.round($pacingMetrics.avgWordsPerPassage)}
            </div>
          </div>
          <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <div class="text-xs text-gray-500 dark:text-gray-400">Max Depth</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {$pacingMetrics.maxDepth}
            </div>
          </div>
        </div>
      </div>

      <!-- Estimated Playtime -->
      <div>
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Estimated Playtime</h3>
        <div class="space-y-2">
          {#if $shortestPath}
            <div class="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600 dark:text-gray-400">Shortest Path</span>
                <span class="text-sm font-semibold text-green-700 dark:text-green-400">
                  {formatTime($shortestPath.totalReadTime)}
                </span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {$shortestPath.totalWords} words · {$shortestPath.passages.length} passages
              </div>
            </div>
          {/if}
          {#if $longestPath}
            <div class="p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-600 dark:text-gray-400">Longest Path</span>
                <span class="text-sm font-semibold text-purple-700 dark:text-purple-400">
                  {formatTime($longestPath.totalReadTime)}
                </span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {$longestPath.totalWords} words · {$longestPath.passages.length} passages
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Branching & Flow -->
      <div>
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Branching & Flow</h3>
        <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div class="flex justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Branching Factor</span>
            <span class="font-medium">{$pacingMetrics.branchingFactor.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Avg Choices/Passage</span>
            <span class="font-medium">{$pacingMetrics.avgChoicesPerPassage.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Dead Ends</span>
            <span class="font-medium {$pacingMetrics.deadEnds > 5 ? 'text-yellow-600 dark:text-yellow-400' : ''}">
              {$pacingMetrics.deadEnds}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Orphaned Passages</span>
            <span class="font-medium {$pacingMetrics.orphans > 0 ? 'text-red-600 dark:text-red-400' : ''}">
              {$pacingMetrics.orphans}
            </span>
          </div>
        </div>
      </div>

      <!-- Issues -->
      {#if $pacingIssues.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Issues ({$pacingIssues.length})
            {#if $highSeverityIssues.length > 0}
              <span class="text-red-600 dark:text-red-400">· {$highSeverityIssues.length} High Priority</span>
            {/if}
          </h3>
          <div class="space-y-2">
            {#each $pacingIssues.slice(0, 10) as issue (issue.passageId + issue.type)}
              <div class="p-2 rounded border {getSeverityBg(issue.severity)}">
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium {getSeverityColor(issue.severity)}">
                      {issue.severity.toUpperCase()}
                    </div>
                    <div class="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {issue.message}
                    </div>
                    {#if issue.suggestion}
                      <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                        💡 {issue.suggestion}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
            {#if $pacingIssues.length > 10}
              <div class="text-xs text-center text-gray-500 dark:text-gray-400">
                ...and {$pacingIssues.length - 10} more issues
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="text-sm font-medium text-green-700 dark:text-green-400">
            ✓ No pacing issues detected
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Your story has good pacing!
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
