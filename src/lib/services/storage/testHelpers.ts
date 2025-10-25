/**
 * Test Helpers for Storage Adapters
 *
 * Provides utilities for testing storage implementations including
 * mock localStorage, test data generators, and assertion helpers.
 */

import type { ProjectData, ProjectMetadata, AutoSaveData, SerializedStory } from './types';

/**
 * Mock localStorage implementation for testing
 */
export class MockLocalStorage implements Storage {
	private store: Map<string, string> = new Map();
	private quotaLimit = 5 * 1024 * 1024; // 5MB default
	private throwQuotaError = false;

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	key(index: number): string | null {
		const keys = Array.from(this.store.keys());
		return keys[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		if (this.throwQuotaError) {
			const error = new Error('QuotaExceededError');
			error.name = 'QuotaExceededError';
			throw error;
		}

		// Check quota
		const currentSize = this.getSize();
		const newItemSize = key.length + value.length;
		if (currentSize + newItemSize > this.quotaLimit) {
			const error = new Error('QuotaExceededError');
			error.name = 'QuotaExceededError';
			throw error;
		}

		this.store.set(key, value);
	}

	/**
	 * Get current storage size in bytes
	 */
	getSize(): number {
		let size = 0;
		for (const [key, value] of this.store.entries()) {
			size += key.length + value.length;
		}
		return size;
	}

	/**
	 * Set quota limit for testing
	 */
	setQuotaLimit(limit: number): void {
		this.quotaLimit = limit;
	}

	/**
	 * Enable/disable quota errors
	 */
	setThrowQuotaError(shouldThrow: boolean): void {
		this.throwQuotaError = shouldThrow;
	}

	/**
	 * Get all keys as array
	 */
	getAllKeys(): string[] {
		return Array.from(this.store.keys());
	}
}

/**
 * Create a mock SerializedStory for testing
 */
export function createMockStory(overrides?: Partial<SerializedStory>): SerializedStory {
	const now = new Date();
	return {
		id: 'story-1',
		metadata: {
			title: 'Test Story',
			author: 'Test Author',
			description: 'Test description',
			created: now,
			modified: now,
			version: '1.0.0'
		},
		passages: [
			{
				id: 'passage-1',
				title: 'Start',
				content: 'This is the start passage.',
				tags: ['start'],
				position: { x: 0, y: 0 },
				connections: []
			}
		],
		startPassageId: 'passage-1',
		tags: ['test'],
		...overrides
	};
}

/**
 * Create a mock ProjectData for testing
 */
export function createMockProject(overrides?: Partial<ProjectData>): ProjectData {
	const now = new Date();
	const story = createMockStory();

	return {
		id: 'project-1',
		name: 'Test Project',
		story,
		metadata: {
			id: 'project-1',
			name: 'Test Project',
			description: 'Test project description',
			version: 1,
			createdAt: now,
			updatedAt: now,
			passageCount: story.passages.length,
			wordCount: 10,
			tags: ['test']
		},
		version: 1,
		createdAt: now,
		updatedAt: now,
		...overrides
	};
}

/**
 * Create a mock AutoSaveData for testing
 */
export function createMockAutoSave(overrides?: Partial<AutoSaveData>): AutoSaveData {
	return {
		projectId: 'project-1',
		story: createMockStory(),
		timestamp: Date.now(),
		version: 1,
		checksum: 'abc123',
		...overrides
	};
}

/**
 * Create a mock ProjectMetadata for testing
 */
export function createMockMetadata(overrides?: Partial<ProjectMetadata>): ProjectMetadata {
	const now = new Date();
	return {
		id: 'project-1',
		name: 'Test Project',
		description: 'Test description',
		version: 1,
		createdAt: now,
		updatedAt: now,
		passageCount: 1,
		wordCount: 10,
		tags: ['test'],
		...overrides
	};
}

/**
 * Wait for a certain amount of time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that dates are close (within threshold)
 */
export function assertDatesClose(
	actual: Date,
	expected: Date,
	thresholdMs = 1000
): void {
	const diff = Math.abs(actual.getTime() - expected.getTime());
	if (diff > thresholdMs) {
		throw new Error(
			`Dates not close enough: ${actual.toISOString()} vs ${expected.toISOString()} (diff: ${diff}ms)`
		);
	}
}

/**
 * Create multiple mock projects for list testing
 */
export function createMockProjects(count: number): ProjectData[] {
	const projects: ProjectData[] = [];
	const baseTime = new Date('2024-01-01').getTime();

	for (let i = 0; i < count; i++) {
		const createdAt = new Date(baseTime + i * 1000 * 60 * 60); // 1 hour apart
		const updatedAt = new Date(createdAt.getTime() + 1000 * 60); // 1 minute later

		projects.push(
			createMockProject({
				id: `project-${i + 1}`,
				name: `Test Project ${i + 1}`,
				createdAt,
				updatedAt,
				metadata: createMockMetadata({
					id: `project-${i + 1}`,
					name: `Test Project ${i + 1}`,
					createdAt,
					updatedAt,
					tags: i % 2 === 0 ? ['even'] : ['odd']
				})
			})
		);
	}

	return projects;
}
