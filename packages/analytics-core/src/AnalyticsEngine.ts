import type { AnalyticsEvent, AnalyticsSession, AnalyticsConfig, AnalyticsMetrics } from './types';

export class AnalyticsEngine {
  private config: AnalyticsConfig;
  private currentSession: AnalyticsSession | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(event: AnalyticsEvent) => void> = [];

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      batchSize: 50,
      flushInterval: 10000, // 10 seconds
      ...config,
    };

    if (this.config.enabled) {
      this.startSession();
      this.startFlushTimer();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSession(): void {
    this.currentSession = {
      id: this.generateId(),
      startTime: Date.now(),
      events: [],
      metadata: {},
    };
  }

  private endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession = null;
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  public track(
    type: string,
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      metadata,
      sessionId: this.currentSession?.id,
    };

    this.eventQueue.push(event);
    this.currentSession?.events.push(event);

    // Notify listeners
    this.listeners.forEach(listener => listener(event));

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.config.storage) {
      await this.config.storage.save(events);
    }
  }

  public getMetrics(): AnalyticsMetrics {
    const events = this.currentSession?.events || [];

    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
    });

    const sessionDuration = this.currentSession
      ? Date.now() - this.currentSession.startTime
      : 0;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByCategory,
      sessionDuration,
      averageEventsPerSession: events.length,
    };
  }

  public addEventListener(listener: (event: AnalyticsEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getCurrentSession(): AnalyticsSession | null {
    return this.currentSession;
  }

  public async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
    this.endSession();
  }
}
