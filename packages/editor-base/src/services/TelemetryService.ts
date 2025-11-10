/**
 * Telemetry Service
 * Track user actions and application events
 */

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  properties?: Record<string, any>;
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
}

// Singleton instance
export const telemetryService = new TelemetryService();
