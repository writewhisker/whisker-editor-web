/**
 * Story player and test scenario execution
 */

export { StoryPlayer } from './StoryPlayer';
export { TestScenarioRunner } from './TestScenarioRunner';
export type * from './types';
export type * from './testScenarioTypes';

// WLS 1.0 Content Renderer
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

// WLS 2.0 Thread Scheduler
export {
  ThreadScheduler,
  createThreadScheduler,
  type Thread,
  type ThreadOutput,
  type ThreadSchedulerOptions,
  type ThreadEvent,
  type ThreadEventCallback,
} from './ThreadScheduler';

// WLS 2.0 Timed Content Manager
export {
  TimedContentManager,
  createTimedContentManager,
  parseTimeString,
  type TimedBlock,
  type ScheduleOptions,
  type TimerEvent,
  type TimerEventCallback,
} from './TimedContentManager';

// WLS 2.0 External Function Binding
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

// WLS 2.0 Audio/Media API
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

// WLS 2.0 Text Effects and Transitions
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

// WLS 2.0 Parameterized Passages
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
