<script lang="ts">
  import type { StoryMetrics } from '$lib/analytics/types';

  // Props
  let {
    metrics,
  }: {
    metrics: StoryMetrics | null;
  } = $props();

  function getComplexityColor(score: number): string {
    if (score < 30) return '#4caf50'; // Green - simple
    if (score < 60) return '#ff9800'; // Orange - moderate
    return '#f44336'; // Red - complex
  }

  function getComplexityLabel(score: number): string {
    if (score < 30) return 'Simple';
    if (score < 60) return 'Moderate';
    return 'Complex';
  }
</script>

{#if metrics}
  <div class="story-metrics">
    <div class="metrics-grid">
      <!-- Basic Counts -->
      <div class="metric-card">
        <div class="metric-icon">📄</div>
        <div class="metric-value">{metrics.totalPassages}</div>
        <div class="metric-label">Passages</div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">🔀</div>
        <div class="metric-value">{metrics.totalChoices}</div>
        <div class="metric-label">Choices</div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">🔢</div>
        <div class="metric-value">{metrics.totalVariables}</div>
        <div class="metric-label">Variables</div>
      </div>

      <!-- Structure Metrics -->
      <div class="metric-card">
        <div class="metric-icon">⚖️</div>
        <div class="metric-value">{metrics.avgChoicesPerPassage}</div>
        <div class="metric-label">Avg Choices/Passage</div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">⬇️</div>
        <div class="metric-value">{metrics.maxDepth}</div>
        <div class="metric-label">Max Depth</div>
      </div>

      <div class="metric-card">
        <div class="metric-icon">↔️</div>
        <div class="metric-value">{metrics.maxBreadth}</div>
        <div class="metric-label">Max Breadth</div>
      </div>

      <!-- Reading Time -->
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-value">{metrics.estimatedReadingTime}</div>
        <div class="metric-label">Est. Minutes</div>
      </div>

      <!-- Complexity -->
      <div class="metric-card highlight">
        <div class="metric-icon">🎯</div>
        <div class="metric-value" style="color: {getComplexityColor(metrics.complexityScore)}">
          {metrics.complexityScore}
        </div>
        <div class="metric-label">
          Complexity
          <span class="complexity-label" style="color: {getComplexityColor(metrics.complexityScore)}">
            ({getComplexityLabel(metrics.complexityScore)})
          </span>
        </div>
      </div>
    </div>

    <!-- Reachability Section -->
    <div class="reachability-section">
      <h4>Reachability</h4>
      <div class="reachability-grid">
        <div class="reachability-item">
          <div class="reachability-bar">
            <div
              class="reachability-fill reachable"
              style="width: {(metrics.reachablePassages / metrics.totalPassages) * 100}%"
            ></div>
          </div>
          <div class="reachability-label">
            <span class="reachability-count">{metrics.reachablePassages}</span> reachable
          </div>
        </div>

        {#if metrics.unreachablePassages > 0}
          <div class="reachability-item">
            <div class="reachability-bar">
              <div
                class="reachability-fill unreachable"
                style="width: {(metrics.unreachablePassages / metrics.totalPassages) * 100}%"
              ></div>
            </div>
            <div class="reachability-label">
              <span class="reachability-count warning">{metrics.unreachablePassages}</span>
              unreachable
            </div>
          </div>
        {/if}

        {#if metrics.deadEnds > 0}
          <div class="reachability-item">
            <div class="reachability-bar">
              <div
                class="reachability-fill deadend"
                style="width: {(metrics.deadEnds / metrics.totalPassages) * 100}%"
              ></div>
            </div>
            <div class="reachability-label">
              <span class="reachability-count info">{metrics.deadEnds}</span> dead-ends
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="empty-state">
    <p>No metrics available. Load a story to see analytics.</p>
  </div>
{/if}

<style>
  .story-metrics {
    padding: 20px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .metric-card.highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }

  .metric-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .metric-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary, #333);
    margin-bottom: 4px;
  }

  .metric-card.highlight .metric-value {
    color: white;
  }

  .metric-label {
    font-size: 13px;
    color: var(--text-secondary, #666);
    font-weight: 500;
  }

  .metric-card.highlight .metric-label {
    color: rgba(255, 255, 255, 0.9);
  }

  .complexity-label {
    display: block;
    font-size: 11px;
    margin-top: 2px;
    font-weight: 600;
  }

  .reachability-section {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 20px;
  }

  .reachability-section h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .reachability-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .reachability-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .reachability-bar {
    flex: 1;
    height: 24px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 12px;
    overflow: hidden;
  }

  .reachability-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .reachability-fill.reachable {
    background: linear-gradient(90deg, #4caf50, #81c784);
  }

  .reachability-fill.unreachable {
    background: linear-gradient(90deg, #ff9800, #ffb74d);
  }

  .reachability-fill.deadend {
    background: linear-gradient(90deg, #2196f3, #64b5f6);
  }

  .reachability-label {
    min-width: 120px;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .reachability-count {
    font-weight: 700;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .reachability-count.warning {
    color: #ff9800;
  }

  .reachability-count.info {
    color: #2196f3;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary, #666);
  }

  .empty-state p {
    margin: 0;
  }

  @media (max-width: 768px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .reachability-item {
      flex-direction: column;
      align-items: stretch;
    }

    .reachability-label {
      text-align: center;
    }
  }
</style>
