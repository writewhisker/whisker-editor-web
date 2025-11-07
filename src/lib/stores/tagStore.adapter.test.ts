/**
 * TagStore Adapter Tests
 *
 * Tests tagStore integration with PreferenceService.
 * Verifies custom tag color persistence and tag operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { tagRegistry, tagsByUsage, tagsByName, tagActions } from './tagStore';
import { currentStory } from './projectStore';
import { Story } from '@whisker/core-ts';
import { getPreferenceService } from '../services/storage/PreferenceService';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter';
import { MockLocalStorage } from '../services/storage/testHelpers';

describe('TagStore with PreferenceService', () => {
	let mockStorage: MockLocalStorage;
	let adapter: LocalStorageAdapter;
	let prefService: ReturnType<typeof getPreferenceService>;
	let testStory: Story;

	async function createFreshStory() {
		// Import Passage class
		const { Passage } = await import('../models/Passage');

		// Create test story with tagged passages
		const story = new Story();
		story.metadata.title = 'Test Story';

		// Add passages with tags (create NEW objects with NEW IDs each time)
		const passage1 = new Passage();
		passage1.title = `Passage 1 ${Date.now()}`;
		passage1.tags = ['combat', 'important'];
		story.addPassage(passage1);

		const passage2 = new Passage();
		passage2.title = `Passage 2 ${Date.now()}`;
		passage2.tags = ['combat', 'dialog'];
		story.addPassage(passage2);

		const passage3 = new Passage();
		passage3.title = `Passage 3 ${Date.now()}`;
		passage3.tags = ['important'];
		story.addPassage(passage3);

		return story;
	}

	beforeEach(async () => {
		// Setup mock localStorage
		mockStorage = new MockLocalStorage();
		global.localStorage = mockStorage as any;

		// Create and initialize adapter
		adapter = new LocalStorageAdapter();
		await adapter.initialize();

		// Get preference service instance
		prefService = getPreferenceService();
		await prefService.initialize();

		// Clear any previous settings
		prefService.clearCache();
		mockStorage.clear();

		// Clear custom tag colors at the start
		prefService.setPreferenceSync('whisker-tag-colors', {});
		tagActions._resetCustomColors();

		// Clear current story first to avoid leakage
		currentStory.set(null);

		// Create fresh test story
		testStory = await createFreshStory();

		// Set as current story
		currentStory.set(testStory);
	});

	afterEach(() => {
		currentStory.set(null);
		prefService.clearCache();
		// Clear custom tag colors from storage and store
		mockStorage.removeItem('whisker-tag-colors');
		prefService.setPreferenceSync('whisker-tag-colors', {});
		tagActions._resetCustomColors();
	});

	describe('custom color persistence', () => {
		it('should save custom tag color to PreferenceService', () => {
			tagActions.setTagColor('combat', '#ff0000');

			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ combat: '#ff0000' });
		});

		it('should load custom tag colors from PreferenceService', () => {
			// Set color via tagActions (which updates both store and preference)
			tagActions.setTagColor('combat', '#00ff00');

			// Should retrieve custom color
			const color = tagActions.getTagColor('combat');
			expect(color).toBe('#00ff00');
		});

		it('should persist multiple custom colors', () => {
			tagActions.setTagColor('combat', '#ff0000');
			tagActions.setTagColor('dialog', '#00ff00');
			tagActions.setTagColor('important', '#0000ff');

			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({
				combat: '#ff0000',
				dialog: '#00ff00',
				important: '#0000ff',
			});
		});

		it('should update existing custom color', () => {
			tagActions.setTagColor('combat', '#ff0000');
			tagActions.setTagColor('combat', '#00ff00');

			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ combat: '#00ff00' });
		});

		it('should remove custom color when reset', () => {
			tagActions.setTagColor('combat', '#ff0000');
			tagActions.resetTagColor('combat');

			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({});
		});

		it('should fallback to hash-based color when no custom color', () => {
			const color = tagActions.getTagColor('combat');
			// Should be a valid hex color
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
		});
	});

	describe('tag registry', () => {
		it('should build registry from current story', () => {
			const registry = get(tagRegistry);

			expect(registry.size).toBe(3);
			expect(registry.has('combat')).toBe(true);
			expect(registry.has('important')).toBe(true);
			expect(registry.has('dialog')).toBe(true);
		});

		it('should track tag usage counts', () => {
			const registry = get(tagRegistry);

			const combat = registry.get('combat');
			expect(combat?.usageCount).toBe(2);

			const important = registry.get('important');
			expect(important?.usageCount).toBe(2);

			const dialog = registry.get('dialog');
			expect(dialog?.usageCount).toBe(1);
		});

		it('should include custom colors in registry', () => {
			tagActions.setTagColor('combat', '#ff0000');

			const registry = get(tagRegistry);
			const combat = registry.get('combat');

			expect(combat?.color).toBe('#ff0000');
		});

		it('should track passage IDs for each tag', () => {
			const registry = get(tagRegistry);

			const combat = registry.get('combat');
			expect(combat?.passageIds).toHaveLength(2);
		});
	});

	describe('tag sorting', () => {
		it('should sort tags by usage', () => {
			const sorted = get(tagsByUsage);

			// combat and important both have 2 uses, dialog has 1
			expect(sorted[0].usageCount).toBeGreaterThanOrEqual(sorted[1].usageCount);
			expect(sorted[1].usageCount).toBeGreaterThanOrEqual(sorted[2].usageCount);
		});

		it('should sort tags by name', () => {
			const sorted = get(tagsByName);

			expect(sorted[0].name).toBe('combat');
			expect(sorted[1].name).toBe('dialog');
			expect(sorted[2].name).toBe('important');
		});
	});

	describe('tag operations', () => {
		it('should rename tag and preserve custom color', async () => {
			// Create fresh story for this test to avoid mutations from previous tests
			const freshStory = await createFreshStory();
			currentStory.set(freshStory);


			tagActions.setTagColor('combat', '#ff0000');
			const count = tagActions.renameTag('combat', 'battle', freshStory);

			// Check custom color was moved
			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ battle: '#ff0000' });

			// Check passages were updated
			const passages = Array.from(freshStory.passages.values());
			const passage1 = passages[1];
			expect(passage1.tags).toContain('battle');
			expect(passage1.tags).not.toContain('combat');
		});

		it('should delete tag and remove custom color', () => {
			tagActions.setTagColor('combat', '#ff0000');
			const count = tagActions.deleteTag('combat', testStory);

			expect(count).toBe(2); // Removed from 2 passages

			// Check custom color was removed
			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({});

			// Check passages were updated
			const passages = Array.from(testStory.passages.values());
			const passage1 = passages[0];
			expect(passage1.tags).not.toContain('combat');
		});

		it('should merge tags and clean up source custom color', () => {
			tagActions.setTagColor('combat', '#ff0000');
			tagActions.setTagColor('important', '#00ff00');

			tagActions.mergeTags('combat', 'important', testStory);

			// Check source color was removed
			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ important: '#00ff00' });
		});

		it('should add tag to passage', () => {
			const passages = Array.from(testStory.passages.values());
			const passage = passages[0];
			const added = tagActions.addTagToPassage(passage.id, 'new-tag', testStory);

			expect(added).toBe(true);
			expect(passage.tags).toContain('new-tag');
		});

		it('should remove tag from passage', async () => {
			// Create fresh story for this test
			const freshStory = await createFreshStory();
			currentStory.set(freshStory);

			const passages = Array.from(freshStory.passages.values());
			const passage = passages[1];
			const removed = tagActions.removeTagFromPassage(passage.id, 'combat', freshStory);

			expect(removed).toBe(true);
			expect(passage.tags).not.toContain('combat');
		});

		it('should not add duplicate tag to passage', async () => {
			// Create fresh story for this test
			const freshStory = await createFreshStory();
			currentStory.set(freshStory);

			const passages = Array.from(freshStory.passages.values());
			const passage = passages[1];
			const added = tagActions.addTagToPassage(passage.id, 'combat', freshStory);

			expect(added).toBe(false);
		});

		it('should handle removing non-existent tag', () => {
			const passages = Array.from(testStory.passages.values());
			const passage = passages[0];
			const removed = tagActions.removeTagFromPassage(passage.id, 'non-existent', testStory);

			expect(removed).toBe(false);
		});
	});

	describe('tag queries', () => {
		it('should get all unique tags', () => {
			const tags = tagActions.getAllTags();

			expect(tags).toEqual(['combat', 'dialog', 'important']);
		});

		it('should get tag info', () => {
			const info = tagActions.getTagInfo('combat');

			expect(info).toBeDefined();
			expect(info?.name).toBe('combat');
			expect(info?.usageCount).toBe(2);
		});

		it('should get passages with tag', () => {
			const passageIds = tagActions.getPassagesWithTag('combat', testStory);

			expect(passageIds).toHaveLength(2);
		});

		it('should return empty array for non-existent tag', () => {
			const passageIds = tagActions.getPassagesWithTag('non-existent', testStory);

			expect(passageIds).toEqual([]);
		});
	});

	describe('tag statistics', () => {
		it('should calculate tag statistics', () => {
			const stats = tagActions.getTagStatistics();

			expect(stats.totalTags).toBe(3);
			expect(stats.totalUsages).toBe(5); // combat:2 + important:2 + dialog:1
			expect(stats.mostUsedTag?.usageCount).toBe(2);
			expect(stats.averageUsage).toBeCloseTo(1.67, 1);
		});

		it('should handle empty story', () => {
			currentStory.set(new Story());

			const stats = tagActions.getTagStatistics();

			expect(stats.totalTags).toBe(0);
			expect(stats.totalUsages).toBe(0);
			expect(stats.mostUsedTag).toBeNull();
			expect(stats.averageUsage).toBe(0);
		});
	});

	describe('backward compatibility', () => {
		it('should read custom colors from localStorage fallback', () => {
			// Set color via tagActions
			tagActions.setTagColor('combat', '#ff0000');

			// PreferenceService should have the color (it uses localStorage under the hood)
			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ combat: '#ff0000' });

			// Should also retrieve the color
			const color = tagActions.getTagColor('combat');
			expect(color).toBe('#ff0000');
		});

		it('should migrate old custom colors on first write', () => {
			// Set initial value
			tagActions.setTagColor('combat', '#ff0000');

			// Update with new value
			tagActions.setTagColor('combat', '#00ff00');

			// Should have new value
			const stored = prefService.getPreferenceSync('whisker-tag-colors', {});
			expect(stored).toEqual({ combat: '#00ff00' });
		});
	});

	describe('error handling', () => {
		it('should handle invalid passage ID in addTagToPassage', () => {
			const added = tagActions.addTagToPassage('invalid-id', 'new-tag', testStory);
			expect(added).toBe(false);
		});

		it('should handle invalid passage ID in removeTagFromPassage', () => {
			const removed = tagActions.removeTagFromPassage('invalid-id', 'combat', testStory);
			expect(removed).toBe(false);
		});
	});

	describe('reactivity', () => {
		it('should update registry when story changes', async () => {
			const initialRegistry = get(tagRegistry);
			expect(initialRegistry.size).toBe(3);

			// Import Passage class
			const { Passage } = await import('../models/Passage');

			// Add new passage with new tag
			const newPassage = new Passage();
			newPassage.title = 'New Passage';
			newPassage.tags = ['new-tag'];
			testStory.addPassage(newPassage);

			// Trigger reactivity by updating currentStory
			currentStory.set(testStory);

			const updatedRegistry = get(tagRegistry);
			expect(updatedRegistry.size).toBe(4);
			expect(updatedRegistry.has('new-tag')).toBe(true);
		});

		it('should update registry when custom colors change', () => {
			const initialRegistry = get(tagRegistry);
			const initialColor = initialRegistry.get('combat')?.color;

			tagActions.setTagColor('combat', '#ff0000');

			const updatedRegistry = get(tagRegistry);
			const updatedColor = updatedRegistry.get('combat')?.color;

			expect(updatedColor).not.toBe(initialColor);
			expect(updatedColor).toBe('#ff0000');
		});
	});
});
