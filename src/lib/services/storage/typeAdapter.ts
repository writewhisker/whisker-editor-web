/**
 * Type Adapter for Storage Layer
 *
 * Bridges between the editor's internal data models and the storage layer's format.
 * This adapter handles the conversion between:
 * - src/lib/models/types.ts (Editor format)
 * - src/lib/services/storage/types.ts (Storage format)
 */

import type { ProjectData as ModelProjectData, StoryData } from '@writewhisker/core-ts';
import type {
	StoredProject,
	SerializedStory
} from './types';

/**
 * Convert from editor model format to storage format
 */
export function modelToStorage(modelData: ModelProjectData): StoredProject {
	// Extract story data by removing the version field
	const { version: _editorVersion, ...storyData } = modelData;

	// Build SerializedStory
	const serializedStory: SerializedStory = {
		id: generateProjectId(storyData),
		metadata: {
			title: storyData.metadata.title,
			author: storyData.metadata.author,
			description: storyData.metadata.description,
			created: new Date(storyData.metadata.created),
			modified: new Date(storyData.metadata.modified),
			version: storyData.metadata.version,
			ifid: storyData.metadata.ifid  // Preserve IFID
		},
		passages: Object.values(storyData.passages).map(passage => ({
			id: passage.id,
			title: passage.title,
			content: passage.content,
			tags: passage.tags || [],
			position: passage.position,
			size: passage.size,                // Preserve size
			metadata: passage.metadata,        // Preserve passage metadata
			onEnterScript: passage.onEnterScript,
			onExitScript: passage.onExitScript,
			connections: passage.choices.map((choice, index) => ({
				choiceId: choice.id,           // Preserve original choice ID
				targetPassageId: choice.target,
				choiceText: choice.text,
				choiceIndex: index,
				condition: choice.condition,   // Preserve condition
				action: choice.action,         // Preserve action
				metadata: choice.metadata      // Preserve choice metadata
			}))
		})),
		startPassageId: storyData.startPassage,
		tags: storyData.metadata.tags || [],
		stylesheets: storyData.stylesheets,    // Preserve stylesheets
		scripts: storyData.scripts,            // Preserve scripts
		assets: storyData.assets               // Preserve assets
	};

	// Build storage ProjectData
	const storageProject: StoredProject = {
		id: serializedStory.id,
		name: storyData.metadata.title,
		story: serializedStory,
		metadata: {
			id: serializedStory.id,
			name: storyData.metadata.title,
			description: storyData.metadata.description,
			version: 1, // Storage version, not editor version
			createdAt: new Date(storyData.metadata.created),
			updatedAt: new Date(storyData.metadata.modified),
			passageCount: Object.keys(storyData.passages).length,
			wordCount: calculateWordCount(storyData),
			tags: storyData.metadata.tags || [],
			ownerId: storyData.metadata.createdBy
		},
		version: 1,
		createdAt: new Date(storyData.metadata.created),
		updatedAt: new Date(storyData.metadata.modified),
		ownerId: storyData.metadata.createdBy
	};

	return storageProject;
}

/**
 * Convert from storage format to editor model format
 */
export function storageToModel(storageData: StoredProject): ModelProjectData {
	const story = storageData.story;

	// Convert passages from array to Record
	const passages: Record<string, any> = {};
	for (const passage of story.passages) {
		passages[passage.id] = {
			id: passage.id,
			title: passage.title,
			content: passage.content,
			position: passage.position,
			size: passage.size || { width: 200, height: 150 },  // Default size if missing
			onEnterScript: passage.onEnterScript,
			onExitScript: passage.onExitScript,
			metadata: passage.metadata || {},  // Restore passage metadata
			choices: passage.connections.map((conn, index) => ({
				// Use original choiceId if available, otherwise fallback for legacy data
				id: conn.choiceId || `legacy-choice-${passage.id}-${index}-${hashString(conn.choiceText)}`,
				text: conn.choiceText,
				target: conn.targetPassageId,
				condition: conn.condition,
				action: conn.action,
				metadata: conn.metadata || {}  // Restore choice metadata
			})),
			tags: passage.tags,
			created: storageData.createdAt.toISOString(),
			modified: storageData.updatedAt.toISOString()
		};
	}

	// Convert variables (empty for now as not stored)
	const variables: Record<string, any> = {};

	const modelData: ModelProjectData = {
		metadata: {
			title: story.metadata.title,
			author: story.metadata.author || '',
			version: story.metadata.version,
			created: story.metadata.created.toISOString(),
			modified: story.metadata.modified.toISOString(),
			description: story.metadata.description,
			tags: story.tags || [],
			createdBy: storageData.ownerId || 'local',
			ifid: story.metadata.ifid  // Restore IFID
		},
		startPassage: story.startPassageId,
		passages,
		variables,
		stylesheets: story.stylesheets,    // Restore stylesheets
		scripts: story.scripts,            // Restore scripts
		assets: story.assets,              // Restore assets
		version: '1.0.0' // Editor format version
	};

	return modelData;
}

/**
 * Generate a consistent project ID from story data
 */
function generateProjectId(storyData: StoryData): string {
	// Use a simple slug from the title + timestamp
	const slug = storyData.metadata.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const timestamp = new Date(storyData.metadata.created).getTime();
	return `${slug}-${timestamp}`;
}

/**
 * Calculate total word count across all passages
 */
function calculateWordCount(storyData: StoryData): number {
	return Object.values(storyData.passages).reduce((total, passage) => {
		const words = passage.content.trim().split(/\s+/).filter(w => w.length > 0);
		return total + words.length;
	}, 0);
}

/**
 * Generate stable hash from string for legacy ID generation
 */
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
}
