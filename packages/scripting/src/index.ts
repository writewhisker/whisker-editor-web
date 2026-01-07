/**
 * Scripting System
 * Lua execution engine and configuration
 */

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
// LuaExecutor temporarily disabled - uses deprecated @writewhisker/core-ts
// export { LuaExecutor } from './LuaExecutor';

// Monaco Editor integration is exported separately to avoid bundling monaco-editor
// in packages that don't need it. Import from '@writewhisker/scripting/luaConfig' instead.
// export { registerLuaLanguage, registerStoryTheme, initializeLuaSupport } from './luaConfig';

// WLS 1.0 Whisker API
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

// WLS 1.0 Expression Evaluator
export {
  ExpressionEvaluator,
  EvaluationError,
  createEvaluator,
  evaluate,
  type EvalResult,
  type EvalOptions,
} from './expressions';

// WLS 2.0 LIST State Machine Operations
export {
  ListValue,
  ListRegistry,
  parseListDeclaration,
  evaluateListOperator,
} from './list-operations';

// WLS 2.0 Runtime
export * from './wls2';

// Security utilities
export * from './security';
