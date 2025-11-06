/**
 * Error Tracking Service
 *
 * Provides centralized error tracking and monitoring using Sentry.
 * Captures errors, performance metrics, and user feedback.
 */

import * as Sentry from '@sentry/svelte';

interface ErrorTrackingConfig {
  enabled: boolean;
  dsn: string | null;
  environment: 'development' | 'staging' | 'production';
  sampleRate: number;
  tracesSampleRate: number;
}

class ErrorTrackingService {
  private initialized = false;
  private config: ErrorTrackingConfig;

  constructor() {
    this.config = {
      enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
      dsn: import.meta.env.VITE_SENTRY_DSN || null,
      environment: (import.meta.env.VITE_ENV as any) || (import.meta.env.PROD ? 'production' : 'development'),
      sampleRate: 1.0, // Capture 100% of errors
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    };
  }

  /**
   * Initialize Sentry error tracking
   */
  initialize() {
    if (this.initialized) {
      console.warn('Error tracking already initialized');
      return;
    }

    if (!this.config.enabled) {
      console.log('Error tracking disabled (missing VITE_SENTRY_DSN or not in production)');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn!,
        environment: this.config.environment,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true, // Privacy: mask all text
            blockAllMedia: true, // Privacy: block all media
          }),
        ],

        // Performance Monitoring
        tracesSampleRate: this.config.tracesSampleRate,

        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || 'unknown',

        // Error filtering
        beforeSend(event, hint) {
          // Filter out errors from browser extensions
          if (hint.originalException && typeof hint.originalException === 'object') {
            const error = hint.originalException as any;
            if (error.stack && error.stack.includes('chrome-extension://')) {
              return null; // Don't send
            }
          }

          // Filter out localhost errors in production
          if (event.request?.url?.includes('localhost') || event.request?.url?.includes('127.0.0.1')) {
            return null;
          }

          return event;
        },

        // Ignore specific errors
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          'canvas.contentDocument',
          'MyApp_RemoveAllHighlights',
          'atomicFindClose',
          // Network errors that we can't control
          'NetworkError',
          'Failed to fetch',
          'Load failed',
          // ResizeObserver loop errors (benign)
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
        ],
      });

      this.initialized = true;
      console.log(`Error tracking initialized (${this.config.environment})`);
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  /**
   * Manually capture an exception
   */
  captureException(error: Error | unknown, context?: Record<string, any>) {
    if (!this.initialized) {
      console.error('Error tracking not initialized:', error);
      return;
    }

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    if (!this.initialized) {
      console.log(`[${level.toUpperCase()}]`, message, context);
      return;
    }

    Sentry.captureMessage(message, {
      level: level as any,
      extra: context,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; username?: string } | null) {
    if (!this.initialized) return;

    Sentry.setUser(user);
  }

  /**
   * Set custom context/tags for errors
   */
  setContext(key: string, value: any) {
    if (!this.initialized) return;

    Sentry.setContext(key, value);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, any>) {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string) {
    if (!this.initialized) {
      return {
        finish: () => {},
        setData: () => {},
        setTag: () => {},
      };
    }

    return Sentry.startInactiveSpan({
      name,
      op,
    });
  }

  /**
   * Check if error tracking is enabled
   */
  isEnabled(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

// Export for testing
export { ErrorTrackingService };
