/**
 * Storage Service Types
 *
 * Type definitions for the pluggable storage system.
 * Based on /whisker-implementation/backend-architecture/IMPLEMENTATION_INTERFACES.md
 */

/**
 * Serialized story data for storage
 */
export interface SerializedStory {
	id: string;
	metadata: {
		title: string;
		author?: string;
		description?: string;
		created: Date;
		modified: Date;
		version: string;
		ifid?: string;              // Interactive Fiction ID (whisker-core compat)
	};
	passages: Array<{
		id: string;
		title: string;
		content: string;
		tags: string[];
		position: { x: number; y: number };
		size?: { width: number; height: number };   // Passage size (whisker-core compat)
		metadata?: Record<string, any>;             // Custom passage metadata
		onEnterScript?: string;                     // Script on passage entry
		onExitScript?: string;                      // Script on passage exit
		connections: Array<{
			choiceId: string;           // Unique choice ID (preserves editor IDs)
			targetPassageId: string;
			choiceText: string;
			choiceIndex: number;        // Index in choices array (for ordering)
			condition?: string;         // Choice condition expression
			action?: string;            // Action to execute when chosen
			metadata?: Record<string, any>;  // Custom choice metadata
		}>;
	}>;
	startPassageId: string;
	tags: string[];
	stylesheets?: string[];         // CSS code blocks (whisker-core compat)
	scripts?: string[];             // Story-wide Lua/JS scripts (whisker-core compat)
	assets?: Array<{                // Asset references (whisker-core compat)
		id: string;
		name: string;
		type: 'image' | 'audio' | 'video' | 'font' | 'other';
		path: string;
		mimeType: string;
		size?: number;
		metadata?: Record<string, any>;
	}>;
}

/**
 * Stored project data structure
 * Note: Renamed from ProjectData to avoid conflicts with editor model types
 */
export interface StoredProject {
	id: string;
	name: string;
	story: SerializedStory;
	metadata: ProjectMetadata;
	version: number;
	createdAt: Date;
	updatedAt: Date;
	ownerId?: string;
	permissions?: ProjectPermissions;
}

/**
 * Project metadata (lightweight)
 */
export interface ProjectMetadata {
	id: string;
	name: string;
	description?: string;
	version: number;
	createdAt: Date;
	updatedAt: Date;
	passageCount: number;
	wordCount: number;
	tags?: string[];
	thumbnail?: string;
	ownerId?: string;
	isShared?: boolean;
}

/**
 * Project permissions
 */
export interface ProjectPermissions {
	owner: string;
	readers?: string[];
	writers?: string[];
	isPublic?: boolean;
}

/**
 * Auto-save data structure
 */
export interface AutoSaveData {
	projectId: string;
	story: SerializedStory;
	timestamp: number;
	version: number;
	checksum?: string;
}

/**
 * Save operation result
 */
export interface SaveResult {
	success: boolean;
	projectId?: string;
	version?: number;
	timestamp?: number;
	error?: string;
	conflictData?: StoredProject;
}

/**
 * Project filter options
 */
export interface ProjectFilter {
	ownerId?: string;
	tags?: string[];
	searchQuery?: string;
	sortBy?: 'name' | 'created' | 'modified';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

/**
 * Preference scope
 */
export type PreferenceScope = 'global' | 'user' | 'project';

/**
 * Asset metadata
 */
export interface AssetMetadata {
	id: string;
	projectId: string;
	filename: string;
	mimeType: string;
	size: number;
	uploadedAt: Date;
	url?: string;
}

/**
 * Storage adapter interface
 */
export interface IStorageAdapter {
	/**
	 * Initialize the storage adapter
	 * Called once during app startup
	 */
	initialize(): Promise<void>;

	/**
	 * Check if the adapter is ready to use
	 */
	isReady(): boolean;

	/**
	 * Project Operations
	 */
	saveProject(project: StoredProject): Promise<SaveResult>;
	loadProject(projectId: string): Promise<StoredProject | null>;
	listProjects(filter?: ProjectFilter): Promise<ProjectMetadata[]>;
	deleteProject(projectId: string): Promise<void>;
	duplicateProject(projectId: string, newName: string): Promise<StoredProject>;

	/**
	 * Auto-save Operations
	 */
	saveAutoSave(projectId: string, data: AutoSaveData): Promise<void>;
	loadAutoSave(projectId: string): Promise<AutoSaveData | null>;
	clearAutoSave(projectId: string): Promise<void>;

	/**
	 * Preferences Operations
	 */
	savePreference(key: string, value: any, scope?: PreferenceScope): Promise<void>;
	loadPreference(key: string, scope?: PreferenceScope): Promise<any | null>;
	loadAllPreferences(scope?: PreferenceScope): Promise<Record<string, any>>;
	listPreferences(prefix?: string): Promise<string[]>;
	deletePreference(key: string, scope?: PreferenceScope): Promise<void>;

	/**
	 * Asset Operations (optional, may not be supported by all adapters)
	 */
	uploadAsset?(projectId: string, file: File): Promise<AssetMetadata>;
	downloadAsset?(assetId: string): Promise<Blob>;
	deleteAsset?(assetId: string): Promise<void>;
	listAssets?(projectId: string): Promise<AssetMetadata[]>;
}

/**
 * Storage adapter configuration
 */
export interface StorageConfig {
	type: 'localStorage' | 'restApi' | 'firebase' | 'supabase';
	apiUrl?: string;
	apiKey?: string;
	options?: Record<string, any>;
}

/**
 * Storage error types
 */
export class StorageError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: any
	) {
		super(message);
		this.name = 'StorageError';
	}
}

export class StorageConflictError extends StorageError {
	constructor(
		message: string,
		public conflictData?: StoredProject
	) {
		super(message, 'CONFLICT', conflictData);
		this.name = 'StorageConflictError';
	}
}

export class StorageNotFoundError extends StorageError {
	constructor(message: string) {
		super(message, 'NOT_FOUND');
		this.name = 'StorageNotFoundError';
	}
}

export class StorageQuotaError extends StorageError {
	constructor(
		message: string,
		public quota?: number,
		public used?: number
	) {
		super(message, 'QUOTA_EXCEEDED', { quota, used });
		this.name = 'StorageQuotaError';
	}
}
