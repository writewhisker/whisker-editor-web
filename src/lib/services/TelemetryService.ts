/**
 * Telemetry Service
 *
 * Provides advanced telemetry and monitoring for storage operations,
 * performance metrics, and error tracking.
 */

import type { IStorageAdapter } from './storage/types';

export interface StorageMetrics {
  reads: number;
  writes: number;
  deletes: number;
  errors: number;
  totalReadTime: number;
  totalWriteTime: number;
  totalDeleteTime: number;
  avgReadTime: number;
  avgWriteTime: number;
  avgDeleteTime: number;
  lastOperation: string | null;
  lastOperationTime: number | null;
}

export interface PerformanceMetric {
  timestamp: number;
  operation: 'read' | 'write' | 'delete' | 'list' | 'sync';
  duration: number;
  key?: string;
  success: boolean;
  error?: string;
}

export interface ErrorEvent {
  timestamp: number;
  operation: string;
  error: string;
  key?: string;
  stack?: string;
}

export interface QuotaMetrics {
  used: number;
  total: number;
  available: number;
  usagePercentage: number;
  timestamp: number;
}

export interface TelemetrySnapshot {
  metrics: StorageMetrics;
  recentPerformance: PerformanceMetric[];
  recentErrors: ErrorEvent[];
  quotaHistory: QuotaMetrics[];
  sessionStart: number;
  sessionDuration: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  maxPerformanceHistory: number;
  maxErrorHistory: number;
  maxQuotaHistory: number;
  quotaCheckInterval: number; // milliseconds
}

/**
 * TelemetryService
 *
 * Features:
 * - Storage operation metrics (reads, writes, deletes)
 * - Performance tracking with timing
 * - Error tracking and logging
 * - Storage quota monitoring
 * - Historical data retention
 * - Export/import telemetry data
 */
export class TelemetryService {
  private config: TelemetryConfig;
  private metrics: StorageMetrics;
  private performanceHistory: PerformanceMetric[];
  private errorHistory: ErrorEvent[];
  private quotaHistory: QuotaMetrics[];
  private sessionStart: number;
  private quotaCheckTimer: number | null = null;
  private adapter: IStorageAdapter | null = null;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = {
      enabled: true,
      maxPerformanceHistory: 100,
      maxErrorHistory: 50,
      maxQuotaHistory: 20,
      quotaCheckInterval: 60000, // 1 minute
      ...config,
    };

    this.metrics = this.createEmptyMetrics();
    this.performanceHistory = [];
    this.errorHistory = [];
    this.quotaHistory = [];
    this.sessionStart = Date.now();
  }

  /**
   * Initialize telemetry service with storage adapter
   */
  initialize(adapter: IStorageAdapter): void {
    this.adapter = adapter;

    if (this.config.enabled) {
      this.startQuotaMonitoring();
    }
  }

  /**
   * Enable or disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (enabled) {
      this.startQuotaMonitoring();
    } else {
      this.stopQuotaMonitoring();
    }
  }

  /**
   * Track a read operation
   */
  trackRead(key: string, duration: number, success: boolean, error?: Error): void {
    if (!this.config.enabled) return;

    this.metrics.reads++;
    this.metrics.totalReadTime += duration;
    this.metrics.avgReadTime = this.metrics.totalReadTime / this.metrics.reads;
    this.metrics.lastOperation = `read:${key}`;
    this.metrics.lastOperationTime = Date.now();

    if (!success) {
      this.metrics.errors++;
      this.trackError('read', error?.message || 'Unknown error', key, error?.stack);
    }

    this.addPerformanceMetric({
      timestamp: Date.now(),
      operation: 'read',
      duration,
      key,
      success,
      error: error?.message,
    });
  }

  /**
   * Track a write operation
   */
  trackWrite(key: string, duration: number, success: boolean, error?: Error): void {
    if (!this.config.enabled) return;

    this.metrics.writes++;
    this.metrics.totalWriteTime += duration;
    this.metrics.avgWriteTime = this.metrics.totalWriteTime / this.metrics.writes;
    this.metrics.lastOperation = `write:${key}`;
    this.metrics.lastOperationTime = Date.now();

    if (!success) {
      this.metrics.errors++;
      this.trackError('write', error?.message || 'Unknown error', key, error?.stack);
    }

    this.addPerformanceMetric({
      timestamp: Date.now(),
      operation: 'write',
      duration,
      key,
      success,
      error: error?.message,
    });
  }

  /**
   * Track a delete operation
   */
  trackDelete(key: string, duration: number, success: boolean, error?: Error): void {
    if (!this.config.enabled) return;

    this.metrics.deletes++;
    this.metrics.totalDeleteTime += duration;
    this.metrics.avgDeleteTime = this.metrics.totalDeleteTime / this.metrics.deletes;
    this.metrics.lastOperation = `delete:${key}`;
    this.metrics.lastOperationTime = Date.now();

    if (!success) {
      this.metrics.errors++;
      this.trackError('delete', error?.message || 'Unknown error', key, error?.stack);
    }

    this.addPerformanceMetric({
      timestamp: Date.now(),
      operation: 'delete',
      duration,
      key,
      success,
      error: error?.message,
    });
  }

  /**
   * Track a list operation
   */
  trackList(duration: number, success: boolean, error?: Error): void {
    if (!this.config.enabled) return;

    this.metrics.lastOperation = 'list';
    this.metrics.lastOperationTime = Date.now();

    if (!success) {
      this.metrics.errors++;
      this.trackError('list', error?.message || 'Unknown error', undefined, error?.stack);
    }

    this.addPerformanceMetric({
      timestamp: Date.now(),
      operation: 'list',
      duration,
      success,
      error: error?.message,
    });
  }

  /**
   * Track a sync operation
   */
  trackSync(duration: number, success: boolean, error?: Error): void {
    if (!this.config.enabled) return;

    this.metrics.lastOperation = 'sync';
    this.metrics.lastOperationTime = Date.now();

    if (!success) {
      this.metrics.errors++;
      this.trackError('sync', error?.message || 'Unknown error', undefined, error?.stack);
    }

    this.addPerformanceMetric({
      timestamp: Date.now(),
      operation: 'sync',
      duration,
      success,
      error: error?.message,
    });
  }

  /**
   * Track an error
   */
  private trackError(operation: string, error: string, key?: string, stack?: string): void {
    const errorEvent: ErrorEvent = {
      timestamp: Date.now(),
      operation,
      error,
      key,
      stack,
    };

    this.errorHistory.push(errorEvent);

    // Trim history if too long
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Add performance metric to history
   */
  private addPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceHistory.push(metric);

    // Trim history if too long
    if (this.performanceHistory.length > this.config.maxPerformanceHistory) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetric[] {
    return [...this.performanceHistory];
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorEvent[] {
    return [...this.errorHistory];
  }

  /**
   * Get quota history
   */
  getQuotaHistory(): QuotaMetrics[] {
    return [...this.quotaHistory];
  }

  /**
   * Get complete telemetry snapshot
   */
  getSnapshot(): TelemetrySnapshot {
    return {
      metrics: this.getMetrics(),
      recentPerformance: this.getPerformanceHistory(),
      recentErrors: this.getErrorHistory(),
      quotaHistory: this.getQuotaHistory(),
      sessionStart: this.sessionStart,
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.performanceHistory = [];
    this.errorHistory = [];
    this.quotaHistory = [];
    this.sessionStart = Date.now();
  }

  /**
   * Export telemetry data as JSON
   */
  exportData(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Import telemetry data from JSON
   */
  importData(json: string): boolean {
    try {
      const snapshot = JSON.parse(json) as TelemetrySnapshot;

      this.metrics = snapshot.metrics;
      this.performanceHistory = snapshot.recentPerformance;
      this.errorHistory = snapshot.recentErrors;
      this.quotaHistory = snapshot.quotaHistory;
      this.sessionStart = snapshot.sessionStart;

      return true;
    } catch (error) {
      console.error('Failed to import telemetry data:', error);
      return false;
    }
  }

  /**
   * Start monitoring storage quota
   */
  private startQuotaMonitoring(): void {
    if (this.quotaCheckTimer !== null) return;
    if (!this.adapter) return;

    // Initial check
    this.checkQuota();

    // Periodic checks
    this.quotaCheckTimer = window.setInterval(() => {
      this.checkQuota();
    }, this.config.quotaCheckInterval);
  }

  /**
   * Stop monitoring storage quota
   */
  private stopQuotaMonitoring(): void {
    if (this.quotaCheckTimer !== null) {
      clearInterval(this.quotaCheckTimer);
      this.quotaCheckTimer = null;
    }
  }

  /**
   * Check current storage quota
   */
  private async checkQuota(): Promise<void> {
    if (!this.adapter) return;

    try {
      const quotaInfo = await this.adapter.getQuotaInfo();

      const quotaMetrics: QuotaMetrics = {
        used: quotaInfo.used,
        total: quotaInfo.total,
        available: quotaInfo.available,
        usagePercentage: quotaInfo.total > 0 ? (quotaInfo.used / quotaInfo.total) * 100 : 0,
        timestamp: Date.now(),
      };

      this.quotaHistory.push(quotaMetrics);

      // Trim history if too long
      if (this.quotaHistory.length > this.config.maxQuotaHistory) {
        this.quotaHistory.shift();
      }
    } catch (error) {
      console.error('Failed to check quota:', error);
    }
  }

  /**
   * Get current quota metrics
   */
  async getCurrentQuota(): Promise<QuotaMetrics | null> {
    if (!this.adapter) return null;

    try {
      const quotaInfo = await this.adapter.getQuotaInfo();

      return {
        used: quotaInfo.used,
        total: quotaInfo.total,
        available: quotaInfo.available,
        usagePercentage: quotaInfo.total > 0 ? (quotaInfo.used / quotaInfo.total) * 100 : 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to get current quota:', error);
      return null;
    }
  }

  /**
   * Calculate statistics from performance history
   */
  getPerformanceStats(): {
    totalOperations: number;
    successRate: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    operationCounts: Record<string, number>;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationCounts: {},
      };
    }

    const successCount = this.performanceHistory.filter(m => m.success).length;
    const durations = this.performanceHistory.map(m => m.duration);
    const operationCounts: Record<string, number> = {};

    for (const metric of this.performanceHistory) {
      operationCounts[metric.operation] = (operationCounts[metric.operation] || 0) + 1;
    }

    return {
      totalOperations: this.performanceHistory.length,
      successRate: (successCount / this.performanceHistory.length) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      operationCounts,
    };
  }

  /**
   * Get recent errors (last N)
   */
  getRecentErrors(count: number = 10): ErrorEvent[] {
    return this.errorHistory.slice(-count);
  }

  /**
   * Get operations per minute
   */
  getOperationsPerMinute(): number {
    const sessionDurationMinutes = (Date.now() - this.sessionStart) / 60000;
    if (sessionDurationMinutes === 0) return 0;

    const totalOperations = this.metrics.reads + this.metrics.writes + this.metrics.deletes;
    return totalOperations / sessionDurationMinutes;
  }

  /**
   * Clean up resources
   */
  close(): void {
    this.stopQuotaMonitoring();
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): StorageMetrics {
    return {
      reads: 0,
      writes: 0,
      deletes: 0,
      errors: 0,
      totalReadTime: 0,
      totalWriteTime: 0,
      totalDeleteTime: 0,
      avgReadTime: 0,
      avgWriteTime: 0,
      avgDeleteTime: 0,
      lastOperation: null,
      lastOperationTime: null,
    };
  }
}

// Global telemetry service instance
let telemetryService: TelemetryService | null = null;

/**
 * Get or create the global telemetry service
 */
export function getTelemetryService(): TelemetryService {
  if (!telemetryService) {
    telemetryService = new TelemetryService();
  }
  return telemetryService;
}

/**
 * Initialize the global telemetry service with a storage adapter
 */
export function initializeTelemetry(adapter: IStorageAdapter, config?: Partial<TelemetryConfig>): TelemetryService {
  telemetryService = new TelemetryService(config);
  telemetryService.initialize(adapter);
  return telemetryService;
}
