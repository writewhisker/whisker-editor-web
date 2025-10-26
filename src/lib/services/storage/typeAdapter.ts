/**
 * Type Adapter for Storage Layer
 *
 * Bridges between the editor's internal data models and the storage layer's format.
 * This adapter handles the conversion between:
 * - src/lib/models/types.ts (Editor format)
 * - src/lib/services/storage/types.ts (Storage format)
 */

import type { ProjectData as ModelProjectData, StoryData } from '../../models/types';
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
			version: storyData.metadata.version
		},
		passages: Object.values(storyData.passages).map(passage => ({
			id: passage.id,
			title: passage.title,
			content: passage.content,
			tags: passage.tags || [],
			position: passage.position,
			connections: passage.choices.map((choice, index) => ({
				targetPassageId: choice.target,
				choiceText: choice.text,
				choiceIndex: index
			}))
		})),
		startPassageId: storyData.startPassage,
		tags: [] // Story-level tags (not currently used in editor)
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
			tags: []
		},
		version: 1,
		createdAt: new Date(storyData.metadata.created),
		updatedAt: new Date(storyData.metadata.modified)
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
			choices: passage.connections.map(conn => ({
				id: `choice-${conn.targetPassageId}-${conn.choiceIndex}`,
				text: conn.choiceText,
				target: conn.targetPassageId,
				condition: undefined,
				action: undefined
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
			description: story.metadata.description
		},
		startPassage: story.startPassageId,
		passages,
		variables,
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
