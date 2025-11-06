<script lang="ts">
  import StoryMetrics from './StoryMetrics.svelte';
  import IssueList from './IssueList.svelte';
  import PlaythroughAnalyticsPanel from './PlaythroughAnalyticsPanel.svelte';
  import PlaythroughList from './PlaythroughList.svelte';
  import { currentMetrics, isAnalyzing, analyticsActions, lastAnalyzed } from '$lib/stores/analyticsStore';
  import { getPlaythroughRecorder } from '$lib/analytics/PlaythroughRecorder';
  import { currentStory } from '$lib/stores/storyStateStore';

  // State
  let activeTab = $state<'metrics' | 'issues' | 'playthroughs' | 'history'>('metrics');
  let playthroughCount = $state(0);

  // Load playthrough count
  $effect(() => {
    const story = $currentStory;
    if (story && story.metadata.id) {
      const recorder = getPlaythroughRecorder();
      playthroughCount = recorder.getPlaythroughsByStory(story.metadata.id).length;
    }
  });

  function formatLastAnalyzed(): string {
    if (!$lastAnalyzed) return 'Never';

    const diff = Date.now() - $lastAnalyzed;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date($lastAnalyzed).toLocaleDateString();
  }

  function handleRefresh() {
    analyticsActions.analyzeStory();
  }

  function handleExport() {
    analyticsActions.exportReport();
  }
</script>

<div class="analytics-dashboard">
  <div class="dashboard-header">
    <h2>Story Analytics</h2>
    <div class="header-actions">
      <span class="last-analyzed">
        Last analyzed: {formatLastAnalyzed()}
      </span>
      <button
        class="btn btn-secondary"
        onclick={handleRefresh}
        disabled={$isAnalyzing}
      >
        {$isAnalyzing ? '🔄 Analyzing...' : '🔄 Refresh'}
      </button>
      <button class="btn btn-primary" onclick={handleExport} disabled={!$currentMetrics}>
        📥 Export Report
      </button>
    </div>
  </div>

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'metrics'}
      onclick={() => (activeTab = 'metrics')}
    >
      📊 Metrics
      {#if $currentMetrics}
        <span class="badge">{$currentMetrics.totalPassages}</span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'issues'}
      onclick={() => (activeTab = 'issues')}
    >
      ⚠️ Issues
      {#if $currentMetrics && $currentMetrics.issues.length > 0}
        <span class="badge warning">{$currentMetrics.issues.length}</span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'playthroughs'}
      onclick={() => (activeTab = 'playthroughs')}
    >
      📈 Playthroughs
      {#if playthroughCount > 0}
        <span class="badge">{playthroughCount}</span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'history'}
      onclick={() => (activeTab = 'history')}
    >
      📝 History
    </button>
  </div>

  <div class="dashboard-content">
    {#if $isAnalyzing && activeTab === 'metrics'}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing your story...</p>
      </div>
    {:else if activeTab === 'metrics'}
      <StoryMetrics metrics={$currentMetrics} />
    {:else if activeTab === 'issues'}
      <IssueList issues={$currentMetrics?.issues || []} />
    {:else if activeTab === 'playthroughs'}
      <PlaythroughAnalyticsPanel />
    {:else if activeTab === 'history'}
      <PlaythroughList />
    {/if}
  </div>
</div>

<style>
  .analytics-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary, #f5f5f5);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .dashboard-header h2 {
    margin: 0;
    font-size: 24px;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .last-analyzed {
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .tabs {
    display: flex;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    padding: 0 20px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    transition: all 0.2s;
  }

  .tab:hover {
    background: var(--bg-hover, #f5f5f5);
  }

  .tab.active {
    color: var(--accent-color, #3498db);
    border-bottom-color: var(--accent-color, #3498db);
  }

  .badge {
    padding: 2px 8px;
    background: var(--accent-color, #3498db);
    color: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .badge.warning {
    background: #ff9800;
  }

  .dashboard-content {
    flex: 1;
    overflow-y: auto;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 60px 20px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color, #e0e0e0);
    border-top-color: var(--accent-color, #3498db);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-state p {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #666);
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .header-actions {
      flex-wrap: wrap;
      justify-content: space-between;
    }

    .tabs {
      overflow-x: auto;
    }
  }
</style>
