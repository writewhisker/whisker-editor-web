export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  metadata?: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

export interface AnalyticsSession {
  id: string;
  startTime: number;
  endTime?: number;
  userId?: string;
  events: AnalyticsEvent[];
  metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  sessionTimeout: number;
  batchSize: number;
  flushInterval: number;
  storage?: AnalyticsStorage;
}

export interface AnalyticsStorage {
  save(events: AnalyticsEvent[]): Promise<void>;
  load(): Promise<AnalyticsEvent[]>;
  clear(): Promise<void>;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  sessionDuration: number;
  averageEventsPerSession: number;
}
