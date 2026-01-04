/**
 * VCS Tools Integration Tests
 *
 * Tests for diff/merge operations on complete stories.
 */

import { describe, it, expect } from 'vitest';
import { diffStories, formatDiff, getSummary } from './StoryDiff';
import { mergeStories, resolveConflicts } from './StoryMerge';
import type { StoryData } from '@writewhisker/story-models';

/**
 * Create a more complex story for integration testing
 */
function createCompleteStory(): StoryData {
  return {
    metadata: {
      title: 'The Adventure',
      author: 'Test Author',
      version: '1.0.0',
      created: '2024-01-01T00:00:00Z',
      modified: '2024-01-01T00:00:00Z',
      description: 'An exciting adventure story',
      tags: ['adventure', 'fantasy'],
      ifid: '12345678-1234-1234-1234-123456789ABC',
    },
    startPassage: 'start',
    passages: {
      start: {
        id: 'start',
        title: 'The Beginning',
        content: 'You stand at the entrance of a dark cave.\n\nWhat do you do?',
        position: { x: 100, y: 100 },
        choices: [
          { id: 'c1', text: 'Enter the cave', target: 'cave' },
          { id: 'c2', text: 'Walk away', target: 'forest' },
        ],
        tags: ['start'],
      },
      cave: {
        id: 'cave',
        title: 'The Cave',
        content: 'The cave is dark and mysterious.\n\nYou hear strange sounds.',
        position: { x: 200, y: 100 },
        choices: [
          { id: 'c3', text: 'Light a torch', target: 'cave_lit', condition: 'hasTorch' },
          { id: 'c4', text: 'Go deeper', target: 'deep_cave' },
          { id: 'c5', text: 'Go back', target: 'start' },
        ],
        onEnterScript: 'visited_cave = true',
      },
      forest: {
        id: 'forest',
        title: 'The Forest',
        content: 'The forest is peaceful and calm.',
        position: { x: 100, y: 200 },
        choices: [
          { id: 'c6', text: 'Return to cave', target: 'start' },
        ],
      },
      deep_cave: {
        id: 'deep_cave',
        title: 'Deep in the Cave',
        content: 'You find a treasure chest!',
        position: { x: 300, y: 100 },
        choices: [
          { id: 'c7', text: 'Open it', target: 'treasure' },
          { id: 'c8', text: 'Leave it', target: 'cave' },
        ],
      },
      treasure: {
        id: 'treasure',
        title: 'Treasure Found!',
        content: 'You found 100 gold coins!',
        position: { x: 400, y: 100 },
        choices: [],
        onEnterScript: 'gold = gold + 100',
      },
      cave_lit: {
        id: 'cave_lit',
        title: 'The Lit Cave',
        content: 'With light, you can see ancient writings on the walls.',
        position: { x: 200, y: 200 },
        choices: [
          { id: 'c9', text: 'Read the writings', target: 'secret' },
          { id: 'c10', text: 'Continue deeper', target: 'deep_cave' },
        ],
      },
      secret: {
        id: 'secret',
        title: 'The Secret',
        content: 'The writings reveal a hidden passage!',
        position: { x: 200, y: 300 },
        choices: [],
      },
    },
    variables: {
      gold: { name: 'gold', type: 'number', initial: 0 },
      hasTorch: { name: 'hasTorch', type: 'boolean', initial: false },
      visited_cave: { name: 'visited_cave', type: 'boolean', initial: false },
    },
    settings: {
      theme: 'dark',
      autoSave: true,
    },
  };
}

describe('VCS Tools Integration', () => {
  describe('Full Story Diff', () => {
    it('should handle complex story comparisons', () => {
      const base = createCompleteStory();

      // Create a modified version with multiple changes
      const modified: StoryData = JSON.parse(JSON.stringify(base));
      modified.metadata.version = '1.1.0';
      modified.passages.start.content = 'You arrive at the entrance of an ancient cave.';
      modified.passages.cave.choices.push({
        id: 'c_new',
        text: 'Search for secrets',
        target: 'secret',
      });
      modified.variables.gems = { name: 'gems', type: 'number', initial: 0 };
      delete modified.passages.forest;

      const diff = diffStories(base, modified);

      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.passagesModified).toBeGreaterThan(0);
      expect(diff.summary.passagesRemoved).toBe(1);
      expect(diff.summary.variablesAdded).toBe(1);
      expect(diff.summary.choicesAdded).toBe(1);
    });

    it('should produce readable formatted output', () => {
      const base = createCompleteStory();
      const modified: StoryData = JSON.parse(JSON.stringify(base));
      modified.passages.start.title = 'A New Beginning';
      modified.metadata.author = 'New Author';

      const diff = diffStories(base, modified);
      const output = formatDiff(diff);

      expect(output).toContain('Story Diff Summary');
      expect(output).toContain('A New Beginning');
      expect(output).toContain('New Author');
    });

    it('should provide accurate summary for commit messages', () => {
      const base = createCompleteStory();
      const modified: StoryData = JSON.parse(JSON.stringify(base));
      modified.passages.new1 = {
        id: 'new1',
        title: 'New Passage 1',
        content: 'New content',
        position: { x: 500, y: 100 },
        choices: [],
      };
      modified.passages.new2 = {
        id: 'new2',
        title: 'New Passage 2',
        content: 'More content',
        position: { x: 600, y: 100 },
        choices: [],
      };
      modified.passages.cave.content = 'Modified cave content';

      const diff = diffStories(base, modified);
      const summary = getSummary(diff);

      expect(summary).toContain('added 2 passages');
      expect(summary).toContain('modified 1 passage');
    });
  });

  describe('Full Story Merge', () => {
    it('should merge non-conflicting changes from two branches', () => {
      const base = createCompleteStory();

      // Local changes: modify cave passage and add a variable
      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.passages.cave.content = 'The cave is dark and filled with bats.';
      local.variables.bats = { name: 'bats', type: 'number', initial: 10 };

      // Remote changes: modify forest passage and update metadata
      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.forest.content = 'The forest is filled with birdsong.';
      remote.metadata.version = '1.0.1';

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.merged.passages.cave.content).toContain('bats');
      expect(result.merged.passages.forest.content).toContain('birdsong');
      expect(result.merged.variables.bats).toBeDefined();
      expect(result.merged.metadata.version).toBe('1.0.1');
    });

    it('should detect conflicts on same passage content', () => {
      const base = createCompleteStory();

      // Both branches modify the same passage
      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.passages.start.content = 'Local version of the intro.';

      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.start.content = 'Remote version of the intro.';

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some(c => c.type === 'passage-content')).toBe(true);
    });

    it('should handle passage additions from both branches', () => {
      const base = createCompleteStory();

      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.passages.local_new = {
        id: 'local_new',
        title: 'Local New Passage',
        content: 'Added by local',
        position: { x: 500, y: 100 },
        choices: [],
      };

      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.remote_new = {
        id: 'remote_new',
        title: 'Remote New Passage',
        content: 'Added by remote',
        position: { x: 600, y: 100 },
        choices: [],
      };

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.merged.passages.local_new).toBeDefined();
      expect(result.merged.passages.remote_new).toBeDefined();
    });

    it('should handle choice modifications without conflicts', () => {
      const base = createCompleteStory();

      // Local adds a choice
      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.passages.start.choices.push({
        id: 'local_choice',
        text: 'Climb a tree',
        target: 'tree',
      });

      // Remote modifies existing choice
      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.cave.choices[0].text = 'Light your torch';

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.merged.passages.start.choices.some(c => c.id === 'local_choice')).toBe(true);
      expect(result.merged.passages.cave.choices[0].text).toBe('Light your torch');
    });

    it('should resolve conflicts with strategy', () => {
      const base = createCompleteStory();

      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.metadata.title = 'Local Title';

      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.metadata.title = 'Remote Title';

      // Use remote strategy
      const result = mergeStories(base, local, remote, { strategy: 'remote' });

      expect(result.merged.metadata.title).toBe('Remote Title');
      expect(result.autoResolved).toBeGreaterThan(0);
    });

    it('should allow manual conflict resolution', () => {
      const base = createCompleteStory();

      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.passages.start.content = 'Local content';

      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.start.content = 'Remote content';

      const mergeResult = mergeStories(base, local, remote);

      // Resolve in favor of remote
      const resolutions = new Map<string, 'local' | 'remote' | 'base'>();
      for (const conflict of mergeResult.conflicts) {
        resolutions.set(conflict.path, 'remote');
      }

      const resolved = resolveConflicts(mergeResult, resolutions);

      expect(resolved.passages.start.content).toBe('Remote content');
    });

    it('should merge variable changes correctly', () => {
      const base = createCompleteStory();

      // Local adds a variable
      const local: StoryData = JSON.parse(JSON.stringify(base));
      local.variables.health = { name: 'health', type: 'number', initial: 100 };

      // Remote modifies existing variable
      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.variables.gold.initial = 50;

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.merged.variables.health).toBeDefined();
      expect(result.merged.variables.gold.initial).toBe(50);
    });

    it('should handle passage deletions', () => {
      const base = createCompleteStory();

      // Local deletes forest
      const local: StoryData = JSON.parse(JSON.stringify(base));
      delete local.passages.forest;

      // Remote doesn't change forest
      const result = mergeStories(base, local, base);

      expect(result.success).toBe(true);
      expect(result.merged.passages.forest).toBeUndefined();
    });

    it('should detect delete-modify conflicts', () => {
      const base = createCompleteStory();

      // Local deletes forest
      const local: StoryData = JSON.parse(JSON.stringify(base));
      delete local.passages.forest;

      // Remote modifies forest
      const remote: StoryData = JSON.parse(JSON.stringify(base));
      remote.passages.forest.content = 'A beautiful enchanted forest.';

      const result = mergeStories(base, local, remote);

      expect(result.conflicts.some(c => c.type === 'passage-deleted')).toBe(true);
    });
  });

  describe('Round-trip Consistency', () => {
    it('should maintain story integrity through diff and merge', () => {
      const original = createCompleteStory();

      // No changes should produce no diff
      const noDiff = diffStories(original, original);
      expect(noDiff.hasChanges).toBe(false);

      // Merge with no changes should return original
      const noChangeResult = mergeStories(original, original, original);
      expect(noChangeResult.success).toBe(true);

      // Compare structures
      expect(noChangeResult.merged.metadata.title).toBe(original.metadata.title);
      expect(Object.keys(noChangeResult.merged.passages).length)
        .toBe(Object.keys(original.passages).length);
    });

    it('should preserve all passage properties through merge', () => {
      const base = createCompleteStory();
      const modified: StoryData = JSON.parse(JSON.stringify(base));
      modified.passages.cave.notes = 'Author notes here';

      const result = mergeStories(base, modified, base);

      expect(result.merged.passages.cave.notes).toBe('Author notes here');
      expect(result.merged.passages.cave.onEnterScript).toBe(base.passages.cave.onEnterScript);
    });
  });
});
