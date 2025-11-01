import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  versionDiffStore,
  snapshots,
  currentDiff,
  hasSnapshots,
  type VersionSnapshot,
  type StoryDiff,
  type PassageDiff,
} from './versionDiffStore';
import type { Story, Passage } from './projectStore';

describe('versionDiffStore', () => {
  let story1: Story;
  let story2: Story;

  beforeEach(() => {
    story1 = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
      },
      passages: [
        {
          id: 'p1',
          title: 'Start',
          content: 'This is the beginning.',
          tags: [],
          x: 0,
          y: 0,
        } as Passage,
        {
          id: 'p2',
          title: 'Middle',
          content: 'This is the middle.',
          tags: ['important'],
          x: 100,
          y: 0,
        } as Passage,
      ],
      startPassage: 'p1',
      variables: [],
    } as Story;

    story2 = {
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.1.0',
      },
      passages: [
        {
          id: 'p1',
          title: 'Start',
          content: 'This is the beginning with changes.',
          tags: [],
          x: 0,
          y: 0,
        } as Passage,
        {
          id: 'p2',
          title: 'Middle',
          content: 'This is the middle.',
          tags: ['important', 'new'],
          x: 100,
          y: 100,
        } as Passage,
        {
          id: 'p3',
          title: 'End',
          content: 'This is the end.',
          tags: [],
          x: 200,
          y: 0,
        } as Passage,
      ],
      startPassage: 'p1',
      variables: [],
    } as Story;

    versionDiffStore.clearAllSnapshots();
  });

  afterEach(() => {
    versionDiffStore.clearAllSnapshots();
  });

  describe('initial state', () => {
    it('should initialize with empty snapshots', () => {
      expect(get(snapshots)).toEqual([]);
    });

    it('should initialize with null current diff', () => {
      expect(get(currentDiff)).toBeNull();
    });

    it('should initialize with hasSnapshots false', () => {
      expect(get(hasSnapshots)).toBe(false);
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot of the story', () => {
      versionDiffStore.createSnapshot(story1, 'Version 1.0');

      const allSnapshots = get(snapshots);
      expect(allSnapshots).toHaveLength(1);
    });

    it('should return snapshot ID', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Test');

      expect(snapshotId).toBeDefined();
      expect(typeof snapshotId).toBe('string');
    });

    it('should store snapshot with label', () => {
      versionDiffStore.createSnapshot(story1, 'Initial Version');

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].label).toBe('Initial Version');
    });

    it('should store snapshot with description', () => {
      versionDiffStore.createSnapshot(story1, 'V1', 'First version of the story');

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].description).toBe('First version of the story');
    });

    it('should store snapshot with author', () => {
      versionDiffStore.createSnapshot(story1, 'V1', '', 'John Doe');

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].author).toBe('John Doe');
    });

    it('should store snapshot with timestamp', () => {
      const before = Date.now();
      versionDiffStore.createSnapshot(story1, 'Test');
      const after = Date.now();

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(allSnapshots[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should deep clone the story', () => {
      versionDiffStore.createSnapshot(story1, 'V1');

      // Modify original story
      story1.passages[0].content = 'Modified content';

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].story.passages[0].content).toBe('This is the beginning.');
    });

    it('should generate unique IDs for each snapshot', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      expect(id1).not.toBe(id2);
    });

    it('should update hasSnapshots derived store', () => {
      versionDiffStore.createSnapshot(story1, 'Test');

      expect(get(hasSnapshots)).toBe(true);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot by ID', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Test');

      versionDiffStore.deleteSnapshot(snapshotId);

      expect(get(snapshots)).toEqual([]);
    });

    it('should not affect other snapshots', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.deleteSnapshot(id1);

      const allSnapshots = get(snapshots);
      expect(allSnapshots).toHaveLength(1);
      expect(allSnapshots[0].id).toBe(id2);
    });

    it('should clear current diff if it used deleted snapshot', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      expect(get(currentDiff)).not.toBeNull();

      versionDiffStore.deleteSnapshot(id1);

      expect(get(currentDiff)).toBeNull();
    });

    it('should handle deleting non-existent snapshot', () => {
      versionDiffStore.createSnapshot(story1, 'V1');

      versionDiffStore.deleteSnapshot('non-existent-id');

      expect(get(snapshots)).toHaveLength(1);
    });
  });

  describe('updateSnapshot', () => {
    it('should update snapshot label', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Original Label');

      versionDiffStore.updateSnapshot(snapshotId, { label: 'New Label' });

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].label).toBe('New Label');
    });

    it('should update snapshot description', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Test', 'Original description');

      versionDiffStore.updateSnapshot(snapshotId, { description: 'New description' });

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].description).toBe('New description');
    });

    it('should update both label and description', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Old', 'Old desc');

      versionDiffStore.updateSnapshot(snapshotId, {
        label: 'New Label',
        description: 'New Description',
      });

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].label).toBe('New Label');
      expect(allSnapshots[0].description).toBe('New Description');
    });

    it('should not affect other snapshot properties', () => {
      const snapshotId = versionDiffStore.createSnapshot(story1, 'Test', '', 'John Doe');
      const originalTimestamp = get(snapshots)[0].timestamp;

      versionDiffStore.updateSnapshot(snapshotId, { label: 'Updated' });

      const allSnapshots = get(snapshots);
      expect(allSnapshots[0].timestamp).toBe(originalTimestamp);
      expect(allSnapshots[0].author).toBe('John Doe');
    });
  });

  describe('selectVersions - diff computation', () => {
    it('should compute diff between two versions', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff).not.toBeNull();
    });

    it('should include fromVersion and toVersion in diff', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.fromVersion.label).toBe('V1');
      expect(diff?.toVersion.label).toBe('V2');
    });

    it('should detect added passages', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const addedPassages = diff?.passageDiffs.filter(p => p.changeType === 'added') || [];
      expect(addedPassages.length).toBeGreaterThan(0);
    });

    it('should detect removed passages', () => {
      const id1 = versionDiffStore.createSnapshot(story2, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const removedPassages = diff?.passageDiffs.filter(p => p.changeType === 'removed') || [];
      expect(removedPassages.length).toBeGreaterThan(0);
    });

    it('should detect modified passages', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const modifiedPassages = diff?.passageDiffs.filter(p => p.changeType === 'modified') || [];
      expect(modifiedPassages.length).toBeGreaterThan(0);
    });

    it('should detect unchanged passages', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2'); // Same content

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const unchangedPassages = diff?.passageDiffs.filter(p => p.changeType === 'unchanged') || [];
      expect(unchangedPassages.length).toBe(2);
    });

    it('should handle selecting non-existent versions', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');

      versionDiffStore.selectVersions(id1, 'non-existent');

      const diff = get(currentDiff);
      expect(diff).toBeNull();
    });
  });

  describe('selectVersions - content changes', () => {
    it('should detect text changes in passages', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p1Diff = diff?.passageDiffs.find(p => p.passageId === 'p1');

      expect(p1Diff?.textChanges).toBeDefined();
      expect(p1Diff?.textChanges?.length).toBeGreaterThan(0);
    });

    it('should identify added text lines', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p1Diff = diff?.passageDiffs.find(p => p.passageId === 'p1');
      const addedLines = p1Diff?.textChanges?.filter(c => c.type === 'added') || [];

      expect(addedLines.length).toBeGreaterThan(0);
    });

    it('should identify removed text lines', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p1Diff = diff?.passageDiffs.find(p => p.passageId === 'p1');
      const removedLines = p1Diff?.textChanges?.filter(c => c.type === 'removed') || [];

      expect(removedLines.length).toBeGreaterThan(0);
    });
  });

  describe('selectVersions - metadata changes', () => {
    it('should detect tag changes', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p2Diff = diff?.passageDiffs.find(p => p.passageId === 'p2');

      const tagChanges = p2Diff?.metadataChanges?.filter(c => c.field === 'tags') || [];
      expect(tagChanges.length).toBeGreaterThan(0);
    });

    it('should detect position changes', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p2Diff = diff?.passageDiffs.find(p => p.passageId === 'p2');

      const posChanges = p2Diff?.metadataChanges?.filter(c => c.field === 'position') || [];
      expect(posChanges.length).toBeGreaterThan(0);
    });

    it('should include old and new values in metadata changes', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      const p2Diff = diff?.passageDiffs.find(p => p.passageId === 'p2');
      const posChange = p2Diff?.metadataChanges?.find(c => c.field === 'position');

      expect(posChange?.oldValue).toBeDefined();
      expect(posChange?.newValue).toBeDefined();
    });
  });

  describe('selectVersions - statistics', () => {
    it('should count passages added', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesAdded).toBe(1); // p3 was added
    });

    it('should count passages removed', () => {
      const id1 = versionDiffStore.createSnapshot(story2, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesRemoved).toBe(1); // p3 was removed
    });

    it('should count passages modified', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesModified).toBeGreaterThan(0);
    });

    it('should count passages unchanged', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesUnchanged).toBe(2);
    });

    it('should count lines added', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.linesAdded).toBeGreaterThan(0);
    });

    it('should count lines removed', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.linesRemoved).toBeGreaterThan(0);
    });
  });

  describe('clearComparison', () => {
    it('should clear current diff', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      expect(get(currentDiff)).not.toBeNull();

      versionDiffStore.clearComparison();

      expect(get(currentDiff)).toBeNull();
    });

    it('should not affect snapshots', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      versionDiffStore.clearComparison();

      expect(get(snapshots)).toHaveLength(2);
    });
  });

  describe('exportDiffReport', () => {
    it('should generate HTML report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Story Comparison Report');
    });

    it('should include version information in report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'Version 1.0');
      const id2 = versionDiffStore.createSnapshot(story2, 'Version 2.0');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('Version 1.0');
      expect(html).toContain('Version 2.0');
    });

    it('should include statistics in report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('Passages Added');
      expect(html).toContain('Passages Removed');
      expect(html).toContain('Passages Modified');
    });

    it('should include passage changes in report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('Changes by Passage');
    });

    it('should show line-level changes in report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('line-added');
      expect(html).toContain('line-removed');
    });

    it('should include metadata changes in report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      expect(html).toContain('Metadata Changes');
    });

    it('should filter out unchanged passages from report', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);
      const diff = get(currentDiff);

      const html = versionDiffStore.exportDiffReport(diff!);

      // Report should be minimal since nothing changed
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('clearAllSnapshots', () => {
    it('should clear all snapshots', () => {
      versionDiffStore.createSnapshot(story1, 'V1');
      versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.clearAllSnapshots();

      expect(get(snapshots)).toEqual([]);
    });

    it('should clear current diff', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      versionDiffStore.clearAllSnapshots();

      expect(get(currentDiff)).toBeNull();
    });

    it('should update hasSnapshots to false', () => {
      versionDiffStore.createSnapshot(story1, 'V1');

      versionDiffStore.clearAllSnapshots();

      expect(get(hasSnapshots)).toBe(false);
    });
  });

  describe('derived stores', () => {
    it('should derive hasSnapshots correctly', () => {
      expect(get(hasSnapshots)).toBe(false);

      versionDiffStore.createSnapshot(story1, 'V1');

      expect(get(hasSnapshots)).toBe(true);
    });

    it('should update snapshots array reactively', () => {
      const before = get(snapshots);
      expect(before).toEqual([]);

      versionDiffStore.createSnapshot(story1, 'V1');

      const after = get(snapshots);
      expect(after).toHaveLength(1);
    });

    it('should update currentDiff reactively', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story2, 'V2');

      expect(get(currentDiff)).toBeNull();

      versionDiffStore.selectVersions(id1, id2);

      expect(get(currentDiff)).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle comparing identical versions', () => {
      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesModified).toBe(0);
      expect(diff?.stats.passagesAdded).toBe(0);
      expect(diff?.stats.passagesRemoved).toBe(0);
    });

    it('should handle empty stories', () => {
      const emptyStory: Story = {
        metadata: { title: 'Empty', author: '', version: '1.0.0' },
        passages: [],
        startPassage: '',
        variables: [],
      } as Story;

      const id1 = versionDiffStore.createSnapshot(emptyStory, 'V1');
      const id2 = versionDiffStore.createSnapshot(story1, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff?.stats.passagesAdded).toBe(2);
    });

    it('should handle passages with multiline content', () => {
      const multilineStory: Story = {
        ...story1,
        passages: [
          {
            id: 'p1',
            title: 'Multiline',
            content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
            tags: [],
            x: 0,
            y: 0,
          } as Passage,
        ],
      };

      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(multilineStory, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff).not.toBeNull();
    });

    it('should handle passages with no content', () => {
      const emptyPassageStory: Story = {
        ...story1,
        passages: [
          {
            id: 'p1',
            title: 'Empty',
            content: '',
            tags: [],
            x: 0,
            y: 0,
          } as Passage,
        ],
      };

      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(emptyPassageStory, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff).not.toBeNull();
    });

    it('should handle special characters in passage content', () => {
      const specialStory: Story = {
        ...story1,
        passages: [
          {
            id: 'p1',
            title: 'Special',
            content: '<html>&amp; "quotes" \'apostrophes\'',
            tags: [],
            x: 0,
            y: 0,
          } as Passage,
        ],
      };

      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(specialStory, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff).not.toBeNull();
    });

    it('should handle very long passages', () => {
      const longContent = 'A'.repeat(10000);
      const longStory: Story = {
        ...story1,
        passages: [
          {
            id: 'p1',
            title: 'Long',
            content: longContent,
            tags: [],
            x: 0,
            y: 0,
          } as Passage,
        ],
      };

      const id1 = versionDiffStore.createSnapshot(story1, 'V1');
      const id2 = versionDiffStore.createSnapshot(longStory, 'V2');

      versionDiffStore.selectVersions(id1, id2);

      const diff = get(currentDiff);
      expect(diff).not.toBeNull();
    });

    it('should handle multiple snapshots efficiently', () => {
      for (let i = 0; i < 10; i++) {
        versionDiffStore.createSnapshot(story1, `Version ${i}`);
      }

      const allSnapshots = get(snapshots);
      expect(allSnapshots).toHaveLength(10);
    });
  });
});
