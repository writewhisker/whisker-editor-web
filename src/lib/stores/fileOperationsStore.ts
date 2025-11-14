import { get } from 'svelte/store';
import { storyStateActions } from './storyStateStore';
import { projectMetadataActions } from './projectMetadataStore';
import { selectionActions } from './selectionStore';
import { historyActions } from './historyStore';
import type { ProjectData } from '@whisker/core-ts';
import { getDefaultStorageAdapter } from '../services/storage/StorageServiceFactory';
import type { IStorageAdapter } from '../services/storage/types';
import { modelToStorage, storageToModel } from '../services/storage/typeAdapter';

/**
 * File operations store
 * Handles saving/loading projects to/from storage
 */

// Storage state
let storageAdapter: IStorageAdapter | null = null;
let currentProjectId: string | null = null;
let storageReady = false;

/**
 * Save current project to storage
 */
async function saveToStorage(): Promise<void> {
  if (!storageAdapter || !storageReady) {
    console.warn('Storage not available, skipping save');
    return;
  }

  const story = storyStateActions.getStory();
  if (!story) {
    console.warn('No story to save');
    return;
  }

  try {
    const modelData = story.serializeProject();
    const storedProject = modelToStorage(modelData);

    // If we have a current project ID, update version
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
      // Remember last project
      localStorage.setItem('whisker-last-project-id', result.projectId);
      console.log('Project saved to storage:', result.projectId);
      projectMetadataActions.markSaved();
    }
  } catch (err) {
    console.error('Failed to save to storage:', err);
    // Don't throw - allow app to continue working
  }
}

/**
 * Load project from storage by ID
 */
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

/**
 * File operations
 */
export const fileOperations = {
  /**
   * Create a new project
   */
  newProject(title?: string) {
    console.log('[fileOperationsStore] newProject called with title:', title);
    const story = storyStateActions.createStory(title);
    console.log('[fileOperationsStore] After createStory, story has', story.passages.size, 'passages');
    projectMetadataActions.clearMetadata();

    // Reset storage tracking for new project
    currentProjectId = null;

    // Initialize history with the new story state
    historyActions.setPresent(story.serialize());

    // Select the start passage
    console.log('[fileOperationsStore] About to selectStartPassage, story.startPassage:', story.startPassage);
    selectionActions.selectStartPassage();

    // Auto-save new project to storage
    saveToStorage().catch(err => {
      console.error('Failed to save new project:', err);
    });
  },

  /**
   * Load a project from project data
   */
  loadProject(data: ProjectData, filePath?: string) {
    const story = storyStateActions.loadStory(data);
    projectMetadataActions.setFilePath(filePath || null);
    projectMetadataActions.markSaved();

    // Initialize history with the loaded story state
    historyActions.setPresent(story.serialize());

    // Select start passage
    selectionActions.selectStartPassage();
  },

  /**
   * Save the current project and return the project data
   */
  saveProject(): ProjectData | null {
    const data = storyStateActions.serializeStory();

    if (!data) return null;

    projectMetadataActions.markSaved();

    // Save to storage (async, non-blocking)
    saveToStorage().catch(err => {
      console.error('Storage save failed:', err);
    });

    return data;
  },

  /**
   * Close the current project
   */
  closeProject() {
    storyStateActions.clearStory();
    projectMetadataActions.clearMetadata();
    selectionActions.clearSelection();
    historyActions.clear();
    currentProjectId = null;
  },

  /**
   * Save current project to storage
   */
  async saveToStorage() {
    await saveToStorage();
  },

  /**
   * Load project from storage by ID
   */
  async loadFromStorage(projectId: string) {
    await loadFromStorage(projectId);
  },

  /**
   * List all projects in storage
   */
  async listProjects() {
    if (!storageAdapter || !storageReady) {
      return [];
    }
    return await storageAdapter.listProjects();
  },

  /**
   * Check if storage is ready
   */
  isStorageReady(): boolean {
    return storageReady;
  },

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return currentProjectId;
  },
};

// Storage initialization
(async () => {
  try {
    storageAdapter = await getDefaultStorageAdapter();
    storageReady = true;
    console.log('Storage initialized successfully');

    // Try to load last project from localStorage preference
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
