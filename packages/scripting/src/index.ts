/**
 * Scripting System
 * Lua execution engine and runtime features
 */

// Lua Engine
export {
  LuaEngine,
  getLuaEngine,
  type LuaValue,
  type LuaTable,
  type LuaFunction,
  type LuaExecutionContext,
  type LuaExecutionResult,
  type LuaMultiValue,
  type LuaCoroutine,
  isMultiValue,
} from './LuaEngine';

// Whisker API
export {
  WhiskerApi,
  WhiskerStateApi,
  WhiskerPassageApi,
  WhiskerHistoryApi,
  WhiskerChoiceApi,
  InMemoryRuntimeContext,
  createWhiskerApi,
  createTestWhiskerApi,
  type WhiskerPassage,
  type WhiskerChoice,
  type WhiskerValue,
  type WhiskerObject,
  type WhiskerRuntimeContext,
} from './whiskerApi';

// Expression Evaluator
export {
  ExpressionEvaluator,
  EvaluationError,
  createEvaluator,
  evaluate,
  type EvalResult,
  type EvalOptions,
} from './expressions';

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

// LIST Utilities (from list-operations)
export {
  parseListDeclaration,
  evaluateListOperator,
} from './list-operations';

// ARRAY - Dynamic Array
export {
  ArrayValue,
  ArrayRegistry,
} from './ArrayValue';

// MAP - Key-Value Store
export {
  MapValue,
  MapRegistry,
} from './MapValue';

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

// Runtime Container
export {
  Container,
  createContainer,
  createTestContainer,
  createLightContainer,
} from './Container';

// Runtime Types
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
  // LIST State Machine
  ListValueConfig,
  HistoryEntry,
  StateCallback,
  ListValueState,
  ListRegistryState,
  // ARRAY
  ArrayValueConfig,
  ArrayHistoryEntry,
  ArrayValueState,
  ArrayRegistryState,
  // MAP
  MapValueConfig,
  MapHistoryEntry,
  MapValueState,
  MapRegistryState,
  // Text Effects
  EffectType,
  EffectDefinition,
  EffectOptions,
  FrameUpdate,
  EffectControllerState,
  // Audio Effects
  AudioGroup,
  AudioDeclaration,
  AudioEffectOptions,
  AudioState,
  AudioTrack,
  FadeState,
  // Parameterized Passages
  PassageParameter,
  PassageHeader,
  PassageArgument,
  VariableRef,
  ExpressionRef,
  PassageCall,
  PassageArgBinding,
  // Container
  ContainerOptions,
  ContainerState,
  StepResult,
} from './runtime-types';

// Security utilities
export * from './security';
