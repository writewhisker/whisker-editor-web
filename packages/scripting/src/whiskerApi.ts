/**
 * WLS 1.0 Whisker API
 *
 * Implements the whisker.* namespace for Lua scripting.
 * See WLS 1.0 Specification Chapter 7: Lua API
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
 * Provides all WLS 1.0 whisker.* functions
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
