<script lang="ts">
  import { currentStory } from '../../stores/storyStateStore';
  import { StoryFlowAnalyzer, type StoryFlowMetrics } from '../../utils/storyFlowAnalytics';
  import { onMount } from 'svelte';

  let metrics: StoryFlowMetrics | null = $state(null);
  let isLoading = $state(false);
  let selectedTab: 'overview' | 'paths' | 'bottlenecks' | 'issues' = $state('overview');

  function analyzeStory() {
    if (!$currentStory) {
      metrics = null;
      return;
    }

    isLoading = true;
    try {
      metrics = StoryFlowAnalyzer.analyze($currentStory);
    } catch (error) {
      console.error('Flow analysis error:', error);
      metrics = null;
    } finally {
      isLoading = false;
    }
  }

  // Re-analyze when story changes
  $effect(() => {
    if ($currentStory) {
      analyzeStory();
    }
  });

  onMount(() => {
    analyzeStory();
  });

  function getPassageTitle(passageId: string): string {
    const passage = $currentStory?.getPassage(passageId);
    return passage?.title || 'Unknown';
  }

  function getBottleneckSeverity(score: number): string {
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
</script>

<div class="story-flow-analytics">
  <div class="header">
    <h2>Story Flow Analytics</h2>
    <button onclick={analyzeStory} disabled={isLoading || !$currentStory} class="refresh-btn">
      {isLoading ? 'Analyzing...' : 'Refresh'}
    </button>
  </div>

  {#if !$currentStory}
    <div class="empty-state">
      <p>No story loaded</p>
    </div>
  {:else if isLoading}
    <div class="loading">
      <p>Analyzing story flow...</p>
    </div>
  {:else if metrics}
    <div class="tabs">
      <button
        class:active={selectedTab === 'overview'}
        onclick={() => (selectedTab = 'overview')}
      >
        Overview
      </button>
      <button
        class:active={selectedTab === 'paths'}
        onclick={() => (selectedTab = 'paths')}
      >
        Paths ({metrics.totalPaths})
      </button>
      <button
        class:active={selectedTab === 'bottlenecks'}
        onclick={() => (selectedTab = 'bottlenecks')}
      >
        Bottlenecks ({metrics.bottlenecks.length})
      </button>
      <button
        class:active={selectedTab === 'issues'}
        onclick={() => (selectedTab = 'issues')}
      >
        Issues ({metrics.deadEnds.length + metrics.unreachablePassages.length})
      </button>
    </div>

    <div class="tab-content">
      {#if selectedTab === 'overview'}
        <div class="overview">
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Total Paths</div>
              <div class="metric-value">{metrics.totalPaths}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Path Length</div>
              <div class="metric-value">{metrics.averagePathLength.toFixed(1)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Dead Ends</div>
              <div class="metric-value">{metrics.deadEnds.length}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Circular Paths</div>
              <div class="metric-value">{metrics.circularPaths.length}</div>
            </div>
          </div>

          {#if metrics.longestPath && typeof metrics.longestPath === 'object' && 'path' in metrics.longestPath}
            <div class="path-summary">
              <h3>Longest Path</h3>
              <div class="path-length">{metrics.longestPath.length} passages</div>
              <div class="path-details">
                {#each metrics.longestPath.path as passageId, i}
                  <span class="path-node">{getPassageTitle(passageId)}</span>
                  {#if i < metrics.longestPath.path.length - 1}
                    <span class="path-arrow">→</span>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          {#if metrics.shortestPath && typeof metrics.shortestPath === 'object' && 'path' in metrics.shortestPath}
            <div class="path-summary">
              <h3>Shortest Path</h3>
              <div class="path-length">{metrics.shortestPath.length} passages</div>
              <div class="path-details">
                {#each metrics.shortestPath.path as passageId, i}
                  <span class="path-node">{getPassageTitle(passageId)}</span>
                  {#if i < metrics.shortestPath.path.length - 1}
                    <span class="path-arrow">→</span>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else if selectedTab === 'paths'}
        <div class="paths-view">
          <div class="info-message">
            Your story has {metrics.totalPaths} possible paths from the start passage.
          </div>

          {#if metrics.circularPaths.length > 0}
            <div class="circular-paths">
              <h3>Circular Paths ({metrics.circularPaths.length})</h3>
              {#each metrics.circularPaths as path}
                <div class="circular-path">
                  <div class="path-details">
                    {#each path.path as passageId, i}
                      <span class="path-node">{getPassageTitle(passageId)}</span>
                      {#if i < path.path.length - 1}
                        <span class="path-arrow">→</span>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else if selectedTab === 'bottlenecks'}
        <div class="bottlenecks-view">
          <div class="info-message">
            Bottlenecks are passages where many paths converge or diverge.
          </div>

          {#if metrics.bottlenecks.length === 0}
            <p>No significant bottlenecks detected.</p>
          {:else}
            <div class="bottleneck-list">
              {#each metrics.bottlenecks as bottleneck}
                <div class="bottleneck-item severity-{getBottleneckSeverity(bottleneck.bottleneckScore)}">
                  <div class="bottleneck-header">
                    <span class="bottleneck-title">{bottleneck.passageTitle}</span>
                    <span class="bottleneck-score">{bottleneck.bottleneckScore.toFixed(1)}</span>
                  </div>
                  <div class="bottleneck-stats">
                    <span>↓ {bottleneck.incomingCount} incoming</span>
                    <span>↑ {bottleneck.outgoingCount} outgoing</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else if selectedTab === 'issues'}
        <div class="issues-view">
          {#if metrics.deadEnds.length > 0}
            <div class="issue-section">
              <h3>Dead Ends ({metrics.deadEnds.length})</h3>
              <p class="issue-description">Passages with no outgoing choices</p>
              <div class="issue-list">
                {#each metrics.deadEnds as passageId}
                  <div class="issue-item">
                    {getPassageTitle(passageId)}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if metrics.unreachablePassages.length > 0}
            <div class="issue-section">
              <h3>Unreachable Passages ({metrics.unreachablePassages.length})</h3>
              <p class="issue-description">Passages not connected from the start</p>
              <div class="issue-list">
                {#each metrics.unreachablePassages as passageId}
                  <div class="issue-item">
                    {getPassageTitle(passageId)}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if metrics.deadEnds.length === 0 && metrics.unreachablePassages.length === 0}
            <div class="no-issues">
              <p>No flow issues detected!</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="error-state">
      <p>Failed to analyze story flow</p>
    </div>
  {/if}
</div>

<style>
  .story-flow-analytics {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .refresh-btn {
    padding: 6px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .refresh-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 16px;
  }

  .tabs button {
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    color: #64748b;
    transition: all 0.2s;
  }

  .tabs button:hover {
    color: #1e293b;
  }

  .tabs button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .empty-state,
  .loading,
  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: #64748b;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: #f8fafc;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .metric-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-value {
    font-size: 28px;
    font-weight: 600;
    color: #1e293b;
  }

  .path-summary {
    margin-bottom: 24px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .path-summary h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .path-length {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 12px;
  }

  .path-details {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .path-node {
    padding: 4px 8px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 12px;
    color: #1e293b;
  }

  .path-arrow {
    color: #94a3b8;
    font-size: 12px;
  }

  .info-message {
    padding: 12px 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    color: #1e40af;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .bottleneck-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bottleneck-item {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .bottleneck-item.severity-high {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  .bottleneck-item.severity-medium {
    background: #fffbeb;
    border-color: #fde047;
  }

  .bottleneck-item.severity-low {
    background: #f0fdf4;
    border-color: #86efac;
  }

  .bottleneck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .bottleneck-title {
    font-weight: 600;
    font-size: 14px;
  }

  .bottleneck-score {
    font-size: 18px;
    font-weight: 700;
  }

  .bottleneck-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #64748b;
  }

  .issue-section {
    margin-bottom: 24px;
  }

  .issue-section h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .issue-description {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 12px;
  }

  .issue-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .issue-item {
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 14px;
  }

  .no-issues {
    padding: 48px;
    text-align: center;
    color: #10b981;
    font-size: 16px;
  }

  .circular-paths {
    margin-top: 16px;
  }

  .circular-paths h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .circular-path {
    padding: 12px;
    background: #fef3c7;
    border: 1px solid #fde047;
    border-radius: 6px;
    margin-bottom: 12px;
  }
</style>
