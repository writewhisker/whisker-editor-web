import type { ComponentType } from 'svelte';
import type { Passage } from '../models/Passage';

/**
 * Plugin System Type Definitions
 * Enables extensibility for the Whisker editor
 */

// Passage type definition for plugins
export interface PassageType {
  type: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
}

// Custom action definition
export interface CustomAction {
  type: string;
  label: string;
  description?: string;
  execute: (context: ActionContext, params: any) => Promise<void> | void;
}

// Custom condition definition
export interface CustomCondition {
  type: string;
  label: string;
  description?: string;
  evaluate: (context: ConditionContext, params: any) => boolean;
}

// Action execution context
export interface ActionContext {
  currentPassage: Passage | null;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}

// Condition evaluation context
export interface ConditionContext {
  currentPassage: Passage | null;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}

// UI extension points
export interface PluginUIExtensions {
  sidebar?: ComponentType;
  inspector?: ComponentType;
  toolbar?: ComponentType;
  menuBar?: ComponentType;
  contextMenu?: ComponentType;
}

// Runtime hooks
export interface PluginRuntimeHooks {
  onInit?: (context: RuntimeContext) => void | Promise<void>;
  onStoryLoad?: (context: RuntimeContext) => void | Promise<void>;
  onPassageEnter?: (passage: Passage, context: RuntimeContext) => void | Promise<void>;
  onPassageExit?: (passage: Passage, context: RuntimeContext) => void | Promise<void>;
  onVariableChange?: (name: string, value: any, context: RuntimeContext) => void;
  onSave?: (context: RuntimeContext) => void | Promise<void>;
  onLoad?: (context: RuntimeContext) => void | Promise<void>;
}

// Runtime context
export interface RuntimeContext {
  storyState: Record<string, any>;
  variables: Map<string, any>;
  currentPassage: Passage | null;
  history: string[]; // Passage IDs
}

// Main plugin interface
export interface EditorPlugin {
  // Metadata
  name: string;
  version: string;
  author?: string;
  description?: string;

  // Optional features
  nodeTypes?: PassageType[];
  actions?: CustomAction[];
  conditions?: CustomCondition[];
  ui?: PluginUIExtensions;
  runtime?: PluginRuntimeHooks;

  // Lifecycle
  onRegister?: () => void | Promise<void>;
  onUnregister?: () => void | Promise<void>;
}

// Plugin registry entry
export interface PluginRegistryEntry {
  plugin: EditorPlugin;
  enabled: boolean;
  registeredAt: Date;
}
