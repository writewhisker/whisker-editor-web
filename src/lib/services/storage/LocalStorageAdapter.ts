/**
 * LocalStorage Storage Adapter
 *
 * Implements the IStorageAdapter interface using browser localStorage.
 * This is the default storage backend for the Whisker Editor.
 */

import { nanoid } from 'nanoid';
import type {
	IStorageAdapter,
	StoredProject,
	ProjectMetadata,
	AutoSaveData,
	SaveResult,
	ProjectFilter,
	PreferenceScope,
	SerializedStory
} from './types';
import {
	StorageError,
	StorageNotFoundError,
	StorageQuotaError,
	StorageConflictError
} from './types';

/**
 * LocalStorage keys
 */
const KEYS = {
	PROJECTS_INDEX: 'whisker-projects-index',
	PROJECT_PREFIX: 'whisker-project-',
	AUTOSAVE_PREFIX: 'whisker-autosave-',
	PREFERENCE_PREFIX: 'whisker-preference-',
	USER_PREFERENCE_PREFIX: 'whisker-user-preference-'
} as const;

/**
 * LocalStorage adapter implementation
 */
export class LocalStorageAdapter implements IStorageAdapter {
	private ready = false;
	private projectIndex: Set<string> = new Set();

	/**
	 * Initialize the adapter
	 */
	async initialize(): Promise<void> {
		try {
			// Check if localStorage is available
			if (typeof localStorage === 'undefined') {
				throw new StorageError('localStorage is not available', 'NOT_AVAILABLE');
			}

			// Test localStorage access
			const testKey = '__whisker_test__';
			localStorage.setItem(testKey, 'test');
			localStorage.removeItem(testKey);

			// Load project index
			await this.loadProjectIndex();

			this.ready = true;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				throw new StorageQuotaError('Storage quota exceeded during initialization');
			}
			throw new StorageError(
				`Failed to initialize localStorage adapter: ${error}`,
				'INITIALIZATION_ERROR',
				error
			);
		}
	}

	/**
	 * Check if adapter is ready
	 */
	isReady(): boolean {
		return this.ready;
	}

	/**
	 * Load project index from localStorage
	 */
	private async loadProjectIndex(): Promise<void> {
		try {
			const indexJson = localStorage.getItem(KEYS.PROJECTS_INDEX);
			if (indexJson) {
				const indexArray = JSON.parse(indexJson) as string[];
				this.projectIndex = new Set(indexArray);
			}
		} catch (error) {
			console.error('Failed to load project index, creating new:', error);
			this.projectIndex = new Set();
			await this.saveProjectIndex();
		}
	}

	/**
	 * Save project index to localStorage
	 */
	private async saveProjectIndex(): Promise<void> {
		try {
			const indexArray = Array.from(this.projectIndex);
			localStorage.setItem(KEYS.PROJECTS_INDEX, JSON.stringify(indexArray));
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				throw new StorageQuotaError('Storage quota exceeded while saving project index');
			}
			throw new StorageError('Failed to save project index', 'SAVE_ERROR', error);
		}
	}

	/**
	 * Save a project
	 */
	async saveProject(project: StoredProject): Promise<SaveResult> {
		this.ensureReady();

		try {
			// Generate ID if not provided
			const projectId = project.id || nanoid();
			const now = new Date();

			// Check for conflicts (optimistic locking)
			const existing = await this.loadProject(projectId);
			if (existing && existing.version !== project.version) {
				throw new StorageConflictError('Project has been modified by another process', existing);
			}

			// Increment version
			const newVersion = (project.version || 0) + 1;

			// Create updated project data
			const updatedProject: StoredProject = {
				...project,
				id: projectId,
				version: newVersion,
				updatedAt: now,
				metadata: {
					...project.metadata,
					id: projectId,
					version: newVersion,
					updatedAt: now
				}
			};

			// Serialize and save
			const projectKey = `${KEYS.PROJECT_PREFIX}${projectId}`;
			const serialized = JSON.stringify(updatedProject);

			localStorage.setItem(projectKey, serialized);

			// Update index
			this.projectIndex.add(projectId);
			await this.saveProjectIndex();

			return {
				success: true,
				projectId,
				version: newVersion,
				timestamp: now.getTime()
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				throw new StorageQuotaError('Storage quota exceeded while saving project');
			}
			if (error instanceof StorageConflictError) {
				throw error;
			}
			throw new StorageError(
				`Failed to save project: ${error}`,
				'SAVE_ERROR',
				error
			);
		}
	}

	/**
	 * Load a project
	 */
	async loadProject(projectId: string): Promise<StoredProject | null> {
		this.ensureReady();

		try {
			const projectKey = `${KEYS.PROJECT_PREFIX}${projectId}`;
			const serialized = localStorage.getItem(projectKey);

			if (!serialized) {
				return null;
			}

			const project = JSON.parse(serialized) as StoredProject;

			// Convert date strings back to Date objects
			project.createdAt = new Date(project.createdAt);
			project.updatedAt = new Date(project.updatedAt);
			project.metadata.createdAt = new Date(project.metadata.createdAt);
			project.metadata.updatedAt = new Date(project.metadata.updatedAt);

			return project;
		} catch (error) {
			throw new StorageError(
				`Failed to load project ${projectId}: ${error}`,
				'LOAD_ERROR',
				error
			);
		}
	}

	/**
	 * List all projects
	 */
	async listProjects(filter?: ProjectFilter): Promise<ProjectMetadata[]> {
		this.ensureReady();

		try {
			const metadataList: ProjectMetadata[] = [];

			// Load metadata for all projects
			for (const projectId of this.projectIndex) {
				try {
					const project = await this.loadProject(projectId);
					if (project) {
						metadataList.push(project.metadata);
					}
				} catch (error) {
					console.error(`Failed to load project ${projectId}:`, error);
					// Continue with other projects
				}
			}

			// Apply filters
			let filtered = metadataList;

			if (filter?.searchQuery) {
				const query = filter.searchQuery.toLowerCase();
				filtered = filtered.filter(
					(m) =>
						m.name.toLowerCase().includes(query) ||
						m.description?.toLowerCase().includes(query)
				);
			}

			if (filter?.tags && filter.tags.length > 0) {
				filtered = filtered.filter((m) =>
					filter.tags!.some((tag) => m.tags?.includes(tag))
				);
			}

			if (filter?.ownerId) {
				filtered = filtered.filter((m) => m.ownerId === filter.ownerId);
			}

			// Sort
			const sortBy = filter?.sortBy || 'modified';
			const sortOrder = filter?.sortOrder || 'desc';

			filtered.sort((a, b) => {
				let comparison = 0;
				switch (sortBy) {
					case 'name':
						comparison = a.name.localeCompare(b.name);
						break;
					case 'created':
						comparison = a.createdAt.getTime() - b.createdAt.getTime();
						break;
					case 'modified':
						comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
						break;
				}
				return sortOrder === 'asc' ? comparison : -comparison;
			});

			// Apply pagination
			if (filter?.offset !== undefined || filter?.limit !== undefined) {
				const offset = filter.offset || 0;
				const limit = filter.limit || filtered.length;
				filtered = filtered.slice(offset, offset + limit);
			}

			return filtered;
		} catch (error) {
			throw new StorageError(
				`Failed to list projects: ${error}`,
				'LIST_ERROR',
				error
			);
		}
	}

	/**
	 * Delete a project
	 */
	async deleteProject(projectId: string): Promise<void> {
		this.ensureReady();

		try {
			const projectKey = `${KEYS.PROJECT_PREFIX}${projectId}`;
			const autosaveKey = `${KEYS.AUTOSAVE_PREFIX}${projectId}`;

			// Remove project data
			localStorage.removeItem(projectKey);
			localStorage.removeItem(autosaveKey);

			// Update index
			this.projectIndex.delete(projectId);
			await this.saveProjectIndex();
		} catch (error) {
			throw new StorageError(
				`Failed to delete project ${projectId}: ${error}`,
				'DELETE_ERROR',
				error
			);
		}
	}

	/**
	 * Duplicate a project
	 */
	async duplicateProject(projectId: string, newName: string): Promise<StoredProject> {
		this.ensureReady();

		try {
			const original = await this.loadProject(projectId);
			if (!original) {
				throw new StorageNotFoundError(`Project ${projectId} not found`);
			}

			const now = new Date();
			const newId = nanoid();

			const duplicate: StoredProject = {
				...original,
				id: newId,
				name: newName,
				version: 1,
				createdAt: now,
				updatedAt: now,
				metadata: {
					...original.metadata,
					id: newId,
					name: newName,
					version: 1,
					createdAt: now,
					updatedAt: now
				}
			};

			await this.saveProject(duplicate);

			return duplicate;
		} catch (error) {
			if (error instanceof StorageNotFoundError) {
				throw error;
			}
			throw new StorageError(
				`Failed to duplicate project ${projectId}: ${error}`,
				'DUPLICATE_ERROR',
				error
			);
		}
	}

	/**
	 * Save auto-save data
	 */
	async saveAutoSave(projectId: string, data: AutoSaveData): Promise<void> {
		this.ensureReady();

		try {
			const autosaveKey = `${KEYS.AUTOSAVE_PREFIX}${projectId}`;
			const serialized = JSON.stringify(data);

			localStorage.setItem(autosaveKey, serialized);
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Auto-save quota exceeded is not critical, just log it
				console.warn('Auto-save quota exceeded, skipping');
				return;
			}
			throw new StorageError(
				`Failed to save auto-save data: ${error}`,
				'AUTOSAVE_ERROR',
				error
			);
		}
	}

	/**
	 * Load auto-save data
	 */
	async loadAutoSave(projectId: string): Promise<AutoSaveData | null> {
		this.ensureReady();

		try {
			const autosaveKey = `${KEYS.AUTOSAVE_PREFIX}${projectId}`;
			const serialized = localStorage.getItem(autosaveKey);

			if (!serialized) {
				return null;
			}

			return JSON.parse(serialized) as AutoSaveData;
		} catch (error) {
			console.error(`Failed to load auto-save data for ${projectId}:`, error);
			return null;
		}
	}

	/**
	 * Clear auto-save data
	 */
	async clearAutoSave(projectId: string): Promise<void> {
		this.ensureReady();

		try {
			const autosaveKey = `${KEYS.AUTOSAVE_PREFIX}${projectId}`;
			localStorage.removeItem(autosaveKey);
		} catch (error) {
			throw new StorageError(
				`Failed to clear auto-save data: ${error}`,
				'CLEAR_ERROR',
				error
			);
		}
	}

	/**
	 * Save a preference
	 */
	async savePreference(key: string, value: any, scope: PreferenceScope = 'global'): Promise<void> {
		this.ensureReady();

		try {
			const prefKey = this.getPreferenceKey(key, scope);
			const serialized = JSON.stringify(value);

			localStorage.setItem(prefKey, serialized);
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				throw new StorageQuotaError('Storage quota exceeded while saving preference');
			}
			throw new StorageError(
				`Failed to save preference ${key}: ${error}`,
				'SAVE_ERROR',
				error
			);
		}
	}

	/**
	 * Load a preference
	 */
	async loadPreference(key: string, scope: PreferenceScope = 'global'): Promise<any | null> {
		this.ensureReady();

		try {
			const prefKey = this.getPreferenceKey(key, scope);
			const serialized = localStorage.getItem(prefKey);

			if (!serialized) {
				return null;
			}

			return JSON.parse(serialized);
		} catch (error) {
			console.error(`Failed to load preference ${key}:`, error);
			return null;
		}
	}

	/**
	 * Load all preferences
	 */
	async loadAllPreferences(scope: PreferenceScope = 'global'): Promise<Record<string, any>> {
		this.ensureReady();

		try {
			const prefix = scope === 'user' ? KEYS.USER_PREFERENCE_PREFIX : KEYS.PREFERENCE_PREFIX;
			const preferences: Record<string, any> = {};

			// Iterate through all localStorage keys
			for (let i = 0; i < localStorage.length; i++) {
				const fullKey = localStorage.key(i);
				if (fullKey?.startsWith(prefix)) {
					const key = fullKey.substring(prefix.length);
					const value = await this.loadPreference(key, scope);
					if (value !== null) {
						preferences[key] = value;
					}
				}
			}

			return preferences;
		} catch (error) {
			throw new StorageError(
				`Failed to load all preferences: ${error}`,
				'LOAD_ERROR',
				error
			);
		}
	}

	/**
	 * Delete a preference
	 */
	async deletePreference(key: string, scope: PreferenceScope = 'global'): Promise<void> {
		this.ensureReady();

		try {
			const prefKey = this.getPreferenceKey(key, scope);
			localStorage.removeItem(prefKey);
		} catch (error) {
			throw new StorageError(
				`Failed to delete preference ${key}: ${error}`,
				'DELETE_ERROR',
				error
			);
		}
	}

	/**
	 * Get the full localStorage key for a preference
	 */
	private getPreferenceKey(key: string, scope: PreferenceScope): string {
		switch (scope) {
			case 'user':
				return `${KEYS.USER_PREFERENCE_PREFIX}${key}`;
			case 'project':
				// Project-scoped preferences would need a project ID context
				// For now, fall through to global
				console.warn('Project-scoped preferences not yet implemented, using global');
				return `${KEYS.PREFERENCE_PREFIX}${key}`;
			case 'global':
			default:
				return `${KEYS.PREFERENCE_PREFIX}${key}`;
		}
	}

	/**
	 * Ensure the adapter is ready
	 */
	private ensureReady(): void {
		if (!this.ready) {
			throw new StorageError(
				'Storage adapter not initialized. Call initialize() first.',
				'NOT_INITIALIZED'
			);
		}
	}

	/**
	 * Get storage quota information
	 */
	async getQuotaInfo(): Promise<{ used: number; available: number; total: number }> {
		this.ensureReady();

		try {
			// Estimate localStorage usage
			let used = 0;
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key) {
					const value = localStorage.getItem(key);
					used += key.length + (value?.length || 0);
				}
			}

			// localStorage typically has a 5-10MB limit
			// We'll use 5MB as a conservative estimate
			const total = 5 * 1024 * 1024; // 5MB in bytes
			const available = total - used;

			return { used, available, total };
		} catch (error) {
			throw new StorageError(
				`Failed to get quota info: ${error}`,
				'QUOTA_ERROR',
				error
			);
		}
	}

	/**
	 * Clear all data (for testing/debugging)
	 */
	async clearAllData(): Promise<void> {
		this.ensureReady();

		try {
			// Delete all projects
			for (const projectId of this.projectIndex) {
				await this.deleteProject(projectId);
			}

			// Clear project index
			localStorage.removeItem(KEYS.PROJECTS_INDEX);
			this.projectIndex.clear();
		} catch (error) {
			throw new StorageError(
				`Failed to clear all data: ${error}`,
				'CLEAR_ERROR',
				error
			);
		}
	}
}
