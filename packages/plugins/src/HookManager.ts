/**
 * Hook Manager
 * Central registry for hook handlers with priority-based execution
 */

import { HookTypes } from './HookTypes';
import type { HookHandler, HookEntry, HookResult, Logger } from './types';

/**
 * Default hook priority
 */
export const DEFAULT_PRIORITY = 50;

/**
 * Priority range
 */
export const MIN_PRIORITY = 0;
export const MAX_PRIORITY = 100;

/**
 * Hook scope for temporary hooks
 */
export interface HookScope {
  register(event: string, callback: HookHandler, priority?: number): string;
  close(): number;
  getHooks(): string[];
}

/**
 * HookManager class
 */
export class HookManager {
  private hooks: Map<string, HookEntry[]> = new Map();
  private nextId = 1;
  private idToEvent: Map<string, string> = new Map();
  private paused: Set<string> = new Set();
  private globalPause = false;
  private log?: Logger;

  constructor(logger?: Logger) {
    this.log = logger;
  }

  /**
   * Factory method
   */
  static create(logger?: Logger): HookManager {
    return new HookManager(logger);
  }

  /**
   * Generate unique hook ID
   */
  private generateId(): string {
    const id = `hook_${this.nextId}`;
    this.nextId++;
    return id;
  }

  /**
   * Register a hook handler
   */
  registerHook(
    event: string,
    callback: HookHandler,
    priority?: number,
    pluginName?: string
  ): string {
    if (typeof event !== 'string') {
      throw new Error('Event must be string');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback must be function');
    }

    const normalizedPriority = Math.max(
      MIN_PRIORITY,
      Math.min(MAX_PRIORITY, priority ?? DEFAULT_PRIORITY)
    );

    // Initialize event bucket if needed
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    // Generate hook ID
    const hookId = this.generateId();

    // Create hook entry
    const entry: HookEntry = {
      id: hookId,
      callback,
      priority: normalizedPriority,
      pluginName,
      registeredAt: Date.now(),
    };

    // Insert maintaining priority order (lower priority runs first)
    const hooks = this.hooks.get(event)!;
    let inserted = false;
    for (let i = 0; i < hooks.length; i++) {
      if (normalizedPriority < hooks[i].priority) {
        hooks.splice(i, 0, entry);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      hooks.push(entry);
    }

    // Track for unregistration
    this.idToEvent.set(hookId, event);

    this.log?.debug(`Registered hook: ${event} (${hookId})`, { pluginName, priority: normalizedPriority });

    return hookId;
  }

  /**
   * Unregister a hook handler
   */
  unregisterHook(hookId: string): boolean {
    const event = this.idToEvent.get(hookId);
    if (!event) {
      return false;
    }

    const hooks = this.hooks.get(event);
    if (!hooks) {
      return false;
    }

    for (let i = 0; i < hooks.length; i++) {
      if (hooks[i].id === hookId) {
        hooks.splice(i, 1);
        this.idToEvent.delete(hookId);
        this.log?.debug(`Unregistered hook: ${event} (${hookId})`);
        return true;
      }
    }

    return false;
  }

  /**
   * Trigger an observer hook (side effects only)
   */
  trigger(event: string, ...args: unknown[]): HookResult[] {
    if (this.globalPause || this.paused.has(event)) {
      return [];
    }

    const hooks = this.hooks.get(event);
    if (!hooks || hooks.length === 0) {
      return [];
    }

    const results: HookResult[] = [];

    for (const entry of hooks) {
      try {
        const result = entry.callback(...args);
        results.push({
          success: true,
          result,
          hookId: entry.id,
          pluginName: entry.pluginName,
        });
      } catch (error) {
        results.push({
          success: false,
          error: String(error),
          hookId: entry.id,
          pluginName: entry.pluginName,
        });
        this.log?.warn(`Hook error: ${event} (${entry.id})`, error);
      }
    }

    return results;
  }

  /**
   * Trigger a transform hook (returns modified value)
   */
  transform<T>(event: string, initialValue: T, ...args: unknown[]): { value: T; results: HookResult[] } {
    if (this.globalPause || this.paused.has(event)) {
      return { value: initialValue, results: [] };
    }

    const hooks = this.hooks.get(event);
    if (!hooks || hooks.length === 0) {
      return { value: initialValue, results: [] };
    }

    let value = initialValue;
    const results: HookResult[] = [];

    for (const entry of hooks) {
      try {
        const result = entry.callback(value, ...args);
        results.push({
          success: true,
          result,
          hookId: entry.id,
          pluginName: entry.pluginName,
        });

        if (result !== undefined) {
          value = result as T;  // Use transformed value
        }
      } catch (error) {
        results.push({
          success: false,
          error: String(error),
          hookId: entry.id,
          pluginName: entry.pluginName,
        });
        this.log?.warn(`Hook error: ${event} (${entry.id})`, error);
      }
    }

    return { value, results };
  }

  /**
   * Smart emit based on hook type
   * Automatically calls trigger() for observer hooks and transform() for transform hooks
   */
  emit<T = unknown>(event: string, ...args: unknown[]): { value: T | undefined; results: HookResult[] } {
    const mode = HookTypes.getMode(event);

    if (mode === HookTypes.MODE.TRANSFORM) {
      const [initialValue, ...restArgs] = args;
      const { value, results } = this.transform(event, initialValue as T, ...restArgs);
      return { value, results };
    } else {
      // Observer mode (including unknown events treated as observer)
      const results = this.trigger(event, ...args);
      return { value: undefined, results };
    }
  }

  /**
   * Get registered hooks for an event
   */
  getHooks(event: string): HookEntry[] {
    return this.hooks.get(event) || [];
  }

  /**
   * Get number of registered hooks for an event
   */
  getHookCount(event: string): number {
    const hooks = this.hooks.get(event);
    return hooks ? hooks.length : 0;
  }

  /**
   * Get all events with registered hooks
   */
  getRegisteredEvents(): string[] {
    const events: string[] = [];
    for (const [event, hooks] of this.hooks.entries()) {
      if (hooks.length > 0) {
        events.push(event);
      }
    }
    return events.sort();
  }

  /**
   * Get total number of registered hooks
   */
  getTotalHookCount(): number {
    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }

  /**
   * Clear all hooks for an event
   */
  clearEvent(event: string): number {
    const hooks = this.hooks.get(event);
    if (!hooks) {
      return 0;
    }

    const count = hooks.length;

    // Remove ID mappings
    for (const entry of hooks) {
      this.idToEvent.delete(entry.id);
    }

    this.hooks.delete(event);

    return count;
  }

  /**
   * Clear all registered hooks
   */
  clearAll(): number {
    const total = this.getTotalHookCount();
    this.hooks.clear();
    this.idToEvent.clear();
    return total;
  }

  /**
   * Clear all hooks for a specific plugin
   */
  clearPluginHooks(pluginName: string): number {
    let removed = 0;

    for (const [event, hooks] of this.hooks.entries()) {
      let i = 0;
      while (i < hooks.length) {
        if (hooks[i].pluginName === pluginName) {
          this.idToEvent.delete(hooks[i].id);
          hooks.splice(i, 1);
          removed++;
        } else {
          i++;
        }
      }
    }

    return removed;
  }

  /**
   * Pause hook execution for an event
   */
  pauseEvent(event: string): void {
    this.paused.add(event);
  }

  /**
   * Resume hook execution for an event
   */
  resumeEvent(event: string): void {
    this.paused.delete(event);
  }

  /**
   * Check if event is paused
   */
  isEventPaused(event: string): boolean {
    return this.paused.has(event);
  }

  /**
   * Pause all hook execution globally
   */
  pauseAll(): void {
    this.globalPause = true;
  }

  /**
   * Resume all hook execution globally
   */
  resumeAll(): void {
    this.globalPause = false;
  }

  /**
   * Check if hooks are globally paused
   */
  isGloballyPaused(): boolean {
    return this.globalPause;
  }

  /**
   * Get hooks for a specific plugin
   */
  getPluginHooks(pluginName: string): Array<{ event: string; hook: HookEntry }> {
    const pluginHooks: Array<{ event: string; hook: HookEntry }> = [];

    for (const [event, hooks] of this.hooks.entries()) {
      for (const entry of hooks) {
        if (entry.pluginName === pluginName) {
          pluginHooks.push({ event, hook: entry });
        }
      }
    }

    return pluginHooks;
  }

  /**
   * Register static hooks from plugin definition
   */
  registerPluginHooks(
    pluginName: string,
    hooks: Record<string, HookHandler>,
    priority?: number
  ): string[] {
    const hookIds: string[] = [];

    if (!hooks) {
      return hookIds;
    }

    for (const [event, callback] of Object.entries(hooks)) {
      if (typeof callback === 'function') {
        const id = this.registerHook(event, callback, priority, pluginName);
        hookIds.push(id);
      }
    }

    return hookIds;
  }

  /**
   * Create a scoped context for temporary hooks
   * Hooks registered in the scope are automatically unregistered when scope closes
   */
  createScope(): HookScope {
    const manager = this;
    const scopeHooks: string[] = [];

    return {
      register(event: string, callback: HookHandler, priority?: number): string {
        const id = manager.registerHook(event, callback, priority, 'scope');
        scopeHooks.push(id);
        return id;
      },

      close(): number {
        let count = 0;
        for (const id of scopeHooks) {
          if (manager.unregisterHook(id)) {
            count++;
          }
        }
        scopeHooks.length = 0;
        return count;
      },

      getHooks(): string[] {
        return [...scopeHooks];
      },
    };
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.hooks.clear();
    this.idToEvent.clear();
    this.paused.clear();
    this.globalPause = false;
    this.nextId = 1;
  }
}

export default HookManager;
