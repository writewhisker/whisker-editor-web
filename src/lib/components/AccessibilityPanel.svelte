<script lang="ts">
  import {
    accessibilityStore,
    accessibilityReport,
    accessibilityScore,
    accessibilityLevel,
    accessibilityIssues,
    criticalIssues,
    type AccessibilityIssue,
  } from '../stores/accessibilityStore';
  import { currentStory } from '../stores/projectStore';

  // Get score color
  function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  // Get level badge color
  function getLevelBadge(level: string): string {
    switch (level) {
      case 'excellent': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'good': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'fair': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'poor': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  }

  // Get severity color
  function getSeverityColor(severity: AccessibilityIssue['severity']): string {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
    }
  }

  // Get severity background
  function getSeverityBg(severity: AccessibilityIssue['severity']): string {
    switch (severity) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  }

  // Get reading ease description
  function getReadingEaseDesc(score: number): string {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  // Analyze story
  function analyze() {
    if (!$currentStory) return;
    accessibilityStore.analyze($currentStory);
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
        Accessibility
      </h2>
      <button
        onclick={analyze}
        disabled={!$currentStory || $accessibilityStore.analyzing}
        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
      >
        {$accessibilityStore.analyzing ? 'Analyzing...' : 'Check'}
      </button>
    </div>
    {#if $accessibilityReport}
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Last checked: {new Date($accessibilityReport.analyzedAt).toLocaleString()}
      </p>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if !$currentStory}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No story loaded</p>
      </div>
    {:else if !$accessibilityReport}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p class="text-sm">Click "Check" to analyze accessibility</p>
      </div>
    {:else}
      <!-- Accessibility Score -->
      <div class="p-4 rounded-lg border-2 {$accessibilityScore >= 70 ? 'border-green-300 dark:border-green-700' : 'border-yellow-300 dark:border-yellow-700'} bg-gray-50 dark:bg-gray-900">
        <div class="text-center">
          <div class="text-4xl font-bold {getScoreColor($accessibilityScore)} mb-2">
            {Math.round($accessibilityScore)}
          </div>
          <div class="inline-block px-3 py-1 rounded-full text-sm font-medium {getLevelBadge($accessibilityLevel)}">
            {$accessibilityLevel.toUpperCase()}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Accessibility Score
          </div>
        </div>
      </div>

      <!-- Reading Level -->
      {#if $accessibilityReport.readingLevel}
        <div>
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Reading Level</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-900">
              <span class="text-gray-600 dark:text-gray-400">Grade Level</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {$accessibilityReport.readingLevel.fleschKincaidGrade.toFixed(1)}
              </span>
            </div>
            <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-900">
              <span class="text-gray-600 dark:text-gray-400">Reading Ease</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {$accessibilityReport.readingLevel.fleschReadingEase.toFixed(0)}
                <span class="text-xs text-gray-500">
                  ({getReadingEaseDesc($accessibilityReport.readingLevel.fleschReadingEase)})
                </span>
              </span>
            </div>
            <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-900">
              <span class="text-gray-600 dark:text-gray-400">Avg Sentence Length</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {$accessibilityReport.readingLevel.avgSentenceLength.toFixed(1)} words
              </span>
            </div>
            <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-900">
              <span class="text-gray-600 dark:text-gray-400">Complex Words</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {$accessibilityReport.readingLevel.complexWords}
              </span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Issues Summary -->
      {#if $accessibilityIssues.length > 0}
        <div>
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Issues ({$accessibilityIssues.length})
            {#if $criticalIssues.length > 0}
              <span class="text-red-600 dark:text-red-400">
                · {$criticalIssues.length} Critical
              </span>
            {/if}
          </h3>
          <div class="space-y-2">
            {#each $accessibilityIssues.slice(0, 15) as issue (issue.id)}
              <div class="p-3 rounded border {getSeverityBg(issue.severity)}">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <span class="text-xs font-medium uppercase {getSeverityColor(issue.severity)}">
                    {issue.severity}
                  </span>
                  {#if issue.wcagLevel}
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      WCAG {issue.wcagLevel}
                    </span>
                  {/if}
                </div>
                <div class="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  {issue.message}
                </div>
                {#if issue.passageTitle}
                  <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Passage: {issue.passageTitle}
                  </div>
                {/if}
                <div class="text-xs text-gray-600 dark:text-gray-400 italic">
                  💡 {issue.suggestion}
                </div>
              </div>
            {/each}
            {#if $accessibilityIssues.length > 15}
              <div class="text-xs text-center text-gray-500 dark:text-gray-400">
                ...and {$accessibilityIssues.length - 15} more issues
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="text-sm font-medium text-green-700 dark:text-green-400">
            ✓ No accessibility issues detected
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Your story follows accessibility best practices!
          </div>
        </div>
      {/if}

      <!-- Guidelines Info -->
      <div class="p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div class="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
          About WCAG Guidelines
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">
          This checker follows Web Content Accessibility Guidelines (WCAG) 2.1 standards for interactive content.
        </div>
      </div>
    {/if}
  </div>
</div>
