/**
 * Story player and test scenario execution
 */

export { StoryPlayer } from './StoryPlayer';
export { TestScenarioRunner } from './TestScenarioRunner';
export type * from './types';
export type * from './testScenarioTypes';

// Content Renderer
export {
  ContentRenderer,
  createContentRenderer,
  renderContent,
  evaluateCondition,
  type RenderResult,
  type RenderedChoice,
  type RenderError,
  type RenderOptions,
  type AlternativesState,
  type ChoiceState,
} from './ContentRenderer';

// Thread Scheduler
export {
  ThreadScheduler,
  createThreadScheduler,
  type Thread,
  type ThreadOutput,
  type ThreadSchedulerOptions,
  type ThreadEvent,
  type ThreadEventCallback,
} from './ThreadScheduler';

// Threaded Story Player
export {
  ThreadedStoryPlayer,
  createThreadedStoryPlayer,
  type ThreadedPlayerState,
  type ThreadStateInfo,
  type ThreadExecutionOptions,
  type ThreadStepResult,
  type ThreadedPlayerEvent,
} from './ThreadedStoryPlayer';

// Timed Content Manager
export {
  TimedContentManager,
  createTimedContentManager,
  parseTimeString,
  type TimedBlock,
  type ScheduleOptions,
  type TimerEvent,
  type TimerEventCallback,
} from './TimedContentManager';

// External Function Binding
export {
  ExternalFunctionRegistry,
  createExternalFunctionRegistry,
  parseExternalDeclaration,
  type ExternalFunction,
  type FunctionParameter,
  type FunctionDeclaration,
  type CallResult,
  type RegistryOptions,
} from './ExternalFunctions';

// Audio/Media API
export {
  AudioManager,
  MockAudioBackend,
  createAudioManager,
  parseAudioDeclaration,
  type AudioChannel,
  type AudioTrack,
  type PlayingAudio,
  type AudioBackend,
  type AudioManagerOptions,
} from './AudioManager';

// Text Effects and Transitions
export {
  TextEffectManager,
  createTextEffectManager,
  parseEffectDeclaration,
  EFFECT_CSS,
  type EffectOptions,
  type EffectFrame,
  type EffectRenderer,
  type EffectComplete,
  type TextEffect,
  type EffectController,
  type CSSKeyframe,
} from './TextEffects';

// Parameterized Passages
export {
  ParameterizedPassageManager,
  createParameterizedPassageManager,
  parsePassageHeader,
  parsePassageCall,
  formatPassageCall,
  type PassageParameter,
  type ParameterizedPassage,
  type ParameterBindingResult,
  type ParameterBindingError,
  type ParameterManagerOptions,
} from './ParameterizedPassages';

// LIST State Machine
export {
  ListStateMachine,
  ListStateMachineRegistry,
  createExclusiveStateMachine,
  createFlagStateMachine,
  type StateTransitionCallback,
  type StateTransitionEvent,
  type ListStateMachineConfig,
  type ListStateMachineState,
} from './ListStateMachine';

// Runtime Integration (Unified Facade)
export {
  RuntimeIntegration,
  createPlayer,
  createTestPlayer,
  type RuntimeConfig,
  type RuntimeState,
  type RuntimeEvent,
  type RuntimeEventCallback,
} from './RuntimeIntegration';
