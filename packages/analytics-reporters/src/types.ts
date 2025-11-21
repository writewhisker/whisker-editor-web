import type { AnalyticsEvent } from '@writewhisker/analytics-core';

export interface Report {
  title: string;
  generatedAt: number;
  period: {
    start: number;
    end: number;
  };
  summary: ReportSummary;
  sections: ReportSection[];
}

export interface ReportSummary {
  totalEvents: number;
  uniqueUsers?: number;
  uniqueSessions: number;
  averageSessionDuration: number;
  topCategories: Array<{ category: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
}

export interface ReportSection {
  title: string;
  type: 'chart' | 'table' | 'metric';
  data: any;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface TableData {
  headers: string[];
  rows: Array<Array<string | number>>;
}
