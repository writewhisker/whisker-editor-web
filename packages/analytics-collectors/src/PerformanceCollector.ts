import type { AnalyticsEngine } from '@writewhisker/analytics-core';

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
}

export class PerformanceCollector {
  private engine: AnalyticsEngine;

  constructor(engine: AnalyticsEngine) {
    this.engine = engine;
  }

  public collectPageLoad(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const navigation = window.performance.getEntriesByType('navigation')[0] as any;

        const metrics: PerformanceMetrics = {
          loadTime: perfData.loadEventEnd - perfData.navigationStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        };

        // Paint timing
        const paintEntries = window.performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        this.engine.track('performance', 'page_load', 'timing', undefined, metrics.loadTime, metrics);
      }, 0);
    });
  }

  public collectResourceTiming(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const resourcesByType: Record<string, number> = {};
    let totalSize = 0;

    resources.forEach(resource => {
      const type = this.getResourceType(resource);
      resourcesByType[type] = (resourcesByType[type] || 0) + 1;

      if (resource.transferSize) {
        totalSize += resource.transferSize;
      }
    });

    this.engine.track('performance', 'resources', 'loaded', undefined, resources.length, {
      byType: resourcesByType,
      totalSize,
    });
  }

  private getResourceType(resource: PerformanceResourceTiming): string {
    const name = resource.name.toLowerCase();
    if (name.endsWith('.js')) return 'script';
    if (name.endsWith('.css')) return 'stylesheet';
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'image';
    if (name.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  public measureOperation(name: string, operation: () => void): void {
    const startTime = performance.now();
    operation();
    const duration = performance.now() - startTime;

    this.engine.track('performance', 'operation', name, undefined, duration);
  }

  public async measureAsyncOperation(name: string, operation: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    await operation();
    const duration = performance.now() - startTime;

    this.engine.track('performance', 'async_operation', name, undefined, duration);
  }
}
