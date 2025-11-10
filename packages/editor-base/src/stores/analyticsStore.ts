/**
 * Analytics Store
 * Track and store analytics data
 */

import { writable, derived } from 'svelte/store';
import type { Playthrough } from '../models/Playthrough';

export interface AnalyticsData {
  playthroughs: Playthrough[];
  totalPlays: number;
  averageCompletionTime: number;
  completionRate: number;
}

const defaultData: AnalyticsData = {
  playthroughs: [],
  totalPlays: 0,
  averageCompletionTime: 0,
  completionRate: 0,
};

function createAnalyticsStore() {
  const { subscribe, set, update } = writable<AnalyticsData>(defaultData);

  return {
    subscribe,
    set,
    update,
    addPlaythrough: (playthrough: Playthrough) =>
      update((data) => {
        const playthroughs = [...data.playthroughs, playthrough];
        const totalPlays = playthroughs.length;
        const completed = playthroughs.filter((p) => p.completed);
        const completionRate = totalPlays > 0 ? completed.length / totalPlays : 0;
        const averageCompletionTime =
          completed.length > 0
            ? completed.reduce((sum, p) => sum + p.getDuration(), 0) / completed.length
            : 0;

        return {
          playthroughs,
          totalPlays,
          averageCompletionTime,
          completionRate,
        };
      }),
    clear: () => set(defaultData),
  };
}

export const analyticsStore = createAnalyticsStore();

export const playthroughCount = derived(analyticsStore, ($analytics) => $analytics.totalPlays);
export const completionRate = derived(analyticsStore, ($analytics) => $analytics.completionRate);

// Additional exports for compatibility
export const currentMetrics = derived(analyticsStore, ($analytics) => $analytics);
export const isAnalyzing = writable(false);
export const lastAnalyzed = writable<number | null>(null);

export const analyticsActions = {
  addPlaythrough: analyticsStore.addPlaythrough,
  clear: analyticsStore.clear,
  analyze: () => {
    isAnalyzing.set(true);
    setTimeout(() => {
      isAnalyzing.set(false);
      lastAnalyzed.set(Date.now());
    }, 100);
  },
};
