import type { AnalyticsEngine } from '@writewhisker/analytics-core';

export interface InteractionCollectorConfig {
  trackClicks?: boolean;
  trackInputs?: boolean;
  trackScrolls?: boolean;
  trackPageViews?: boolean;
  throttleInterval?: number;
}

export class UserInteractionCollector {
  private config: Required<InteractionCollectorConfig>;
  private engine: AnalyticsEngine;
  private cleanupFunctions: Array<() => void> = [];
  private lastScrollTime = 0;

  constructor(engine: AnalyticsEngine, config: InteractionCollectorConfig = {}) {
    this.engine = engine;
    this.config = {
      trackClicks: true,
      trackInputs: true,
      trackScrolls: true,
      trackPageViews: true,
      throttleInterval: 100,
      ...config,
    };
  }

  public start(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.config.trackClicks) {
      this.trackClicks();
    }

    if (this.config.trackInputs) {
      this.trackInputs();
    }

    if (this.config.trackScrolls) {
      this.trackScrolls();
    }

    if (this.config.trackPageViews) {
      this.trackPageViews();
    }
  }

  private trackClicks(): void {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const id = target.id;
      const className = target.className;

      this.engine.track('interaction', 'click', tagName, id || className, undefined, {
        x: e.clientX,
        y: e.clientY,
        button: e.button,
      });
    };

    window.addEventListener('click', handler);
    this.cleanupFunctions.push(() => window.removeEventListener('click', handler));
  }

  private trackInputs(): void {
    const handler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const type = target.type;
      const name = target.name;

      this.engine.track('interaction', 'input', type, name);
    };

    window.addEventListener('input', handler);
    this.cleanupFunctions.push(() => window.removeEventListener('input', handler));
  }

  private trackScrolls(): void {
    const handler = () => {
      const now = Date.now();
      if (now - this.lastScrollTime < this.config.throttleInterval) {
        return;
      }
      this.lastScrollTime = now;

      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      this.engine.track('interaction', 'scroll', 'page', undefined, scrollPercentage);
    };

    window.addEventListener('scroll', handler, { passive: true });
    this.cleanupFunctions.push(() => window.removeEventListener('scroll', handler));
  }

  private trackPageViews(): void {
    this.engine.track('navigation', 'page_view', window.location.pathname, document.title);
  }

  public stop(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
  }
}
