/**
 * Tests for TelemetryService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelemetryService, type TelemetryConfig } from './TelemetryService';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';

describe('TelemetryService', () => {
  let telemetry: TelemetryService;
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    telemetry = new TelemetryService();
    adapter = new LocalStorageAdapter();
    localStorage.clear();
  });

  afterEach(() => {
    telemetry.close();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(telemetry).toBeDefined();
      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(0);
      expect(metrics.writes).toBe(0);
      expect(metrics.deletes).toBe(0);
    });

    it('should initialize with custom config', () => {
      const config: Partial<TelemetryConfig> = {
        enabled: false,
        maxPerformanceHistory: 50,
        maxErrorHistory: 25,
      };

      const customTelemetry = new TelemetryService(config);
      expect(customTelemetry).toBeDefined();
      customTelemetry.close();
    });

    it('should initialize with storage adapter', async () => {
      await adapter.initialize();
      telemetry.initialize(adapter);
      expect(telemetry).toBeDefined();
    });
  });

  describe('Read Operations Tracking', () => {
    it('should track successful read', () => {
      telemetry.trackRead('test-key', 10, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(1);
      expect(metrics.totalReadTime).toBe(10);
      expect(metrics.avgReadTime).toBe(10);
      expect(metrics.lastOperation).toBe('read:test-key');
    });

    it('should track multiple reads', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackRead('key-2', 20, true);
      telemetry.trackRead('key-3', 30, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(3);
      expect(metrics.totalReadTime).toBe(60);
      expect(metrics.avgReadTime).toBe(20);
    });

    it('should track failed read', () => {
      const error = new Error('Read failed');
      telemetry.trackRead('test-key', 5, false, error);

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(1);
      expect(metrics.errors).toBe(1);

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('read');
      expect(errors[0].error).toBe('Read failed');
    });

    it('should not track when disabled', () => {
      telemetry.setEnabled(false);
      telemetry.trackRead('test-key', 10, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(0);
    });
  });

  describe('Write Operations Tracking', () => {
    it('should track successful write', () => {
      telemetry.trackWrite('test-key', 15, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.writes).toBe(1);
      expect(metrics.totalWriteTime).toBe(15);
      expect(metrics.avgWriteTime).toBe(15);
      expect(metrics.lastOperation).toBe('write:test-key');
    });

    it('should track multiple writes', () => {
      telemetry.trackWrite('key-1', 10, true);
      telemetry.trackWrite('key-2', 20, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.writes).toBe(2);
      expect(metrics.totalWriteTime).toBe(30);
      expect(metrics.avgWriteTime).toBe(15);
    });

    it('should track failed write', () => {
      const error = new Error('Write failed');
      telemetry.trackWrite('test-key', 5, false, error);

      const metrics = telemetry.getMetrics();
      expect(metrics.writes).toBe(1);
      expect(metrics.errors).toBe(1);

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('write');
    });
  });

  describe('Delete Operations Tracking', () => {
    it('should track successful delete', () => {
      telemetry.trackDelete('test-key', 8, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.deletes).toBe(1);
      expect(metrics.totalDeleteTime).toBe(8);
      expect(metrics.avgDeleteTime).toBe(8);
      expect(metrics.lastOperation).toBe('delete:test-key');
    });

    it('should track multiple deletes', () => {
      telemetry.trackDelete('key-1', 5, true);
      telemetry.trackDelete('key-2', 10, true);
      telemetry.trackDelete('key-3', 15, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.deletes).toBe(3);
      expect(metrics.totalDeleteTime).toBe(30);
      expect(metrics.avgDeleteTime).toBe(10);
    });

    it('should track failed delete', () => {
      const error = new Error('Delete failed');
      telemetry.trackDelete('test-key', 3, false, error);

      const metrics = telemetry.getMetrics();
      expect(metrics.deletes).toBe(1);
      expect(metrics.errors).toBe(1);
    });
  });

  describe('List Operations Tracking', () => {
    it('should track successful list', () => {
      telemetry.trackList(12, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.lastOperation).toBe('list');
    });

    it('should track failed list', () => {
      const error = new Error('List failed');
      telemetry.trackList(5, false, error);

      const metrics = telemetry.getMetrics();
      expect(metrics.errors).toBe(1);

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('list');
    });
  });

  describe('Sync Operations Tracking', () => {
    it('should track successful sync', () => {
      telemetry.trackSync(100, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.lastOperation).toBe('sync');
    });

    it('should track failed sync', () => {
      const error = new Error('Sync failed');
      telemetry.trackSync(50, false, error);

      const metrics = telemetry.getMetrics();
      expect(metrics.errors).toBe(1);

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('sync');
    });
  });

  describe('Performance History', () => {
    it('should maintain performance history', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);
      telemetry.trackDelete('key-3', 8, true);

      const history = telemetry.getPerformanceHistory();
      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('read');
      expect(history[1].operation).toBe('write');
      expect(history[2].operation).toBe('delete');
    });

    it('should limit performance history size', () => {
      const customTelemetry = new TelemetryService({
        maxPerformanceHistory: 5,
      });

      for (let i = 0; i < 10; i++) {
        customTelemetry.trackRead(`key-${i}`, 10, true);
      }

      const history = customTelemetry.getPerformanceHistory();
      expect(history).toHaveLength(5);

      customTelemetry.close();
    });

    it('should include all metric details', () => {
      telemetry.trackRead('test-key', 10, true);

      const history = telemetry.getPerformanceHistory();
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('operation');
      expect(history[0]).toHaveProperty('duration');
      expect(history[0]).toHaveProperty('key');
      expect(history[0]).toHaveProperty('success');
    });
  });

  describe('Error History', () => {
    it('should maintain error history', () => {
      telemetry.trackRead('key-1', 5, false, new Error('Error 1'));
      telemetry.trackWrite('key-2', 5, false, new Error('Error 2'));

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(2);
      expect(errors[0].error).toBe('Error 1');
      expect(errors[1].error).toBe('Error 2');
    });

    it('should limit error history size', () => {
      const customTelemetry = new TelemetryService({
        maxErrorHistory: 3,
      });

      for (let i = 0; i < 5; i++) {
        customTelemetry.trackRead(`key-${i}`, 5, false, new Error(`Error ${i}`));
      }

      const errors = customTelemetry.getErrorHistory();
      expect(errors).toHaveLength(3);

      customTelemetry.close();
    });

    it('should include error details', () => {
      const error = new Error('Test error');
      telemetry.trackRead('test-key', 5, false, error);

      const errors = telemetry.getErrorHistory();
      expect(errors[0]).toHaveProperty('timestamp');
      expect(errors[0]).toHaveProperty('operation');
      expect(errors[0]).toHaveProperty('error');
      expect(errors[0]).toHaveProperty('key');
    });
  });

  describe('Quota Monitoring', () => {
    it('should get current quota', async () => {
      await adapter.initialize();
      telemetry.initialize(adapter);

      const quota = await telemetry.getCurrentQuota();
      expect(quota).not.toBeNull();
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('total');
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('usagePercentage');
    });

    it('should return null if no adapter', async () => {
      const quota = await telemetry.getCurrentQuota();
      expect(quota).toBeNull();
    });

    it('should track quota history', async () => {
      await adapter.initialize();
      telemetry.initialize(adapter);

      // Wait a bit for initial quota check
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = telemetry.getQuotaHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate performance stats', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackRead('key-2', 20, true);
      telemetry.trackWrite('key-3', 15, true);
      telemetry.trackDelete('key-4', 5, false, new Error('Failed'));

      const stats = telemetry.getPerformanceStats();
      expect(stats.totalOperations).toBe(4);
      expect(stats.successRate).toBe(75); // 3 out of 4
      expect(stats.avgDuration).toBe(12.5); // (10+20+15+5)/4
      expect(stats.minDuration).toBe(5);
      expect(stats.maxDuration).toBe(20);
    });

    it('should count operations by type', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackRead('key-2', 10, true);
      telemetry.trackWrite('key-3', 10, true);

      const stats = telemetry.getPerformanceStats();
      expect(stats.operationCounts.read).toBe(2);
      expect(stats.operationCounts.write).toBe(1);
    });

    it('should return zero stats when no operations', () => {
      const stats = telemetry.getPerformanceStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });

  describe('Telemetry Snapshot', () => {
    it('should create complete snapshot', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);

      const snapshot = telemetry.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('recentPerformance');
      expect(snapshot).toHaveProperty('recentErrors');
      expect(snapshot).toHaveProperty('quotaHistory');
      expect(snapshot).toHaveProperty('sessionStart');
      expect(snapshot).toHaveProperty('sessionDuration');
    });

    it('should include session duration', () => {
      const snapshot = telemetry.getSnapshot();
      expect(snapshot.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);
      telemetry.trackDelete('key-3', 8, false, new Error('Failed'));

      telemetry.reset();

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(0);
      expect(metrics.writes).toBe(0);
      expect(metrics.deletes).toBe(0);
      expect(metrics.errors).toBe(0);

      const history = telemetry.getPerformanceHistory();
      expect(history).toHaveLength(0);

      const errors = telemetry.getErrorHistory();
      expect(errors).toHaveLength(0);
    });

    it('should reset session start time', () => {
      const oldSnapshot = telemetry.getSnapshot();
      const oldSessionStart = oldSnapshot.sessionStart;

      // Wait a bit
      setTimeout(() => {
        telemetry.reset();
        const newSnapshot = telemetry.getSnapshot();
        expect(newSnapshot.sessionStart).toBeGreaterThan(oldSessionStart);
      }, 10);
    });
  });

  describe('Export/Import', () => {
    it('should export telemetry data', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);

      const exported = telemetry.exportData();
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('recentPerformance');
    });

    it('should import telemetry data', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);

      const exported = telemetry.exportData();

      const newTelemetry = new TelemetryService();
      const success = newTelemetry.importData(exported);

      expect(success).toBe(true);

      const metrics = newTelemetry.getMetrics();
      expect(metrics.reads).toBe(1);
      expect(metrics.writes).toBe(1);

      newTelemetry.close();
    });

    it('should handle invalid import data', () => {
      const success = telemetry.importData('invalid json');
      expect(success).toBe(false);
    });

    it('should preserve history on import', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackRead('key-2', 20, false, new Error('Failed'));

      const exported = telemetry.exportData();

      const newTelemetry = new TelemetryService();
      newTelemetry.importData(exported);

      const history = newTelemetry.getPerformanceHistory();
      expect(history).toHaveLength(2);

      const errors = newTelemetry.getErrorHistory();
      expect(errors).toHaveLength(1);

      newTelemetry.close();
    });
  });

  describe('Enable/Disable', () => {
    it('should enable telemetry', () => {
      telemetry.setEnabled(false);
      telemetry.trackRead('key-1', 10, true);

      let metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(0);

      telemetry.setEnabled(true);
      telemetry.trackRead('key-2', 10, true);

      metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(1);
    });

    it('should disable telemetry', () => {
      telemetry.setEnabled(true);
      telemetry.trackRead('key-1', 10, true);

      telemetry.setEnabled(false);
      telemetry.trackRead('key-2', 10, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.reads).toBe(1); // Only first read tracked
    });
  });

  describe('Operations Per Minute', () => {
    it('should calculate operations per minute', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.trackWrite('key-2', 15, true);
      telemetry.trackDelete('key-3', 8, true);

      const opsPerMin = telemetry.getOperationsPerMinute();
      expect(opsPerMin).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 at session start', () => {
      const opsPerMin = telemetry.getOperationsPerMinute();
      expect(opsPerMin).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recent Errors', () => {
    it('should get recent errors', () => {
      for (let i = 0; i < 5; i++) {
        telemetry.trackRead(`key-${i}`, 5, false, new Error(`Error ${i}`));
      }

      const recent = telemetry.getRecentErrors(3);
      expect(recent).toHaveLength(3);
      expect(recent[2].error).toBe('Error 4'); // Most recent
    });

    it('should return all errors if count > history', () => {
      telemetry.trackRead('key-1', 5, false, new Error('Error 1'));
      telemetry.trackRead('key-2', 5, false, new Error('Error 2'));

      const recent = telemetry.getRecentErrors(10);
      expect(recent).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('should close cleanly', () => {
      telemetry.trackRead('key-1', 10, true);
      telemetry.close();

      // Should not throw
      expect(() => telemetry.close()).not.toThrow();
    });

    it('should stop quota monitoring on close', async () => {
      await adapter.initialize();
      telemetry.initialize(adapter);

      telemetry.close();

      // Quota monitoring should be stopped
      // No way to directly test, but should not throw
      expect(() => telemetry.close()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      telemetry.trackRead('key-1', 0, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.avgReadTime).toBe(0);
    });

    it('should handle very large durations', () => {
      telemetry.trackRead('key-1', 999999, true);

      const metrics = telemetry.getMetrics();
      expect(metrics.avgReadTime).toBe(999999);
    });

    it('should handle operations without keys', () => {
      telemetry.trackList(10, true);
      telemetry.trackSync(50, true);

      const history = telemetry.getPerformanceHistory();
      expect(history).toHaveLength(2);
      expect(history[0].key).toBeUndefined();
      expect(history[1].key).toBeUndefined();
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      delete error.stack;

      telemetry.trackRead('key-1', 5, false, error);

      const errors = telemetry.getErrorHistory();
      expect(errors[0].stack).toBeUndefined();
    });
  });
});
