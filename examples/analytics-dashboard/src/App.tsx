import React, { useState, useEffect } from 'react';
import { Story } from '@writewhisker/core-ts';
import { AnalyticsTracker, AnalyticsAggregator } from '@writewhisker/analytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function App() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    // Create demo story
    const story = new Story({
      metadata: {
        title: 'Analytics Demo',
        author: 'Whisker',
      },
    });

    // Create demo passages
    ['Start', 'Middle', 'End'].forEach((name) => {
      story.createPassage({
        name,
        content: `Passage ${name}`,
        tags: name === 'Start' ? ['start'] : [],
      });
    });

    // Generate demo analytics data
    const tracker = new AnalyticsTracker({ storyId: story.id });
    const aggregator = new AnalyticsAggregator();

    // Simulate 50 sessions
    for (let i = 0; i < 50; i++) {
      const sessionId = `session-${i}`;
      const startTime = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000;

      tracker.track({
        type: 'session_start',
        sessionId,
        timestamp: startTime,
        storyId: story.id,
      });

      // Track passage views
      ['Start', 'Middle', 'End'].forEach((passageName, index) => {
        if (Math.random() > 0.2 * index) {
          // Some drop off
          tracker.track({
            type: 'passage_view',
            sessionId,
            timestamp: startTime + index * 30000,
            storyId: story.id,
            passageId: passageName,
            passageName,
          });
        }
      });
    }

    const events = tracker.getEvents();
    const sessionMetrics = aggregator.aggregateSessionMetrics(events);
    const passageMetrics = aggregator.aggregatePassageMetrics(events);

    setMetrics({
      sessions: sessionMetrics,
      passages: Array.from(passageMetrics.entries()).map(([id, data]) => ({
        name: data.passageName || id,
        views: data.views,
        avgTime: (data.averageTimeSpent / 1000).toFixed(1),
      })),
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Analytics Dashboard</h1>
        <p>Whisker Story Performance Metrics</p>
      </header>

      <div className="metrics-grid">
        <MetricCard
          title="Total Sessions"
          value={metrics.sessions.totalSessions}
        />
        <MetricCard
          title="Completion Rate"
          value={`${(metrics.sessions.completionRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          title="Avg Duration"
          value={`${(metrics.sessions.averageSessionDuration / 60000).toFixed(1)}m`}
        />
        <MetricCard
          title="Completed"
          value={metrics.sessions.completedSessions}
        />
      </div>

      <div className="charts">
        <div className="chart-container">
          <h2>Passage Views</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.passages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#4a9eff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>Average Time per Passage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.passages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#4caf50"
                name="Seconds"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="metric-card">
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

export default App;
