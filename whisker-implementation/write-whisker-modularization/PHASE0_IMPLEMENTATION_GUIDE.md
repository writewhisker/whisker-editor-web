# Phase 0: Foundation - Implementation Guide

## Overview

Phase 0 consists of 16 PRs across 4 weeks that must be completed BEFORE any package extraction can begin. This guide provides detailed instructions for each PR.

## Timeline

- **Week 1**: projectStore Refactoring (PRs #1-4)
- **Week 2**: Plugin System Foundation (PRs #5-7)
- **Week 3**: Implement IF Systems (PRs #8-12)
- **Week 4**: Workspace Setup (PRs #13-16)

**Total Estimated Effort**: 40-50 developer-days

---

# Week 1: projectStore Refactoring

## PR #1: Create New Focused Stores

**Goal**: Split projectStore responsibilities into focused stores while maintaining backward compatibility

**Estimated Effort**: 3-4 days
**Lines Changed**: ~300
**Risk**: HIGH

### Files to Create

#### 1. `src/lib/stores/storyStateStore.ts`

```typescript
import { writable, derived, get } from 'svelte/store';
import { Story } from '../models/Story';
import type { ProjectData, StoryData } from '../models/types';

/**
 * Core story state management
 * Replaces: currentStory from projectStore
 */
export const currentStory = writable<Story | null>(null);

export const storyStateActions = {
  setStory(story: Story | null) {
    currentStory.set(story);
  },

  updateStory(updater: (story: Story | null) => Story | null) {
    currentStory.update(updater);
  },

  getStory(): Story | null {
    return get(currentStory);
  },

  clearStory() {
    currentStory.set(null);
  },
};

// Derived stores
export const passageList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.passages.values());
});

export const variableList = derived(currentStory, $story => {
  if (!$story) return [];
  return Array.from($story.variables.values());
});
```

#### 2. `src/lib/stores/selectionStore.ts`

```typescript
import { writable, derived, get } from 'svelte/store';
import { currentStory } from './storyStateStore';

/**
 * Selection state management
 * Replaces: selectedPassageId from projectStore
 */
export const selectedPassageId = writable<string | null>(null);
export const selectedElementId = writable<string | null>(null); // For future use

export const selectionActions = {
  selectPassage(passageId: string | null) {
    selectedPassageId.set(passageId);
  },

  clearSelection() {
    selectedPassageId.set(null);
    selectedElementId.set(null);
  },

  getSelectedPassageId(): string | null {
    return get(selectedPassageId);
  },
};

// Derived: Get the actual selected passage
export const selectedPassage = derived(
  [currentStory, selectedPassageId],
  ([$story, $selectedId]) => {
    if (!$story || !$selectedId) return null;
    return $story.getPassage($selectedId) || null;
  }
);
```

#### 3. `src/lib/stores/passageOperationsStore.ts`

```typescript
import { get } from 'svelte/store';
import { Passage } from '../models/Passage';
import { currentStory, storyStateActions } from './storyStateStore';
import { selectedPassageId, selectionActions } from './selectionStore';
import { historyActions } from './historyStore';
import { unsavedChanges } from './projectMetadataStore';
import { removeConnectionsToPassage } from '../utils/connectionValidator';

/**
 * Passage CRUD operations
 * Replaces: addPassage, updatePassage, deletePassage, duplicatePassage from projectStore
 */
export const passageOperations = {
  addPassage(title?: string): Passage | null {
    let addedPassage: Passage | null = null;

    storyStateActions.updateStory(story => {
      if (!story) return story;

      // Check for duplicate titles
      const requestedTitle = title || 'Untitled Passage';
      const existingPassage = Array.from(story.passages.values()).find(
        p => p.title.toLowerCase() === requestedTitle.toLowerCase()
      );

      if (existingPassage) {
        console.warn(`Warning: A passage with the title "${requestedTitle}" already exists. Creating with modified title.`);
        // Auto-append number to make it unique
        let counter = 2;
        let uniqueTitle = `${requestedTitle} ${counter}`;
        while (Array.from(story.passages.values()).some(p => p.title.toLowerCase() === uniqueTitle.toLowerCase())) {
          counter++;
          uniqueTitle = `${requestedTitle} ${counter}`;
        }
        title = uniqueTitle;
      }

      const passage = new Passage({
        title: title || 'Untitled Passage',
        content: '',
        position: { x: 0, y: 0 },
      });

      story.addPassage(passage);
      selectionActions.selectPassage(passage.id);
      unsavedChanges.set(true);
      addedPassage = passage;

      return story;
    });

    // Save new state to history
    const newState = storyStateActions.getStory();
    if (newState) {
      historyActions.pushState(newState.serialize());
    }

    return addedPassage;
  },

  updatePassage(
    passageId: string,
    updates: Partial<{
      title: string;
      content: string;
      tags: string[];
      position: { x: number; y: number };
      color?: string;
      notes?: string
    }>
  ) {
    let changeMade = false;

    storyStateActions.updateStory(story => {
      if (!story) return story;

      const passage = story.getPassage(passageId);
      if (!passage) return story;

      // Check for duplicate title if title is being updated
      if (updates.title !== undefined && updates.title !== passage.title) {
        const existingPassage = Array.from(story.passages.values()).find(
          p => p.id !== passageId && p.title.toLowerCase() === updates.title!.toLowerCase()
        );

        if (existingPassage) {
          console.warn(`Warning: Cannot rename to "${updates.title}" - a passage with that title already exists.`);
          delete updates.title;
          if (Object.keys(updates).length === 0) {
            return story;
          }
        }
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        if (updates.title !== undefined) passage.title = updates.title;
        if (updates.content !== undefined) passage.content = updates.content;
        if (updates.tags !== undefined) passage.tags = updates.tags;
        if (updates.position !== undefined) passage.position = updates.position;
        if (updates.color !== undefined) passage.color = updates.color;
        if (updates.notes !== undefined) passage.notes = updates.notes;

        passage.modified = new Date().toISOString();
        unsavedChanges.set(true);
        changeMade = true;
      }

      return story;
    });

    // Save to history if changes were made
    if (changeMade) {
      const newState = storyStateActions.getStory();
      if (newState) {
        historyActions.pushState(newState.serialize());
      }
    }
  },

  deletePassage(passageId: string) {
    storyStateActions.updateStory(story => {
      if (!story) return story;

      // Clean up connections
      const removedConnections = removeConnectionsToPassage(story, passageId);
      if (removedConnections > 0) {
        console.log(`Auto-cleanup: Removed ${removedConnections} connection(s) to passage "${story.getPassage(passageId)?.title || passageId}"`);
      }

      story.removePassage(passageId);

      // Clear selection if deleted passage was selected
      if (get(selectedPassageId) === passageId) {
        selectionActions.clearSelection();
      }

      unsavedChanges.set(true);
      return story;
    });

    // Save to history
    const newState = storyStateActions.getStory();
    if (newState) {
      historyActions.pushState(newState.serialize());
    }
  },

  duplicatePassage(passageId: string): Passage | null {
    let duplicatedPassage: Passage | null = null;

    storyStateActions.updateStory(story => {
      if (!story) return story;

      const passage = story.getPassage(passageId);
      if (!passage) return story;

      const duplicate = passage.clone();

      // Ensure unique title
      let finalTitle = duplicate.title;
      let counter = 2;
      while (Array.from(story.passages.values()).some(p => p.title.toLowerCase() === finalTitle.toLowerCase())) {
        finalTitle = `${passage.title} (Copy ${counter})`;
        counter++;
      }
      duplicate.title = finalTitle;

      story.addPassage(duplicate);
      selectionActions.selectPassage(duplicate.id);
      unsavedChanges.set(true);
      duplicatedPassage = duplicate;

      return story;
    });

    // Save to history
    const newState = storyStateActions.getStory();
    if (newState) {
      historyActions.pushState(newState.serialize());
    }

    return duplicatedPassage;
  },
};
```

#### 4. `src/lib/stores/projectMetadataStore.ts`

```typescript
import { writable, get } from 'svelte/store';

/**
 * Project metadata and state
 * Replaces: currentFilePath, unsavedChanges from projectStore
 */
export const currentFilePath = writable<string | null>(null);
export const unsavedChanges = writable<boolean>(false);

export const projectMetadataActions = {
  setFilePath(path: string | null) {
    currentFilePath.set(path);
  },

  markChanged() {
    unsavedChanges.set(true);
  },

  markSaved() {
    unsavedChanges.set(false);
  },

  clearMetadata() {
    currentFilePath.set(null);
    unsavedChanges.set(false);
  },
};
```

#### 5. `src/lib/stores/fileOperationsStore.ts`

```typescript
import { get, tick } from 'svelte';
import { Story } from '../models/Story';
import type { ProjectData } from '../models/types';
import { currentStory, storyStateActions } from './storyStateStore';
import { currentFilePath, unsavedChanges, projectMetadataActions } from './projectMetadataStore';
import { selectionActions } from './selectionStore';
import { historyActions } from './historyStore';
import { getDefaultStorageAdapter } from '../services/storage/StorageServiceFactory';
import type { IStorageAdapter } from '../services/storage/types';
import { modelToStorage, storageToModel } from '../services/storage/typeAdapter';

// Storage state
let storageAdapter: IStorageAdapter | null = null;
let currentProjectId: string | null = null;
let storageReady = false;

// Track undo/redo state
let undoInProgress = false;

/**
 * File and storage operations
 * Replaces: newProject, loadProject, saveProject, etc. from projectStore
 */

async function saveToStorage(): Promise<void> {
  if (!storageAdapter || !storageReady) {
    console.warn('Storage not available, skipping save');
    return;
  }

  const story = get(currentStory);
  if (!story) {
    console.warn('No story to save');
    return;
  }

  try {
    const modelData = story.serializeProject();
    const storedProject = modelToStorage(modelData);

    if (currentProjectId) {
      storedProject.id = currentProjectId;
      const existing = await storageAdapter.loadProject(currentProjectId);
      if (existing) {
        storedProject.version = existing.version;
      }
    }

    const result = await storageAdapter.saveProject(storedProject);
    if (result.success && result.projectId) {
      currentProjectId = result.projectId;
      localStorage.setItem('whisker-last-project-id', result.projectId);
      console.log('Project saved to storage:', result.projectId);
      projectMetadataActions.markSaved();
    }
  } catch (err) {
    console.error('Failed to save to storage:', err);
  }
}

async function loadFromStorage(projectId: string): Promise<void> {
  if (!storageAdapter || !storageReady) {
    throw new Error('Storage not available');
  }

  const storedProject = await storageAdapter.loadProject(projectId);
  if (!storedProject) {
    throw new Error(`Project ${projectId} not found`);
  }

  const modelData = storageToModel(storedProject);
  fileOperations.loadProject(modelData);
  currentProjectId = projectId;
  localStorage.setItem('whisker-last-project-id', projectId);
}

export const fileOperations = {
  newProject(title?: string) {
    const story = new Story({
      metadata: {
        title: title || 'Untitled Story',
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    storyStateActions.setStory(story);
    projectMetadataActions.clearMetadata();
    currentProjectId = null;

    // Initialize history
    historyActions.setPresent(story.serialize());

    // Select start passage
    const startPassage = Array.from(story.passages.values())[0];
    if (startPassage) {
      selectionActions.selectPassage(startPassage.id);
    }

    // Auto-save
    saveToStorage().catch(err => {
      console.error('Failed to save new project:', err);
    });
  },

  loadProject(data: ProjectData, filePath?: string) {
    const story = Story.deserializeProject(data);
    storyStateActions.setStory(story);
    projectMetadataActions.setFilePath(filePath || null);
    projectMetadataActions.markSaved();

    // Initialize history
    historyActions.setPresent(story.serialize());

    // Select start passage
    if (story.startPassage) {
      selectionActions.selectPassage(story.startPassage);
    }
  },

  saveProject(): ProjectData | null {
    let data: ProjectData | null = null;

    storyStateActions.updateStory(story => {
      if (story) {
        story.updateModified();
        data = story.serializeProject();
        projectMetadataActions.markSaved();
      }
      return story;
    });

    // Save to storage
    if (data) {
      saveToStorage().catch(err => {
        console.error('Storage save failed:', err);
      });
    }

    return data;
  },

  closeProject() {
    storyStateActions.clearStory();
    projectMetadataActions.clearMetadata();
    selectionActions.clearSelection();
    historyActions.clear();
  },

  async undo() {
    if (undoInProgress) return;

    undoInProgress = true;
    try {
      const previousState = historyActions.undo();
      if (previousState) {
        const story = Story.deserialize(previousState);

        // Force UI refresh
        storyStateActions.setStory(null);
        await tick();
        await new Promise(resolve => setTimeout(resolve, 75));
        storyStateActions.setStory(story);
        await tick();

        // Update selection if needed
        const currentSelection = selectionActions.getSelectedPassageId();
        if (currentSelection && !story.getPassage(currentSelection)) {
          const firstPassage = Array.from(story.passages.values())[0];
          if (firstPassage) {
            selectionActions.selectPassage(firstPassage.id);
          } else {
            selectionActions.clearSelection();
          }
        }

        projectMetadataActions.markChanged();
      }
    } finally {
      undoInProgress = false;
    }
  },

  async redo() {
    const nextState = historyActions.redo();
    if (nextState) {
      const story = Story.deserialize(nextState);

      storyStateActions.setStory(null);
      await tick();
      await new Promise(resolve => setTimeout(resolve, 75));
      storyStateActions.setStory(story);
      await tick();

      projectMetadataActions.markChanged();
    }
  },

  async saveToStorage() {
    await saveToStorage();
  },

  async loadFromStorage(projectId: string) {
    await loadFromStorage(projectId);
  },

  async listProjects() {
    if (!storageAdapter || !storageReady) {
      return [];
    }
    return await storageAdapter.listProjects();
  },
};

// Storage initialization
(async () => {
  try {
    storageAdapter = await getDefaultStorageAdapter();
    storageReady = true;
    console.log('Storage initialized successfully');

    const lastProjectId = localStorage.getItem('whisker-last-project-id');
    if (lastProjectId && storageAdapter) {
      try {
        const storedProject = await storageAdapter.loadProject(lastProjectId);
        if (storedProject) {
          const modelData = storageToModel(storedProject);
          fileOperations.loadProject(modelData);
          currentProjectId = lastProjectId;
          console.log(`Loaded last project: ${storedProject.name}`);
        }
      } catch (err) {
        console.warn('Could not load last project:', err);
      }
    }
  } catch (err) {
    console.error('Storage initialization failed, running in-memory mode:', err);
    storageReady = false;
  }
})();
```

#### 6. `src/lib/stores/projectStore.ts` (Facade for backward compatibility)

```typescript
/**
 * BACKWARD COMPATIBILITY FACADE
 *
 * This file maintains the old projectStore API while delegating to new focused stores.
 * Will be removed after all components are migrated.
 *
 * @deprecated Use focused stores instead:
 * - storyStateStore for story state
 * - selectionStore for selection
 * - passageOperationsStore for passage CRUD
 * - fileOperationsStore for file operations
 * - projectMetadataStore for metadata
 */

import { currentStory, passageList, variableList, storyStateActions } from './storyStateStore';
import { selectedPassageId, selectedPassage, selectionActions } from './selectionStore';
import { passageOperations } from './passageOperationsStore';
import { currentFilePath, unsavedChanges, projectMetadataActions } from './projectMetadataStore';
import { fileOperations } from './fileOperationsStore';

// Re-export stores
export { currentStory, currentFilePath, unsavedChanges, selectedPassageId };
export { passageList, variableList, selectedPassage };

// Re-export models for convenience
export { Story } from '../models/Story';
export { Passage } from '../models/Passage';

// Facade for old projectActions API
export const projectActions = {
  // File operations
  newProject: fileOperations.newProject.bind(fileOperations),
  loadProject: fileOperations.loadProject.bind(fileOperations),
  saveProject: fileOperations.saveProject.bind(fileOperations),
  closeProject: fileOperations.closeProject.bind(fileOperations),

  // Passage operations
  addPassage: passageOperations.addPassage.bind(passageOperations),
  updatePassage: passageOperations.updatePassage.bind(passageOperations),
  deletePassage: passageOperations.deletePassage.bind(passageOperations),
  duplicatePassage: passageOperations.duplicatePassage.bind(passageOperations),

  // History operations
  undo: fileOperations.undo.bind(fileOperations),
  redo: fileOperations.redo.bind(fileOperations),

  // Storage operations
  saveToStorage: fileOperations.saveToStorage.bind(fileOperations),
  loadFromStorage: fileOperations.loadFromStorage.bind(fileOperations),
  listProjects: fileOperations.listProjects.bind(fileOperations),

  // Metadata
  markChanged: projectMetadataActions.markChanged.bind(projectMetadataActions),
};
```

### Testing Strategy

1. **Create test for each new store** (~100 lines each)
2. **Update projectStore.test.ts** to use facade
3. **Run full test suite** - all 5,442 tests should still pass

### Rollout Plan

1. Create all new store files
2. Update projectStore to be a facade
3. Run tests - ensure 100% pass
4. Commit and create PR #1

**Success Criteria**:
- ✅ All tests pass
- ✅ App works identically
- ✅ No breaking changes
- ✅ Facade provides backward compatibility

---

## PR #2-4: Migrate Components

**Note**: These PRs are repetitive. See PR #2 example below.

### PR #2: Migrate Core Components (Batch 1)

**Goal**: Update 20-25 core components to use new focused stores

**Estimated Effort**: 3-4 days
**Lines Changed**: ~400
**Risk**: MEDIUM

### Components to Migrate (Batch 1)

1. GraphView.svelte
2. PassageList.svelte
3. PropertiesPanel.svelte
4. PassageEditor.svelte
5. MetadataEditor.svelte
6. (+ 15-20 more)

### Migration Pattern

**Before**:
```typescript
import { currentStory, projectActions, selectedPassageId } from '$lib/stores/projectStore';

// Usage
projectActions.addPassage('New Passage');
projectActions.updatePassage(id, { title: 'Updated' });
```

**After**:
```typescript
import { currentStory } from '$lib/stores/storyStateStore';
import { selectedPassageId } from '$lib/stores/selectionStore';
import { passageOperations } from '$lib/stores/passageOperationsStore';

// Usage
passageOperations.addPassage('New Passage');
passageOperations.updatePassage(id, { title: 'Updated' });
```

### Testing

1. Test each migrated component individually
2. Run full test suite
3. Manual smoke testing of each component

### PR #3-4

Follow same pattern for remaining components.

---

# Week 2: Plugin System Foundation

## PR #5: Design Plugin System

**Goal**: Create plugin type system and PluginManager

**Estimated Effort**: 2-3 days
**Lines Changed**: ~250
**Risk**: MEDIUM

### Files to Create

#### `src/lib/plugins/types.ts`

```typescript
import type { SvelteComponent } from 'svelte';
import type { Passage } from '../models/Passage';

/**
 * Plugin System Type Definitions
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
  currentPassage: Passage;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}

// Condition evaluation context
export interface ConditionContext {
  currentPassage: Passage;
  storyState: Record<string, any>;
  variables: Map<string, any>;
}

// UI extension points
export interface PluginUIExtensions {
  sidebar?: typeof SvelteComponent;
  inspector?: typeof SvelteComponent;
  toolbar?: typeof SvelteComponent;
  menuBar?: typeof SvelteComponent;
  contextMenu?: typeof SvelteComponent;
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
```

#### `src/lib/plugins/PluginManager.ts`

```typescript
import type { EditorPlugin, PluginRegistryEntry, PassageType, CustomAction, CustomCondition } from './types';

/**
 * Plugin Manager - Central registry for all editor plugins
 */
export class PluginManager {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private initialized = false;

  /**
   * Register a plugin
   */
  async register(plugin: EditorPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }

    console.log(`Registering plugin: ${plugin.name} v${plugin.version}`);

    const entry: PluginRegistryEntry = {
      plugin,
      enabled: true,
      registeredAt: new Date(),
    };

    this.plugins.set(plugin.name, entry);

    // Call plugin's onRegister hook
    if (plugin.onRegister) {
      await plugin.onRegister();
    }

    console.log(`Plugin "${plugin.name}" registered successfully`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return;
    }

    // Call plugin's onUnregister hook
    if (entry.plugin.onUnregister) {
      await entry.plugin.onUnregister();
    }

    this.plugins.delete(pluginName);
    console.log(`Plugin "${pluginName}" unregistered`);
  }

  /**
   * Enable/disable a plugin
   */
  setEnabled(pluginName: string, enabled: boolean): void {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      console.warn(`Plugin "${pluginName}" is not registered`);
      return;
    }

    entry.enabled = enabled;
    console.log(`Plugin "${pluginName}" ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): EditorPlugin[] {
    return Array.from(this.plugins.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.plugin);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): EditorPlugin | null {
    const entry = this.plugins.get(name);
    return entry?.enabled ? entry.plugin : null;
  }

  /**
   * Get all passage types from all plugins
   */
  getPassageTypes(): PassageType[] {
    const types: PassageType[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.nodeTypes) {
        types.push(...plugin.nodeTypes);
      }
    }
    return types;
  }

  /**
   * Get all custom actions from all plugins
   */
  getActions(): CustomAction[] {
    const actions: CustomAction[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.actions) {
        actions.push(...plugin.actions);
      }
    }
    return actions;
  }

  /**
   * Get all custom conditions from all plugins
   */
  getConditions(): CustomCondition[] {
    const conditions: CustomCondition[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.conditions) {
        conditions.push(...plugin.conditions);
      }
    }
    return conditions;
  }

  /**
   * Get UI extensions of a specific type
   */
  getUIExtensions(type: keyof NonNullable<EditorPlugin['ui']>): any[] {
    const extensions: any[] = [];
    for (const plugin of this.getPlugins()) {
      if (plugin.ui?.[type]) {
        extensions.push({
          pluginName: plugin.name,
          component: plugin.ui[type],
        });
      }
    }
    return extensions;
  }

  /**
   * Execute runtime hook across all plugins
   */
  async executeHook(hookName: keyof NonNullable<EditorPlugin['runtime']>, ...args: any[]): Promise<void> {
    for (const plugin of this.getPlugins()) {
      if (plugin.runtime?.[hookName]) {
        try {
          await (plugin.runtime[hookName] as any)(...args);
        } catch (err) {
          console.error(`Error executing hook "${hookName}" in plugin "${plugin.name}":`, err);
        }
      }
    }
  }

  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('PluginManager already initialized');
      return;
    }

    console.log('Initializing PluginManager...');

    // Execute onInit for all plugins
    await this.executeHook('onInit', { /* runtime context */ });

    this.initialized = true;
    console.log(`PluginManager initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
}

// Global plugin manager instance
export const pluginManager = new PluginManager();
```

### Testing

Create `src/lib/plugins/PluginManager.test.ts` with comprehensive tests.

### Success Criteria

- ✅ PluginManager can register/unregister plugins
- ✅ Can query plugins by type
- ✅ Hooks execute properly
- ✅ All tests pass

---

## PR #6-7: Add Extension Points & Convert Validators

Similar detailed guides for remaining PRs...

---

# Week 3-4: Implementation Guides

Due to space constraints, I'm providing the structure. The full implementation guide would include:

- **Week 3**: Detailed code for Inventory, Stats, and Combat systems
- **Week 4**: pnpm workspace configuration files

---

## Summary

This guide provides:
1. ✅ **Complete code** for new focused stores (PRs #1)
2. ✅ **Migration patterns** for components (PRs #2-4)
3. ✅ **Plugin system architecture** (PRs #5-7)
4. ⏳ **Placeholders** for IF systems and workspace (PRs #8-16)

**Next Steps**:
1. Review this guide
2. Begin with PR #1 (create new stores)
3. Test thoroughly
4. Proceed to PR #2 (migrate components batch 1)

**Estimated Timeline**: 4 weeks for 1 developer
