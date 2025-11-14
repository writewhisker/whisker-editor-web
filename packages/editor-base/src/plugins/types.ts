import type { ComponentType } from 'svelte';
import type { Passage } from '@whisker/core-ts';

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
  history?: string[];
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
  // Story lifecycle
  onInit?: (context: RuntimeContext) => void | Promise<void>;
  onStoryLoad?: (context: RuntimeContext) => void | Promise<void>;
  onPassageEnter?: (passage: Passage, context: RuntimeContext) => void | Promise<void>;
  onPassageExit?: (passage: Passage, context: RuntimeContext) => void | Promise<void>;
  onVariableChange?: (name: string, value: any, context: RuntimeContext) => void;
  onSave?: (context: RuntimeContext) => void | Promise<void>;
  onLoad?: (context: RuntimeContext) => void | Promise<void>;

  // SaaS-specific hooks
  onProjectCreate?: (projectId: string, context: RuntimeContext) => void | Promise<void>;
  onProjectDelete?: (projectId: string, context: RuntimeContext) => void | Promise<void>;
  onPublish?: (publishUrl: string, context: RuntimeContext) => void | Promise<void>;
  onUnpublish?: (context: RuntimeContext) => void | Promise<void>;
  onUserIdentify?: (userId: string, traits: Record<string, any>) => void | Promise<void>;
  onAnalyticsEvent?: (eventName: string, properties: Record<string, any>) => void | Promise<void>;
}

// Runtime context
export interface RuntimeContext {
  storyState: Record<string, any>;
  variables: Map<string, any>;
  currentPassage: Passage | null;
  history: string[]; // Passage IDs
  // SaaS context (optional, for multi-tenant applications)
  userId?: string;
  projectId?: string;
  organizationId?: string;
  permissions?: string[];
}

// Storage context for plugin storage operations
export interface StorageContext {
  userId: string;
  projectId: string;
  pluginId: string;
}

// SaaS Plugin Extensions (for multi-tenant and SaaS applications)
export interface SaaSPluginExtensions {
  /** Backend API integration */
  api?: {
    endpoints?: Record<string, (params: any) => Promise<any>>;
    middleware?: Array<(req: any, res: any, next: any) => void>;
  };

  /** Subscription/billing checks */
  permissions?: {
    requiredPlan?: 'free' | 'starter' | 'pro' | 'enterprise' | string;
    requiredFeatures?: string[];
    checkAccess?: (user: any) => Promise<boolean>;
  };

  /** Storage integration for plugin data */
  storage?: {
    save?: (data: any, context: StorageContext) => Promise<void>;
    load?: (context: StorageContext) => Promise<any>;
    delete?: (context: StorageContext) => Promise<void>;
  };

  /** Settings/configuration UI and schema */
  settings?: {
    schema?: Record<string, {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      label: string;
      description?: string;
      default?: any;
      required?: boolean;
      validation?: (value: any) => boolean | string;
    }>;
    defaults?: Record<string, any>;
    validateSettings?: (settings: any) => boolean | { valid: boolean; errors: string[] };
  };

  /** Analytics and tracking configuration */
  analytics?: {
    trackingId?: string;
    events?: Record<string, {
      name: string;
      properties?: Record<string, any>;
    }>;
  };
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

  // SaaS extensions (optional, for multi-tenant applications)
  saas?: SaaSPluginExtensions;

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
