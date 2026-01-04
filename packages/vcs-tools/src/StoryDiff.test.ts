import { describe, it, expect } from 'vitest';
import {
  diffStories,
  formatDiff,
  getSummary,
  type StoryDiffResult,
} from './StoryDiff';
import type { StoryData, PassageData, VariableData } from '@writewhisker/story-models';

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

describe('StoryDiff', () => {
  describe('diffStories', () => {
    it('should detect no changes for identical stories', () => {
      const story = createTestStory();
      const result = diffStories(story, story);

      expect(result.hasChanges).toBe(false);
      expect(result.summary.passagesAdded).toBe(0);
      expect(result.summary.passagesRemoved).toBe(0);
      expect(result.summary.passagesModified).toBe(0);
    });

    it('should detect added passages', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: base.passages.start,
          newPassage: {
            id: 'newPassage',
            title: 'New Passage',
            content: 'New content',
            position: { x: 100, y: 100 },
            choices: [],
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.passagesAdded).toBe(1);
      expect(result.passageChanges.find(p => p.passageId === 'newPassage')?.type).toBe('added');
    });

    it('should detect removed passages', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [],
          },
          toRemove: {
            id: 'toRemove',
            title: 'To Remove',
            content: 'Will be removed',
            position: { x: 100, y: 100 },
            choices: [],
          },
        },
      });
      const modified = createTestStory();

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.passagesRemoved).toBe(1);
      expect(result.passageChanges.find(p => p.passageId === 'toRemove')?.type).toBe('removed');
    });

    it('should detect modified passage content', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Modified content',
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.passagesModified).toBe(1);
      const passageChange = result.passageChanges.find(p => p.passageId === 'start');
      expect(passageChange?.type).toBe('modified');
      expect(passageChange?.fields?.find(f => f.field === 'content')).toBeDefined();
    });

    it('should detect modified passage title', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            title: 'New Title',
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      const passageChange = result.passageChanges.find(p => p.passageId === 'start');
      expect(passageChange?.fields?.find(f => f.field === 'title')).toBeDefined();
    });

    it('should ignore position changes by default', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            position: { x: 500, y: 500 },
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(false);
    });

    it('should detect position changes when not ignored', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            position: { x: 500, y: 500 },
          },
        },
      });

      const result = diffStories(base, modified, { ignorePositions: false });

      expect(result.hasChanges).toBe(true);
      const passageChange = result.passageChanges.find(p => p.passageId === 'start');
      expect(passageChange?.fields?.find(f => f.field === 'position')).toBeDefined();
    });

    it('should detect added choices', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            choices: [
              {
                id: 'choice1',
                text: 'Go forward',
                target: 'next',
              },
            ],
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.choicesAdded).toBe(1);
    });

    it('should detect removed choices', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [
              {
                id: 'choice1',
                text: 'Go forward',
                target: 'next',
              },
            ],
          },
        },
      });
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            choices: [],
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.choicesRemoved).toBe(1);
    });

    it('should detect modified choices', () => {
      const base = createTestStory({
        passages: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Content',
            position: { x: 0, y: 0 },
            choices: [
              {
                id: 'choice1',
                text: 'Go forward',
                target: 'next',
              },
            ],
          },
        },
      });
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            choices: [
              {
                id: 'choice1',
                text: 'Go forward!',
                target: 'different',
              },
            ],
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.choicesModified).toBe(1);
    });

    it('should detect added variables', () => {
      const base = createTestStory();
      const modified = createTestStory({
        variables: {
          health: {
            name: 'health',
            type: 'number',
            initial: 100,
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.variablesAdded).toBe(1);
    });

    it('should detect removed variables', () => {
      const base = createTestStory({
        variables: {
          health: {
            name: 'health',
            type: 'number',
            initial: 100,
          },
        },
      });
      const modified = createTestStory();

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.variablesRemoved).toBe(1);
    });

    it('should detect modified variables', () => {
      const base = createTestStory({
        variables: {
          health: {
            name: 'health',
            type: 'number',
            initial: 100,
          },
        },
      });
      const modified = createTestStory({
        variables: {
          health: {
            name: 'health',
            type: 'number',
            initial: 50,
          },
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.summary.variablesModified).toBe(1);
    });

    it('should detect metadata changes', () => {
      const base = createTestStory();
      const modified = createTestStory({
        metadata: {
          ...base.metadata,
          title: 'New Title',
        },
      });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.metadataChanges.find(m => m.field === 'title')).toBeDefined();
    });

    it('should detect settings changes', () => {
      const base = createTestStory({ settings: { theme: 'light' } });
      const modified = createTestStory({ settings: { theme: 'dark' } });

      const result = diffStories(base, modified);

      expect(result.hasChanges).toBe(true);
      expect(result.settingsChanges.find(s => s.field === 'theme')).toBeDefined();
    });
  });

  describe('formatDiff', () => {
    it('should format empty diff', () => {
      const base = createTestStory();
      const diff = diffStories(base, base);
      const output = formatDiff(diff);

      expect(output).toContain('No changes detected');
    });

    it('should format diff with changes', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Modified content',
          },
          newPassage: {
            id: 'newPassage',
            title: 'New Passage',
            content: 'New content',
            position: { x: 100, y: 100 },
            choices: [],
          },
        },
      });

      const diff = diffStories(base, modified);
      const output = formatDiff(diff);

      expect(output).toContain('Story Diff Summary');
      expect(output).toContain('Passages:');
      expect(output).toContain('New Passage');
    });

    it('should support colored output', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Modified',
          },
        },
      });

      const diff = diffStories(base, modified);
      const output = formatDiff(diff, { color: true });

      // Should contain ANSI escape codes
      expect(output).toMatch(/\x1b\[\d+m/);
    });
  });

  describe('getSummary', () => {
    it('should return "No changes" for identical stories', () => {
      const story = createTestStory();
      const diff = diffStories(story, story);
      const summary = getSummary(diff);

      expect(summary).toBe('No changes');
    });

    it('should summarize passage additions', () => {
      const base = createTestStory();
      const modified = createTestStory({
        passages: {
          ...base.passages,
          new1: { id: 'new1', title: 'New 1', content: '', position: { x: 0, y: 0 }, choices: [] },
          new2: { id: 'new2', title: 'New 2', content: '', position: { x: 0, y: 0 }, choices: [] },
        },
      });

      const diff = diffStories(base, modified);
      const summary = getSummary(diff);

      expect(summary).toContain('added 2 passages');
    });

    it('should summarize multiple types of changes', () => {
      const base = createTestStory({
        variables: {
          oldVar: { name: 'oldVar', type: 'number', initial: 0 },
        },
      });
      const modified = createTestStory({
        passages: {
          start: {
            ...base.passages.start,
            content: 'Changed',
          },
        },
        variables: {
          newVar: { name: 'newVar', type: 'string', initial: '' },
        },
      });

      const diff = diffStories(base, modified);
      const summary = getSummary(diff);

      expect(summary).toContain('modified 1 passage');
      expect(summary).toContain('variable change');
    });
  });
});
