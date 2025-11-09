/**
 * Adaptive Difficulty Store
 *
 * Manages dynamic difficulty adjustment system for interactive fiction:
 * - Performance metrics tracking (success rate, time spent, retries)
 * - Difficulty adjustment rules and thresholds
 * - Multiple adjustment strategies
 * - Code generation for difficulty scaling
 */

import { writable, derived } from 'svelte/store';

export type MetricType = 'success_rate' | 'time_spent' | 'retry_count' | 'hint_usage' | 'custom';
export type AdjustmentType = 'variable_modifier' | 'content_swap' | 'hint_availability' | 'timer_adjustment';
export type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard';

export interface PerformanceMetric {
  id: string;
  name: string;
  type: MetricType;
  description: string;
  customCode?: string; // For custom metrics
}

export interface DifficultyThreshold {
  metricId: string;
  condition: 'above' | 'below' | 'equals';
  value: number;
  duration: number; // Number of passages to evaluate over
}

export interface DifficultyAdjustment {
  id: string;
  name: string;
  description: string;
  type: AdjustmentType;
  targetLevel: DifficultyLevel;
  thresholds: DifficultyThreshold[];

  // Adjustment parameters
  variableModifier?: {
    variableName: string;
    operation: 'multiply' | 'add' | 'set';
    value: number;
  };
  contentSwap?: {
    passageId: string;
    easyContent: string;
    hardContent: string;
  };
  hintAvailability?: {
    enableHints: boolean;
    hintDelay: number;
  };
  timerAdjustment?: {
    baseTime: number;
    adjustment: number; // Percentage
  };
}

export interface AdaptiveDifficultyConfig {
  enabled: boolean;
  metrics: PerformanceMetric[];
  adjustments: DifficultyAdjustment[];
  updateFrequency: number; // Check difficulty every N passages
  smoothingFactor: number; // 0-1, how quickly to adjust
}

const DEFAULT_CONFIG: AdaptiveDifficultyConfig = {
  enabled: true,
  metrics: [
    {
      id: 'metric_success',
      name: 'Success Rate',
      type: 'success_rate',
      description: 'Percentage of successful outcomes',
    },
    {
      id: 'metric_time',
      name: 'Time Spent',
      type: 'time_spent',
      description: 'Average time per passage (seconds)',
    },
    {
      id: 'metric_retries',
      name: 'Retry Count',
      type: 'retry_count',
      description: 'Number of retries on challenges',
    },
  ],
  adjustments: [],
  updateFrequency: 5,
  smoothingFactor: 0.3,
};

// Generate difficulty system code
function generateDifficultyCode(config: AdaptiveDifficultyConfig): {
  types: string;
  metricsCode: string;
  evaluationCode: string;
  adjustmentCode: string;
  utilityCode: string;
} {
  const types = `
export interface PlayerMetrics {
  successCount: number;
  failureCount: number;
  totalTime: number;
  passageCount: number;
  retryCount: number;
  hintUsage: number;
  recentPerformance: number[]; // Sliding window of recent scores
}

export interface DifficultyState {
  currentLevel: '${['very_easy', 'easy', 'normal', 'hard', 'very_hard'].join("' | '")}';
  metrics: PlayerMetrics;
  lastUpdate: number;
}
`.trim();

  const metricsCode = `
/**
 * Track player metrics
 */
export class MetricsTracker {
  private metrics: PlayerMetrics = {
    successCount: 0,
    failureCount: 0,
    totalTime: 0,
    passageCount: 0,
    retryCount: 0,
    hintUsage: 0,
    recentPerformance: [],
  };

  /**
   * Record a success
   */
  recordSuccess(): void {
    this.metrics.successCount++;
    this.metrics.recentPerformance.push(1);
    this.trimRecentPerformance();
  }

  /**
   * Record a failure
   */
  recordFailure(): void {
    this.metrics.failureCount++;
    this.metrics.recentPerformance.push(0);
    this.trimRecentPerformance();
  }

  /**
   * Record time spent on passage
   */
  recordTime(seconds: number): void {
    this.metrics.totalTime += seconds;
    this.metrics.passageCount++;
  }

  /**
   * Record a retry
   */
  recordRetry(): void {
    this.metrics.retryCount++;
  }

  /**
   * Record hint usage
   */
  recordHintUsage(): void {
    this.metrics.hintUsage++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PlayerMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(): number {
    const total = this.metrics.successCount + this.metrics.failureCount;
    return total > 0 ? this.metrics.successCount / total : 0.5;
  }

  /**
   * Calculate average time per passage
   */
  getAverageTime(): number {
    return this.metrics.passageCount > 0
      ? this.metrics.totalTime / this.metrics.passageCount
      : 0;
  }

  /**
   * Get recent performance (sliding window)
   */
  getRecentPerformance(): number {
    if (this.metrics.recentPerformance.length === 0) return 0.5;
    const sum = this.metrics.recentPerformance.reduce((a, b) => a + b, 0);
    return sum / this.metrics.recentPerformance.length;
  }

  private trimRecentPerformance(): void {
    const maxSize = ${config.updateFrequency * 2};
    if (this.metrics.recentPerformance.length > maxSize) {
      this.metrics.recentPerformance = this.metrics.recentPerformance.slice(-maxSize);
    }
  }
}
`.trim();

  const evaluationCode = `
/**
 * Evaluate difficulty adjustments based on metrics
 */
export function evaluateDifficulty(
  tracker: MetricsTracker,
  currentLevel: DifficultyState['currentLevel']
): DifficultyState['currentLevel'] {
  const metrics = tracker.getMetrics();

  // Skip if not enough data
  if (metrics.passageCount < ${config.updateFrequency}) {
    return currentLevel;
  }

  const successRate = tracker.getSuccessRate();
  const avgTime = tracker.getAverageTime();
  const recentPerformance = tracker.getRecentPerformance();

${config.adjustments.map(adj => {
  const thresholdChecks = adj.thresholds.map(threshold => {
    const metric = config.metrics.find(m => m.id === threshold.metricId);
    let metricValue = '';

    switch (metric?.type) {
      case 'success_rate':
        metricValue = 'successRate';
        break;
      case 'time_spent':
        metricValue = 'avgTime';
        break;
      case 'retry_count':
        metricValue = 'metrics.retryCount';
        break;
      case 'hint_usage':
        metricValue = 'metrics.hintUsage';
        break;
      default:
        metricValue = 'recentPerformance';
    }

    const condition = threshold.condition === 'above' ? '>'
                    : threshold.condition === 'below' ? '<'
                    : '===';

    return `${metricValue} ${condition} ${threshold.value}`;
  }).join(' && ');

  return `
  // ${adj.name}
  if (${thresholdChecks}) {
    return '${adj.targetLevel}';
  }`;
}).join('\n')}

  return currentLevel;
}
`.trim();

  const adjustmentCode = `
/**
 * Apply difficulty adjustments
 */
export function applyDifficultyAdjustments(
  level: DifficultyState['currentLevel'],
  gameState: any
): void {
${config.adjustments.map(adj => {
  let code = `
  // ${adj.name}: ${adj.description}
  if (level === '${adj.targetLevel}') {`;

  if (adj.variableModifier) {
    const { variableName, operation, value } = adj.variableModifier;
    if (operation === 'multiply') {
      code += `
    gameState.variables['${variableName}'] *= ${value};`;
    } else if (operation === 'add') {
      code += `
    gameState.variables['${variableName}'] += ${value};`;
    } else if (operation === 'set') {
      code += `
    gameState.variables['${variableName}'] = ${value};`;
    }
  }

  if (adj.hintAvailability) {
    code += `
    gameState.hintsEnabled = ${adj.hintAvailability.enableHints};
    gameState.hintDelay = ${adj.hintAvailability.hintDelay};`;
  }

  if (adj.timerAdjustment) {
    const { baseTime, adjustment } = adj.timerAdjustment;
    code += `
    gameState.timeLimit = ${baseTime} * (1 + ${adjustment} / 100);`;
  }

  code += `
  }`;

  return code;
}).join('\n')}
}
`.trim();

  const utilityCode = `
/**
 * Difficulty system manager
 */
export class DifficultyManager {
  private tracker = new MetricsTracker();
  private state: DifficultyState = {
    currentLevel: 'normal',
    metrics: this.tracker.getMetrics(),
    lastUpdate: 0,
  };

  constructor() {
    this.loadState();
  }

  /**
   * Update difficulty based on current metrics
   */
  update(gameState: any): void {
    const passageCount = this.tracker.getMetrics().passageCount;

    // Check if it's time to update
    if (passageCount - this.state.lastUpdate >= ${config.updateFrequency}) {
      const newLevel = evaluateDifficulty(this.tracker, this.state.currentLevel);

      if (newLevel !== this.state.currentLevel) {
        this.state.currentLevel = newLevel;
        applyDifficultyAdjustments(newLevel, gameState);
        this.saveState();
      }

      this.state.lastUpdate = passageCount;
      this.state.metrics = this.tracker.getMetrics();
    }
  }

  /**
   * Get metrics tracker
   */
  getTracker(): MetricsTracker {
    return this.tracker;
  }

  /**
   * Get current state
   */
  getState(): DifficultyState {
    return { ...this.state };
  }

  /**
   * Reset difficulty system
   */
  reset(): void {
    this.tracker = new MetricsTracker();
    this.state = {
      currentLevel: 'normal',
      metrics: this.tracker.getMetrics(),
      lastUpdate: 0,
    };
    this.saveState();
  }

  private saveState(): void {
    localStorage.setItem('difficulty_state', JSON.stringify(this.state));
    localStorage.setItem('difficulty_metrics', JSON.stringify(this.tracker.getMetrics()));
  }

  private loadState(): void {
    const savedState = localStorage.getItem('difficulty_state');
    const savedMetrics = localStorage.getItem('difficulty_metrics');

    if (savedState) {
      try {
        this.state = JSON.parse(savedState);
      } catch (e) {
        console.error('Failed to load difficulty state:', e);
      }
    }

    if (savedMetrics) {
      try {
        const metrics = JSON.parse(savedMetrics);
        // Restore metrics to tracker (implementation depends on tracker structure)
      } catch (e) {
        console.error('Failed to load difficulty metrics:', e);
      }
    }
  }
}

// Create global instance
export const difficultyManager = new DifficultyManager();
`.trim();

  return {
    types,
    metricsCode,
    evaluationCode,
    adjustmentCode,
    utilityCode,
  };
}

// Create store
const createAdaptiveDifficultyStore = () => {
  const { subscribe, set, update } = writable<AdaptiveDifficultyConfig>(DEFAULT_CONFIG);

  return {
    subscribe,

    /**
     * Set enabled state
     */
    setEnabled: (enabled: boolean) => {
      update(state => ({ ...state, enabled }));
    },

    /**
     * Add metric
     */
    addMetric: (metric: Omit<PerformanceMetric, 'id'>) => {
      const id = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      update(state => ({
        ...state,
        metrics: [...state.metrics, { ...metric, id }],
      }));
    },

    /**
     * Update metric
     */
    updateMetric: (id: string, updates: Partial<PerformanceMetric>) => {
      update(state => ({
        ...state,
        metrics: state.metrics.map(m => m.id === id ? { ...m, ...updates } : m),
      }));
    },

    /**
     * Delete metric
     */
    deleteMetric: (id: string) => {
      update(state => ({
        ...state,
        metrics: state.metrics.filter(m => m.id !== id),
      }));
    },

    /**
     * Add adjustment
     */
    addAdjustment: (adjustment: Omit<DifficultyAdjustment, 'id'>) => {
      const id = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      update(state => ({
        ...state,
        adjustments: [...state.adjustments, { ...adjustment, id }],
      }));
    },

    /**
     * Update adjustment
     */
    updateAdjustment: (id: string, updates: Partial<DifficultyAdjustment>) => {
      update(state => ({
        ...state,
        adjustments: state.adjustments.map(a => a.id === id ? { ...a, ...updates } : a),
      }));
    },

    /**
     * Delete adjustment
     */
    deleteAdjustment: (id: string) => {
      update(state => ({
        ...state,
        adjustments: state.adjustments.filter(a => a.id !== id),
      }));
    },

    /**
     * Set update frequency
     */
    setUpdateFrequency: (frequency: number) => {
      update(state => ({ ...state, updateFrequency: frequency }));
    },

    /**
     * Set smoothing factor
     */
    setSmoothingFactor: (factor: number) => {
      update(state => ({ ...state, smoothingFactor: factor }));
    },

    /**
     * Generate code
     */
    generateCode: (): ReturnType<typeof generateDifficultyCode> => {
      let config: AdaptiveDifficultyConfig = DEFAULT_CONFIG;
      const unsubscribe = subscribe(state => { config = state; });
      unsubscribe();
      return generateDifficultyCode(config);
    },

    /**
     * Reset to defaults
     */
    reset: () => {
      set(DEFAULT_CONFIG);
    },
  };
};

export const adaptiveDifficultyStore = createAdaptiveDifficultyStore();

// Derived stores
export const metrics = derived(adaptiveDifficultyStore, $store => $store.metrics);
export const adjustments = derived(adaptiveDifficultyStore, $store => $store.adjustments);
export const isEnabled = derived(adaptiveDifficultyStore, $store => $store.enabled);
