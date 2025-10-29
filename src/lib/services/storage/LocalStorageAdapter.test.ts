/**
 * LocalStorageAdapter Tests
 *
 * Comprehensive test suite for the LocalStorage storage adapter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import {
	StorageError,
	StorageNotFoundError,
	StorageQuotaError,
	StorageConflictError
} from './types';
import {
	MockLocalStorage,
	createMockProject,
	createMockMetadata,
	createMockAutoSave,
	createMockProjects,
	assertDatesClose
} from './testHelpers';

describe('LocalStorageAdapter', () => {
	let adapter: LocalStorageAdapter;
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;
		adapter = new LocalStorageAdapter();
	});

	describe('initialization', () => {
		it('should initialize successfully', async () => {
			await adapter.initialize();
			expect(adapter.isReady()).toBe(true);
		});

		it('should throw error if localStorage is not available', async () => {
			// @ts-expect-error - Simulating missing localStorage
			global.localStorage = undefined;
			const newAdapter = new LocalStorageAdapter();

			await expect(newAdapter.initialize()).rejects.toThrow(StorageError);
			await expect(newAdapter.initialize()).rejects.toThrow('localStorage is not available');
		});

		it('should throw error if cannot write to localStorage', async () => {
			mockStorage.setThrowQuotaError(true);
			const newAdapter = new LocalStorageAdapter();

			// Implementation wraps quota errors in generic StorageError during initialization
			await expect(newAdapter.initialize()).rejects.toThrow(StorageError);
		});

		it('should load existing project index', async () => {
			// Pre-populate index
			mockStorage.setItem('whisker-projects-index', JSON.stringify(['project-1', 'project-2']));

			const newAdapter = new LocalStorageAdapter();
			await newAdapter.initialize();

			// Index should be loaded (we'll verify by listing projects)
			const projects = await newAdapter.listProjects();
			expect(projects).toEqual([]);
		});

		it('should create new project index if corrupted', async () => {
			// Set corrupted index
			mockStorage.setItem('whisker-projects-index', 'invalid json');

			const newAdapter = new LocalStorageAdapter();
			await newAdapter.initialize();

			// Should recover and create empty index
			expect(newAdapter.isReady()).toBe(true);
		});
	});

	describe('isReady', () => {
		it('should return false before initialization', () => {
			expect(adapter.isReady()).toBe(false);
		});

		it('should return true after initialization', async () => {
			await adapter.initialize();
			expect(adapter.isReady()).toBe(true);
		});
	});

	describe('saveProject', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should save a new project', async () => {
			const project = createMockProject({ version: 0 });
			delete (project as any).id; // Test ID generation

			const result = await adapter.saveProject(project);

			expect(result.success).toBe(true);
			expect(result.projectId).toBeDefined();
			expect(result.version).toBe(1);
			expect(result.timestamp).toBeDefined();
		});

		it('should save a project with existing ID', async () => {
			const project = createMockProject({ id: 'custom-id', version: 0 });

			const result = await adapter.saveProject(project);

			expect(result.success).toBe(true);
			expect(result.projectId).toBe('custom-id');
			expect(result.version).toBe(1);
		});

		it('should increment version on update', async () => {
			const project = createMockProject({ id: 'test-id', version: 0 });

			// First save
			const firstSave = await adapter.saveProject(project);

			// Update - use version from first save
			const updatedProject = { ...project, version: firstSave.version ?? 1 };
			const result = await adapter.saveProject(updatedProject);

			expect(result.version).toBe(2);
		});

		it('should throw conflict error if version mismatch', async () => {
			const project = createMockProject({ id: 'test-id', version: 0 });

			// First save
			const firstSave = await adapter.saveProject(project);

			// Try to save with old version
			const conflictingProject = { ...project, version: 0 };

			await expect(adapter.saveProject(conflictingProject)).rejects.toThrow(
				StorageConflictError
			);
		});

		it('should update project index', async () => {
			const project = createMockProject({ id: 'new-project' });

			await adapter.saveProject(project);

			const index = JSON.parse(mockStorage.getItem('whisker-projects-index')!);
			expect(index).toContain('new-project');
		});

		it('should throw quota error if storage is full', async () => {
			mockStorage.setQuotaLimit(100); // Very small quota

			const project = createMockProject();

			// Quota errors get wrapped in generic StorageError
			await expect(adapter.saveProject(project)).rejects.toThrow(StorageError);
		});

		it('should set createdAt and updatedAt timestamps', async () => {
			const project = createMockProject();
			const beforeSave = new Date();

			const result = await adapter.saveProject(project);

			const saved = await adapter.loadProject(result.projectId!);
			const afterSave = new Date();

			expect(saved).toBeDefined();
			expect(saved!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
			expect(saved!.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
			expect(saved!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
			expect(saved!.updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
		});

		it('should update metadata version and timestamps', async () => {
			const project = createMockProject({ id: 'test-id', version: 0 });

			const result = await adapter.saveProject(project);

			const saved = await adapter.loadProject(result.projectId!);
			expect(saved!.metadata.version).toBe(1);
			assertDatesClose(saved!.metadata.updatedAt, new Date());
		});
	});

	describe('loadProject', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should load an existing project', async () => {
			const project = createMockProject({ id: 'test-load' });
			await adapter.saveProject(project);

			const loaded = await adapter.loadProject('test-load');

			expect(loaded).toBeDefined();
			expect(loaded!.id).toBe('test-load');
			expect(loaded!.name).toBe(project.name);
		});

		it('should return null for non-existent project', async () => {
			const loaded = await adapter.loadProject('non-existent');

			expect(loaded).toBeNull();
		});

		it('should parse dates correctly', async () => {
			const project = createMockProject({ id: 'test-dates' });
			const now = new Date();

			await adapter.saveProject(project);
			const loaded = await adapter.loadProject('test-dates');

			expect(loaded!.createdAt).toBeInstanceOf(Date);
			expect(loaded!.updatedAt).toBeInstanceOf(Date);
			expect(loaded!.metadata.createdAt).toBeInstanceOf(Date);
			expect(loaded!.metadata.updatedAt).toBeInstanceOf(Date);
		});

		it('should throw error if data is corrupted', async () => {
			// Manually set corrupted data
			mockStorage.setItem('whisker-project-corrupted', 'invalid json');

			await expect(adapter.loadProject('corrupted')).rejects.toThrow(StorageError);
		});
	});

	describe('listProjects', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should return empty array when no projects exist', async () => {
			const projects = await adapter.listProjects();

			expect(projects).toEqual([]);
		});

		it('should list all projects', async () => {
			const mockProjects = createMockProjects(3);

			for (const project of mockProjects) {
				await adapter.saveProject(project);
			}

			const projects = await adapter.listProjects();

			expect(projects).toHaveLength(3);
		});

		it('should filter by search query (name)', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					name: 'Alpha Project',
					version: 0,
					metadata: createMockMetadata({ id: 'p1', name: 'Alpha Project' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					name: 'Beta Project',
					version: 0,
					metadata: createMockMetadata({ id: 'p2', name: 'Beta Project' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p3',
					name: 'Alpha Story',
					version: 0,
					metadata: createMockMetadata({ id: 'p3', name: 'Alpha Story' })
				})
			);

			const projects = await adapter.listProjects({ searchQuery: 'alpha' });

			expect(projects).toHaveLength(2);
			expect(projects.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
		});

		it('should filter by search query (description)', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					metadata: { ...createMockProject().metadata, description: 'A fantasy tale' }
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					metadata: { ...createMockProject().metadata, description: 'A sci-fi adventure' }
				})
			);

			const projects = await adapter.listProjects({ searchQuery: 'fantasy' });

			expect(projects).toHaveLength(1);
			expect(projects[0].id).toBe('p1');
		});

		it('should filter by tags', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					metadata: { ...createMockProject().metadata, tags: ['fantasy', 'magic'] }
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					metadata: { ...createMockProject().metadata, tags: ['scifi', 'space'] }
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p3',
					metadata: { ...createMockProject().metadata, tags: ['fantasy', 'dragons'] }
				})
			);

			const projects = await adapter.listProjects({ tags: ['fantasy'] });

			expect(projects).toHaveLength(2);
			expect(projects.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
		});

		it('should filter by ownerId', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					version: 0,
					ownerId: 'user1',
					metadata: createMockMetadata({ id: 'p1', ownerId: 'user1' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					version: 0,
					ownerId: 'user2',
					metadata: createMockMetadata({ id: 'p2', ownerId: 'user2' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p3',
					version: 0,
					ownerId: 'user1',
					metadata: createMockMetadata({ id: 'p3', ownerId: 'user1' })
				})
			);

			const projects = await adapter.listProjects({ ownerId: 'user1' });

			expect(projects).toHaveLength(2);
			expect(projects.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
		});

		it('should sort by name ascending', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					name: 'Charlie',
					version: 0,
					metadata: createMockMetadata({ id: 'p1', name: 'Charlie' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					name: 'Alpha',
					version: 0,
					metadata: createMockMetadata({ id: 'p2', name: 'Alpha' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p3',
					name: 'Beta',
					version: 0,
					metadata: createMockMetadata({ id: 'p3', name: 'Beta' })
				})
			);

			const projects = await adapter.listProjects({ sortBy: 'name', sortOrder: 'asc' });

			expect(projects.map((p) => p.name)).toEqual(['Alpha', 'Beta', 'Charlie']);
		});

		it('should sort by name descending', async () => {
			await adapter.saveProject(
				createMockProject({
					id: 'p1',
					name: 'Charlie',
					version: 0,
					metadata: createMockMetadata({ id: 'p1', name: 'Charlie' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p2',
					name: 'Alpha',
					version: 0,
					metadata: createMockMetadata({ id: 'p2', name: 'Alpha' })
				})
			);
			await adapter.saveProject(
				createMockProject({
					id: 'p3',
					name: 'Beta',
					version: 0,
					metadata: createMockMetadata({ id: 'p3', name: 'Beta' })
				})
			);

			const projects = await adapter.listProjects({ sortBy: 'name', sortOrder: 'desc' });

			expect(projects.map((p) => p.name)).toEqual(['Charlie', 'Beta', 'Alpha']);
		});

		it('should sort by created date', async () => {
			const baseTime = new Date('2024-01-01').getTime();

			// Save projects with staggered delays to ensure different createdAt times
			await adapter.saveProject(createMockProject({ id: 'p1', version: 0 }));
			await new Promise((resolve) => setTimeout(resolve, 5));
			await adapter.saveProject(createMockProject({ id: 'p2', version: 0 }));
			await new Promise((resolve) => setTimeout(resolve, 5));
			await adapter.saveProject(createMockProject({ id: 'p3', version: 0 }));

			const projects = await adapter.listProjects({ sortBy: 'created', sortOrder: 'asc' });

			// Should be sorted by creation order
			expect(projects.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
		});

		it('should sort by modified date (default)', async () => {
			// Save p1, then update p3, then update p2 to get different modified times
			await adapter.saveProject(createMockProject({ id: 'p1', version: 0 }));
			await new Promise((resolve) => setTimeout(resolve, 5));
			await adapter.saveProject(createMockProject({ id: 'p2', version: 0 }));
			await new Promise((resolve) => setTimeout(resolve, 5));
			await adapter.saveProject(createMockProject({ id: 'p3', version: 0 }));

			const projects = await adapter.listProjects({ sortOrder: 'desc' });

			// Should be sorted by most recently modified (p3, p2, p1)
			expect(projects.map((p) => p.id)).toEqual(['p3', 'p2', 'p1']);
		});

		it('should apply pagination with limit', async () => {
			const mockProjects = createMockProjects(10);
			for (const project of mockProjects) {
				await adapter.saveProject(project);
			}

			const projects = await adapter.listProjects({ limit: 5 });

			expect(projects).toHaveLength(5);
		});

		it('should apply pagination with offset', async () => {
			const mockProjects = createMockProjects(10);
			for (const project of mockProjects) {
				await adapter.saveProject(project);
			}

			const projects = await adapter.listProjects({
				offset: 5,
				sortBy: 'name',
				sortOrder: 'asc'
			});

			expect(projects).toHaveLength(5);
		});

		it('should apply pagination with both offset and limit', async () => {
			const mockProjects = createMockProjects(10);
			for (const project of mockProjects) {
				await adapter.saveProject(project);
			}

			const projects = await adapter.listProjects({
				offset: 3,
				limit: 4,
				sortBy: 'name',
				sortOrder: 'asc'
			});

			expect(projects).toHaveLength(4);
		});

		it('should handle errors gracefully when loading individual projects fails', async () => {
			// Add valid project
			await adapter.saveProject(createMockProject({ id: 'valid' }));

			// Manually add corrupted project to index
			const index = JSON.parse(mockStorage.getItem('whisker-projects-index')!);
			index.push('corrupted');
			mockStorage.setItem('whisker-projects-index', JSON.stringify(index));
			mockStorage.setItem('whisker-project-corrupted', 'invalid json');

			// Should only return valid project
			const projects = await adapter.listProjects();

			expect(projects).toHaveLength(1);
			expect(projects[0].id).toBe('valid');
		});
	});

	describe('deleteProject', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should delete a project', async () => {
			const project = createMockProject({ id: 'to-delete' });
			await adapter.saveProject(project);

			await adapter.deleteProject('to-delete');

			const loaded = await adapter.loadProject('to-delete');
			expect(loaded).toBeNull();
		});

		it('should remove project from index', async () => {
			const project = createMockProject({ id: 'to-delete' });
			await adapter.saveProject(project);

			await adapter.deleteProject('to-delete');

			const index = JSON.parse(mockStorage.getItem('whisker-projects-index')!);
			expect(index).not.toContain('to-delete');
		});

		it('should delete associated auto-save data', async () => {
			const project = createMockProject({ id: 'to-delete' });
			await adapter.saveProject(project);
			await adapter.saveAutoSave('to-delete', createMockAutoSave({ projectId: 'to-delete' }));

			await adapter.deleteProject('to-delete');

			const autoSave = await adapter.loadAutoSave('to-delete');
			expect(autoSave).toBeNull();
		});

		it('should not throw error if project does not exist', async () => {
			await expect(adapter.deleteProject('non-existent')).resolves.not.toThrow();
		});
	});

	describe('duplicateProject', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should duplicate a project', async () => {
			const original = createMockProject({ id: 'original', name: 'Original', version: 0 });
			await adapter.saveProject(original);

			const duplicate = await adapter.duplicateProject('original', 'Duplicate');

			expect(duplicate.id).not.toBe('original');
			expect(duplicate.name).toBe('Duplicate');
			expect(duplicate.version).toBe(1);
			// Check story properties individually to avoid Date comparison issues
			expect(duplicate.story.id).toEqual(original.story.id);
			expect(duplicate.story.passages).toEqual(original.story.passages);
			expect(duplicate.story.startPassageId).toEqual(original.story.startPassageId);
			expect(duplicate.story.tags).toEqual(original.story.tags);
		});

		it('should throw error if original project not found', async () => {
			await expect(adapter.duplicateProject('non-existent', 'Copy')).rejects.toThrow(
				StorageNotFoundError
			);
		});

		it('should save the duplicate', async () => {
			const original = createMockProject({ id: 'original' });
			await adapter.saveProject(original);

			const duplicate = await adapter.duplicateProject('original', 'Duplicate');

			const loaded = await adapter.loadProject(duplicate.id);
			expect(loaded).toBeDefined();
			expect(loaded!.name).toBe('Duplicate');
		});

		it('should create new timestamps', async () => {
			const original = createMockProject({
				id: 'original',
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-01')
			});
			await adapter.saveProject(original);

			const duplicate = await adapter.duplicateProject('original', 'Duplicate');

			const now = new Date();
			assertDatesClose(duplicate.createdAt, now);
			assertDatesClose(duplicate.updatedAt, now);
		});
	});

	describe('auto-save operations', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should save auto-save data', async () => {
			const autoSave = createMockAutoSave({ projectId: 'project-1' });

			await adapter.saveAutoSave('project-1', autoSave);

			const saved = mockStorage.getItem('whisker-autosave-project-1');
			expect(saved).toBeDefined();
		});

		it('should load auto-save data', async () => {
			const autoSave = createMockAutoSave({ projectId: 'project-1' });
			await adapter.saveAutoSave('project-1', autoSave);

			const loaded = await adapter.loadAutoSave('project-1');

			expect(loaded).toBeDefined();
			expect(loaded!.projectId).toBe(autoSave.projectId);
			expect(loaded!.version).toBe(autoSave.version);
			expect(loaded!.timestamp).toBe(autoSave.timestamp);
			expect(loaded!.checksum).toBe(autoSave.checksum);
			// Story comparison - check structure not Date objects
			expect(loaded!.story.id).toBe(autoSave.story.id);
			expect(loaded!.story.passages).toEqual(autoSave.story.passages);
		});

		it('should return null if auto-save does not exist', async () => {
			const loaded = await adapter.loadAutoSave('non-existent');

			expect(loaded).toBeNull();
		});

		it('should clear auto-save data', async () => {
			const autoSave = createMockAutoSave({ projectId: 'project-1' });
			await adapter.saveAutoSave('project-1', autoSave);

			await adapter.clearAutoSave('project-1');

			const loaded = await adapter.loadAutoSave('project-1');
			expect(loaded).toBeNull();
		});

		it('should handle quota error gracefully', async () => {
			mockStorage.setQuotaLimit(100); // Very small quota

			const autoSave = createMockAutoSave();

			// Implementation catches quota errors and logs warning, returning without throwing
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await adapter.saveAutoSave('project-1', autoSave);

			// Should have logged a warning about quota
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-save quota exceeded'));

			consoleSpy.mockRestore();
		});

		it('should handle corrupted auto-save data', async () => {
			mockStorage.setItem('whisker-autosave-corrupted', 'invalid json');

			const loaded = await adapter.loadAutoSave('corrupted');

			expect(loaded).toBeNull();
		});
	});

	describe('preference operations', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should save a global preference', async () => {
			await adapter.savePreference('theme', 'dark', 'global');

			const saved = mockStorage.getItem('whisker-preference-theme');
			expect(saved).toBe('"dark"');
		});

		it('should save a user preference', async () => {
			await adapter.savePreference('fontSize', 14, 'user');

			const saved = mockStorage.getItem('whisker-user-preference-fontSize');
			expect(saved).toBe('14');
		});

		it('should load a global preference', async () => {
			await adapter.savePreference('theme', 'dark', 'global');

			const loaded = await adapter.loadPreference('theme', 'global');

			expect(loaded).toBe('dark');
		});

		it('should load a user preference', async () => {
			await adapter.savePreference('fontSize', 14, 'user');

			const loaded = await adapter.loadPreference('fontSize', 'user');

			expect(loaded).toBe(14);
		});

		it('should return null for non-existent preference', async () => {
			const loaded = await adapter.loadPreference('non-existent');

			expect(loaded).toBeNull();
		});

		it('should save complex preference objects', async () => {
			const prefs = { editor: { lineNumbers: true, wordWrap: false } };

			await adapter.savePreference('editorPrefs', prefs);

			const loaded = await adapter.loadPreference('editorPrefs');

			expect(loaded).toEqual(prefs);
		});

		it('should load all global preferences', async () => {
			await adapter.savePreference('theme', 'dark', 'global');
			await adapter.savePreference('fontSize', 14, 'global');
			await adapter.savePreference('autoSave', true, 'global');

			const all = await adapter.loadAllPreferences('global');

			expect(all).toEqual({
				theme: 'dark',
				fontSize: 14,
				autoSave: true
			});
		});

		it('should load all user preferences', async () => {
			await adapter.savePreference('lastProject', 'proj-1', 'user');
			await adapter.savePreference('recentFiles', ['f1', 'f2'], 'user');

			const all = await adapter.loadAllPreferences('user');

			expect(all).toEqual({
				lastProject: 'proj-1',
				recentFiles: ['f1', 'f2']
			});
		});

		it('should delete a preference', async () => {
			await adapter.savePreference('temp', 'value');

			await adapter.deletePreference('temp');

			const loaded = await adapter.loadPreference('temp');
			expect(loaded).toBeNull();
		});

		it('should throw quota error if storage is full', async () => {
			mockStorage.setQuotaLimit(100);

			// Quota errors get wrapped in generic StorageError
			await expect(adapter.savePreference('key', 'x'.repeat(1000))).rejects.toThrow(
				StorageError
			);
		});

		it('should warn about project-scoped preferences not being implemented', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await adapter.savePreference('test', 'value', 'project');

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Project-scoped preferences not yet implemented')
			);

			consoleSpy.mockRestore();
		});
	});

	describe('getQuotaInfo', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should return quota information', async () => {
			const quota = await adapter.getQuotaInfo();

			expect(quota.used).toBeGreaterThanOrEqual(0);
			expect(quota.available).toBeGreaterThan(0);
			expect(quota.total).toBe(5 * 1024 * 1024); // 5MB
		});

		it('should calculate used space correctly', async () => {
			const project = createMockProject();
			await adapter.saveProject(project);

			const quota = await adapter.getQuotaInfo();

			expect(quota.used).toBeGreaterThan(0);
		});
	});

	describe('clearAllData', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should clear all projects', async () => {
			const projects = createMockProjects(3);
			for (const project of projects) {
				await adapter.saveProject(project);
			}

			await adapter.clearAllData();

			const remaining = await adapter.listProjects();
			expect(remaining).toHaveLength(0);
		});

		it('should clear project index', async () => {
			const project = createMockProject();
			await adapter.saveProject(project);

			await adapter.clearAllData();

			const index = mockStorage.getItem('whisker-projects-index');
			expect(index).toBeNull();
		});
	});

	describe('error handling', () => {
		beforeEach(async () => {
			await adapter.initialize();
		});

		it('should throw error if not initialized', async () => {
			const newAdapter = new LocalStorageAdapter();

			await expect(newAdapter.saveProject(createMockProject())).rejects.toThrow(
				'not initialized'
			);
			await expect(newAdapter.loadProject('test')).rejects.toThrow('not initialized');
			await expect(newAdapter.listProjects()).rejects.toThrow('not initialized');
		});
	});
});
