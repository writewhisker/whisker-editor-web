/**
 * WLS 2.0 Runtime Module
 *
 * This module provides advanced runtime features for the Whisker scripting engine:
 * - Thread Scheduler: Parallel narrative execution
 * - Timed Content: Delayed and scheduled content delivery
 * - External Functions: Host function binding with type checking
 * - LIST State Machine: State management with history tracking
 * - Text Effects: Typewriter, animations, and transitions
 * - Audio Effects: Fade, crossfade, and group volume control
 * - Parameterized Passages: Reusable passages with arguments
 */

// Types
export type {
  // Thread Scheduler
  Thread,
  ThreadState,
  ThreadStepResult,
  ThreadSchedulerOptions,
  // Timed Content
  Timer,
  TimerType,
  TimerState,
  TimerCallback,
  FiredTimer,
  TimedContentOptions,
  // External Functions
  ExternalParameter,
  ExternalParamType,
  ExternalDeclaration,
  ExternalFunction,
  ExternalFunctionEntry,
  ExternalFunctionsOptions,
  ValidationResult,
  // LIST State Machine (Phase 2)
  ListValueConfig,
  HistoryEntry,
  StateCallback,
  ListValueState,
  ListRegistryState,
  // Text Effects (Phase 3)
  EffectType,
  EffectDefinition,
  EffectOptions,
  FrameUpdate,
  EffectControllerState,
  // Audio Effects (Phase 3)
  AudioGroup,
  AudioDeclaration,
  AudioEffectOptions,
  AudioState,
  AudioTrack,
  FadeState,
  // Parameterized Passages (Phase 3)
  PassageParameter,
  PassageHeader,
  PassageArgument,
  VariableRef,
  ExpressionRef,
  PassageCall,
  PassageArgBinding,
  // Container (Phase 6)
  WLS2Options,
  WLS2State,
  StepResult,
} from './types';

// Thread Scheduler
export {
  ThreadScheduler,
  createThreadScheduler,
  type ThreadExecutor,
} from './ThreadScheduler';

// Timed Content
export {
  TimedContent,
  createTimedContent,
  parseTimeString,
} from './TimedContent';

// External Functions
export {
  ExternalFunctions,
  createExternalFunctions,
  parseDeclaration,
} from './ExternalFunctions';

// LIST State Machine
export {
  ListValue,
  createExclusive,
  createFlags,
  fromState,
} from './ListValue';

export {
  ListRegistry,
  createListRegistry,
  type ListRegistryOptions,
} from './ListRegistry';

// Text Effects
export {
  TextEffects,
  createTextEffects,
  EffectController,
  parseEffectDeclaration,
  BUILTIN_EFFECTS,
  type EffectCallbacks,
  type EffectDeclaration,
} from './TextEffects';

// Audio Effects
export {
  AudioEffects,
  createAudioEffects,
  parseAudioDeclaration,
  nullAudioBackend,
  type AudioBackend,
} from './AudioEffects';

// Parameterized Passages
export {
  ParameterizedPassages,
  createParameterizedPassages,
  parsePassageHeader,
  parsePassageCall,
  isVariableRef,
  isExpressionRef,
} from './ParameterizedPassages';
