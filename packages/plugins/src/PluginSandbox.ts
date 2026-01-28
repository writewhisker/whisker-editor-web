/**
 * Plugin Sandbox - Provides isolation and security for plugin execution
 */

import type { Logger, PluginMetadata } from './types';

/**
 * Permission types
 */
export type Permission =
  | 'storage'        // Access to plugin storage
  | 'config'         // Access to configuration
  | 'api'            // Access to APIs
  | 'network'        // Network access (fetch)
  | 'dom'            // DOM manipulation
  | 'hooks'          // Register hooks
  | 'console'        // Console access
  | 'timer'          // setTimeout/setInterval
  | 'crypto'         // Crypto APIs
  | 'clipboard'      // Clipboard access
  | 'notification';  // Notification API

/**
 * Permission request result
 */
export interface PermissionResult {
  granted: boolean;
  reason?: string;
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Allowed permissions */
  permissions?: Permission[];
  /** Execution timeout in milliseconds */
  timeout?: number;
  /** Memory limit in bytes (best effort) */
  memoryLimit?: number;
  /** Maximum number of API calls per second */
  rateLimit?: number;
  /** Whether to capture console output */
  captureConsole?: boolean;
  /** Custom logger */
  logger?: Logger;
}

/**
 * Execution result
 */
export interface ExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  logs: LogEntry[];
}

/**
 * Log entry
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  args: unknown[];
  timestamp: number;
}

/**
 * Sandboxed API access
 */
export interface SandboxedApis {
  fetch?: typeof fetch;
  setTimeout?: typeof setTimeout;
  setInterval?: typeof setInterval;
  clearTimeout?: typeof clearTimeout;
  clearInterval?: typeof clearInterval;
  console?: Console;
  crypto?: Crypto;
}

/**
 * PluginSandbox class
 */
export class PluginSandbox {
  private config: Required<SandboxConfig>;
  private grantedPermissions: Set<Permission> = new Set();
  private pendingTimers: Set<unknown> = new Set();
  private logs: LogEntry[] = [];
  private apiCallCount = 0;
  private lastApiCallReset = Date.now();

  constructor(
    private metadata: PluginMetadata,
    config?: SandboxConfig
  ) {
    this.config = {
      permissions: config?.permissions || ['storage', 'config', 'hooks', 'console'],
      timeout: config?.timeout || 5000,
      memoryLimit: config?.memoryLimit || 50 * 1024 * 1024, // 50MB
      rateLimit: config?.rateLimit || 100,
      captureConsole: config?.captureConsole ?? true,
      logger: config?.logger as Logger,
    };

    // Grant default permissions
    for (const perm of this.config.permissions) {
      this.grantedPermissions.add(perm);
    }
  }

  /**
   * Factory method
   */
  static create(metadata: PluginMetadata, config?: SandboxConfig): PluginSandbox {
    return new PluginSandbox(metadata, config);
  }

  /**
   * Check if permission is granted
   */
  hasPermission(permission: Permission): boolean {
    return this.grantedPermissions.has(permission);
  }

  /**
   * Request permission
   */
  requestPermission(permission: Permission): PermissionResult {
    if (this.grantedPermissions.has(permission)) {
      return { granted: true };
    }

    // For now, auto-deny permissions not in config
    // In a real implementation, this could prompt the user
    this.config.logger?.warn(
      `Plugin ${this.metadata.name} requested permission "${permission}" which is not granted`
    );

    return {
      granted: false,
      reason: `Permission "${permission}" is not in the allowed list`,
    };
  }

  /**
   * Grant permission
   */
  grantPermission(permission: Permission): void {
    this.grantedPermissions.add(permission);
  }

  /**
   * Revoke permission
   */
  revokePermission(permission: Permission): void {
    this.grantedPermissions.delete(permission);
  }

  /**
   * Get all granted permissions
   */
  getPermissions(): Permission[] {
    return Array.from(this.grantedPermissions);
  }

  /**
   * Execute function in sandbox with timeout
   */
  async execute<T>(fn: () => T | Promise<T>): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    this.logs = [];

    try {
      const result = await this.withTimeout(fn, this.config.timeout);
      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        logs: [...this.logs],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
        logs: [...this.logs],
      };
    }
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(fn: () => T | Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Plugin execution timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve()
        .then(() => fn())
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Create sandboxed APIs
   */
  createSandboxedApis(): SandboxedApis {
    const apis: SandboxedApis = {};

    // Fetch (if network permission granted)
    if (this.hasPermission('network')) {
      apis.fetch = this.createSandboxedFetch();
    }

    // Timers (if timer permission granted)
    if (this.hasPermission('timer')) {
      apis.setTimeout = this.createSandboxedSetTimeout();
      apis.setInterval = this.createSandboxedSetInterval();
      apis.clearTimeout = this.createSandboxedClearTimeout();
      apis.clearInterval = this.createSandboxedClearInterval();
    }

    // Console (if console permission granted)
    if (this.hasPermission('console')) {
      apis.console = this.createSandboxedConsole();
    }

    return apis;
  }

  /**
   * Create sandboxed fetch
   */
  private createSandboxedFetch(): typeof fetch {
    const sandbox = this;

    return async function sandboxedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      sandbox.checkRateLimit();

      if (typeof fetch !== 'function') {
        throw new Error('fetch is not available');
      }

      sandbox.config.logger?.debug(`Plugin ${sandbox.metadata.name} fetching: ${input}`);
      return fetch(input, init);
    };
  }

  /**
   * Create sandboxed setTimeout
   */
  private createSandboxedSetTimeout(): (callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => ReturnType<typeof setTimeout> {
    const sandbox = this;

    return function sandboxedSetTimeout(
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof setTimeout> {
      const timerId = setTimeout(() => {
        sandbox.pendingTimers.delete(timerId);
        try {
          callback(...args);
        } catch (error) {
          sandbox.config.logger?.error(`Plugin ${sandbox.metadata.name} timer error:`, error);
        }
      }, delay);

      sandbox.pendingTimers.add(timerId);
      return timerId;
    };
  }

  /**
   * Create sandboxed setInterval
   */
  private createSandboxedSetInterval(): (callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => ReturnType<typeof setInterval> {
    const sandbox = this;

    return function sandboxedSetInterval(
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): ReturnType<typeof setInterval> {
      const timerId = setInterval(() => {
        try {
          callback(...args);
        } catch (error) {
          sandbox.config.logger?.error(`Plugin ${sandbox.metadata.name} interval error:`, error);
        }
      }, delay);

      sandbox.pendingTimers.add(timerId);
      return timerId;
    };
  }

  /**
   * Create sandboxed clearTimeout
   */
  private createSandboxedClearTimeout(): (timerId: ReturnType<typeof setTimeout>) => void {
    const sandbox = this;

    return function sandboxedClearTimeout(timerId: ReturnType<typeof setTimeout>): void {
      sandbox.pendingTimers.delete(timerId);
      clearTimeout(timerId);
    };
  }

  /**
   * Create sandboxed clearInterval
   */
  private createSandboxedClearInterval(): (timerId: ReturnType<typeof setInterval>) => void {
    const sandbox = this;

    return function sandboxedClearInterval(timerId: ReturnType<typeof setInterval>): void {
      sandbox.pendingTimers.delete(timerId);
      clearInterval(timerId);
    };
  }

  /**
   * Create sandboxed console
   */
  private createSandboxedConsole(): Console {
    const sandbox = this;
    const prefix = `[Plugin: ${this.metadata.name}]`;

    const createLogger = (level: LogEntry['level']) => {
      return (...args: unknown[]): void => {
        const entry: LogEntry = {
          level,
          message: args.map(String).join(' '),
          args,
          timestamp: Date.now(),
        };
        sandbox.logs.push(entry);

        if (sandbox.config.captureConsole) {
          // Also log to real console with prefix
          const realConsole = console;
          switch (level) {
            case 'debug':
              realConsole.debug(prefix, ...args);
              break;
            case 'info':
              realConsole.info(prefix, ...args);
              break;
            case 'warn':
              realConsole.warn(prefix, ...args);
              break;
            case 'error':
              realConsole.error(prefix, ...args);
              break;
          }
        }
      };
    };

    return {
      debug: createLogger('debug'),
      info: createLogger('info'),
      log: createLogger('info'),
      warn: createLogger('warn'),
      error: createLogger('error'),
      // Stub out other console methods
      assert: () => {},
      clear: () => {},
      count: () => {},
      countReset: () => {},
      dir: () => {},
      dirxml: () => {},
      group: () => {},
      groupCollapsed: () => {},
      groupEnd: () => {},
      table: () => {},
      time: () => {},
      timeEnd: () => {},
      timeLog: () => {},
      timeStamp: () => {},
      trace: () => {},
      profile: () => {},
      profileEnd: () => {},
    } as Console;
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): void {
    const now = Date.now();
    if (now - this.lastApiCallReset > 1000) {
      this.apiCallCount = 0;
      this.lastApiCallReset = now;
    }

    this.apiCallCount++;
    if (this.apiCallCount > this.config.rateLimit) {
      throw new Error(`Rate limit exceeded: ${this.config.rateLimit} calls per second`);
    }
  }

  /**
   * Get captured logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear captured logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Cleanup all pending timers
   */
  cleanup(): void {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer as ReturnType<typeof setTimeout>);
      clearInterval(timer as ReturnType<typeof setInterval>);
    }
    this.pendingTimers.clear();
    this.logs = [];
  }

  /**
   * Get sandbox stats
   */
  getStats(): {
    permissions: Permission[];
    pendingTimers: number;
    logCount: number;
    apiCallsThisSecond: number;
  } {
    return {
      permissions: this.getPermissions(),
      pendingTimers: this.pendingTimers.size,
      logCount: this.logs.length,
      apiCallsThisSecond: this.apiCallCount,
    };
  }

  /**
   * Wrap a function to run in sandbox
   */
  wrap<T extends (...args: unknown[]) => unknown>(
    fn: T
  ): (...args: Parameters<T>) => Promise<ExecutionResult<ReturnType<T>>> {
    return async (...args: Parameters<T>) => {
      return this.execute(() => fn(...args) as ReturnType<T>);
    };
  }
}
