<script lang="ts">
  import { Story } from '@writewhisker/core-ts';
  import { AnalyticsTracker, AnalyticsAggregator } from '@writewhisker/analytics';
  import type { AnalyticsEvent, SessionMetrics, PassageMetrics } from '@writewhisker/analytics';

  // Load story and analytics data
  let story = $state<Story | null>(null);
  let tracker = $state<AnalyticsTracker | null>(null);
  let aggregator = $state<AnalyticsAggregator | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Metrics
  let sessionMetrics = $state<SessionMetrics | null>(null);
  let passageMetrics = $state<Map<string, PassageMetrics>>(new Map());
  let totalSessions = $state(0);
  let totalEvents = $state(0);
  let averagePlaytime = $state(0);
  let completionRate = $state(0);

  async function loadData() {
    const params = new URLSearchParams(window.location.search);
    const storyUrl = params.get('story');
    const analyticsUrl = params.get('analytics');

    try {
      // Load story
      if (storyUrl) {
        const response = await fetch(storyUrl);
        const storyData = await response.json();
        story = Story.deserialize(storyData);
      } else {
        // Create demo story
        story = createDemoStory();
      }

      // Initialize analytics
      tracker = new AnalyticsTracker({ storyId: story.id });
      aggregator = new AnalyticsAggregator();

      // Load analytics data
      if (analyticsUrl) {
        const response = await fetch(analyticsUrl);
        const events: AnalyticsEvent[] = await response.json();
        events.forEach((event) => tracker?.track(event));
      } else {
        // Generate demo analytics
        generateDemoAnalytics();
      }

      // Calculate metrics
      calculateMetrics();
    } catch (err) {
      error = `Failed to load data: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      loading = false;
    }
  }

  function createDemoStory(): Story {
    const demoStory = new Story({
      metadata: {
        title: 'Demo Story',
        author: 'Analytics Demo',
        description: 'Sample story for analytics demonstration',
      },
    });

    demoStory.createPassage({
      name: 'Start',
      content: 'Welcome!\\n\\n[[Continue->Middle]]',
      tags: ['start'],
    });

    demoStory.createPassage({
      name: 'Middle',
      content: 'Choose your path:\\n\\n[[Path A->EndA]]\\n[[Path B->EndB]]',
    });

    demoStory.createPassage({
      name: 'EndA',
      content: 'You chose path A!',
    });

    demoStory.createPassage({
      name: 'EndB',
      content: 'You chose path B!',
    });

    return demoStory;
  }

  function generateDemoAnalytics() {
    if (!tracker || !story) return;

    // Generate 100 demo sessions
    for (let i = 0; i < 100; i++) {
      const sessionId = `session-${i}`;
      const startTime = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Last 7 days

      // Session start
      tracker.track({
        type: 'session_start',
        sessionId,
        timestamp: startTime,
        storyId: story.id,
      });

      // Passage views
      const passages = ['Start', 'Middle', Math.random() > 0.5 ? 'EndA' : 'EndB'];
      let currentTime = startTime;

      passages.forEach((passageName, index) => {
        currentTime += Math.random() * 30000 + 10000; // 10-40 seconds per passage
        tracker?.track({
          type: 'passage_view',
          sessionId,
          timestamp: currentTime,
          storyId: story!.id,
          passageId: passageName,
          passageName,
        });
      });

      // Session end (80% completion rate)
      if (Math.random() > 0.2) {
        currentTime += Math.random() * 5000;
        tracker.track({
          type: 'session_end',
          sessionId,
          timestamp: currentTime,
          storyId: story.id,
        });
      }
    }
  }

  function calculateMetrics() {
    if (!tracker || !aggregator) return;

    const events = tracker.getEvents();
    sessionMetrics = aggregator.aggregateSessionMetrics(events);
    passageMetrics = aggregator.aggregatePassageMetrics(events);

    totalSessions = sessionMetrics.totalSessions;
    totalEvents = events.length;
    averagePlaytime = sessionMetrics.averageSessionDuration / 1000 / 60; // Convert to minutes
    completionRate = sessionMetrics.completionRate * 100;
  }

  // Load data on mount
  $effect(() => {
    loadData();
  });

  // Format numbers
  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(Math.round(num));
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }
</script>

<div class="app">
  <header>
    <div class="header-content">
      <h1>Analytics Dashboard</h1>
      {#if story}
        <p class="story-title">{story.metadata.title}</p>
      {/if}
    </div>
  </header>

  <main>
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    {:else if error}
      <div class="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onclick={() => window.location.reload()}>Reload</button>
      </div>
    {:else if story && sessionMetrics}
      <div class="dashboard">
        <!-- Overview Metrics -->
        <section class="metrics-grid">
          <div class="card">
            <div class="metric">
              <div class="metric-label">Total Sessions</div>
              <div class="metric-value">{formatNumber(totalSessions)}</div>
            </div>
          </div>

          <div class="card">
            <div class="metric">
              <div class="metric-label">Total Events</div>
              <div class="metric-value">{formatNumber(totalEvents)}</div>
            </div>
          </div>

          <div class="card">
            <div class="metric">
              <div class="metric-label">Avg. Playtime</div>
              <div class="metric-value">{averagePlaytime.toFixed(1)}m</div>
            </div>
          </div>

          <div class="card">
            <div class="metric">
              <div class="metric-label">Completion Rate</div>
              <div class="metric-value">{formatPercent(completionRate)}</div>
            </div>
          </div>
        </section>

        <!-- Passage Analytics -->
        <section class="passage-analytics">
          <div class="card">
            <h2 class="card-title">Passage Performance</h2>
            <div class="passage-list">
              {#each Array.from(passageMetrics.entries()) as [passageId, metrics]}
                <div class="passage-item">
                  <div class="passage-info">
                    <div class="passage-name">{metrics.passageName || passageId}</div>
                    <div class="passage-stats">
                      <span class="stat">
                        <span class="stat-label">Views:</span>
                        <span class="stat-value">{formatNumber(metrics.views)}</span>
                      </span>
                      <span class="stat">
                        <span class="stat-label">Avg. Time:</span>
                        <span class="stat-value">{formatDuration(metrics.averageTimeSpent / 1000)}</span>
                      </span>
                      {#if metrics.exitRate > 0}
                        <span class="stat">
                          <span class="stat-label">Exit Rate:</span>
                          <span class="stat-value">{formatPercent(metrics.exitRate * 100)}</span>
                        </span>
                      {/if}
                    </div>
                  </div>
                  <div class="passage-bar">
                    <div
                      class="passage-bar-fill"
                      style="width: {(metrics.views / totalSessions) * 100}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </section>

        <!-- Session Details -->
        <section class="session-details">
          <div class="card">
            <h2 class="card-title">Session Statistics</h2>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">Total Sessions</div>
                <div class="stat-value">{formatNumber(sessionMetrics.totalSessions)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Completed Sessions</div>
                <div class="stat-value">{formatNumber(sessionMetrics.completedSessions)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Avg. Duration</div>
                <div class="stat-value">{formatDuration(sessionMetrics.averageSessionDuration / 1000)}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Completion Rate</div>
                <div class="stat-value">{formatPercent(sessionMetrics.completionRate * 100)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    {:else}
      <div class="error">
        <p>No data available</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    padding: 2rem;
    box-shadow: var(--shadow-sm);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
  }

  header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--primary-color);
  }

  .story-title {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .passage-analytics,
  .session-details {
    width: 100%;
  }

  .passage-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .passage-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .passage-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .passage-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .passage-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .stat-label {
    color: var(--text-secondary);
  }

  .stat-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .passage-bar {
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
  }

  .passage-bar-fill {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.3s ease;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-item .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-item .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .error h2 {
    color: var(--error-color);
    margin-bottom: 1rem;
  }

  .error button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .error button:hover {
    background: var(--primary-hover);
  }
</style>
