/**
 * Runtime Types
 *
 * Core type definitions for WLS runtime features including:
 * - Thread Scheduler (parallel narrative execution)
 * - Timed Content (delayed/scheduled content)
 * - External Functions (host function binding)
 * - LIST State Machine (state operations)
 * - Text Effects (text presentation)
 * - Audio Effects (audio management)
 * - Parameterized Passages (reusable passages)
 */

// =============================================================================
// Thread Scheduler Types
// =============================================================================

export type ThreadState =
  | 'running'
  | 'waiting'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface Thread {
  id: string;
  passage: string;
  parentId: string | null;
  children: string[];
  state: ThreadState;
  priority: number;
  variables: Map<string, unknown>;
  waitingFor: string | null;
  result: unknown;
  isMain: boolean;
  createdAt: number;
}

export interface ThreadStepResult {
  threadId: string;
  state: ThreadState;
  result?: unknown;
  error?: string;
}

export interface ThreadSchedulerOptions {
  maxThreads?: number;
  defaultPriority?: number;
}

// =============================================================================
// Timed Content Types
// =============================================================================

export type TimerType = 'oneshot' | 'repeating';

export type TimerState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface Timer {
  id: string;
  type: TimerType;
  delay: number; // milliseconds
  elapsed: number;
  content: unknown;
  callback?: TimerCallback;
  state: TimerState;
  createdAt: number;
  maxFires?: number;
  fireCount: number;
}

export interface TimerCallback {
  (timer: Timer): void;
}

export interface FiredTimer {
  timerId: string;
  content: unknown;
  fireCount: number;
}

export interface TimedContentOptions {
  maxTimers?: number;
}

// =============================================================================
// External Functions Types
// =============================================================================

export type ExternalParamType = 'string' | 'number' | 'boolean' | 'any';

export interface ExternalParameter {
  name: string;
  type: ExternalParamType;
  optional: boolean;
}

export interface ExternalDeclaration {
  name: string;
  params: ExternalParameter[];
  returnType: string;
}

export interface ExternalFunction {
  (...args: unknown[]): unknown;
}

export interface ExternalFunctionEntry {
  fn: ExternalFunction;
  declaration?: ExternalDeclaration;
}

export interface ExternalFunctionsOptions {
  strictTypeChecking?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// LIST State Machine Types
// =============================================================================

export interface ListValueConfig {
  trackHistory: boolean;
  maxHistoryLength: number;
  allowUndefinedStates: boolean;
  onTransition?: (from: string[], to: string[]) => void;
}

export interface HistoryEntry {
  state: string;
  action: 'enter' | 'exit' | 'add' | 'remove' | 'toggle' | 'set' | 'reset';
  timestamp: number;
  previousStates: string[];
}

export interface StateCallback {
  onEnter?: () => void;
  onExit?: () => void;
}

export interface ListValueState {
  name: string;
  possibleValues: string[];
  activeValues: string[];
  history?: HistoryEntry[];
}

export interface ListRegistryState {
  lists: Record<string, ListValueState>;
}

// =============================================================================
// Text Effects Types
// =============================================================================

export type EffectType = 'progressive' | 'animation' | 'transition';

export interface EffectDefinition {
  type: EffectType;
  defaultOptions: Record<string, unknown>;
  css?: string;
}

export interface EffectOptions {
  speed?: number; // for progressive
  duration?: number; // for animation/transition
  intensity?: number;
  [key: string]: unknown;
}

export interface FrameUpdate {
  visibleText: string;
  progress: number;
  elapsed: number;
}

export interface EffectControllerState {
  paused: boolean;
  cancelled: boolean;
  completed: boolean;
  elapsed: number;
  charIndex?: number;
  totalChars?: number;
  text?: string;
  speed?: number;
  duration?: number;
}

// =============================================================================
// Audio Effects Types
// =============================================================================

export type AudioGroup = 'music' | 'sfx' | 'ambient' | 'voice';

export interface AudioDeclaration {
  id: string;
  src: string;
  group: AudioGroup;
  volume?: number;
  loop?: boolean;
}

export interface AudioEffectOptions {
  fadeDuration?: number;
  volume?: number;
  loop?: boolean;
}

export interface AudioState {
  playing: Map<string, AudioTrack>;
  volumes: Record<AudioGroup, number>;
  muted: boolean;
}

export interface AudioTrack {
  id: string;
  group: AudioGroup;
  volume: number;
  loop: boolean;
  playing: boolean;
  fadeState?: FadeState;
}

export interface FadeState {
  type: 'in' | 'out' | 'crossfade';
  startVolume: number;
  targetVolume: number;
  duration: number;
  elapsed: number;
}

// =============================================================================
// Parameterized Passages Types
// =============================================================================

export interface PassageParameter {
  name: string;
  default?: unknown;
}

export interface PassageHeader {
  name: string;
  params: PassageParameter[];
}

export type PassageArgument =
  | string
  | number
  | boolean
  | VariableRef
  | ExpressionRef;

export interface VariableRef {
  _type: 'variable_ref';
  name: string;
}

export interface ExpressionRef {
  _type: 'expression';
  expr: string;
}

export interface PassageCall {
  target: string;
  args: PassageArgument[];
}

export interface PassageArgBinding {
  passageName: string;
  bindings: Map<string, PassageArgument>;
}

// =============================================================================
// Container Types
// =============================================================================

export interface ContainerOptions {
  enableThreads?: boolean;
  enableTimers?: boolean;
  enableExternalFunctions?: boolean;
  enableLists?: boolean;
  enableTextEffects?: boolean;
  enableAudioEffects?: boolean;
  enableParameterizedPassages?: boolean;
}

export interface ContainerState {
  threads?: Thread[];
  timers?: Timer[];
  lists?: ListRegistryState;
  audio?: AudioState;
}

export interface StepResult {
  threadResults: ThreadStepResult[];
  firedTimers: FiredTimer[];
  completedEffects: string[];
}
