<script lang="ts">
  import {
    validationResult,
    qualityMetrics,
    isValidating,
    errorCount,
    warningCount,
    infoCount,
    isValid,
    validationActions,
    validationOptions,
    autoValidate,
    validationHistory,
    validatorConfig,
    performanceMetrics,
  } from '../../stores/validationStore';
  import { selectedPassageId } from '../../stores/projectStore';
  import { viewMode, viewPreferencesActions } from '../../stores/viewPreferencesStore';
  import type { ValidationIssue, ValidationSeverity, ValidationCategory } from '../../validation/types';

  // Filter state
  let selectedSeverity: ValidationSeverity | 'all' = 'all';
  let selectedCategory: ValidationCategory | 'all' = 'all';
  let showOnlyFixable = false;

  // View state
  let activeTab: 'issues' | 'metrics' | 'history' = 'issues';
  let selectedHistoryIndex: number | null = null;

  // Fix All state
  let isFixingAll = false;
  let fixAllProgress = { current: 0, total: 0 };
  let showFixAllConfirmation = false;
  let showFixAllSummary = false;
  let fixAllResult: any = null;

  // Filtered issues
  $: filteredIssues = ($validationResult && Array.isArray($validationResult.issues))
    ? $validationResult.issues.filter((issue) => {
        if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
          return false;
        }
        if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
          return false;
        }
        if (showOnlyFixable && !issue.fixable) {
          return false;
        }
        return true;
      })
    : [];

  // Issue counts by severity
  $: errorIssues = filteredIssues.filter(i => i.severity === 'error');
  $: warningIssues = filteredIssues.filter(i => i.severity === 'warning');
  $: infoIssues = filteredIssues.filter(i => i.severity === 'info');

  // Handle manual validation
  function handleValidate() {
    validationActions.validate();
  }

  // Handle auto-fix
  function handleAutoFix() {
    const fixableIssues = validationActions.getFixableIssues();
    if (fixableIssues.length === 0) {
      alert('No fixable issues found.');
      return;
    }

    const description = validationActions.getAutoFixDescription();
    if (confirm(`${description}\n\nThis cannot be undone. Continue?`)) {
      const result = validationActions.autoFix();

      if (result) {
        if (result.success) {
          alert(`Successfully fixed ${result.issuesFixed} issue(s).`);
        } else {
          alert(`Fixed ${result.issuesFixed} issue(s), but ${result.issuesFailed} failed:\n${result.errors.join('\n')}`);
        }
      }
    }
  }

  // Format duration
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // Get severity icon
  function getSeverityIcon(severity: ValidationSeverity): string {
    switch (severity) {
      case 'error': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  }

  // Get severity color
  function getSeverityColor(severity: ValidationSeverity): string {
    switch (severity) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
    }
  }

  // Handle issue click to navigate to passage
  function handleIssueClick(issue: ValidationIssue) {
    if (issue.passageId) {
      selectedPassageId.set(issue.passageId);
      // Switch to a view where the passage is visible if in preview mode
      if ($viewMode === 'preview') {
        viewPreferencesActions.setViewMode('list');
      }
    }
  }

  // Handle export
  function handleExport(format: 'json' | 'csv' | 'markdown' | 'html') {
    if (!$validationResult) {
      alert('No validation results to export. Please run validation first.');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    switch (format) {
      case 'json':
        content = validationActions.exportJSON();
        filename = `validation-${timestamp}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        content = validationActions.exportCSV();
        filename = `validation-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
      case 'markdown':
        content = validationActions.exportMarkdown();
        filename = `validation-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = validationActions.exportHTML();
        filename = `validation-${timestamp}.html`;
        mimeType = 'text/html';
        break;
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Handle import
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = validationActions.importJSON(text);

        if (success) {
          alert('Validation results imported successfully!');
          // Switch to issues tab to show imported results
          activeTab = 'issues';
        } else {
          alert('Failed to import validation results. Please check the file format.');
        }
      } catch (error) {
        alert('Error reading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    input.click();
  }

  // Handle individual issue fix
  function handleFixIssue(issueId: string) {
    const preview = validationActions.getIssueFixPreview(issueId);

    if (confirm(`${preview}\n\nApply this fix?`)) {
      const result = validationActions.fixIssue(issueId);

      if (result) {
        if (result.success && result.issuesFixed > 0) {
          // Success - issue was fixed
        } else if (result.issuesFailed > 0) {
          alert(`Failed to fix issue:\n${result.errors.join('\n')}`);
        }
      }
    }
  }

  // Handle Fix All button click
  function handleFixAllClick() {
    const fixableIssues = validationActions.getFixableIssues();
    if (fixableIssues.length === 0) {
      return;
    }
    showFixAllConfirmation = true;
  }

  // Confirm and execute Fix All
  async function confirmFixAll() {
    showFixAllConfirmation = false;
    isFixingAll = true;

    const fixableIssues = validationActions.getFixableIssues();
    fixAllProgress = { current: 0, total: fixableIssues.length };

    try {
      // Apply all fixes at once using the autoFix method
      const result = validationActions.autoFix();

      if (result) {
        fixAllResult = result;
        fixAllProgress.current = fixAllProgress.total;

        // Show summary after a brief delay to show completion
        setTimeout(() => {
          isFixingAll = false;
          showFixAllSummary = true;
        }, 500);
      } else {
        isFixingAll = false;
        alert('Failed to apply fixes. Please try again.');
      }
    } catch (error) {
      isFixingAll = false;
      alert(`Error during auto-fix: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cancel Fix All confirmation
  function cancelFixAll() {
    showFixAllConfirmation = false;
  }

  // Close Fix All summary
  function closeFixAllSummary() {
    showFixAllSummary = false;
    fixAllResult = null;
  }

  // Get fixable issues count
  $: fixableIssuesCount = validationActions.getFixableIssues().length;
</script>

<div class="validation-panel h-full flex flex-col bg-white">
  <!-- Header -->
  <div class="header border-b border-gray-300 p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
        <span>🔍</span>
        <span>Validation</span>
      </h3>

      <div class="flex items-center gap-2">
        {#if fixableIssuesCount > 0}
          <button
            class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
            on:click={handleFixAllClick}
            disabled={isFixingAll || $isValidating}
          >
            Fix All ({fixableIssuesCount})
          </button>
        {/if}

        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={$autoValidate}
            on:change={(e) => validationActions.setAutoValidate(e.currentTarget.checked)}
          />
          <span>Auto</span>
        </label>

        <button
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
          on:click={handleValidate}
          disabled={$isValidating}
        >
          {$isValidating ? 'Validating...' : 'Validate'}
        </button>
      </div>
    </div>

    <!-- Status -->
    {#if $validationResult}
      <div class="status flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          {#if $isValid}
            <span class="text-green-600 font-semibold">✓ Valid</span>
          {:else}
            <span class="text-red-600 font-semibold">✗ Invalid</span>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          {#if $errorCount > 0}
            <span class="text-red-600 font-medium">🔴 {$errorCount}</span>
          {/if}
          {#if $warningCount > 0}
            <span class="text-yellow-600 font-medium">⚠️ {$warningCount}</span>
          {/if}
          {#if $infoCount > 0}
            <span class="text-blue-600 font-medium">ℹ️ {$infoCount}</span>
          {/if}
        </div>

        <div class="ml-auto text-xs text-gray-500">
          {formatDuration($validationResult.duration)}
        </div>
      </div>
    {:else}
      <div class="text-sm text-gray-500">No validation results</div>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="tabs flex border-b border-gray-300">
    <button
      class="tab px-4 py-2 text-sm font-medium transition-colors {activeTab === 'issues' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
      on:click={() => activeTab = 'issues'}
    >
      Issues ({filteredIssues.length})
    </button>
    <button
      class="tab px-4 py-2 text-sm font-medium transition-colors {activeTab === 'metrics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
      on:click={() => activeTab = 'metrics'}
    >
      Metrics
    </button>
    <button
      class="tab px-4 py-2 text-sm font-medium transition-colors {activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}"
      on:click={() => activeTab = 'history'}
    >
      History ({$validationHistory.length})
    </button>
  </div>

  <!-- Content -->
  <div class="content flex-1 overflow-y-auto">
    {#if activeTab === 'issues'}
      <!-- Filters -->
      <div class="filters p-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center gap-3 text-sm flex-wrap">
          <select
            bind:value={selectedSeverity}
            class="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Severity</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>

          <select
            bind:value={selectedCategory}
            class="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Categories</option>
            <option value="structure">Structure</option>
            <option value="links">Links</option>
            <option value="variables">Variables</option>
            <option value="content">Content</option>
            <option value="quality">Quality</option>
          </select>

          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" bind:checked={showOnlyFixable} />
            <span>Fixable only</span>
          </label>

          {#if validationActions.getFixableIssues().length > 0}
            <button
              class="ml-auto px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              on:click={handleAutoFix}
            >
              Auto-fix ({validationActions.getFixableIssues().length})
            </button>
          {/if}
        </div>
      </div>

      <!-- Issues list -->
      <div class="issues-list">
        {#if filteredIssues.length === 0}
          <div class="p-4 text-center text-gray-500 text-sm">
            {#if $validationResult && Array.isArray($validationResult.issues)}
              {#if $validationResult.issues.length === 0}
                ✓ No issues found
              {:else}
                No issues match the current filters
              {/if}
            {:else}
              Run validation to see issues
            {/if}
          </div>
        {:else}
          {#each filteredIssues as issue (issue.id)}
            <div
              class="issue p-3 border-b border-gray-200 hover:bg-gray-50"
            >
              <div class="flex items-start gap-2">
                <span class="flex-shrink-0">{getSeverityIcon(issue.severity)}</span>
                <div
                  class="flex-1 min-w-0 {issue.passageId ? 'cursor-pointer' : ''}"
                  on:click={() => handleIssueClick(issue)}
                  role="button"
                  tabindex={issue.passageId ? 0 : -1}
                  on:keydown={(e) => e.key === 'Enter' && handleIssueClick(issue)}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium {getSeverityColor(issue.severity)}">
                      {issue.message}
                    </span>
                    {#if issue.fixable}
                      <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Fixable
                      </span>
                    {/if}
                  </div>

                  {#if issue.description}
                    <p class="text-sm text-gray-600 mb-1">{issue.description}</p>
                  {/if}

                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span class="bg-gray-100 px-2 py-0.5 rounded">{issue.category}</span>
                    {#if issue.passageTitle}
                      <span>📄 {issue.passageTitle}</span>
                    {/if}
                    {#if issue.variableName}
                      <span>🔢 {issue.variableName}</span>
                    {/if}
                  </div>
                </div>

                {#if issue.fixable}
                  <button
                    class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 flex-shrink-0"
                    on:click|stopPropagation={() => handleFixIssue(issue.id)}
                    title={issue.fixDescription || 'Fix this issue'}
                  >
                    Fix
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {:else if activeTab === 'metrics'}
      <!-- Quality Metrics -->
      {#if $qualityMetrics}
        <div class="metrics p-4 space-y-4">
          <!-- Structure -->
          <div class="metric-group">
            <h4 class="font-semibold text-gray-700 mb-2">Structure</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Depth:</span>
                <span class="font-medium">{$qualityMetrics.depth}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Branching:</span>
                <span class="font-medium">{$qualityMetrics.branchingFactor.toFixed(2)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Density:</span>
                <span class="font-medium">{($qualityMetrics.density * 100).toFixed(1)}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Reachability:</span>
                <span class="font-medium">{$qualityMetrics.reachabilityScore.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="metric-group">
            <h4 class="font-semibold text-gray-700 mb-2">Content</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Passages:</span>
                <span class="font-medium">{$qualityMetrics.totalPassages}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Choices:</span>
                <span class="font-medium">{$qualityMetrics.totalChoices}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Variables:</span>
                <span class="font-medium">{$qualityMetrics.totalVariables}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Endings:</span>
                <span class="font-medium">{$qualityMetrics.uniqueEndings}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Total Words:</span>
                <span class="font-medium">{$qualityMetrics.totalWords.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Avg Words/Passage:</span>
                <span class="font-medium">{$qualityMetrics.avgWordsPerPassage.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <!-- Complexity -->
          <div class="metric-group">
            <h4 class="font-semibold text-gray-700 mb-2">Complexity</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Conditional:</span>
                <span class="font-medium">{$qualityMetrics.conditionalComplexity.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Variable Refs:</span>
                <span class="font-medium">{$qualityMetrics.variableComplexity.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Estimates -->
          <div class="metric-group">
            <h4 class="font-semibold text-gray-700 mb-2">Estimates</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Play Time:</span>
                <span class="font-medium">{$qualityMetrics.estimatedPlayTime} min</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Unique Paths:</span>
                <span class="font-medium">{$qualityMetrics.estimatedPaths.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Export & Import -->
          <div class="metric-group">
            <h4 class="font-semibold text-gray-700 mb-2">Export Report</h4>
            <div class="grid grid-cols-2 gap-2 text-sm mb-3">
              <button
                class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                on:click={() => handleExport('json')}
                disabled={!$validationResult}
              >
                JSON
              </button>
              <button
                class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                on:click={() => handleExport('csv')}
                disabled={!$validationResult}
              >
                CSV
              </button>
              <button
                class="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
                on:click={() => handleExport('markdown')}
                disabled={!$validationResult}
              >
                Markdown
              </button>
              <button
                class="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
                on:click={() => handleExport('html')}
                disabled={!$validationResult}
              >
                HTML
              </button>
            </div>
            <button
              class="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              on:click={handleImport}
            >
              📥 Import JSON Report
            </button>
            <p class="text-xs text-gray-500 mt-2">
              Export validation results or import previously saved reports
            </p>
          </div>

          <!-- Validator Configuration -->
          <div class="metric-group">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-gray-700">Validators</h4>
              <button
                class="text-xs text-blue-600 hover:text-blue-800"
                on:click={() => validationActions.resetValidatorConfig()}
              >
                Reset All
              </button>
            </div>
            <div class="space-y-2">
              {#each Object.entries($validatorConfig) as [name, config]}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    on:change={(e) => validationActions.setValidatorEnabled(name, e.currentTarget.checked)}
                  />
                  <span class="flex-1">{name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </label>
              {/each}
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Enable or disable specific validators to customize validation
            </p>
          </div>

          <!-- Performance Metrics -->
          {#if $performanceMetrics}
            <div class="metric-group">
              <h4 class="font-semibold text-gray-700 mb-2">Performance</h4>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Avg Duration:</span>
                  <span class="font-medium">{$performanceMetrics.avgDuration}ms</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Total Runs:</span>
                  <span class="font-medium">{$performanceMetrics.totalRuns}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Fastest:</span>
                  <span class="font-medium">{$performanceMetrics.minDuration}ms</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Slowest:</span>
                  <span class="font-medium">{$performanceMetrics.maxDuration}ms</span>
                </div>
              </div>
              <div class="mt-2 flex items-center gap-2 text-sm">
                <span class="text-gray-600">Trend:</span>
                <span class="font-medium {$performanceMetrics.trend === 'improving' ? 'text-green-600' : $performanceMetrics.trend === 'degrading' ? 'text-red-600' : 'text-gray-600'}">
                  {$performanceMetrics.trend === 'improving' ? '📈 Improving' : $performanceMetrics.trend === 'degrading' ? '📉 Degrading' : '➖ Stable'}
                </span>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="p-4 text-center text-gray-500 text-sm">
          Run validation to see metrics
        </div>
      {/if}
    {:else if activeTab === 'history'}
      <!-- Validation History -->
      {#if $validationHistory.length === 0}
        <div class="p-4 text-center text-gray-500 text-sm">
          No validation history yet. Run validation to start tracking history.
        </div>
      {:else}
        <div class="history-list">
          {#each $validationHistory as historyItem, index (historyItem.timestamp)}
            <div
              class="history-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
              on:click={() => selectedHistoryIndex = selectedHistoryIndex === index ? null : index}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && (selectedHistoryIndex = selectedHistoryIndex === index ? null : index)}
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">
                    {new Date(historyItem.timestamp).toLocaleString()}
                  </span>
                  {#if historyItem.valid}
                    <span class="text-green-600 font-semibold text-sm">✓ Valid</span>
                  {:else}
                    <span class="text-red-600 font-semibold text-sm">✗ Invalid</span>
                  {/if}
                </div>
                <div class="flex items-center gap-2 text-sm">
                  {#if historyItem.errorCount > 0}
                    <span class="text-red-600">🔴 {historyItem.errorCount}</span>
                  {/if}
                  {#if historyItem.warningCount > 0}
                    <span class="text-yellow-600">⚠️ {historyItem.warningCount}</span>
                  {/if}
                  {#if historyItem.infoCount > 0}
                    <span class="text-blue-600">ℹ️ {historyItem.infoCount}</span>
                  {/if}
                  <span class="text-xs text-gray-500">{formatDuration(historyItem.duration)}</span>
                  <span class="text-gray-400">{selectedHistoryIndex === index ? '▼' : '▶'}</span>
                </div>
              </div>

              {#if selectedHistoryIndex === index}
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Total Passages:</span>
                      <span class="font-medium">{historyItem.stats.totalPassages}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Dead Links:</span>
                      <span class="font-medium">{historyItem.stats.deadLinks}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Reachable:</span>
                      <span class="font-medium">{historyItem.stats.reachablePassages}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Unreachable:</span>
                      <span class="font-medium">{historyItem.stats.unreachablePassages}</span>
                    </div>
                  </div>

                  {#if historyItem.issues.length > 0}
                    <div class="text-xs text-gray-600 mb-1">Top Issues:</div>
                    <div class="space-y-1">
                      {#each historyItem.issues.slice(0, 3) as issue}
                        <div class="text-xs pl-2 border-l-2 {issue.severity === 'error' ? 'border-red-400' : issue.severity === 'warning' ? 'border-yellow-400' : 'border-blue-400'}">
                          <span class={getSeverityColor(issue.severity)}>{issue.message}</span>
                        </div>
                      {/each}
                      {#if historyItem.issues.length > 3}
                        <div class="text-xs text-gray-500 pl-2">
                          ... and {historyItem.issues.length - 3} more
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="p-3 border-t border-gray-300 bg-gray-50 text-center">
          <button
            class="text-sm text-red-600 hover:text-red-800 font-medium"
            on:click={() => {
              if (confirm('Clear all validation history?')) {
                validationActions.clearHistory();
                selectedHistoryIndex = null;
              }
            }}
          >
            Clear History
          </button>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Fix All Confirmation Dialog -->
  {#if showFixAllConfirmation}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      on:click={cancelFixAll}
      on:keydown={(e) => e.key === 'Escape' && cancelFixAll()}
      role="presentation"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        on:click|stopPropagation
        role="dialog" tabindex="-1"
        aria-modal="true"
        aria-labelledby="fix-all-confirm-title"
        tabindex="-1"
      >
        <div class="p-6">
          <h3 id="fix-all-confirm-title" class="text-xl font-bold text-gray-900 mb-4">Confirm Fix All</h3>

          <div class="mb-4">
            <p class="text-gray-700 mb-3">
              {validationActions.getAutoFixDescription()}
            </p>

            <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p class="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will modify your story by:
              </p>
              <ul class="text-sm text-yellow-800 mt-2 ml-4 list-disc">
                <li>Deleting unreachable passages</li>
                <li>Removing dead links</li>
                <li>Adding undefined variables</li>
                <li>Removing unused variables</li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              on:click={cancelFixAll}
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
              on:click={confirmFixAll}
            >
              Apply Fixes
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Fix All Progress Dialog -->
  {#if isFixingAll}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Applying Fixes...</h3>

          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-600">Progress</span>
              <span class="text-sm font-medium text-gray-900">
                {fixAllProgress.current} / {fixAllProgress.total}
              </span>
            </div>

            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-green-500 h-2 rounded-full transition-all duration-300"
                style="width: {fixAllProgress.total > 0 ? (fixAllProgress.current / fixAllProgress.total) * 100 : 0}%"
              ></div>
            </div>
          </div>

          <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Fix All Summary Dialog -->
  {#if showFixAllSummary && fixAllResult}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      on:click={closeFixAllSummary}
      on:keydown={(e) => e.key === 'Escape' && closeFixAllSummary()}
      role="presentation"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        on:click|stopPropagation
        role="dialog" tabindex="-1"
        aria-modal="true"
        aria-labelledby="fix-all-summary-title"
        tabindex="-1"
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 id="fix-all-summary-title" class="text-xl font-bold text-gray-900">Fix All Summary</h3>
            <button
              class="text-gray-400 hover:text-gray-600"
              on:click={closeFixAllSummary}
            >
              <span class="text-2xl">&times;</span>
            </button>
          </div>

          <div class="mb-4">
            {#if fixAllResult.success}
              <div class="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <div class="flex items-center gap-2 text-green-800">
                  <span class="text-2xl">✓</span>
                  <span class="font-semibold">Successfully fixed {fixAllResult.issuesFixed} issue(s)</span>
                </div>
              </div>
            {:else}
              <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <div class="flex items-center gap-2 text-yellow-800">
                  <span class="text-2xl">⚠</span>
                  <div>
                    <div class="font-semibold">Fixed {fixAllResult.issuesFixed} issue(s)</div>
                    <div class="text-sm">Failed to fix {fixAllResult.issuesFailed} issue(s)</div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Details -->
            <div class="space-y-3">
              {#if fixAllResult.passagesDeleted && fixAllResult.passagesDeleted.length > 0}
                <div class="bg-gray-50 rounded p-3">
                  <div class="font-medium text-gray-700 mb-1">Passages Deleted</div>
                  <div class="text-sm text-gray-600">{fixAllResult.passagesDeleted.length} unreachable passage(s) removed</div>
                </div>
              {/if}

              {#if fixAllResult.choicesDeleted && fixAllResult.choicesDeleted.length > 0}
                <div class="bg-gray-50 rounded p-3">
                  <div class="font-medium text-gray-700 mb-1">Dead Links Removed</div>
                  <div class="text-sm text-gray-600">{fixAllResult.choicesDeleted.length} dead link(s) removed</div>
                </div>
              {/if}

              {#if fixAllResult.variablesAdded && fixAllResult.variablesAdded.length > 0}
                <div class="bg-gray-50 rounded p-3">
                  <div class="font-medium text-gray-700 mb-1">Variables Added</div>
                  <div class="text-sm text-gray-600">
                    {fixAllResult.variablesAdded.join(', ')}
                  </div>
                </div>
              {/if}

              {#if fixAllResult.variablesDeleted && fixAllResult.variablesDeleted.length > 0}
                <div class="bg-gray-50 rounded p-3">
                  <div class="font-medium text-gray-700 mb-1">Variables Removed</div>
                  <div class="text-sm text-gray-600">
                    {fixAllResult.variablesDeleted.join(', ')}
                  </div>
                </div>
              {/if}

              {#if fixAllResult.errors && fixAllResult.errors.length > 0}
                <div class="bg-red-50 rounded p-3">
                  <div class="font-medium text-red-700 mb-1">Errors</div>
                  <ul class="text-sm text-red-600 space-y-1">
                    {#each fixAllResult.errors as error}
                      <li>{error}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </div>

          <div class="flex justify-end">
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={closeFixAllSummary}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .validation-panel {
    font-family: system-ui, -apple-system, sans-serif;
  }

  .tab {
    border-bottom: 2px solid transparent;
  }

  .metric-group {
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
</style>
