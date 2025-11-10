<script lang="ts">
  import { PlaythroughAnalytics, type PlaythroughAnalyticsData } from '../../analytics/PlaythroughAnalytics';
  import { getPlaythroughRecorder } from '../../analytics/PlaythroughRecorder';
  import { currentStory } from '../../stores/storyStateStore';
  import type { Playthrough } from '@whisker/core-ts';
  import { untrack } from 'svelte';

  // State
  let analytics = $state<PlaythroughAnalyticsData | null>(null);
  let isAnalyzing = $state(false);
  let selectedTab = $state<'overview' | 'passages' | 'choices' | 'paths'>('overview');
  let playthroughs = $state<Playthrough[]>([]);

  // Load playthroughs when story changes
  $effect(() => {
    const story = $currentStory;
    if (story) {
      untrack(() => loadPlaythroughs());
    }
  });

  function loadPlaythroughs() {
    const recorder = getPlaythroughRecorder();
    const story = $currentStory;

    if (story && story.metadata.id) {
      try {
        playthroughs = recorder.getPlaythroughsByStory(story.metadata.id);
        analyzePlaythroughs();
      } catch (error) {
        // Handle errors gracefully - reset to empty state
        console.error('Failed to load playthroughs:', error);
        playthroughs = [];
        analytics = null;
      }
    }
  }

  function analyzePlaythroughs() {
    const story = $currentStory;
    if (!story || playthroughs.length === 0) {
      analytics = null;
      return;
    }

    isAnalyzing = true;

    try {
      const analyzer = new PlaythroughAnalytics(story, playthroughs);
      analytics = analyzer.analyze();
    } finally {
      isAnalyzing = false;
    }
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  function formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  function handleRefresh() {
    loadPlaythroughs();
  }

  function handleClearData() {
    if (confirm('Are you sure you want to clear all playthrough data? This cannot be undone.')) {
      const recorder = getPlaythroughRecorder();
      const story = $currentStory;
      if (story && story.metadata.id) {
        recorder.clearPlaythroughsByStory(story.metadata.id);
        loadPlaythroughs();
      }
    }
  }
</script>

<div class="playthrough-analytics">
  <div class="analytics-header">
    <h2>Playthrough Analytics</h2>
    <div class="header-actions">
      <span class="playthrough-count">
        {playthroughs.length} playthrough{playthroughs.length !== 1 ? 's' : ''}
      </span>
      <button class="btn btn-secondary" onclick={handleRefresh}>
        🔄 Refresh
      </button>
      <button class="btn btn-danger" onclick={handleClearData} disabled={playthroughs.length === 0}>
        🗑️ Clear Data
      </button>
    </div>
  </div>

  {#if playthroughs.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No Playthrough Data</h3>
      <p>Start testing your story to collect analytics data.</p>
      <p class="hint">Enable recording in the story player to track playthroughs.</p>
    </div>
  {:else if isAnalyzing}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing playthroughs...</p>
    </div>
  {:else if analytics}
    <div class="tabs">
      <button
        class="tab"
        class:active={selectedTab === 'overview'}
        onclick={() => (selectedTab = 'overview')}
      >
        📋 Overview
      </button>
      <button
        class="tab"
        class:active={selectedTab === 'passages'}
        onclick={() => (selectedTab = 'passages')}
      >
        📍 Passages
        <span class="badge">{analytics.passages.size}</span>
      </button>
      <button
        class="tab"
        class:active={selectedTab === 'choices'}
        onclick={() => (selectedTab = 'choices')}
      >
        🎯 Choices
        <span class="badge">{analytics.choices.length}</span>
      </button>
      <button
        class="tab"
        class:active={selectedTab === 'paths'}
        onclick={() => (selectedTab = 'paths')}
      >
        🛤️ Paths
        <span class="badge">{analytics.popularPaths.length}</span>
      </button>
    </div>

    <div class="analytics-content">
      {#if selectedTab === 'overview'}
        <div class="overview-section">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Playthroughs</div>
              <div class="stat-value">{analytics.completion.totalPlaythroughs}</div>
            </div>

            <div class="stat-card">
              <div class="stat-label">Completion Rate</div>
              <div class="stat-value">{formatPercentage(analytics.completion.completionRate)}</div>
              <div class="stat-detail">
                {analytics.completion.completedPlaythroughs} of {analytics.completion.totalPlaythroughs} completed
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-label">Avg. Duration</div>
              <div class="stat-value">{formatDuration(analytics.completion.averageDuration)}</div>
              <div class="stat-detail">
                Min: {formatDuration(analytics.completion.minDuration)}
                • Max: {formatDuration(analytics.completion.maxDuration)}
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-label">Avg. Path Length</div>
              <div class="stat-value">{Math.round(analytics.completion.averageSteps)}</div>
              <div class="stat-detail">
                Min: {analytics.completion.minSteps}
                • Max: {analytics.completion.maxSteps}
              </div>
            </div>
          </div>

          {#if analytics.deadEnds.length > 0}
            <div class="section">
              <h3>⚠️ Dead Ends ({analytics.deadEnds.length})</h3>
              <div class="dead-ends-list">
                {#each analytics.deadEnds as deadEndId}
                  {@const passage = analytics.passages.get(deadEndId)}
                  {#if passage}
                    <div class="dead-end-item">
                      <div class="dead-end-title">{passage.passageTitle}</div>
                      <div class="dead-end-stats">
                        {passage.visitCount} visit{passage.visitCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>

      {:else if selectedTab === 'passages'}
        <div class="passages-section">
          <div class="section-header">
            <h3>Passage Statistics</h3>
            <span class="section-count">{analytics.passages.size} passages</span>
          </div>
          <div class="table-container">
            <table class="passage-table">
              <thead>
                <tr>
                  <th>Passage</th>
                  <th>Visits</th>
                  <th>Visit Rate</th>
                  <th>Avg. Time</th>
                  <th>Exits</th>
                </tr>
              </thead>
              <tbody>
                {#each Array.from(analytics.passages.entries()).sort((a, b) => b[1].visitCount - a[1].visitCount) as [passageId, stats]}
                  <tr>
                    <td class="passage-title">{stats.passageTitle || passageId}</td>
                    <td>{stats.visitCount}</td>
                    <td>{formatPercentage(stats.visitRate)}</td>
                    <td>{formatDuration(stats.averageTimeSpent)}</td>
                    <td>
                      {#if stats.exitPaths.size > 0}
                        <span class="exit-count">{stats.exitPaths.size} path{stats.exitPaths.size !== 1 ? 's' : ''}</span>
                      {:else}
                        <span class="no-exits">No exits</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

      {:else if selectedTab === 'choices'}
        <div class="choices-section">
          <div class="section-header">
            <h3>Choice Statistics</h3>
            <span class="section-count">{analytics.choices.length} choices</span>
          </div>
          <div class="table-container">
            <table class="choice-table">
              <thead>
                <tr>
                  <th>Choice Text</th>
                  <th>From Passage</th>
                  <th>Selections</th>
                  <th>Selection Rate</th>
                </tr>
              </thead>
              <tbody>
                {#each analytics.choices.sort((a, b) => b.selectionCount - a.selectionCount) as stats}
                  <tr>
                    <td class="choice-text">{stats.choiceText}</td>
                    <td class="passage-title">{stats.fromPassageTitle}</td>
                    <td>{stats.selectionCount}</td>
                    <td>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: {stats.selectionRate * 100}%"></div>
                        <span class="progress-label">{formatPercentage(stats.selectionRate)}</span>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

      {:else if selectedTab === 'paths'}
        <div class="paths-section">
          <div class="section-header">
            <h3>Popular Paths</h3>
            <span class="section-count">{analytics.popularPaths.length} unique paths</span>
          </div>
          <div class="paths-list">
            {#each analytics.popularPaths as path, index}
              <div class="path-item">
                <div class="path-header">
                  <span class="path-rank">#{index + 1}</span>
                  <span class="path-count">{path.count} playthrough{path.count !== 1 ? 's' : ''}</span>
                  <span class="path-frequency">{formatPercentage(path.frequency)}</span>
                </div>
                <div class="path-steps">
                  {#each path.path as step, stepIndex}
                    <span class="path-step">
                      {step}
                      {#if stepIndex < path.path.length - 1}
                        <span class="path-arrow">→</span>
                      {/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .playthrough-analytics {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary, #f5f5f5);
  }

  .analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: white;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .analytics-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .playthrough-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary, #f0f0f0);
    border-radius: 4px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary, #666);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem;
    color: var(--text-primary, #333);
  }

  .empty-state p {
    margin: 0.25rem 0;
  }

  .hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color, #e0e0e0);
    border-top-color: var(--primary-color, #007bff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem 0;
    background: white;
    border-bottom: 2px solid var(--border-color, #e0e0e0);
  }

  .tab {
    padding: 0.75rem 1.25rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666);
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    font-size: 0.9375rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tab:hover {
    color: var(--text-primary, #333);
    background: var(--bg-hover, #f8f8f8);
  }

  .tab.active {
    color: var(--primary-color, #007bff);
    border-bottom-color: var(--primary-color, #007bff);
    font-weight: 500;
  }

  .badge {
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-secondary, #666);
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tab.active .badge {
    background: var(--primary-color, #007bff);
    color: white;
  }

  .analytics-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color, #007bff);
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-detail {
    font-size: 0.75rem;
    color: var(--text-tertiary, #999);
  }

  .section {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section h3 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    color: var(--text-primary, #333);
  }

  .dead-ends-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dead-end-item {
    padding: 1rem;
    background: var(--bg-warning, #fff3cd);
    border: 1px solid var(--border-warning, #ffc107);
    border-radius: 4px;
  }

  .dead-end-title {
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 0.25rem;
  }

  .dead-end-stats {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary, #333);
  }

  .section-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    background: var(--bg-tertiary, #f0f0f0);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
  }

  .table-container {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: var(--bg-tertiary, #f8f8f8);
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary, #666);
    border-bottom: 2px solid var(--border-color, #e0e0e0);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    font-size: 0.875rem;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--bg-hover, #f8f8f8);
  }

  .passage-title {
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .choice-text {
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .exit-count {
    color: var(--text-secondary, #666);
  }

  .no-exits {
    color: var(--text-tertiary, #999);
    font-style: italic;
  }

  .progress-bar {
    position: relative;
    width: 100%;
    height: 24px;
    background: var(--bg-tertiary, #f0f0f0);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--primary-color, #007bff);
    transition: width 0.3s ease;
  }

  .progress-label {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-primary, #333);
    z-index: 1;
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .path-item {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
  }

  .path-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .path-rank {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary-color, #007bff);
  }

  .path-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }

  .path-frequency {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-left: auto;
  }

  .path-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .path-step {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--bg-tertiary, #f0f0f0);
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--text-primary, #333);
  }

  .path-arrow {
    color: var(--text-tertiary, #999);
    font-weight: bold;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, #e0e0e0);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #e8e8e8);
  }

  .btn-danger {
    background: var(--danger-color, #dc3545);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--danger-color-dark, #c82333);
  }
</style>
