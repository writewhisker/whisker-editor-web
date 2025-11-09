/**
 * @deprecated This file is a backward-compatible facade.
 * New code should import from the focused stores:
 * - storyStateStore.ts
 * - selectionStore.ts
 * - passageOperationsStore.ts
 * - projectMetadataStore.ts
 * - fileOperationsStore.ts
 * - historyIntegrationStore.ts
 */

// Import all stores and actions from the new focused stores
import {
  currentStory,
  storyStateActions,
  passageList,
  variableList,
  passageCount,
  storyMetadata,
} from './storyStateStore';

import {
  selectedPassageId,
  selectedPassage,
  selectionActions,
  hasSelection,
} from './selectionStore';

import {
  passageOperations,
} from './passageOperationsStore';

import {
  currentFilePath,
  unsavedChanges,
  projectMetadataActions,
} from './projectMetadataStore';

import {
  fileOperations,
} from './fileOperationsStore';

import {
  historyIntegration,
} from './historyIntegrationStore';

// Re-export all stores and actions
export {
  currentStory,
  storyStateActions,
  passageList,
  variableList,
  passageCount,
  storyMetadata,
  selectedPassageId,
  selectedPassage,
  selectionActions,
  hasSelection,
  passageOperations,
  currentFilePath,
  unsavedChanges,
  projectMetadataActions,
  fileOperations,
  historyIntegration,
};

// Re-export models for convenience
export { Story } from '@whisker/core-ts';
export { Passage } from '@whisker/core-ts';

/**
 * Legacy projectActions object for backward compatibility
 * This maintains the old API while delegating to the new stores
 */
export const projectActions = {
  // Project lifecycle
  newProject: (title?: string) => fileOperations.newProject(title),
  loadProject: (data: any, filePath?: string) => fileOperations.loadProject(data, filePath),
  saveProject: () => fileOperations.saveProject(),
  closeProject: () => fileOperations.closeProject(),
  markChanged: () => projectMetadataActions.markChanged(),

  // Passage operations
  addPassage: (title?: string) => {
    const passage = passageOperations.addPassage(title);
    if (passage) {
      projectMetadataActions.markChanged();
      historyIntegration.pushCurrentState();
    }
    return passage;
  },

  updatePassage: (passageId: string, updates: any) => {
    const changed = passageOperations.updatePassage(passageId, updates);
    if (changed) {
      projectMetadataActions.markChanged();
      historyIntegration.pushCurrentState();
    }
  },

  deletePassage: (passageId: string) => {
    passageOperations.deletePassage(passageId);
    projectMetadataActions.markChanged();
    historyIntegration.pushCurrentState();
  },

  duplicatePassage: (passageId: string) => {
    const passage = passageOperations.duplicatePassage(passageId);
    if (passage) {
      projectMetadataActions.markChanged();
      historyIntegration.pushCurrentState();
    }
    return passage;
  },

  // History operations
  undo: () => historyIntegration.undo(),
  redo: () => historyIntegration.redo(),

  // Storage operations
  saveToStorage: () => fileOperations.saveToStorage(),
  loadFromStorage: (projectId: string) => fileOperations.loadFromStorage(projectId),
  listProjects: () => fileOperations.listProjects(),
};
