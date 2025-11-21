import type { AnalyticsEvent } from '@writewhisker/analytics-core';
import type { Report, ReportSummary, ReportSection, ChartData, TableData } from './types';

export class ReportGenerator {
  public generateReport(
    events: AnalyticsEvent[],
    startTime: number,
    endTime: number,
    title: string = 'Analytics Report'
  ): Report {
    const summary = this.generateSummary(events);
    const sections = [
      this.generateEventsByTypeSection(events),
      this.generateEventsByCategorySection(events),
      this.generateTimelineSection(events, startTime, endTime),
      this.generateTopEventsSection(events),
    ];

    return {
      title,
      generatedAt: Date.now(),
      period: { start: startTime, end: endTime },
      summary,
      sections,
    };
  }

  private generateSummary(events: AnalyticsEvent[]): ReportSummary {
    const sessions = new Set(events.map(e => e.sessionId).filter(Boolean));
    const categoryCount: Record<string, number> = {};
    const actionCount: Record<string, number> = {};

    let totalDuration = 0;
    const sessionDurations: Record<string, { start: number; end: number }> = {};

    events.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
      actionCount[event.action] = (actionCount[event.action] || 0) + 1;

      if (event.sessionId) {
        if (!sessionDurations[event.sessionId]) {
          sessionDurations[event.sessionId] = { start: event.timestamp, end: event.timestamp };
        } else {
          sessionDurations[event.sessionId].end = Math.max(
            sessionDurations[event.sessionId].end,
            event.timestamp
          );
        }
      }
    });

    Object.values(sessionDurations).forEach(duration => {
      totalDuration += duration.end - duration.start;
    });

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const topActions = Object.entries(actionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return {
      totalEvents: events.length,
      uniqueSessions: sessions.size,
      averageSessionDuration: sessions.size > 0 ? totalDuration / sessions.size : 0,
      topCategories,
      topActions,
    };
  }

  private generateEventsByTypeSection(events: AnalyticsEvent[]): ReportSection {
    const typeCount: Record<string, number> = {};

    events.forEach(event => {
      typeCount[event.type] = (typeCount[event.type] || 0) + 1;
    });

    const chartData: ChartData = {
      labels: Object.keys(typeCount),
      datasets: [
        {
          label: 'Events',
          data: Object.values(typeCount),
        },
      ],
    };

    return {
      title: 'Events by Type',
      type: 'chart',
      data: chartData,
    };
  }

  private generateEventsByCategorySection(events: AnalyticsEvent[]): ReportSection {
    const categoryCount: Record<string, number> = {};

    events.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });

    const chartData: ChartData = {
      labels: Object.keys(categoryCount),
      datasets: [
        {
          label: 'Events',
          data: Object.values(categoryCount),
        },
      ],
    };

    return {
      title: 'Events by Category',
      type: 'chart',
      data: chartData,
    };
  }

  private generateTimelineSection(
    events: AnalyticsEvent[],
    startTime: number,
    endTime: number
  ): ReportSection {
    const bucketSize = (endTime - startTime) / 24; // 24 buckets
    const buckets: number[] = new Array(24).fill(0);
    const labels: string[] = [];

    for (let i = 0; i < 24; i++) {
      const time = new Date(startTime + i * bucketSize);
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    events.forEach(event => {
      const bucketIndex = Math.floor((event.timestamp - startTime) / bucketSize);
      if (bucketIndex >= 0 && bucketIndex < 24) {
        buckets[bucketIndex]++;
      }
    });

    const chartData: ChartData = {
      labels,
      datasets: [
        {
          label: 'Events over Time',
          data: buckets,
        },
      ],
    };

    return {
      title: 'Event Timeline',
      type: 'chart',
      data: chartData,
    };
  }

  private generateTopEventsSection(events: AnalyticsEvent[]): ReportSection {
    const eventKey = (event: AnalyticsEvent) => `${event.category}:${event.action}`;
    const eventCount: Record<string, number> = {};

    events.forEach(event => {
      const key = eventKey(event);
      eventCount[key] = (eventCount[key] || 0) + 1;
    });

    const topEvents = Object.entries(eventCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const tableData: TableData = {
      headers: ['Category', 'Action', 'Count'],
      rows: topEvents.map(([key, count]) => {
        const [category, action] = key.split(':');
        return [category, action, count];
      }),
    };

    return {
      title: 'Top 10 Events',
      type: 'table',
      data: tableData,
    };
  }
}
