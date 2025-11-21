import type { AnalyticsEngine } from '@writewhisker/analytics-core';

export interface ErrorInfo {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  type: 'error' | 'unhandledrejection';
}

export class ErrorCollector {
  private engine: AnalyticsEngine;
  private cleanupFunctions: Array<() => void> = [];

  constructor(engine: AnalyticsEngine) {
    this.engine = engine;
  }

  public start(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const errorHandler = (event: ErrorEvent) => {
      const errorInfo: ErrorInfo = {
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'error',
      };

      this.engine.track('error', 'runtime', 'uncaught', event.message, undefined, errorInfo);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const errorInfo: ErrorInfo = {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: 'unhandledrejection',
      };

      this.engine.track('error', 'promise', 'unhandled', errorInfo.message, undefined, errorInfo);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    this.cleanupFunctions.push(() => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    });
  }

  public trackError(error: Error, context?: Record<string, any>): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      type: 'error',
    };

    this.engine.track('error', 'manual', 'tracked', error.message, undefined, {
      ...errorInfo,
      ...context,
    });
  }

  public stop(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
  }
}
