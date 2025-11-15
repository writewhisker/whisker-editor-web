import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { currentStory } from './projectStore';
import { tagRegistry, tagsByUsage, tagsByName, tagActions, TAG_COLORS } from './tagStore';

describe('tagStore', () => {
  let story: Story;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Set as current story
    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
    localStorage.clear();
  });

  describe('tagRegistry', () => {
    it('should create empty registry for story with no tags', () => {
      const registry = get(tagRegistry);
      expect(registry.size).toBe(0);
    });

    it('should track tags from passages', () => {
      const p1 = new Passage({ title: 'P1', tags: ['action', 'combat'] });
      const p2 = new Passage({ title: 'P2', tags: ['action', 'dialogue'] });
      story.addPassage(p1);
      story.addPassage(p2);

      currentStory.update(s => s);
      const registry = get(tagRegistry);

      expect(registry.size).toBe(3);
      expect(registry.has('action')).toBe(true);
      expect(registry.has('combat')).toBe(true);
      expect(registry.has('dialogue')).toBe(true);
    });

    it('should count tag usage correctly', () => {
      const p1 = new Passage({ title: 'P1', tags: ['action'] });
      const p2 = new Passage({ title: 'P2', tags: ['action'] });
      const p3 = new Passage({ title: 'P3', tags: ['action', 'dialogue'] });
      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(p3);

      currentStory.update(s => s);
      const registry = get(tagRegistry);

      const actionTag = registry.get('action');
      expect(actionTag?.usageCount).toBe(3);

      const dialogueTag = registry.get('dialogue');
      expect(dialogueTag?.usageCount).toBe(1);
    });

    it('should track passage IDs for each tag', () => {
      const p1 = new Passage({ title: 'P1', tags: ['action'] });
      const p2 = new Passage({ title: 'P2', tags: ['action'] });
      story.addPassage(p1);
      story.addPassage(p2);

      currentStory.update(s => s);
      const registry = get(tagRegistry);

      const actionTag = registry.get('action');
      expect(actionTag?.passageIds).toHaveLength(2);
      expect(actionTag?.passageIds).toContain(p1.id);
      expect(actionTag?.passageIds).toContain(p2.id);
    });

    it('should assign colors to tags', () => {
      const p1 = new Passage({ title: 'P1', tags: ['test'] });
      story.addPassage(p1);

      currentStory.update(s => s);
      const registry = get(tagRegistry);

      const testTag = registry.get('test');
      expect(testTag?.color).toBeDefined();
      expect(TAG_COLORS).toContain(testTag?.color);
    });
  });

  describe('tagsByUsage', () => {
    it('should sort tags by usage count descending', () => {
      const p1 = new Passage({ title: 'P1', tags: ['rare'] });
      const p2 = new Passage({ title: 'P2', tags: ['common', 'rare'] });
      const p3 = new Passage({ title: 'P3', tags: ['common'] });
      const p4 = new Passage({ title: 'P4', tags: ['common'] });
      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(p3);
      story.addPassage(p4);

      currentStory.update(s => s);
      const sorted = get(tagsByUsage);

      expect(sorted[0].name).toBe('common'); // 3 uses
      expect(sorted[0].usageCount).toBe(3);
      expect(sorted[1].name).toBe('rare'); // 2 uses
      expect(sorted[1].usageCount).toBe(2);
    });
  });

  describe('tagsByName', () => {
    it('should sort tags alphabetically', () => {
      const p1 = new Passage({ title: 'P1', tags: ['zebra', 'apple', 'middle'] });
      story.addPassage(p1);

      currentStory.update(s => s);
      const sorted = get(tagsByName);

      expect(sorted[0].name).toBe('apple');
      expect(sorted[1].name).toBe('middle');
      expect(sorted[2].name).toBe('zebra');
    });
  });

  describe('tagActions.getTagColor', () => {
    it('should return consistent color for same tag', () => {
      const color1 = tagActions.getTagColor('test');
      const color2 = tagActions.getTagColor('test');
      expect(color1).toBe(color2);
    });

    it('should return color from palette', () => {
      const color = tagActions.getTagColor('test');
      expect(TAG_COLORS).toContain(color);
    });
  });

  describe('tagActions.setTagColor', () => {
    it('should set custom color for tag', () => {
      tagActions.setTagColor('test', '#ff0000');
      const color = tagActions.getTagColor('test');
      expect(color).toBe('#ff0000');
    });

    it('should persist custom color in localStorage', () => {
      tagActions.setTagColor('test', '#00ff00');
      const stored = JSON.parse(localStorage.getItem('whisker-tag-colors') || '{}');
      expect(stored.test).toBe('#00ff00');
    });
  });

  describe('tagActions.resetTagColor', () => {
    it('should reset to hash-based color', () => {
      tagActions.setTagColor('test', '#ff0000');
      const customColor = tagActions.getTagColor('test');
      expect(customColor).toBe('#ff0000');

      tagActions.resetTagColor('test');
      const defaultColor = tagActions.getTagColor('test');
      expect(TAG_COLORS).toContain(defaultColor);
    });
  });

  describe('tagActions.renameTag', () => {
    it('should rename tag across all passages', () => {
      const p1 = new Passage({ title: 'P1', tags: ['old'] });
      const p2 = new Passage({ title: 'P2', tags: ['old', 'keep'] });
      story.addPassage(p1);
      story.addPassage(p2);

      const count = tagActions.renameTag('old', 'new', story);

      expect(count).toBe(2);
      expect(p1.tags).toContain('new');
      expect(p1.tags).not.toContain('old');
      expect(p2.tags).toContain('new');
      expect(p2.tags).toContain('keep');
    });

    it('should move custom color to new tag name', () => {
      tagActions.setTagColor('old', '#ff0000');
      const p1 = new Passage({ title: 'P1', tags: ['old'] });
      story.addPassage(p1);

      tagActions.renameTag('old', 'new', story);

      expect(tagActions.getTagColor('new')).toBe('#ff0000');
      expect(tagActions.getTagColor('old')).not.toBe('#ff0000');
    });

    it('should return 0 when tag not found', () => {
      const count = tagActions.renameTag('nonexistent', 'new', story);
      expect(count).toBe(0);
    });
  });

  describe('tagActions.deleteTag', () => {
    it('should remove tag from all passages', () => {
      const p1 = new Passage({ title: 'P1', tags: ['delete', 'keep'] });
      const p2 = new Passage({ title: 'P2', tags: ['delete'] });
      story.addPassage(p1);
      story.addPassage(p2);

      const count = tagActions.deleteTag('delete', story);

      expect(count).toBe(2);
      expect(p1.tags).not.toContain('delete');
      expect(p1.tags).toContain('keep');
      expect(p2.tags).not.toContain('delete');
      expect(p2.tags).toHaveLength(0);
    });

    it('should remove custom color', () => {
      tagActions.setTagColor('delete', '#ff0000');
      const p1 = new Passage({ title: 'P1', tags: ['delete'] });
      story.addPassage(p1);

      tagActions.deleteTag('delete', story);

      expect(tagActions.getTagColor('delete')).not.toBe('#ff0000');
    });

    it('should return 0 when tag not found', () => {
      const count = tagActions.deleteTag('nonexistent', story);
      expect(count).toBe(0);
    });
  });

  describe('tagActions.mergeTags', () => {
    it('should merge source tag into target tag', () => {
      const p1 = new Passage({ title: 'P1', tags: ['source'] });
      const p2 = new Passage({ title: 'P2', tags: ['source', 'other'] });
      story.addPassage(p1);
      story.addPassage(p2);

      const count = tagActions.mergeTags('source', 'target', story);

      expect(count).toBe(2);
      expect(p1.tags).toContain('target');
      expect(p1.tags).not.toContain('source');
      expect(p2.tags).toContain('target');
      expect(p2.tags).toContain('other');
    });

    it('should not duplicate target tag if already present', () => {
      const p1 = new Passage({ title: 'P1', tags: ['source', 'target'] });
      story.addPassage(p1);

      tagActions.mergeTags('source', 'target', story);

      expect(p1.tags.filter(t => t === 'target')).toHaveLength(1);
      expect(p1.tags).not.toContain('source');
    });

    it('should remove source tag custom color', () => {
      tagActions.setTagColor('source', '#ff0000');
      const p1 = new Passage({ title: 'P1', tags: ['source'] });
      story.addPassage(p1);

      tagActions.mergeTags('source', 'target', story);

      expect(tagActions.getTagColor('source')).not.toBe('#ff0000');
    });
  });

  describe('tagActions.getAllTags', () => {
    it('should return all unique tag names sorted', () => {
      const p1 = new Passage({ title: 'P1', tags: ['zebra', 'apple'] });
      const p2 = new Passage({ title: 'P2', tags: ['middle', 'apple'] });
      story.addPassage(p1);
      story.addPassage(p2);

      currentStory.update(s => s);
      const tags = tagActions.getAllTags();

      expect(tags).toEqual(['apple', 'middle', 'zebra']);
    });
  });

  describe('tagActions.getTagInfo', () => {
    it('should return tag info', () => {
      const p1 = new Passage({ title: 'P1', tags: ['test'] });
      story.addPassage(p1);

      currentStory.update(s => s);
      const info = tagActions.getTagInfo('test');

      expect(info).toBeDefined();
      expect(info?.name).toBe('test');
      expect(info?.usageCount).toBe(1);
      expect(info?.passageIds).toContain(p1.id);
    });

    it('should return undefined for non-existent tag', () => {
      const info = tagActions.getTagInfo('nonexistent');
      expect(info).toBeUndefined();
    });
  });

  describe('tagActions.getPassagesWithTag', () => {
    it('should return passage IDs with specific tag', () => {
      const p1 = new Passage({ title: 'P1', tags: ['test'] });
      const p2 = new Passage({ title: 'P2', tags: ['test'] });
      const p3 = new Passage({ title: 'P3', tags: ['other'] });
      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(p3);

      currentStory.update(s => s);
      const passages = tagActions.getPassagesWithTag('test', story);

      expect(passages).toHaveLength(2);
      expect(passages).toContain(p1.id);
      expect(passages).toContain(p2.id);
    });

    it('should return empty array for non-existent tag', () => {
      const passages = tagActions.getPassagesWithTag('nonexistent', story);
      expect(passages).toEqual([]);
    });
  });

  describe('tagActions.addTagToPassage', () => {
    it('should add tag to passage', () => {
      const p1 = new Passage({ title: 'P1', tags: [] });
      story.addPassage(p1);

      const result = tagActions.addTagToPassage(p1.id, 'new', story);

      expect(result).toBe(true);
      expect(p1.tags).toContain('new');
    });

    it('should not add duplicate tag', () => {
      const p1 = new Passage({ title: 'P1', tags: ['existing'] });
      story.addPassage(p1);

      const result = tagActions.addTagToPassage(p1.id, 'existing', story);

      expect(result).toBe(false);
      expect(p1.tags.filter(t => t === 'existing')).toHaveLength(1);
    });

    it('should return false for non-existent passage', () => {
      const result = tagActions.addTagToPassage('nonexistent', 'tag', story);
      expect(result).toBe(false);
    });
  });

  describe('tagActions.removeTagFromPassage', () => {
    it('should remove tag from passage', () => {
      const p1 = new Passage({ title: 'P1', tags: ['remove', 'keep'] });
      story.addPassage(p1);

      const result = tagActions.removeTagFromPassage(p1.id, 'remove', story);

      expect(result).toBe(true);
      expect(p1.tags).not.toContain('remove');
      expect(p1.tags).toContain('keep');
    });

    it('should return false when tag not present', () => {
      const p1 = new Passage({ title: 'P1', tags: [] });
      story.addPassage(p1);

      const result = tagActions.removeTagFromPassage(p1.id, 'nonexistent', story);
      expect(result).toBe(false);
    });

    it('should return false for non-existent passage', () => {
      const result = tagActions.removeTagFromPassage('nonexistent', 'tag', story);
      expect(result).toBe(false);
    });
  });

  describe('tagActions.getTagStatistics', () => {
    it('should return correct statistics', () => {
      const p1 = new Passage({ title: 'P1', tags: ['common', 'rare'] });
      const p2 = new Passage({ title: 'P2', tags: ['common'] });
      const p3 = new Passage({ title: 'P3', tags: ['common'] });
      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(p3);

      currentStory.update(s => s);
      const stats = tagActions.getTagStatistics();

      expect(stats.totalTags).toBe(2);
      expect(stats.totalUsages).toBe(4); // common:3 + rare:1
      expect(stats.mostUsedTag?.name).toBe('common');
      expect(stats.mostUsedTag?.usageCount).toBe(3);
      expect(stats.averageUsage).toBe(2);
    });

    it('should handle empty story', () => {
      const stats = tagActions.getTagStatistics();

      expect(stats.totalTags).toBe(0);
      expect(stats.totalUsages).toBe(0);
      expect(stats.mostUsedTag).toBeNull();
      expect(stats.averageUsage).toBe(0);
    });
  });
});
