/**
 * Tests for PluginSandbox
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginSandbox, type Permission } from './PluginSandbox';
import type { PluginMetadata } from './types';

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;
  const metadata: PluginMetadata = {
    name: 'test-plugin',
    version: '1.0.0',
  };

  beforeEach(() => {
    sandbox = PluginSandbox.create(metadata);
  });

  describe('factory method', () => {
    it('creates instance with default config', () => {
      expect(sandbox).toBeInstanceOf(PluginSandbox);
    });

    it('creates instance with custom config', () => {
      const s = PluginSandbox.create(metadata, {
        permissions: ['network', 'crypto'],
        timeout: 10000,
      });
      expect(s.hasPermission('network')).toBe(true);
      expect(s.hasPermission('crypto')).toBe(true);
    });
  });

  describe('permissions', () => {
    it('has default permissions', () => {
      expect(sandbox.hasPermission('storage')).toBe(true);
      expect(sandbox.hasPermission('config')).toBe(true);
      expect(sandbox.hasPermission('hooks')).toBe(true);
      expect(sandbox.hasPermission('console')).toBe(true);
    });

    it('does not have non-default permissions', () => {
      expect(sandbox.hasPermission('network')).toBe(false);
      expect(sandbox.hasPermission('dom')).toBe(false);
    });

    it('grants permission', () => {
      expect(sandbox.hasPermission('network')).toBe(false);
      sandbox.grantPermission('network');
      expect(sandbox.hasPermission('network')).toBe(true);
    });

    it('revokes permission', () => {
      expect(sandbox.hasPermission('storage')).toBe(true);
      sandbox.revokePermission('storage');
      expect(sandbox.hasPermission('storage')).toBe(false);
    });

    it('gets all permissions', () => {
      const perms = sandbox.getPermissions();
      expect(perms).toContain('storage');
      expect(perms).toContain('config');
      expect(perms).toContain('hooks');
      expect(perms).toContain('console');
    });

    it('requests already granted permission', () => {
      const result = sandbox.requestPermission('storage');
      expect(result.granted).toBe(true);
    });

    it('denies non-granted permission request', () => {
      const result = sandbox.requestPermission('network');
      expect(result.granted).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('executes sync function', async () => {
      const result = await sandbox.execute(() => 42);
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('executes async function', async () => {
      const result = await sandbox.execute(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'async result';
      });
      expect(result.success).toBe(true);
      expect(result.result).toBe('async result');
    });

    it('catches errors', async () => {
      const result = await sandbox.execute(() => {
        throw new Error('test error');
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('test error');
    });

    it('times out long-running functions', async () => {
      const shortTimeoutSandbox = PluginSandbox.create(metadata, { timeout: 50 });
      const result = await shortTimeoutSandbox.execute(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 'never reached';
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });

    it('captures logs during execution', async () => {
      const result = await sandbox.execute(() => {
        const apis = sandbox.createSandboxedApis();
        apis.console?.log('test log');
        apis.console?.warn('test warn');
        return true;
      });
      expect(result.success).toBe(true);
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe('sandboxed APIs', () => {
    it('creates sandboxed console when permission granted', () => {
      const apis = sandbox.createSandboxedApis();
      expect(apis.console).toBeDefined();
      expect(typeof apis.console?.log).toBe('function');
    });

    it('does not create fetch without network permission', () => {
      const apis = sandbox.createSandboxedApis();
      expect(apis.fetch).toBeUndefined();
    });

    it('creates sandboxed fetch with network permission', () => {
      sandbox.grantPermission('network');
      const apis = sandbox.createSandboxedApis();
      expect(apis.fetch).toBeDefined();
    });

    it('does not create timers without timer permission', () => {
      const apis = sandbox.createSandboxedApis();
      expect(apis.setTimeout).toBeUndefined();
      expect(apis.setInterval).toBeUndefined();
    });

    it('creates sandboxed timers with timer permission', () => {
      sandbox.grantPermission('timer');
      const apis = sandbox.createSandboxedApis();
      expect(apis.setTimeout).toBeDefined();
      expect(apis.setInterval).toBeDefined();
      expect(apis.clearTimeout).toBeDefined();
      expect(apis.clearInterval).toBeDefined();
    });
  });

  describe('sandboxed console', () => {
    it('logs to internal log store', () => {
      const apis = sandbox.createSandboxedApis();
      apis.console?.debug('debug message');
      apis.console?.info('info message');
      apis.console?.warn('warn message');
      apis.console?.error('error message');

      const logs = sandbox.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs[0].level).toBe('debug');
      expect(logs[1].level).toBe('info');
      expect(logs[2].level).toBe('warn');
      expect(logs[3].level).toBe('error');
    });

    it('captures log arguments', () => {
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('message', 42, { key: 'value' });

      const logs = sandbox.getLogs();
      expect(logs[0].args).toEqual(['message', 42, { key: 'value' }]);
    });

    it('includes timestamp', () => {
      const before = Date.now();
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('test');
      const after = Date.now();

      const logs = sandbox.getLogs();
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('sandboxed timers', () => {
    it('tracks pending timers', () => {
      sandbox.grantPermission('timer');
      const apis = sandbox.createSandboxedApis();

      const timerId = apis.setTimeout!(() => {}, 1000);
      expect(sandbox.getStats().pendingTimers).toBe(1);

      apis.clearTimeout!(timerId);
      expect(sandbox.getStats().pendingTimers).toBe(0);
    });

    it('clears timer from pending on execution', async () => {
      sandbox.grantPermission('timer');
      const apis = sandbox.createSandboxedApis();

      apis.setTimeout!(() => {}, 10);
      expect(sandbox.getStats().pendingTimers).toBe(1);

      await new Promise((r) => setTimeout(r, 50));
      expect(sandbox.getStats().pendingTimers).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('clears pending timers', () => {
      sandbox.grantPermission('timer');
      const apis = sandbox.createSandboxedApis();

      apis.setTimeout!(() => {}, 10000);
      apis.setInterval!(() => {}, 10000);
      expect(sandbox.getStats().pendingTimers).toBe(2);

      sandbox.cleanup();
      expect(sandbox.getStats().pendingTimers).toBe(0);
    });

    it('clears logs', () => {
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('test');
      expect(sandbox.getLogs()).toHaveLength(1);

      sandbox.cleanup();
      expect(sandbox.getLogs()).toHaveLength(0);
    });
  });

  describe('getLogs', () => {
    it('returns copy of logs', () => {
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('test');

      const logs1 = sandbox.getLogs();
      const logs2 = sandbox.getLogs();
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('clearLogs', () => {
    it('clears captured logs', () => {
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('test');
      expect(sandbox.getLogs()).toHaveLength(1);

      sandbox.clearLogs();
      expect(sandbox.getLogs()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns sandbox statistics', () => {
      sandbox.grantPermission('timer');
      const apis = sandbox.createSandboxedApis();
      apis.console?.log('test');
      apis.setTimeout!(() => {}, 10000);

      const stats = sandbox.getStats();
      expect(stats.permissions).toContain('storage');
      expect(stats.permissions).toContain('timer');
      expect(stats.pendingTimers).toBe(1);
      expect(stats.logCount).toBe(1);
      expect(typeof stats.apiCallsThisSecond).toBe('number');

      sandbox.cleanup();
    });
  });

  describe('wrap', () => {
    it('wraps function for sandboxed execution', async () => {
      const fn = (a: number, b: number) => a + b;
      const wrapped = sandbox.wrap(fn);

      const result = await wrapped(2, 3);
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('catches errors in wrapped function', async () => {
      const fn = () => {
        throw new Error('wrapped error');
      };
      const wrapped = sandbox.wrap(fn);

      const result = await wrapped();
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('wrapped error');
    });
  });

  describe('rate limiting', () => {
    it('tracks API calls', () => {
      sandbox.grantPermission('network');
      const stats = sandbox.getStats();
      expect(stats.apiCallsThisSecond).toBe(0);
    });
  });
});
