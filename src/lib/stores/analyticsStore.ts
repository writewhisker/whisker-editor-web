/**
 * Analytics Store
 *
 * State management for story analytics and metrics.
 */

import { writable, derived, get } from 'svelte/store';
import { currentStory } from './projectStore';
import { StoryAnalytics } from '../analytics/StoryAnalytics';
import type { StoryMetrics, AnalyticsReport } from '../analytics/types';

// State
export const currentMetrics = writable<StoryMetrics | null>(null);
export const isAnalyzing = writable<boolean>(false);
export const lastAnalyzed = writable<number | null>(null);

// Derived stores
export const hasIssues = derived(currentMetrics, ($metrics) => {
  return $metrics?.issues && $metrics.issues.length > 0;
});

export const criticalIssues = derived(currentMetrics, ($metrics) => {
  return $metrics?.issues?.filter((i) => i.severity === 'error') || [];
});

export const warnings = derived(currentMetrics, ($metrics) => {
  return $metrics?.issues?.filter((i) => i.severity === 'warning') || [];
});

export const infos = derived(currentMetrics, ($metrics) => {
  return $metrics?.issues?.filter((i) => i.severity === 'info') || [];
});

/**
 * Analytics actions
 */
export const analyticsActions = {
  /**
   * Analyze current story
   */
  async analyzeStory(): Promise<void> {
    const story = get(currentStory);
    if (!story) {
      currentMetrics.set(null);
      return;
    }

    isAnalyzing.set(true);

    try {
      // Run analysis in a microtask to avoid blocking UI
      await new Promise((resolve) => setTimeout(resolve, 0));

      const metrics = StoryAnalytics.analyze(story);
      currentMetrics.set(metrics);
      lastAnalyzed.set(Date.now());
    } catch (error) {
      console.error('Failed to analyze story:', error);
      currentMetrics.set(null);
    } finally {
      isAnalyzing.set(false);
    }
  },

  /**
   * Generate analytics report
   */
  generateReport(): AnalyticsReport | null {
    const story = get(currentStory);
    const metrics = get(currentMetrics);

    if (!story || !metrics) return null;

    return {
      storyId: story.metadata.id,
      storyTitle: story.metadata.title,
      generatedAt: Date.now(),
      metrics,
    };
  },

  /**
   * Export report as JSON
   */
  exportReport(): void {
    const report = this.generateReport();
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.storyTitle}-analytics.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Clear analytics
   */
  clear(): void {
    currentMetrics.set(null);
    lastAnalyzed.set(null);
  },
};

// Auto-analyze when story changes
let analyzeTimeout: ReturnType<typeof setTimeout> | null = null;
currentStory.subscribe(() => {
  // Debounce analysis
  if (analyzeTimeout) {
    clearTimeout(analyzeTimeout);
  }

  analyzeTimeout = setTimeout(() => {
    analyticsActions.analyzeStory();
  }, 500);
});
