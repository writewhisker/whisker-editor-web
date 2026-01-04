import { describe, it, expect } from 'vitest';
import {
  mergeStories,
  resolveConflicts,
  type StoryMergeResult,
} from './StoryMerge';
import type { StoryData } from '@writewhisker/story-models';

/**
 * Create a minimal story for testing
 */
function createTestStory(overrides: Partial<StoryData> = {}): StoryData {
  return {
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: '2024-01-01T00:00:00Z',
      modified: '2024-01-01T00:00:00Z',
      ...overrides.metadata,
    },
    startPassage: 'start',
    passages: {
      start: {
        id: 'start',
        title: 'Start',
        content: 'This is the beginning.',
        position: { x: 0, y: 0 },
        choices: [],
      },
      ...overrides.passages,
    },
    variables: {
      ...overrides.variables,
    },
    ...overrides,
  };
}

describe('StoryMerge', () => {
  describe('mergeStories', () => {
    it('should merge identical stories without conflicts', () => {
      const base = createTestStory();
      const result = mergeStories(base, base, base);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.merged.passages.start.content).toBe('This is the beginning.');
    });

    it('should merge when only local has changes', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Local changes',
          },
        },
      });

      const result = mergeStories(base, local, base);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.merged.passages.start.content).toBe('Local changes');
    });

    it('should merge when only remote has changes', () => {
      const base = createTestStory();
      const remote = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Remote changes',
          },
        },
      });

      const result = mergeStories(base, base, remote);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.merged.passages.start.content).toBe('Remote changes');
    });

    it('should merge non-conflicting changes from both sides', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Original',
            position: { x: 0, y: 0 },
            choices: [],
          },
          passage1: {
            id: 'passage1',
            title: 'Passage 1',
            content: 'Content 1',
            position: { x: 100, y: 0 },
            choices: [],
          },
        },
      });

      const local = createTestStory({
        passages: {
          start: base.passages.start,
          passage1: {
            ...base.passages.passage1,
            content: 'Modified by local',
          },
        },
      });

      const remote = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Modified by remote',
          },
          passage1: base.passages.passage1,
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.merged.passages.start.content).toBe('Modified by remote');
      expect(result.merged.passages.passage1.content).toBe('Modified by local');
    });

    it('should detect content conflicts', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Local content',
          },
        },
      });
      const remote = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Remote content',
          },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some(c => c.type === 'passage-content')).toBe(true);
    });

    it('should handle passage additions from both sides', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          ...base.passages,
          localPassage: {
            id: 'localPassage',
            title: 'Local Passage',
            content: 'Added by local',
            position: { x: 100, y: 0 },
            choices: [],
          },
        },
      });
      const remote = createTestStory({
        passages: {
          ...base.passages,
          remotePassage: {
            id: 'remotePassage',
            title: 'Remote Passage',
            content: 'Added by remote',
            position: { x: 200, y: 0 },
            choices: [],
          },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.merged.passages.localPassage).toBeDefined();
      expect(result.merged.passages.remotePassage).toBeDefined();
    });

    it('should handle passage deletions', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Original',
            position: { x: 0, y: 0 },
            choices: [],
          },
          toDelete: {
            id: 'toDelete',
            title: 'To Delete',
            content: 'Will be deleted',
            position: { x: 100, y: 0 },
            choices: [],
          },
        },
      });

      const local = createTestStory({
        passages: {
          start: base.passages.start,
          // toDelete removed
        },
      });

      const result = mergeStories(base, local, base);

      expect(result.success).toBe(true);
      expect(result.merged.passages.toDelete).toBeUndefined();
    });

    it('should detect delete-modify conflicts', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Original',
            position: { x: 0, y: 0 },
            choices: [],
          },
          contested: {
            id: 'contested',
            title: 'Contested',
            content: 'Original content',
            position: { x: 100, y: 0 },
            choices: [],
          },
        },
      });

      const local = createTestStory({
        passages: {
          start: base.passages.start,
          // contested deleted
        },
      });

      const remote = createTestStory({
        passages: {
          start: base.passages.start,
          contested: {
            ...base.passages.contested,
            content: 'Modified by remote',
          },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.conflicts.some(c => c.type === 'passage-deleted')).toBe(true);
    });

    it('should merge variable additions', () => {
      const base = createTestStory();
      const local = createTestStory({
        variables: {
          localVar: { name: 'localVar', type: 'number', initial: 10 },
        },
      });
      const remote = createTestStory({
        variables: {
          remoteVar: { name: 'remoteVar', type: 'string', initial: 'hello' },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.success).toBe(true);
      expect(result.merged.variables.localVar).toBeDefined();
      expect(result.merged.variables.remoteVar).toBeDefined();
    });

    it('should detect variable conflicts', () => {
      const base = createTestStory({
        variables: {
          score: { name: 'score', type: 'number', initial: 0 },
        },
      });
      const local = createTestStory({
        variables: {
          score: { name: 'score', type: 'number', initial: 100 },
        },
      });
      const remote = createTestStory({
        variables: {
          score: { name: 'score', type: 'number', initial: 50 },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.conflicts.some(c => c.type === 'variable-value')).toBe(true);
    });

    it('should auto-resolve with local strategy', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Local' },
        },
      });
      const remote = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Remote' },
        },
      });

      const result = mergeStories(base, local, remote, { strategy: 'local' });

      expect(result.merged.passages.start.content).toBe('Local');
      expect(result.autoResolved).toBeGreaterThan(0);
    });

    it('should auto-resolve with remote strategy', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Local' },
        },
      });
      const remote = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Remote' },
        },
      });

      const result = mergeStories(base, local, remote, { strategy: 'remote' });

      expect(result.merged.passages.start.content).toBe('Remote');
    });

    it('should merge tags correctly', () => {
      const base = createTestStory({
        metadata: {
          title: 'Test',
          author: 'Author',
          version: '1.0.0',
          created: '2024-01-01',
          modified: '2024-01-01',
          tags: ['original'],
        },
      });
      const local = createTestStory({
        metadata: {
          ...base.metadata,
          tags: ['original', 'local-tag'],
        },
      });
      const remote = createTestStory({
        metadata: {
          ...base.metadata,
          tags: ['original', 'remote-tag'],
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.merged.metadata.tags).toContain('local-tag');
      expect(result.merged.metadata.tags).toContain('remote-tag');
    });

    it('should merge choice additions', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            choices: [
              { id: 'choice1', text: 'Local choice', target: 'next' },
            ],
          },
        },
      });
      const remote = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            choices: [
              { id: 'choice2', text: 'Remote choice', target: 'other' },
            ],
          },
        },
      });

      const result = mergeStories(base, local, remote);

      expect(result.merged.passages.start.choices).toHaveLength(2);
    });
  });

  describe('resolveConflicts', () => {
    it('should apply manual resolutions', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Local' },
        },
      });
      const remote = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Remote' },
        },
      });

      const mergeResult = mergeStories(base, local, remote);
      const resolutions = new Map<string, 'local' | 'remote' | 'base'>([
        ['passages.start.content', 'remote'],
      ]);

      const resolved = resolveConflicts(mergeResult, resolutions);

      expect(resolved.passages.start.content).toBe('Remote');
    });

    it('should apply base resolution', () => {
      const base = createTestStory();
      const local = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Local' },
        },
      });
      const remote = createTestStory({
        passages: {
          start: { ...base.passages.start, content: 'Remote' },
        },
      });

      const mergeResult = mergeStories(base, local, remote);
      const resolutions = new Map<string, 'local' | 'remote' | 'base'>([
        ['passages.start.content', 'base'],
      ]);

      const resolved = resolveConflicts(mergeResult, resolutions);

      expect(resolved.passages.start.content).toBe('This is the beginning.');
    });
  });
});
