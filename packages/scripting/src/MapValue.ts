/**
 * MapValue - Key-Value Store
 *
 * Represents a string-keyed map with get, set, delete, and iteration operations.
 * Supports serialization for save/restore and history tracking.
 *
 * Reference: whisker-core/lib/whisker/core/game_state.lua (lines 469-576)
 */

export interface MapValueConfig {
  trackHistory?: boolean;
  maxHistoryLength?: number;
}

export interface MapHistoryEntry {
  action: 'set' | 'delete' | 'clear';
  key?: string;
  value?: unknown;
  previousValue?: unknown;
  timestamp: number;
  previousSize: number;
}

export interface MapValueState {
  name: string;
  entries: Record<string, unknown>;
  history?: MapHistoryEntry[];
}

const DEFAULT_CONFIG: MapValueConfig = {
  trackHistory: false,
  maxHistoryLength: 100,
};

export class MapValue {
  private _name: string;
  private _entries: Map<string, unknown>;
  private _history: MapHistoryEntry[];
  private _config: MapValueConfig;
  private _locked: boolean;

  constructor(
    name: string,
    initialEntries: Record<string, unknown> = {},
    config: Partial<MapValueConfig> = {}
  ) {
    this._name = name;
    this._entries = new Map(Object.entries(initialEntries));
    this._history = [];
    this._locked = false;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Properties
  // ==========================================================================

  get name(): string {
    return this._name;
  }

  /**
   * Get the map name (method form for compatibility)
   */
  getName(): string {
    return this._name;
  }

  /**
   * Get the map size (number of entries)
   */
  get size(): number {
    return this._entries.size;
  }

  // ==========================================================================
  // Entry Access
  // ==========================================================================

  /**
   * Get value by key
   */
  get(key: string): unknown {
    return this._entries.get(key);
  }

  /**
   * Set value by key
   */
  set(key: string, value: unknown): boolean {
    if (this._locked) {
      console.warn(`MapValue '${this._name}' is locked`);
      return false;
    }

    const previousSize = this._entries.size;
    const previousValue = this._entries.get(key);
    this._entries.set(key, value);

    this._recordHistory('set', key, value, previousValue, previousSize);
    return true;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this._entries.has(key);
  }

  /**
   * Delete key from map
   */
  delete(key: string): unknown {
    if (this._locked) {
      console.warn(`MapValue '${this._name}' is locked`);
      return undefined;
    }

    if (!this._entries.has(key)) {
      return undefined;
    }

    const previousSize = this._entries.size;
    const previousValue = this._entries.get(key);
    this._entries.delete(key);

    this._recordHistory('delete', key, undefined, previousValue, previousSize);
    return previousValue;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this._locked) {
      console.warn(`MapValue '${this._name}' is locked`);
      return;
    }

    const previousSize = this._entries.size;
    this._entries.clear();
    this._recordHistory('clear', undefined, undefined, undefined, previousSize);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this._entries.keys());
  }

  /**
   * Get all values
   */
  values(): unknown[] {
    return Array.from(this._entries.values());
  }

  /**
   * Get all entries as [key, value] pairs
   */
  entries(): [string, unknown][] {
    return Array.from(this._entries.entries());
  }

  /**
   * Check if map is empty
   */
  isEmpty(): boolean {
    return this._entries.size === 0;
  }

  /**
   * Get all entries as object
   */
  toObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this._entries) {
      obj[key] = value;
    }
    return obj;
  }

  // ==========================================================================
  // Iteration
  // ==========================================================================

  /**
   * Iterate over entries
   */
  forEach(callback: (value: unknown, key: string) => void): void {
    this._entries.forEach(callback);
  }

  /**
   * Map entries to new values
   */
  map<T>(callback: (value: unknown, key: string) => T): T[] {
    const results: T[] = [];
    this._entries.forEach((value, key) => {
      results.push(callback(value, key));
    });
    return results;
  }

  /**
   * Filter entries
   */
  filter(predicate: (value: unknown, key: string) => boolean): [string, unknown][] {
    const results: [string, unknown][] = [];
    this._entries.forEach((value, key) => {
      if (predicate(value, key)) {
        results.push([key, value]);
      }
    });
    return results;
  }

  /**
   * Find first matching entry
   */
  find(predicate: (value: unknown, key: string) => boolean): [string, unknown] | undefined {
    for (const [key, value] of this._entries) {
      if (predicate(value, key)) {
        return [key, value];
      }
    }
    return undefined;
  }

  // ==========================================================================
  // Thread Safety
  // ==========================================================================

  /**
   * Lock the map (prevent modifications)
   */
  lock(): void {
    this._locked = true;
  }

  /**
   * Unlock the map
   */
  unlock(): void {
    this._locked = false;
  }

  /**
   * Check if locked
   */
  isLocked(): boolean {
    return this._locked;
  }

  /**
   * Execute a function with the map locked
   */
  withLock<T>(fn: () => T): T {
    const wasLocked = this._locked;
    this._locked = true;
    try {
      return fn();
    } finally {
      this._locked = wasLocked;
    }
  }

  // ==========================================================================
  // History
  // ==========================================================================

  /**
   * Get full history
   */
  getHistory(): MapHistoryEntry[] {
    return [...this._history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this._history = [];
  }

  private _recordHistory(
    action: MapHistoryEntry['action'],
    key: string | undefined,
    value: unknown,
    previousValue: unknown,
    previousSize: number
  ): void {
    if (!this._config.trackHistory) {
      return;
    }

    this._history.push({
      action,
      key,
      value,
      previousValue,
      timestamp: Date.now(),
      previousSize,
    });

    // Trim history if exceeds max length
    if (
      this._config.maxHistoryLength &&
      this._history.length > this._config.maxHistoryLength
    ) {
      this._history = this._history.slice(-this._config.maxHistoryLength);
    }
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): MapValueState {
    return {
      name: this._name,
      entries: this.toObject(),
      history: this._config.trackHistory ? [...this._history] : undefined,
    };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: MapValueState): void {
    if (state.name !== this._name) {
      console.warn(
        `State name mismatch: expected '${this._name}', got '${state.name}'`
      );
    }

    this._entries = new Map(Object.entries(state.entries));

    if (state.history) {
      this._history = [...state.history];
    }
  }

  /**
   * Create a copy of this map
   */
  copy(includeHistory: boolean = false): MapValue {
    const copy = new MapValue(this._name, this.toObject(), {
      ...this._config,
    });

    if (includeHistory && this._config.trackHistory) {
      copy._history = [...this._history];
    }

    return copy;
  }

  /**
   * String representation
   */
  toString(): string {
    const entries = this.entries()
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    const suffix = this._entries.size > 3 ? ', ...' : '';
    return `MapValue(${this._name}: {${entries}${suffix}})`;
  }
}

// =============================================================================
// MapRegistry - Manager for multiple maps
// =============================================================================

export interface MapRegistryState {
  maps: Record<string, MapValueState>;
}

export class MapRegistry {
  private _maps: Map<string, MapValue> = new Map();
  private _defaultConfig: MapValueConfig;

  constructor(defaultConfig: Partial<MapValueConfig> = {}) {
    this._defaultConfig = { ...DEFAULT_CONFIG, ...defaultConfig };
  }

  /**
   * Define a new map
   */
  define(
    name: string,
    initialEntries: Record<string, unknown> = {},
    config?: Partial<MapValueConfig>
  ): MapValue {
    const map = new MapValue(name, initialEntries, {
      ...this._defaultConfig,
      ...config,
    });
    this._maps.set(name, map);
    return map;
  }

  /**
   * Get a map by name
   */
  get(name: string): MapValue | undefined {
    return this._maps.get(name);
  }

  /**
   * Check if a map exists
   */
  has(name: string): boolean {
    return this._maps.has(name);
  }

  /**
   * Remove a map
   */
  remove(name: string): boolean {
    return this._maps.delete(name);
  }

  /**
   * Get all map names
   */
  getNames(): string[] {
    return Array.from(this._maps.keys());
  }

  /**
   * Get all maps
   */
  getAll(): MapValue[] {
    return Array.from(this._maps.values());
  }

  /**
   * Clear all maps
   */
  clear(): void {
    this._maps.clear();
  }

  // ==========================================================================
  // Convenience Accessors
  // ==========================================================================

  /**
   * Get value from map
   */
  getValue(mapName: string, key: string): unknown {
    const map = this._maps.get(mapName);
    return map?.get(key);
  }

  /**
   * Set value in map
   */
  setValue(mapName: string, key: string, value: unknown): boolean {
    const map = this._maps.get(mapName);
    return map?.set(key, value) ?? false;
  }

  /**
   * Check if map has key
   */
  hasKey(mapName: string, key: string): boolean {
    const map = this._maps.get(mapName);
    return map?.has(key) ?? false;
  }

  /**
   * Delete key from map
   */
  deleteKey(mapName: string, key: string): unknown {
    const map = this._maps.get(mapName);
    return map?.delete(key);
  }

  /**
   * Get map size
   */
  getSize(mapName: string): number {
    const map = this._maps.get(mapName);
    return map?.size ?? 0;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): MapRegistryState {
    const maps: Record<string, MapValueState> = {};
    for (const [name, map] of this._maps) {
      maps[name] = map.getState();
    }
    return { maps };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: MapRegistryState): void {
    for (const [name, mapState] of Object.entries(state.maps)) {
      let map = this._maps.get(name);
      if (!map) {
        map = new MapValue(name, {}, this._defaultConfig);
        this._maps.set(name, map);
      }
      map.restoreState(mapState);
    }
  }

  /**
   * Clone this registry
   */
  clone(includeHistory: boolean = false): MapRegistry {
    const cloned = new MapRegistry({ ...this._defaultConfig });
    for (const [name, map] of this._maps) {
      cloned._maps.set(name, map.copy(includeHistory));
    }
    return cloned;
  }
}
