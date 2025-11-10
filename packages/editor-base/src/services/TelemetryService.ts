/**
 * Telemetry Service
 * Track user actions and application events
 */

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  properties?: Record<string, any>;
}

export interface StorageMetrics {
  used: number;
  available: number;
  total: number;
  reads: number;
  writes: number;
  deletes: number;
  avgReadTime: number;
  avgWriteTime: number;
  avgDeleteTime: number;
  errors: number;
  lastOperation?: string;
  lastOperationTime?: number;
  totalReadTime?: number;
  totalWriteTime?: number;
  totalDeleteTime?: number;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  operation?: string;
  key?: string;
  success?: boolean;
}

export interface ErrorEvent {
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  operation?: string;
  error?: string;
  key?: string;
}

export interface QuotaMetrics {
  quota: number;
  usage: number;
  percentage: number;
  used: number;
  total: number;
  available: number;
  usagePercentage: number;
}

export class TelemetryService {
  private events: TelemetryEvent[] = [];
  private enabled: boolean = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    const event: TelemetryEvent = {
      name: eventName,
      timestamp: Date.now(),
      properties,
    };

    this.events.push(event);

    // In a real implementation, this would send to an analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry]', event);
    }
  }

  trackPageView(pageName: string): void {
    this.track('page_view', { page: pageName });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  getMetrics(): StorageMetrics {
    return {
      used: 0,
      available: 1000000,
      total: 1000000,
      reads: 0,
      writes: 0,
      deletes: 0,
      avgReadTime: 0,
      avgWriteTime: 0,
      avgDeleteTime: 0,
      errors: 0,
    };
  }

  getPerformanceHistory(): PerformanceMetric[] {
    return [];
  }

  getErrorHistory(): ErrorEvent[] {
    return [];
  }

  getQuotaHistory(): QuotaMetrics[] {
    return [];
  }

  getPerformanceStats(): any {
    return {};
  }

  getOperationsPerMinute(): number {
    return 0;
  }

  getSnapshot(): any {
    return {
      metrics: this.getMetrics(),
      events: this.events,
    };
  }

  getCurrentQuota(): QuotaMetrics {
    return {
      quota: 1000000,
      usage: 0,
      percentage: 0,
      used: 0,
      total: 1000000,
      available: 1000000,
      usagePercentage: 0,
    };
  }

  reset(): void {
    this.events = [];
  }

  exportData(): any {
    return {
      events: this.events,
      metrics: this.getMetrics(),
    };
  }

  importData(data: any): boolean {
    try {
      if (data.events) {
        this.events = data.events;
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const telemetryService = new TelemetryService();

// Alias for getTelemetryService
export function getTelemetryService(): TelemetryService {
  return telemetryService;
}
