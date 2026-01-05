/**
 * WLS 2.0 Integration Module
 *
 * Unified facade for all WLS 2.0 story player components.
 * Integrates threading, timing, audio, effects, external functions,
 * parameterized passages, and state machines into a cohesive system.
 */

import type { Story } from '@writewhisker/story-models';
import {
  ThreadedStoryPlayer,
  type ThreadedPlayerState,
  type ThreadExecutionOptions,
  type ThreadStepResult,
} from './ThreadedStoryPlayer';
import {
  TimedContentManager,
  parseTimeString,
  type ScheduleOptions,
  type TimerEvent,
  type TimedBlock,
} from './TimedContentManager';
import {
  AudioManager,
  MockAudioBackend,
  type AudioBackend,
  type AudioManagerOptions,
  type AudioChannel,
} from './AudioManager';
import {
  TextEffectManager,
  type EffectOptions,
  type EffectController,
} from './TextEffects';
import {
  ExternalFunctionRegistry,
  type ExternalFunction,
  type RegistryOptions,
  type CallResult,
} from './ExternalFunctions';
import {
  ParameterizedPassageManager,
  type ParameterManagerOptions,
  type ParameterBindingResult,
  type PassageParameter,
} from './ParameterizedPassages';

/**
 * WLS 2.0 integrated player configuration
 */
export interface WLS2Config {
  /** Threading configuration */
  threading?: ThreadExecutionOptions;
  /** Audio configuration */
  audio?: AudioManagerOptions;
  /** External functions configuration */
  externalFunctions?: RegistryOptions;
  /** Parameterized passages configuration */
  passages?: ParameterManagerOptions;
  /** Whether to enable timing features */
  enableTiming?: boolean;
  /** Whether to enable text effects */
  enableEffects?: boolean;
}

/**
 * WLS 2.0 integrated player state
 */
export interface WLS2State {
  /** Player state including threads */
  player: ThreadedPlayerState;
  /** Audio channel volumes */
  audioVolumes: Record<AudioChannel, number>;
  /** Active timer IDs */
  activeTimers: string[];
  /** Timestamp when state was captured */
  timestamp: number;
}

/**
 * WLS 2.0 unified event types
 */
export type WLS2Event =
  // Player events
  | 'passageEntered'
  | 'choiceSelected'
  | 'variableChanged'
  | 'error'
  | 'stateChanged'
  // Thread events
  | 'threadSpawned'
  | 'threadCompleted'
  | 'threadsAllComplete'
  | 'threadError'
  // Audio events
  | 'audioStarted'
  | 'audioStopped'
  | 'audioError'
  // Timer events
  | 'timerCreated'
  | 'timerFired'
  | 'timerCanceled'
  // Effect events
  | 'effectStarted'
  | 'effectCompleted'
  // External function events
  | 'externalFunctionCalled'
  | 'externalFunctionError'
  // Integration lifecycle
  | 'initialized'
  | 'started'
  | 'paused'
  | 'resumed'
  | 'reset';

/**
 * Event callback signature
 */
export type WLS2EventCallback = (event: WLS2Event, data: unknown) => void;

/**
 * WLS2Integration - Unified WLS 2.0 story player
 *
 * Provides a single interface for all WLS 2.0 features:
 * - Parallel narrative threads
 * - Timed content execution
 * - Audio and media playback
 * - Text effects and transitions
 * - External function calls
 * - Parameterized passages
 *
 * @example
 * ```typescript
 * const player = new WLS2Integration({
 *   threading: { maxThreads: 10 },
 *   audio: { backend: new WebAudioBackend() },
 *   enableTiming: true,
 *   enableEffects: true,
 * });
 *
 * // Register external functions
 * player.registerFunction('saveGame', async () => {
 *   await saveToDisk(player.getState());
 * });
 *
 * // Load and start story
 * player.loadStory(story);
 * player.start();
 *
 * // Listen for events
 * player.on('threadSpawned', (e, data) => {
 *   console.log('New thread:', data.threadId);
 * });
 * ```
 */
export class WLS2Integration {
  private player: ThreadedStoryPlayer;
  private timedContent: TimedContentManager | null = null;
  private audio: AudioManager;
  private effects: TextEffectManager | null = null;
  private functions: ExternalFunctionRegistry;
  private passages: ParameterizedPassageManager;

  private config: Required<WLS2Config>;
  private eventListeners: Map<WLS2Event, Set<WLS2EventCallback>> = new Map();
  private story: Story | null = null;
  private initialized: boolean = false;
  private _paused: boolean = false;

  constructor(config: WLS2Config = {}) {
    this.config = {
      threading: config.threading ?? {},
      audio: config.audio ?? {},
      externalFunctions: config.externalFunctions ?? {},
      passages: config.passages ?? {},
      enableTiming: config.enableTiming ?? true,
      enableEffects: config.enableEffects ?? true,
    };

    // Initialize core components
    this.player = new ThreadedStoryPlayer(this.config.threading);

    // Initialize audio (uses MockAudioBackend by default if no backend provided)
    this.audio = new AudioManager(this.config.audio);

    // Initialize external functions
    this.functions = new ExternalFunctionRegistry(this.config.externalFunctions);

    // Initialize parameterized passages
    this.passages = new ParameterizedPassageManager(this.config.passages);

    // Initialize optional components
    if (this.config.enableTiming) {
      this.timedContent = new TimedContentManager();
    }

    if (this.config.enableEffects) {
      this.effects = new TextEffectManager();
    }

    // Initialize event listener maps
    this.initEventListeners();

    // Wire up component events
    this.wireComponentEvents();
  }

  // ============ Lifecycle ============

  /**
   * Load a story for playback
   */
  loadStory(story: Story): void {
    this.story = story;
    this.player.loadStory(story);

    // Register parameterized passages from story
    this.registerPassagesFromStory(story);

    this.initialized = true;
    this.emit('initialized', { story: story.metadata.title });
  }

  /**
   * Start story playback
   */
  start(fromPassageId?: string): void {
    if (!this.initialized) {
      throw new Error('No story loaded');
    }

    this._paused = false;
    this.player.start(fromPassageId);

    this.emit('started', { passageId: fromPassageId });
  }

  /**
   * Pause playback
   */
  pause(): void {
    this._paused = true;

    // Pause timing
    if (this.timedContent) {
      this.timedContent.pause();
    }

    // Pause all audio
    this.audio.pauseAll();

    this.emit('paused', {});
  }

  /**
   * Resume playback
   */
  resume(): void {
    this._paused = false;

    // Resume timing
    if (this.timedContent) {
      this.timedContent.resume();
    }

    // Resume audio
    this.audio.resumeAll();

    this.emit('resumed', {});
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.player.reset();

    // Reset timing
    if (this.timedContent) {
      this.timedContent.reset();
    }

    // Stop all audio
    this.audio.stopAll();

    // Cancel all effects
    if (this.effects) {
      this.effects.cancelAll();
    }

    this._paused = false;
    this.emit('reset', {});
  }

  /**
   * Check if playback is paused
   */
  isPaused(): boolean {
    return this._paused;
  }

  /**
   * Check if player is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============ Threading ============

  /**
   * Spawn a new narrative thread
   */
  spawnThread(passageId: string, options?: { priority?: number }): string {
    return this.player.spawnThread(passageId, options);
  }

  /**
   * Await thread completion
   */
  async awaitThread(threadId: string): Promise<void> {
    return this.player.awaitThread(threadId);
  }

  /**
   * Execute one step for all threads
   */
  stepThreads(): ThreadStepResult {
    return this.player.stepAllThreads();
  }

  /**
   * Run threads until input is needed
   */
  async runUntilInput(): Promise<ThreadStepResult> {
    return this.player.runUntilInputNeeded();
  }

  /**
   * Get all active threads
   */
  getActiveThreads() {
    return this.player.getActiveThreads();
  }

  /**
   * Check if all threads are complete
   */
  areAllThreadsComplete(): boolean {
    return this.player.areAllThreadsComplete();
  }

  // ============ Choices and Navigation ============

  /**
   * Make a choice in the current passage
   */
  makeChoice(choiceId: string): void {
    this.player.makeChoice(choiceId);
  }

  /**
   * Make a choice in a specific thread
   */
  makeThreadChoice(threadId: string, choiceId: string): void {
    this.player.makeThreadChoice(threadId, choiceId);
  }

  /**
   * Get available choices
   */
  getAvailableChoices() {
    return this.player.getAvailableChoices();
  }

  /**
   * Get current passage
   */
  getCurrentPassage() {
    return this.player.getCurrentPassage();
  }

  // ============ Variables ============

  /**
   * Get a variable value
   */
  getVariable(name: string): unknown {
    return this.player.getVariable(name);
  }

  /**
   * Set a variable value
   */
  setVariable(name: string, value: unknown): void {
    this.player.setVariable(name, value);
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, unknown> {
    const state = this.player.getState();
    return state.variables;
  }

  /**
   * Set a thread-local variable
   */
  setThreadVariable(threadId: string, name: string, value: unknown): void {
    this.player.setThreadVariable(threadId, name, value);
  }

  /**
   * Get a thread-local variable
   */
  getThreadVariable(threadId: string, name: string): unknown {
    return this.player.getThreadVariable(threadId, name);
  }

  // ============ Timed Content ============

  /**
   * Schedule content to execute after a delay
   * @param delay Delay in milliseconds or time string (e.g., "2s", "500ms")
   * @param content Content nodes to display
   * @param options Scheduling options
   * @returns Timer ID
   */
  scheduleContent(
    delay: number | string,
    content: unknown[], // ContentNode[]
    options?: ScheduleOptions
  ): string | null {
    if (!this.timedContent) {
      console.warn('Timed content is disabled');
      return null;
    }

    const delayMs = typeof delay === 'string' ? parseTimeString(delay) : delay;
    return this.timedContent.schedule(delayMs, content as any, options);
  }

  /**
   * Schedule repeating content
   * @param interval Interval in milliseconds or time string
   * @param content Content to display each interval
   * @param maxFires Maximum number of fires (0 = unlimited)
   * @returns Timer ID
   */
  scheduleRepeating(
    interval: number | string,
    content: unknown[],
    maxFires: number = 0
  ): string | null {
    if (!this.timedContent) {
      console.warn('Timed content is disabled');
      return null;
    }

    const intervalMs = typeof interval === 'string' ? parseTimeString(interval) : interval;
    return this.timedContent.every(intervalMs, content as any, maxFires);
  }

  /**
   * Process timers and get any ready content
   * Should be called regularly (e.g., every frame)
   */
  tickTimers(): unknown[] {
    if (!this.timedContent) return [];
    return this.timedContent.tick();
  }

  /**
   * Cancel a scheduled timer
   */
  cancelTimer(timerId: string): boolean {
    if (!this.timedContent) return false;
    return this.timedContent.cancel(timerId);
  }

  /**
   * Get all active timer IDs
   */
  getActiveTimers(): string[] {
    if (!this.timedContent) return [];
    return this.timedContent.getActiveTimers();
  }

  /**
   * Get time remaining for a timer
   */
  getTimerRemaining(timerId: string): number {
    if (!this.timedContent) return -1;
    return this.timedContent.getRemaining(timerId);
  }

  /**
   * Check if a timer is active
   */
  isTimerActive(timerId: string): boolean {
    if (!this.timedContent) return false;
    return this.timedContent.isActive(timerId);
  }

  // ============ Audio ============

  /**
   * Play a registered audio track
   */
  async playAudio(trackId: string): Promise<void> {
    try {
      await this.audio.play(trackId);
      this.emit('audioStarted', { trackId });
    } catch (error) {
      this.emit('audioError', { trackId, error });
      throw error;
    }
  }

  /**
   * Stop a specific audio track
   */
  stopAudio(trackId: string): void {
    this.audio.stop(trackId);
    this.emit('audioStopped', { trackId });
  }

  /**
   * Register an audio track for playback
   */
  registerAudioTrack(track: {
    id: string;
    url: string;
    channel: AudioChannel;
    loop?: boolean;
    volume?: number;
    preload?: boolean;
  }): void {
    this.audio.registerTrack({
      id: track.id,
      url: track.url,
      channel: track.channel,
      loop: track.loop ?? false,
      volume: track.volume ?? 1.0,
      preload: track.preload ?? false,
    });
  }

  /**
   * Set volume for a specific track
   */
  setAudioVolume(trackId: string, volume: number): void {
    this.audio.setVolume(trackId, volume);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.audio.setMasterVolume(volume);
  }

  /**
   * Mute/unmute a channel
   */
  setChannelMuted(channel: AudioChannel, muted: boolean): void {
    if (muted) {
      this.audio.muteChannel(channel);
    } else {
      this.audio.unmuteChannel(channel);
    }
  }

  /**
   * Get the audio manager for advanced operations
   */
  getAudioManager(): AudioManager {
    return this.audio;
  }

  // ============ Text Effects ============

  /**
   * Apply a text effect with callbacks
   * @param effectName Name of the effect (e.g., 'typewriter', 'fade-in')
   * @param text Text to apply effect to
   * @param options Effect options
   * @param onFrame Callback for each animation frame
   * @param onComplete Callback when effect completes
   */
  applyEffect(
    effectName: string,
    text: string,
    options: EffectOptions,
    onFrame: (frame: unknown) => void,
    onComplete?: () => void
  ): EffectController | null {
    if (!this.effects) {
      console.warn('Text effects are disabled');
      return null;
    }

    this.emit('effectStarted', { effectName, text });
    const controller = this.effects.applyEffect(
      effectName,
      text,
      options,
      onFrame,
      () => {
        this.emit('effectCompleted', { effectName, text });
        onComplete?.();
      }
    );
    return controller;
  }

  /**
   * Cancel all active effects
   */
  cancelAllEffects(): void {
    if (this.effects) {
      this.effects.cancelAll();
    }
  }

  /**
   * Check if an effect exists
   */
  hasEffect(name: string): boolean {
    if (!this.effects) return false;
    return this.effects.hasEffect(name);
  }

  /**
   * Get the effect manager for advanced operations
   */
  getEffectManager(): TextEffectManager | null {
    return this.effects;
  }

  // ============ External Functions ============

  /**
   * Register an external function
   */
  registerFunction(name: string, fn: ExternalFunction): void {
    this.functions.register(name, fn);
  }

  /**
   * Call an external function
   */
  async callFunction(name: string, args: unknown[]): Promise<CallResult> {
    const result = await this.functions.callSafe(name, args);

    if (result.success) {
      this.emit('externalFunctionCalled', { name, args, result: result.value });
    } else {
      this.emit('externalFunctionError', { name, args, error: result.error });
    }

    return result;
  }

  /**
   * Check if a function is registered
   */
  hasFunction(name: string): boolean {
    return this.functions.isRegistered(name);
  }

  /**
   * Get the function registry for advanced operations
   */
  getFunctionRegistry(): ExternalFunctionRegistry {
    return this.functions;
  }

  // ============ Parameterized Passages ============

  /**
   * Register a parameterized passage
   */
  registerParameterizedPassage(name: string, params: PassageParameter[]): void {
    this.passages.registerPassage(name, params);
  }

  /**
   * Bind arguments to a parameterized passage
   */
  bindPassageArguments(name: string, args: unknown[]): ParameterBindingResult {
    return this.passages.bindArguments(name, args);
  }

  /**
   * Check if a parameterized passage exists
   */
  hasParameterizedPassage(name: string): boolean {
    return this.passages.hasPassage(name);
  }

  /**
   * Get the passage manager for advanced operations
   */
  getPassageManager(): ParameterizedPassageManager {
    return this.passages;
  }

  // ============ State Management ============

  /**
   * Get complete integrated state for serialization
   */
  getState(): WLS2State {
    const playerState = this.player.getThreadedState();

    return {
      player: playerState,
      audioVolumes: {
        bgm: 1.0,  // These would need AudioManager to expose channel volumes
        sfx: 1.0,
        voice: 1.0,
        ambient: 1.0,
      },
      activeTimers: this.timedContent?.getActiveTimers() ?? [],
      timestamp: Date.now(),
    };
  }

  /**
   * Restore from serialized state
   */
  restoreState(state: WLS2State): void {
    // Restore player state (includes threads)
    this.player.restoreThreadedState(state.player);

    // Note: Timers cannot be fully restored as they contain
    // ContentNode[] which includes functions/callbacks.
    // Active timers list is informational only.

    this.emit('stateChanged', { restored: true });
  }

  /**
   * Get the underlying threaded player
   */
  getPlayer(): ThreadedStoryPlayer {
    return this.player;
  }

  /**
   * Get the timed content manager
   */
  getTimedContentManager(): TimedContentManager | null {
    return this.timedContent;
  }

  // ============ Events ============

  /**
   * Add event listener
   */
  on(event: WLS2Event, callback: WLS2EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: WLS2Event, callback: WLS2EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Add one-time event listener
   */
  once(event: WLS2Event, callback: WLS2EventCallback): void {
    const wrapper: WLS2EventCallback = (e, data) => {
      this.off(event, wrapper);
      callback(e, data);
    };
    this.on(event, wrapper);
  }

  // ============ Private Methods ============

  private initEventListeners(): void {
    const events: WLS2Event[] = [
      'passageEntered',
      'choiceSelected',
      'variableChanged',
      'error',
      'stateChanged',
      'threadSpawned',
      'threadCompleted',
      'threadsAllComplete',
      'threadError',
      'audioStarted',
      'audioStopped',
      'audioError',
      'timerCreated',
      'timerFired',
      'timerCanceled',
      'effectStarted',
      'effectCompleted',
      'externalFunctionCalled',
      'externalFunctionError',
      'initialized',
      'started',
      'paused',
      'resumed',
      'reset',
    ];

    for (const event of events) {
      this.eventListeners.set(event, new Set());
    }
  }

  private wireComponentEvents(): void {
    // Wire player events
    this.player.onThread('passageEntered', (data) => {
      this.emit('passageEntered', data);
    });
    this.player.onThread('choiceSelected', (data) => {
      this.emit('choiceSelected', data);
    });
    this.player.onThread('variableChanged', (data) => {
      this.emit('variableChanged', data);
    });
    this.player.onThread('error', (data) => {
      this.emit('error', data);
    });
    this.player.onThread('stateChanged', (data) => {
      this.emit('stateChanged', data);
    });
    this.player.onThread('threadSpawned', (data) => {
      this.emit('threadSpawned', data);
    });
    this.player.onThread('threadCompleted', (data) => {
      this.emit('threadCompleted', data);
    });
    this.player.onThread('threadsAllComplete', (data) => {
      this.emit('threadsAllComplete', data);
    });
    this.player.onThread('threadError', (data) => {
      this.emit('threadError', data);
    });

    // Wire timed content events
    if (this.timedContent) {
      this.timedContent.on((event: TimerEvent, block: TimedBlock) => {
        switch (event) {
          case 'timerCreated':
            this.emit('timerCreated', { timerId: block.id, delay: block.delay });
            break;
          case 'timerFired':
            this.emit('timerFired', { timerId: block.id, fireCount: block.fireCount });
            break;
          case 'timerCanceled':
            this.emit('timerCanceled', { timerId: block.id });
            break;
        }
      });
    }
  }

  private emit(event: WLS2Event, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      }
    }
  }

  private registerPassagesFromStory(story: Story): void {
    // Register passages that have parameters defined
    // This would parse passage headers looking for parameter declarations
    for (const [, passage] of story.passages) {
      const params = this.parsePassageParameters(passage.title);
      if (params.length > 0) {
        this.passages.registerPassage(params[0].name, params.map(p => ({
          name: p.name,
          defaultValue: p.defaultValue,
          required: p.defaultValue === undefined,
        })));
      }
    }
  }

  private parsePassageParameters(title: string): Array<{ name: string; defaultValue?: unknown }> {
    // Parse passage title for parameters like: "myPassage(param1, param2 = 'default')"
    const match = title.match(/^(\w+)\s*\(([^)]+)\)/);
    if (!match) return [];

    const paramStr = match[2];
    const params: Array<{ name: string; defaultValue?: unknown }> = [];

    for (const part of paramStr.split(',')) {
      const trimmed = part.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const name = trimmed.substring(0, eqIndex).trim();
        const defaultStr = trimmed.substring(eqIndex + 1).trim();
        params.push({ name, defaultValue: this.parseDefaultValue(defaultStr) });
      } else {
        params.push({ name: trimmed });
      }
    }

    return params;
  }

  private parseDefaultValue(str: string): unknown {
    // Parse simple default values
    if (str === 'true') return true;
    if (str === 'false') return false;
    if (str === 'null') return null;
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
    if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
      return str.slice(1, -1);
    }
    return str;
  }
}

/**
 * Create a new WLS 2.0 integrated player
 */
export function createWLS2Player(config?: WLS2Config): WLS2Integration {
  return new WLS2Integration(config);
}

/**
 * Create a minimal WLS 2.0 player for testing
 */
export function createTestWLS2Player(): WLS2Integration {
  return new WLS2Integration({
    threading: { maxThreads: 5 },
    audio: { backend: new MockAudioBackend() },
    enableTiming: true,
    enableEffects: true,
  });
}
