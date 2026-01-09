/**
 * Whisker API
 *
 * Implements the whisker.* namespace for Lua scripting.
 * See WLS Specification Chapter 7: Lua API
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Passage object as exposed to Lua
 */
export interface WhiskerPassage {
  id: string;
  content: string;
  tags: string[];
  metadata: Record<string, string>;
}

/**
 * Choice object as exposed to Lua
 */
export interface WhiskerChoice {
  text: string;
  target: string | null;
  type: 'once' | 'sticky';
  index: number;
}

/**
 * Object type for Whisker values (for recursive type support)
 */
export interface WhiskerObject {
  [key: string]: WhiskerValue;
}

/**
 * Variable value types supported by whisker.state
 */
export type WhiskerValue = string | number | boolean | null | WhiskerValue[] | WhiskerObject;

// ============================================================================
//  Collection Types
// ============================================================================

/**
 * LIST type - enumerated set with active/inactive states
 */
export interface WLSList {
  values: string[];           // All possible values
  active: Set<string>;        // Currently active values
}

/**
 * ARRAY type - 0-indexed collection
 */
export type WLSArray = WhiskerValue[];

/**
 * MAP type - key-value object
 */
export type WLSMap = Record<string, WhiskerValue>;

/**
 * Runtime context interface
 * The hosting application must provide this to connect the API to game state
 */
export interface WhiskerRuntimeContext {
  // State management
  getVariable(key: string): WhiskerValue | undefined;
  setVariable(key: string, value: WhiskerValue): void;
  hasVariable(key: string): boolean;
  deleteVariable(key: string): void;
  getAllVariables(): Record<string, WhiskerValue>;
  resetVariables(): void;

  // ============================================
  //  LIST Operations
  // ============================================
  getList(name: string): WLSList | undefined;
  hasList(name: string): boolean;
  getListValues(name: string): string[] | undefined;
  getListActive(name: string): string[];
  listContains(name: string, value: string): boolean;
  listAdd(name: string, value: string): boolean;
  listRemove(name: string, value: string): boolean;
  listToggle(name: string, value: string): boolean;
  listCount(name: string): number;
  setList(name: string, list: WLSList): void;

  // ============================================
  //  ARRAY Operations
  // ============================================
  getArray(name: string): WLSArray | undefined;
  hasArray(name: string): boolean;
  arrayGet(name: string, index: number): WhiskerValue | undefined;
  arraySet(name: string, index: number, value: WhiskerValue): boolean;
  arrayLength(name: string): number;
  arrayPush(name: string, value: WhiskerValue): number;
  arrayPop(name: string): WhiskerValue | undefined;
  arrayInsert(name: string, index: number, value: WhiskerValue): void;
  arrayRemove(name: string, index: number): WhiskerValue | undefined;
  arrayContains(name: string, value: WhiskerValue): boolean;
  arrayIndexOf(name: string, value: WhiskerValue): number;
  setArray(name: string, array: WLSArray): void;

  // ============================================
  //  MAP Operations
  // ============================================
  getMap(name: string): WLSMap | undefined;
  hasMap(name: string): boolean;
  mapGet(name: string, key: string): WhiskerValue | undefined;
  mapSet(name: string, key: string, value: WhiskerValue): void;
  mapHas(name: string, key: string): boolean;
  mapDelete(name: string, key: string): WhiskerValue | undefined;
  mapKeys(name: string): string[];
  mapValues(name: string): WhiskerValue[];
  mapSize(name: string): number;
  setMap(name: string, map: WLSMap): void;

  // Passage management
  getCurrentPassage(): WhiskerPassage | null;
  getPassage(id: string): WhiskerPassage | null;
  goToPassage(id: string): void;
  passageExists(id: string): boolean;
  getAllPassages(): Record<string, WhiskerPassage>;
  getPassagesByTag(tag: string): WhiskerPassage[];

  // History management
  goBack(): boolean;
  canGoBack(): boolean;
  getHistory(): string[];
  getHistoryCount(): number;
  historyContains(id: string): boolean;
  clearHistory(): void;

  // Choice management
  getAvailableChoices(): WhiskerChoice[];
  selectChoice(index: number): void;
  getChoiceCount(): number;

  // Visit tracking
  getVisitCount(passageId?: string): number;

  // Debug output
  print(...args: unknown[]): void;
}

// ============================================================================
// Default In-Memory Context (for testing/preview)
// ============================================================================

/**
 * Default in-memory implementation of WhiskerRuntimeContext
 * Used for testing and preview mode
 */
export class InMemoryRuntimeContext implements WhiskerRuntimeContext {
  private variables: Map<string, WhiskerValue> = new Map();
  private passages: Map<string, WhiskerPassage> = new Map();
  private currentPassageId: string | null = null;
  private history: string[] = [];
  private visitCounts: Map<string, number> = new Map();
  private choices: WhiskerChoice[] = [];
  private output: string[] = [];

  //  Collection storage
  private lists: Map<string, WLSList> = new Map();
  private arrays: Map<string, WLSArray> = new Map();
  private maps: Map<string, WLSMap> = new Map();

  // State management
  getVariable(key: string): WhiskerValue | undefined {
    return this.variables.get(key);
  }

  setVariable(key: string, value: WhiskerValue): void {
    this.variables.set(key, value);
  }

  hasVariable(key: string): boolean {
    return this.variables.has(key);
  }

  deleteVariable(key: string): void {
    this.variables.delete(key);
  }

  getAllVariables(): Record<string, WhiskerValue> {
    const result: Record<string, WhiskerValue> = {};
    this.variables.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  resetVariables(): void {
    this.variables.clear();
  }

  // ============================================
  //  LIST Operations
  // ============================================

  getList(name: string): WLSList | undefined {
    return this.lists.get(name);
  }

  hasList(name: string): boolean {
    return this.lists.has(name);
  }

  getListValues(name: string): string[] | undefined {
    const list = this.lists.get(name);
    return list?.values;
  }

  getListActive(name: string): string[] {
    const list = this.lists.get(name);
    if (!list) return [];
    return Array.from(list.active);
  }

  listContains(name: string, value: string): boolean {
    const list = this.lists.get(name);
    if (!list) return false;
    return list.active.has(value);
  }

  listAdd(name: string, value: string): boolean {
    const list = this.lists.get(name);
    if (!list) return false;
    // Verify value is in possible values
    if (!list.values.includes(value)) return false;
    list.active.add(value);
    return true;
  }

  listRemove(name: string, value: string): boolean {
    const list = this.lists.get(name);
    if (!list) return false;
    list.active.delete(value);
    return true;
  }

  listToggle(name: string, value: string): boolean {
    const list = this.lists.get(name);
    if (!list) return false;
    if (list.active.has(value)) {
      list.active.delete(value);
      return false;
    } else {
      list.active.add(value);
      return true;
    }
  }

  listCount(name: string): number {
    const list = this.lists.get(name);
    if (!list) return 0;
    return list.active.size;
  }

  setList(name: string, list: WLSList): void {
    this.lists.set(name, list);
  }

  // ============================================
  //  ARRAY Operations
  // ============================================

  getArray(name: string): WLSArray | undefined {
    return this.arrays.get(name);
  }

  hasArray(name: string): boolean {
    return this.arrays.has(name);
  }

  arrayGet(name: string, index: number): WhiskerValue | undefined {
    const arr = this.arrays.get(name);
    if (!arr) return undefined;
    return arr[index];
  }

  arraySet(name: string, index: number, value: WhiskerValue): boolean {
    const arr = this.arrays.get(name);
    if (!arr) return false;
    arr[index] = value;
    return true;
  }

  arrayLength(name: string): number {
    const arr = this.arrays.get(name);
    if (!arr) return 0;
    return arr.length;
  }

  arrayPush(name: string, value: WhiskerValue): number {
    const arr = this.arrays.get(name);
    if (!arr) return 0;
    arr.push(value);
    return arr.length;
  }

  arrayPop(name: string): WhiskerValue | undefined {
    const arr = this.arrays.get(name);
    if (!arr || arr.length === 0) return undefined;
    return arr.pop();
  }

  arrayInsert(name: string, index: number, value: WhiskerValue): void {
    const arr = this.arrays.get(name);
    if (!arr) return;
    arr.splice(index, 0, value);
  }

  arrayRemove(name: string, index: number): WhiskerValue | undefined {
    const arr = this.arrays.get(name);
    if (!arr) return undefined;
    const removed = arr.splice(index, 1);
    return removed[0];
  }

  arrayContains(name: string, value: WhiskerValue): boolean {
    const arr = this.arrays.get(name);
    if (!arr) return false;
    return arr.includes(value);
  }

  arrayIndexOf(name: string, value: WhiskerValue): number {
    const arr = this.arrays.get(name);
    if (!arr) return -1;
    return arr.indexOf(value);
  }

  setArray(name: string, array: WLSArray): void {
    this.arrays.set(name, array);
  }

  // ============================================
  //  MAP Operations
  // ============================================

  getMap(name: string): WLSMap | undefined {
    return this.maps.get(name);
  }

  hasMap(name: string): boolean {
    return this.maps.has(name);
  }

  mapGet(name: string, key: string): WhiskerValue | undefined {
    const map = this.maps.get(name);
    if (!map) return undefined;
    return map[key];
  }

  mapSet(name: string, key: string, value: WhiskerValue): void {
    const map = this.maps.get(name);
    if (!map) return;
    map[key] = value;
  }

  mapHas(name: string, key: string): boolean {
    const map = this.maps.get(name);
    if (!map) return false;
    return key in map;
  }

  mapDelete(name: string, key: string): WhiskerValue | undefined {
    const map = this.maps.get(name);
    if (!map) return undefined;
    const old = map[key];
    delete map[key];
    return old;
  }

  mapKeys(name: string): string[] {
    const map = this.maps.get(name);
    if (!map) return [];
    return Object.keys(map);
  }

  mapValues(name: string): WhiskerValue[] {
    const map = this.maps.get(name);
    if (!map) return [];
    return Object.values(map);
  }

  mapSize(name: string): number {
    const map = this.maps.get(name);
    if (!map) return 0;
    return Object.keys(map).length;
  }

  setMap(name: string, map: WLSMap): void {
    this.maps.set(name, map);
  }

  // Passage management
  getCurrentPassage(): WhiskerPassage | null {
    if (!this.currentPassageId) return null;
    return this.passages.get(this.currentPassageId) || null;
  }

  getPassage(id: string): WhiskerPassage | null {
    return this.passages.get(id) || null;
  }

  goToPassage(id: string): void {
    if (!this.passages.has(id)) {
      throw new Error(`Passage not found: ${id}`);
    }
    if (this.currentPassageId) {
      this.history.push(this.currentPassageId);
    }
    this.currentPassageId = id;
    // Increment visit count
    const count = this.visitCounts.get(id) || 0;
    this.visitCounts.set(id, count + 1);
  }

  passageExists(id: string): boolean {
    return this.passages.has(id);
  }

  getAllPassages(): Record<string, WhiskerPassage> {
    const result: Record<string, WhiskerPassage> = {};
    this.passages.forEach((passage, id) => {
      result[id] = passage;
    });
    return result;
  }

  getPassagesByTag(tag: string): WhiskerPassage[] {
    const result: WhiskerPassage[] = [];
    this.passages.forEach((passage) => {
      if (passage.tags.includes(tag)) {
        result.push(passage);
      }
    });
    return result;
  }

  // History management
  goBack(): boolean {
    if (this.history.length === 0) return false;
    const previousId = this.history.pop()!;
    this.currentPassageId = previousId;
    return true;
  }

  canGoBack(): boolean {
    return this.history.length > 0;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  historyContains(id: string): boolean {
    return this.history.includes(id);
  }

  clearHistory(): void {
    this.history = [];
  }

  // Choice management
  getAvailableChoices(): WhiskerChoice[] {
    return [...this.choices];
  }

  selectChoice(index: number): void {
    if (index < 1 || index > this.choices.length) {
      throw new Error(`Invalid choice index: ${index}`);
    }
    const choice = this.choices[index - 1];
    if (choice.target) {
      this.goToPassage(choice.target);
    }
  }

  getChoiceCount(): number {
    return this.choices.length;
  }

  // Visit tracking
  getVisitCount(passageId?: string): number {
    const id = passageId || this.currentPassageId;
    if (!id) return 0;
    return this.visitCounts.get(id) || 0;
  }

  // Debug output
  print(...args: unknown[]): void {
    const message = args.map(arg => String(arg)).join('\t');
    this.output.push(message);
  }

  // Test helpers
  addPassage(passage: WhiskerPassage): void {
    this.passages.set(passage.id, passage);
  }

  setCurrentPassage(id: string): void {
    this.currentPassageId = id;
    // Increment visit count
    const count = this.visitCounts.get(id) || 0;
    this.visitCounts.set(id, count + 1);
  }

  setChoices(choices: WhiskerChoice[]): void {
    this.choices = choices;
  }

  getOutput(): string[] {
    return [...this.output];
  }

  clearOutput(): void {
    this.output = [];
  }
}

// ============================================================================
// Whisker State API
// ============================================================================

/**
 * whisker.state namespace
 */
export class WhiskerStateApi {
  constructor(private context: WhiskerRuntimeContext) {}

  /**
   * Get a variable value
   * @param key Variable name (without $ prefix)
   * @returns Variable value or nil
   */
  get(key: string): WhiskerValue | null {
    if (typeof key !== 'string') {
      throw new Error('whisker.state.get() requires a string argument');
    }
    const value = this.context.getVariable(key);
    return value === undefined ? null : value;
  }

  /**
   * Set a variable value
   * @param key Variable name (without $ prefix)
   * @param value Value to set
   */
  set(key: string, value: WhiskerValue): void {
    if (typeof key !== 'string') {
      throw new Error('whisker.state.set() requires a string key');
    }
    this.context.setVariable(key, value);
  }

  /**
   * Check if a variable exists
   * @param key Variable name
   * @returns true if variable exists
   */
  has(key: string): boolean {
    if (typeof key !== 'string') {
      throw new Error('whisker.state.has() requires a string argument');
    }
    return this.context.hasVariable(key);
  }

  /**
   * Delete a variable
   * @param key Variable name
   */
  delete(key: string): void {
    if (typeof key !== 'string') {
      throw new Error('whisker.state.delete() requires a string argument');
    }
    this.context.deleteVariable(key);
  }

  /**
   * Get all variables as a table
   * @returns Copy of all variables
   */
  all(): Record<string, WhiskerValue> {
    return this.context.getAllVariables();
  }

  /**
   * Clear all variables
   */
  reset(): void {
    this.context.resetVariables();
  }

  // ============================================
  //  LIST Operations
  // ============================================

  /** Get list by name */
  getList(name: string): WLSList | null {
    return this.context.getList(name) ?? null;
  }

  /** Check if list exists */
  hasList(name: string): boolean {
    return this.context.hasList(name);
  }

  /** Get possible values in a list */
  listValues(name: string): string[] | null {
    return this.context.getListValues(name) ?? null;
  }

  /** Get active values in a list */
  listActive(name: string): string[] {
    return this.context.getListActive(name);
  }

  /** Check if value is active in list */
  listContains(name: string, value: string): boolean {
    return this.context.listContains(name, value);
  }

  /** Add/activate value in list */
  listAdd(name: string, value: string): boolean {
    return this.context.listAdd(name, value);
  }

  /** Remove/deactivate value from list */
  listRemove(name: string, value: string): boolean {
    return this.context.listRemove(name, value);
  }

  /** Toggle value in list */
  listToggle(name: string, value: string): boolean {
    return this.context.listToggle(name, value);
  }

  /** Get count of active values */
  listCount(name: string): number {
    return this.context.listCount(name);
  }

  // ============================================
  //  ARRAY Operations
  // ============================================

  /** Get array by name */
  getArray(name: string): WLSArray | null {
    return this.context.getArray(name) ?? null;
  }

  /** Check if array exists */
  hasArray(name: string): boolean {
    return this.context.hasArray(name);
  }

  /** Get array element (0-based index) */
  arrayGet(name: string, index: number): WhiskerValue | null {
    return this.context.arrayGet(name, index) ?? null;
  }

  /** Set array element (0-based index) */
  arraySet(name: string, index: number, value: WhiskerValue): boolean {
    return this.context.arraySet(name, index, value);
  }

  /** Get array length */
  arrayLength(name: string): number {
    return this.context.arrayLength(name);
  }

  /** Append to array */
  arrayPush(name: string, value: WhiskerValue): number {
    return this.context.arrayPush(name, value);
  }

  /** Pop from array */
  arrayPop(name: string): WhiskerValue | null {
    return this.context.arrayPop(name) ?? null;
  }

  /** Insert at index */
  arrayInsert(name: string, index: number, value: WhiskerValue): void {
    this.context.arrayInsert(name, index, value);
  }

  /** Remove at index */
  arrayRemove(name: string, index: number): WhiskerValue | null {
    return this.context.arrayRemove(name, index) ?? null;
  }

  /** Check if array contains value */
  arrayContains(name: string, value: WhiskerValue): boolean {
    return this.context.arrayContains(name, value);
  }

  /** Find index of value (returns 0-based, -1 if not found) */
  arrayIndexOf(name: string, value: WhiskerValue): number {
    return this.context.arrayIndexOf(name, value);
  }

  // ============================================
  //  MAP Operations
  // ============================================

  /** Get map by name */
  getMap(name: string): WLSMap | null {
    return this.context.getMap(name) ?? null;
  }

  /** Check if map exists */
  hasMap(name: string): boolean {
    return this.context.hasMap(name);
  }

  /** Get map value by key */
  mapGet(name: string, key: string): WhiskerValue | null {
    return this.context.mapGet(name, key) ?? null;
  }

  /** Set map value by key */
  mapSet(name: string, key: string, value: WhiskerValue): void {
    this.context.mapSet(name, key, value);
  }

  /** Check if map has key */
  mapHas(name: string, key: string): boolean {
    return this.context.mapHas(name, key);
  }

  /** Delete key from map */
  mapDelete(name: string, key: string): WhiskerValue | null {
    return this.context.mapDelete(name, key) ?? null;
  }

  /** Get all keys in map */
  mapKeys(name: string): string[] {
    return this.context.mapKeys(name);
  }

  /** Get all values in map */
  mapValues(name: string): WhiskerValue[] {
    return this.context.mapValues(name);
  }

  /** Get entry count in map */
  mapSize(name: string): number {
    return this.context.mapSize(name);
  }
}

// ============================================================================
// Whisker Passage API
// ============================================================================

/**
 * whisker.passage namespace
 */
export class WhiskerPassageApi {
  constructor(private context: WhiskerRuntimeContext) {}

  /**
   * Get the current passage
   * @returns Current passage object
   */
  current(): WhiskerPassage | null {
    return this.context.getCurrentPassage();
  }

  /**
   * Get a passage by ID
   * @param id Passage identifier
   * @returns Passage object or nil
   */
  get(id: string): WhiskerPassage | null {
    if (typeof id !== 'string') {
      throw new Error('whisker.passage.get() requires a string argument');
    }
    return this.context.getPassage(id);
  }

  /**
   * Navigate to a passage
   * @param id Target passage identifier
   */
  go(id: string): void {
    if (typeof id !== 'string') {
      throw new Error('whisker.passage.go() requires a string argument');
    }
    if (!this.context.passageExists(id)) {
      throw new Error(`Passage not found: ${id}`);
    }
    this.context.goToPassage(id);
  }

  /**
   * Check if a passage exists
   * @param id Passage identifier
   * @returns true if passage exists
   */
  exists(id: string): boolean {
    if (typeof id !== 'string') {
      throw new Error('whisker.passage.exists() requires a string argument');
    }
    return this.context.passageExists(id);
  }

  /**
   * Get all passages
   * @returns Table of all passages
   */
  all(): Record<string, WhiskerPassage> {
    return this.context.getAllPassages();
  }

  /**
   * Get passages with a specific tag
   * @param tag Tag to search for
   * @returns Array of passages with that tag
   */
  tags(tag: string): WhiskerPassage[] {
    if (typeof tag !== 'string') {
      throw new Error('whisker.passage.tags() requires a string argument');
    }
    return this.context.getPassagesByTag(tag);
  }
}

// ============================================================================
// Whisker History API
// ============================================================================

/**
 * whisker.history namespace
 */
export class WhiskerHistoryApi {
  constructor(private context: WhiskerRuntimeContext) {}

  /**
   * Navigate to previous passage
   * @returns true if navigation occurred
   */
  back(): boolean {
    return this.context.goBack();
  }

  /**
   * Check if back navigation is possible
   * @returns true if history has entries
   */
  canBack(): boolean {
    return this.context.canGoBack();
  }

  /**
   * Get navigation history
   * @returns Array of passage IDs
   */
  list(): string[] {
    return this.context.getHistory();
  }

  /**
   * Get history length
   * @returns Number of history entries
   */
  count(): number {
    return this.context.getHistoryCount();
  }

  /**
   * Check if passage is in history
   * @param id Passage identifier
   * @returns true if in history
   */
  contains(id: string): boolean {
    if (typeof id !== 'string') {
      throw new Error('whisker.history.contains() requires a string argument');
    }
    return this.context.historyContains(id);
  }

  /**
   * Clear navigation history
   */
  clear(): void {
    this.context.clearHistory();
  }
}

// ============================================================================
// Whisker Choice API
// ============================================================================

/**
 * whisker.choice namespace
 */
export class WhiskerChoiceApi {
  constructor(private context: WhiskerRuntimeContext) {}

  /**
   * Get available choices
   * @returns Array of choice objects
   */
  available(): WhiskerChoice[] {
    return this.context.getAvailableChoices();
  }

  /**
   * Select a choice by index
   * @param index 1-based choice index
   */
  select(index: number): void {
    if (typeof index !== 'number') {
      throw new Error('whisker.choice.select() requires a number argument');
    }
    this.context.selectChoice(index);
  }

  /**
   * Get number of available choices
   * @returns Choice count
   */
  count(): number {
    return this.context.getChoiceCount();
  }
}

// ============================================================================
// Main Whisker API
// ============================================================================

/**
 * Main whisker API object
 * Provides all whisker.* functions
 */
export class WhiskerApi {
  public readonly state: WhiskerStateApi;
  public readonly passage: WhiskerPassageApi;
  public readonly history: WhiskerHistoryApi;
  public readonly choice: WhiskerChoiceApi;

  constructor(private context: WhiskerRuntimeContext) {
    this.state = new WhiskerStateApi(context);
    this.passage = new WhiskerPassageApi(context);
    this.history = new WhiskerHistoryApi(context);
    this.choice = new WhiskerChoiceApi(context);
  }

  /**
   * Get visit count for a passage
   * @param passage Passage ID (or current if omitted)
   * @returns Number of visits
   */
  visited(passage?: string): number {
    if (passage !== undefined && typeof passage !== 'string') {
      throw new Error('whisker.visited() requires a string argument or no argument');
    }
    return this.context.getVisitCount(passage);
  }

  /**
   * Get random integer in range
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns Random integer
   */
  random(min: number, max: number): number {
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('whisker.random() requires two number arguments');
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Pick random value from arguments
   * @param args Values to choose from
   * @returns Randomly selected value
   */
  pick<T>(...args: T[]): T {
    if (args.length === 0) {
      throw new Error('whisker.pick() requires at least one argument');
    }
    const index = Math.floor(Math.random() * args.length);
    return args[index];
  }

  /**
   * Debug print
   * @param args Values to print
   */
  print(...args: unknown[]): void {
    this.context.print(...args);
  }
}

/**
 * Create a whisker API instance with a runtime context
 */
export function createWhiskerApi(context: WhiskerRuntimeContext): WhiskerApi {
  return new WhiskerApi(context);
}

/**
 * Create a whisker API instance with the default in-memory context
 */
export function createTestWhiskerApi(): { api: WhiskerApi; context: InMemoryRuntimeContext } {
  const context = new InMemoryRuntimeContext();
  const api = new WhiskerApi(context);
  return { api, context };
}
