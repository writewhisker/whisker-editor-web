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
