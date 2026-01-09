/**
 * @writewhisker/editor-base - Public API
 *
 * This is the stable public API for external consumption.
 * Only exports from this file are guaranteed to maintain backward compatibility.
 *
 * For use in:
 * - SaaS applications
 * - Third-party plugins
 * - External integrations
 *
 * Internal implementation may change, but this public interface will follow semantic versioning.
 */

// ============================================================================
// CORE TYPES (from @writewhisker/core-ts)
// ============================================================================

export type {
  StoryMetadata,
} from '@writewhisker/core-ts';

export {
  Story,
  Passage,
  Choice,
  Variable,
} from '@writewhisker/core-ts';

// ============================================================================
// PLUGIN SYSTEM (Public Plugin API)
// ============================================================================

export { PluginManager, pluginManager } from './plugins/PluginManager';

export type {
  EditorPlugin,
  PluginRegistryEntry,
  PassageType,
  CustomAction,
  CustomCondition,
  ActionContext,
  ConditionContext,
  PluginUIExtensions,
  PluginRuntimeHooks,
  RuntimeContext,
} from './plugins/types';

// Plugin stores (read-only access)
export {
  registeredPlugins,
  allPluginEntries,
  passageTypes,
  customActions,
  customConditions,
} from './stores/pluginStore';

// ============================================================================
// CORE COMPONENTS (Guaranteed Stable)
// ============================================================================

// Graph visualization
export { default as GraphView } from './components/GraphView.svelte';
export { default as PassageNode } from './components/graph/PassageNode.svelte';
export { default as ConnectionEdge } from './components/graph/ConnectionEdge.svelte';

// Editor UI
export { default as MenuBar } from './components/MenuBar.svelte';
export { default as Toolbar } from './components/Toolbar.svelte';
export { default as PropertiesPanel } from './components/PropertiesPanel.svelte';
export { default as PassageList } from './components/PassageList.svelte';

// Dialogs
export { default as ConfirmDialog } from './components/ConfirmDialog.svelte';
export { default as SettingsDialog } from './components/SettingsDialog.svelte';

// ============================================================================
// CORE STORES (Public State Management)
// ============================================================================

// Story state
export {
  currentStory,
  storyStateActions,
  passageList,
  variableList,
  passageCount,
  storyMetadata,
} from './stores/storyStateStore';

// Selection state
export {
  selectedPassageId,
  selectionActions,
  selectedPassage,
  hasSelection,
} from './stores/selectionStore';

// History/undo-redo
export {
  canUndo,
  canRedo,
  historyCount,
  historyActions,
} from './stores/historyStore';

// Notifications
export {
  notificationStore,
} from './stores/notificationStore';

// Loading state
export {
  loadingStore,
} from './stores/loadingStore';

// ============================================================================
// ANALYTICS SYSTEM
// ============================================================================

export { StorySimulator } from '@writewhisker/analytics';
export type {
  SimulationOptions,
  SimulationResult,
} from '@writewhisker/analytics';

export { StoryAnalytics } from '@writewhisker/analytics';
export { PlaythroughRecorder } from '@writewhisker/analytics';

export type {
  PlaythroughData,
  PassageVisitData,
  StoryMetrics,
} from '@writewhisker/analytics';

// ============================================================================
// IMPORT/EXPORT SERVICES
// ============================================================================

export { TwineImporter } from './import/formats/TwineImporter';

export type {
  ImportResult,
  ImportOptions,
  ConversionIssue,
  LossReport,
} from './import/types';

export type {
  ExportFormat,
  ExportOptions,
} from './export/types';

// ============================================================================
// SCRIPTING SYSTEM
// ============================================================================

export { LuaEngine, getLuaEngine, type LuaExecutionResult } from '@writewhisker/scripting';
export { LuaExecutor } from './scripting/LuaExecutor';

// Expression Evaluator
export {
  ExpressionEvaluator,
  evaluate,
  createEvaluator,
} from '@writewhisker/scripting';

// Whisker API
export {
  WhiskerApi,
  createWhiskerApi,
} from '@writewhisker/scripting';

// ============================================================================
// RUNTIME (Advanced Features)
// ============================================================================

// Runtime Container
export {
  Container,
  createContainer,
  createTestContainer,
  createLightContainer,
} from '@writewhisker/scripting';

// Thread Scheduler
export {
  ThreadScheduler,
  createThreadScheduler,
} from '@writewhisker/scripting';

// Timed Content
export {
  TimedContent,
  createTimedContent,
  parseTimeString,
} from '@writewhisker/scripting';

// External Functions
export {
  ExternalFunctions,
  createExternalFunctions,
} from '@writewhisker/scripting';

// LIST State Machine
export {
  ListValue,
  ListRegistry,
  createListRegistry,
} from '@writewhisker/scripting';

// Text Effects
export {
  TextEffects,
  createTextEffects,
  BUILTIN_EFFECTS,
} from '@writewhisker/scripting';

// Audio Effects
export {
  AudioEffects,
  createAudioEffects,
} from '@writewhisker/scripting';

// Parameterized Passages
export {
  ParameterizedPassages,
  createParameterizedPassages,
  parsePassageHeader,
  parsePassageCall,
} from '@writewhisker/scripting';

// Runtime Types
export type {
  Thread,
  ThreadState,
  Timer,
  TimerState,
  ContainerOptions,
  ContainerState,
  StepResult,
  ListValueConfig,
  PassageHeader,
  PassageCall,
  EffectType,
  EffectDefinition,
  AudioGroup,
} from '@writewhisker/scripting';

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

export {
  CSPGenerator,
  createCSPGenerator,
  DEFAULT_CSP_CONFIG,
  PERMISSIVE_CSP_CONFIG,
} from '@writewhisker/scripting';

export {
  sha256Hex,
  sha256Base64,
  generateSRI,
  verifySRI,
  generateKey,
} from '@writewhisker/scripting';

export type {
  CSPConfig,
  HashAlgorithm,
} from '@writewhisker/scripting';

// ============================================================================
// STORE ADAPTERS (for SaaS applications and external integrations)
// ============================================================================

export type {
  StoreAdapter,
  WritableStoreAdapter,
  StoryStateAdapter,
  HistoryAdapter,
  NotificationAdapter,
  ValidationAdapter,
  EditorAdapter,
} from './adapters';

export {
  svelteStoreAdapter,
  createSvelteEditorAdapter,
  createSupabaseEditorAdapter,
} from './adapters';

// ============================================================================
// TYPE GUARDS & HELPERS
// ============================================================================

import { pluginManager as _pluginManager } from './plugins/PluginManager';

/**
 * Check if a plugin is registered
 */
export function isPluginRegistered(pluginName: string): boolean {
  return _pluginManager.getPlugin(pluginName) !== null;
}

/**
 * Get plugin version
 */
export function getPluginVersion(pluginName: string): string | null {
  const plugin = _pluginManager.getPlugin(pluginName);
  return plugin?.version || null;
}

// ============================================================================
// VERSION INFO
// ============================================================================

export const EDITOR_BASE_VERSION = '0.1.0';

/**
 * Get current editor-base package version
 */
export function getEditorVersion(): string {
  return EDITOR_BASE_VERSION;
}
