/**
 * Container - Runtime Component Container
 *
 * Manages all runtime components as a unified container.
 * Provides lifecycle management, state serialization, and coordinated updates.
 *
 * Reference: whisker-core/lib/whisker/runtime/init.lua
 */

import type {
  ContainerOptions,
  ContainerState,
  StepResult,
  Thread,
  Timer,
  ListRegistryState,
  ArrayRegistryState,
  MapRegistryState,
  AudioState,
  ThreadStepResult,
  FiredTimer,
} from './runtime-types';
import { ThreadScheduler, createThreadScheduler, type ThreadExecutor } from './ThreadScheduler';
import { TimedContent, createTimedContent } from './TimedContent';
import { ExternalFunctions, createExternalFunctions } from './ExternalFunctions';
import { ListRegistry, createListRegistry } from './ListRegistry';
import { ArrayValue, ArrayRegistry } from './ArrayValue';
import { MapValue, MapRegistry } from './MapValue';
import { TextEffects, createTextEffects, type EffectCallbacks } from './TextEffects';
import { AudioEffects, createAudioEffects, type AudioBackend } from './AudioEffects';
import {
  ParameterizedPassages,
  createParameterizedPassages,
} from './ParameterizedPassages';

/**
 * Container - Unified container for all WLS runtime components
 *
 * @example
 * ```typescript
 * const container = new Container({
 *   enableThreads: true,
 *   enableTimers: true,
 *   enableLists: true,
 * });
 *
 * // Create main thread
 * container.threads.createThread('Start');
 *
 * // Define a list
 * container.lists.defineExclusive('gameState', ['menu', 'playing', 'paused']);
 *
 * // Step the simulation
 * const result = container.step(16, executor);
 * ```
 */
export class Container {
  private _threads: ThreadScheduler | null = null;
  private _timers: TimedContent | null = null;
  private _externals: ExternalFunctions | null = null;
  private _lists: ListRegistry | null = null;
  private _arrays: ArrayRegistry | null = null;
  private _maps: MapRegistry | null = null;
  private _textEffects: TextEffects | null = null;
  private _audioEffects: AudioEffects | null = null;
  private _passages: ParameterizedPassages | null = null;

  private options: Required<ContainerOptions>;
  private initialized: boolean = false;

  constructor(options: ContainerOptions = {}) {
    this.options = {
      enableThreads: options.enableThreads ?? true,
      enableTimers: options.enableTimers ?? true,
      enableExternalFunctions: options.enableExternalFunctions ?? true,
      enableLists: options.enableLists ?? true,
      enableArrays: options.enableArrays ?? true,
      enableMaps: options.enableMaps ?? true,
      enableTextEffects: options.enableTextEffects ?? true,
      enableAudioEffects: options.enableAudioEffects ?? true,
      enableParameterizedPassages: options.enableParameterizedPassages ?? true,
    };

    this.initialize();
  }

  /**
   * Initialize all enabled components
   */
  private initialize(): void {
    if (this.options.enableThreads) {
      this._threads = createThreadScheduler({ maxThreads: 100 });
    }

    if (this.options.enableTimers) {
      this._timers = createTimedContent({ maxTimers: 1000 });
    }

    if (this.options.enableExternalFunctions) {
      this._externals = createExternalFunctions({ strictTypeChecking: false });
    }

    if (this.options.enableLists) {
      this._lists = createListRegistry();
    }

    if (this.options.enableArrays) {
      this._arrays = new ArrayRegistry();
    }

    if (this.options.enableMaps) {
      this._maps = new MapRegistry();
    }

    if (this.options.enableTextEffects) {
      this._textEffects = createTextEffects();
    }

    if (this.options.enableAudioEffects) {
      this._audioEffects = createAudioEffects();
    }

    if (this.options.enableParameterizedPassages) {
      this._passages = createParameterizedPassages();
    }

    this.initialized = true;
  }

  // ==========================================================================
  // Component Accessors
  // ==========================================================================

  /**
   * Get the thread scheduler
   * @throws Error if threads are disabled
   */
  get threads(): ThreadScheduler {
    if (!this._threads) {
      throw new Error('Container: Threads are disabled');
    }
    return this._threads;
  }

  /**
   * Get the timed content manager
   * @throws Error if timers are disabled
   */
  get timers(): TimedContent {
    if (!this._timers) {
      throw new Error('Container: Timers are disabled');
    }
    return this._timers;
  }

  /**
   * Get the external functions registry
   * @throws Error if external functions are disabled
   */
  get externals(): ExternalFunctions {
    if (!this._externals) {
      throw new Error('Container: External functions are disabled');
    }
    return this._externals;
  }

  /**
   * Get the list registry
   * @throws Error if lists are disabled
   */
  get lists(): ListRegistry {
    if (!this._lists) {
      throw new Error('Container: Lists are disabled');
    }
    return this._lists;
  }

  /**
   * Get the array registry
   * @throws Error if arrays are disabled
   */
  get arrays(): ArrayRegistry {
    if (!this._arrays) {
      throw new Error('Container: Arrays are disabled');
    }
    return this._arrays;
  }

  /**
   * Get the map registry
   * @throws Error if maps are disabled
   */
  get maps(): MapRegistry {
    if (!this._maps) {
      throw new Error('Container: Maps are disabled');
    }
    return this._maps;
  }

  /**
   * Get the text effects manager
   * @throws Error if text effects are disabled
   */
  get textEffects(): TextEffects {
    if (!this._textEffects) {
      throw new Error('Container: Text effects are disabled');
    }
    return this._textEffects;
  }

  /**
   * Get the audio effects manager
   * @throws Error if audio effects are disabled
   */
  get audioEffects(): AudioEffects {
    if (!this._audioEffects) {
      throw new Error('Container: Audio effects are disabled');
    }
    return this._audioEffects;
  }

  /**
   * Get the parameterized passages manager
   * @throws Error if parameterized passages are disabled
   */
  get passages(): ParameterizedPassages {
    if (!this._passages) {
      throw new Error('Container: Parameterized passages are disabled');
    }
    return this._passages;
  }

  // ==========================================================================
  // Safe Accessors (return null if disabled)
  // ==========================================================================

  get threadsOrNull(): ThreadScheduler | null {
    return this._threads;
  }

  get timersOrNull(): TimedContent | null {
    return this._timers;
  }

  get externalsOrNull(): ExternalFunctions | null {
    return this._externals;
  }

  get listsOrNull(): ListRegistry | null {
    return this._lists;
  }

  get arraysOrNull(): ArrayRegistry | null {
    return this._arrays;
  }

  get mapsOrNull(): MapRegistry | null {
    return this._maps;
  }

  get textEffectsOrNull(): TextEffects | null {
    return this._textEffects;
  }

  get audioEffectsOrNull(): AudioEffects | null {
    return this._audioEffects;
  }

  get passagesOrNull(): ParameterizedPassages | null {
    return this._passages;
  }

  // ==========================================================================
  // Feature Checks
  // ==========================================================================

  hasThreads(): boolean {
    return this._threads !== null;
  }

  hasTimers(): boolean {
    return this._timers !== null;
  }

  hasExternals(): boolean {
    return this._externals !== null;
  }

  hasLists(): boolean {
    return this._lists !== null;
  }

  hasArrays(): boolean {
    return this._arrays !== null;
  }

  hasMaps(): boolean {
    return this._maps !== null;
  }

  hasTextEffects(): boolean {
    return this._textEffects !== null;
  }

  hasAudioEffects(): boolean {
    return this._audioEffects !== null;
  }

  hasParameterizedPassages(): boolean {
    return this._passages !== null;
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Step the simulation forward
   * Updates timers, executes threads, and processes audio fades
   *
   * @param deltaMs Time elapsed since last step in milliseconds
   * @param executor Thread executor function (optional if threads disabled)
   * @returns Combined results from all components
   */
  step(deltaMs: number, executor?: ThreadExecutor): StepResult {
    const threadResults: ThreadStepResult[] = [];
    const firedTimers: FiredTimer[] = [];
    const completedEffects: string[] = [];

    // Step threads
    if (this._threads && executor) {
      const results = this._threads.step(executor);
      threadResults.push(...results);
    }

    // Step timers
    if (this._timers) {
      const fired = this._timers.update(deltaMs);
      firedTimers.push(...fired);
    }

    // Step audio (fades)
    if (this._audioEffects) {
      this._audioEffects.update(deltaMs);
    }

    return {
      threadResults,
      firedTimers,
      completedEffects,
    };
  }

  /**
   * Pause all components
   */
  pause(): void {
    if (this._timers) {
      this._timers.pause();
    }
    // Note: Threads don't have a global pause - use pauseThread on individual threads
  }

  /**
   * Resume all components
   */
  resume(): void {
    if (this._timers) {
      this._timers.resume();
    }
  }

  /**
   * Reset all components to initial state
   */
  reset(): void {
    if (this._threads) {
      this._threads.reset();
    }

    if (this._timers) {
      this._timers.reset();
    }

    if (this._lists) {
      this._lists.resetAll();
    }

    if (this._arrays) {
      this._arrays.clear();
    }

    if (this._maps) {
      this._maps.clear();
    }

    if (this._textEffects) {
      this._textEffects.cancelAll();
    }

    if (this._audioEffects) {
      this._audioEffects.stopAll();
    }

    if (this._passages) {
      this._passages.reset();
    }
  }

  /**
   * Check if all processing is complete
   */
  isComplete(): boolean {
    if (this._threads && !this._threads.isComplete()) {
      return false;
    }

    if (this._timers) {
      const active = this._timers.getActiveTimers();
      if (active.length > 0) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize container state for saving
   */
  serialize(): ContainerState {
    const state: ContainerState = {};

    if (this._threads) {
      state.threads = this._threads.serialize();
    }

    if (this._timers) {
      state.timers = this._timers.serialize();
    }

    if (this._lists) {
      state.lists = this._lists.getState();
    }

    if (this._arrays) {
      state.arrays = this._arrays.getState();
    }

    if (this._maps) {
      state.maps = this._maps.getState();
    }

    // Audio and text effects are typically not serialized
    // as they represent transient visual/audio state

    return state;
  }

  /**
   * Deserialize container state from saved data
   */
  deserialize(state: ContainerState): void {
    if (state.threads && this._threads) {
      this._threads.deserialize(state.threads);
    }

    if (state.timers && this._timers) {
      this._timers.deserialize(state.timers);
    }

    if (state.lists && this._lists) {
      this._lists.restoreState(state.lists);
    }

    if (state.arrays && this._arrays) {
      this._arrays.restoreState(state.arrays);
    }

    if (state.maps && this._maps) {
      this._maps.restoreState(state.maps);
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Get current options
   */
  getOptions(): Required<ContainerOptions> {
    return { ...this.options };
  }

  /**
   * Check if container is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set audio backend (must be called before playing audio)
   */
  setAudioBackend(backend: AudioBackend): void {
    if (this._audioEffects) {
      this._audioEffects.setBackend(backend);
    }
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Register an external function
   */
  registerFunction(
    name: string,
    fn: (...args: unknown[]) => unknown
  ): void {
    if (this._externals) {
      this._externals.register(name, fn);
    }
  }

  /**
   * Call an external function
   */
  callFunction(name: string, ...args: unknown[]): unknown {
    if (!this._externals) {
      throw new Error('External functions are disabled');
    }
    return this._externals.call(name, args);
  }

  /**
   * Define an exclusive list (only one value active at a time)
   */
  defineExclusiveList(
    name: string,
    values: string[],
    initial?: string
  ): void {
    if (this._lists) {
      this._lists.defineExclusive(name, values, initial);
    }
  }

  /**
   * Define a flags list (multiple values can be active)
   */
  defineFlagsList(
    name: string,
    values: string[],
    initial: string[] = []
  ): void {
    if (this._lists) {
      this._lists.defineFlags(name, values, initial);
    }
  }

  /**
   * Define an array
   */
  defineArray(
    name: string,
    initialElements: unknown[] = []
  ): ArrayValue | undefined {
    if (this._arrays) {
      return this._arrays.define(name, initialElements);
    }
    return undefined;
  }

  /**
   * Define a map
   */
  defineMap(
    name: string,
    initialEntries: Record<string, unknown> = {}
  ): MapValue | undefined {
    if (this._maps) {
      return this._maps.define(name, initialEntries);
    }
    return undefined;
  }

  /**
   * Apply a text effect
   */
  applyTextEffect(
    effectName: string,
    text: string,
    options: Record<string, unknown> = {},
    callbacks?: EffectCallbacks
  ): void {
    if (this._textEffects) {
      this._textEffects.applyEffect(
        effectName,
        text,
        options,
        callbacks?.onFrame,
        callbacks?.onComplete
      );
    }
  }

  /**
   * Register a parameterized passage
   */
  registerPassage(header: string): void {
    if (this._passages) {
      this._passages.registerPassage(header);
    }
  }
}

/**
 * Factory function to create a Container
 */
export function createContainer(options?: ContainerOptions): Container {
  return new Container(options);
}

/**
 * Create a minimal container for testing (all features enabled)
 */
export function createTestContainer(): Container {
  return new Container({
    enableThreads: true,
    enableTimers: true,
    enableExternalFunctions: true,
    enableLists: true,
    enableArrays: true,
    enableMaps: true,
    enableTextEffects: true,
    enableAudioEffects: true,
    enableParameterizedPassages: true,
  });
}

/**
 * Create a lightweight container (only core features)
 */
export function createLightContainer(): Container {
  return new Container({
    enableThreads: true,
    enableTimers: true,
    enableExternalFunctions: true,
    enableLists: true,
    enableArrays: true,
    enableMaps: true,
    enableTextEffects: false,
    enableAudioEffects: false,
    enableParameterizedPassages: false,
  });
}
