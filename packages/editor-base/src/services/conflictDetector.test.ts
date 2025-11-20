/**
 * Tests for ConflictDetector
 */

import { describe, it, expect } from 'vitest';
import { ConflictDetector } from './conflictDetector';
import { Story, Passage } from '@writewhisker/core-ts';
import type { MergeContext } from '../types/conflict';

describe('ConflictDetector', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts for identical stories', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Author',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const context: MergeContext = {
        local: story,
        remote: story,
      };

      const conflicts = ConflictDetector.detectConflicts(context);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect metadata title conflict', () => {
      const now = new Date().toISOString();
      const localStory = new Story({
        metadata: {
          title: 'Local Title',
          author: 'Author',
          version: '1.0.0',
          created: now,
          modified: now,
        },
      });

      const remoteStory = new Story({
        metadata: {
          title: 'Remote Title',
          author: 'Author',
          version: '1.0.0',
          created: now,
          modified: now,
        },
      });

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const conflicts = ConflictDetector.detectConflicts(context);
      expect(conflicts.length).toBeGreaterThan(0);

      const titleConflict = conflicts.find((c) => c.path === 'metadata.title');
      expect(titleConflict).toBeDefined();
      expect(titleConflict?.localValue).toBe('Local Title');
      expect(titleConflict?.remoteValue).toBe('Remote Title');
      expect(titleConflict?.type).toBe('metadata');
    });

    it('should detect passage content conflict', () => {
      const passage1 = new Passage({
        name: 'Opening',
        content: 'Local content',
      });

      const passage2 = new Passage({
        id: passage1.id, // Same passage
        name: 'Opening',
        content: 'Remote content',
      });

      const now = new Date().toISOString();
      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      localStory.passages.clear();
      localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      remoteStory.passages.clear();
      remoteStory.passages.set(passage2.id, passage2);

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const conflicts = ConflictDetector.detectConflicts(context);

      const contentConflict = conflicts.find(
        (c) => c.path === `passages.${passage1.id}.content`
      );
      expect(contentConflict).toBeDefined();
      expect(contentConflict?.type).toBe('content');
      expect(contentConflict?.localValue).toBe('Local content');
      expect(contentConflict?.remoteValue).toBe('Remote content');
    });

    it('should detect passage deletion conflict', () => {
      const passage = new Passage({
        name: 'Scene 1',
        content: 'Content',
      });

      const now = new Date().toISOString();
      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      localStory.passages.clear();
      localStory.passages.set(passage.id, passage);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      remoteStory.passages.clear(); // Passage deleted remotely

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const conflicts = ConflictDetector.detectConflicts(context);

      const deletionConflict = conflicts.find(
        (c) => c.type === 'deletion' && c.path === `passages.${passage.id}`
      );
      expect(deletionConflict).toBeDefined();
      expect(deletionConflict?.localValue).toBeDefined();
      expect(deletionConflict?.remoteValue).toBeNull();
    });

    it('should detect passage position conflict', () => {
      const passage1 = new Passage({
        name: 'Opening',
        content: 'Content',
        position: { x: 100, y: 100 },
      });

      const passage2 = new Passage({
        id: passage1.id,
        name: 'Opening',
        content: 'Content',
        position: { x: 200, y: 200 },
      });

      const now = new Date().toISOString();
      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      localStory.passages.clear();
      localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: now, modified: now },
      });
      remoteStory.passages.clear();
      remoteStory.passages.set(passage2.id, passage2);

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const conflicts = ConflictDetector.detectConflicts(context);

      const positionConflict = conflicts.find(
        (c) => c.path === `passages.${passage1.id}.position`
      );
      expect(positionConflict).toBeDefined();
      expect(positionConflict?.type).toBe('structure');
      expect(positionConflict?.autoMergeable).toBe(true);
    });

    it('should respect detection options', () => {
      const passage1 = new Passage({
        name: 'Opening',
        content: 'Local content',
      });

      const passage2 = new Passage({
        id: passage1.id,
        name: 'Opening',
        content: 'Remote content',
      });

      const now = new Date().toISOString();
      const localStory = new Story({
        metadata: { title: 'Local Title', author: '', version: '1.0.0', created: now, modified: now },
      });
      localStory.passages.clear();
      localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Remote Title', author: '', version: '1.0.0', created: now, modified: now },
      });
      remoteStory.passages.clear();
      remoteStory.passages.set(passage2.id, passage2);

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      // Only compare metadata
      const metadataOnly = ConflictDetector.detectConflicts(context, {
        compareContent: false,
        compareMetadata: true,
        compareStructure: false,
      });

      expect(metadataOnly.some((c) => c.type === 'metadata')).toBe(true);
      expect(metadataOnly.some((c) => c.type === 'content')).toBe(false);
    });
  });

  describe('generateDiff', () => {
    it('should generate diff for identical content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const diff = ConflictDetector.generateDiff(content, content);

      expect(diff.length).toBeGreaterThan(0);
      expect(diff.every((chunk) => chunk.type === 'equal')).toBe(true);
    });

    it('should detect insertions', () => {
      const local = 'Line 1\nLine 2';
      const remote = 'Line 1\nLine 2\nLine 3';

      const diff = ConflictDetector.generateDiff(local, remote);

      const insertChunk = diff.find((chunk) => chunk.type === 'insert');
      expect(insertChunk).toBeDefined();
      expect(insertChunk?.remoteLines).toContain('Line 3');
    });

    it('should detect deletions', () => {
      const local = 'Line 1\nLine 2\nLine 3';
      const remote = 'Line 1\nLine 2';

      const diff = ConflictDetector.generateDiff(local, remote);

      const deleteChunk = diff.find((chunk) => chunk.type === 'delete');
      expect(deleteChunk).toBeDefined();
      expect(deleteChunk?.localLines).toContain('Line 3');
    });

    it('should detect replacements', () => {
      const local = 'Line 1\nOld Line\nLine 3';
      const remote = 'Line 1\nNew Line\nLine 3';

      const diff = ConflictDetector.generateDiff(local, remote);

      const replaceChunk = diff.find((chunk) => chunk.type === 'replace');
      expect(replaceChunk).toBeDefined();
      expect(replaceChunk?.localLines).toContain('Old Line');
      expect(replaceChunk?.remoteLines).toContain('New Line');
    });
  });

  describe('autoMerge', () => {
    it('should successfully auto-merge non-conflicting stories', () => {
      const passage1 = new Passage({
        name: 'Scene 1',
        content: 'Content 1',
      });

      const passage2 = new Passage({
        name: 'Scene 2',
        content: 'Content 2',
      });

      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      localStory.passages.clear(); localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      remoteStory.passages.clear(); remoteStory.passages.set(passage1.id, passage1); remoteStory.passages.set(passage2.id, passage2); // Added new passage

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const result = ConflictDetector.autoMerge(context);

      expect(result.success).toBe(true);
      expect(result.mergedStory).toBeDefined();
      expect(result.mergedStory?.passages.size).toBe(2);
    });

    it('should fail auto-merge when conflicts exist', () => {
      const passage1 = new Passage({
        name: 'Opening',
        content: 'Local content',
      });

      const passage2 = new Passage({
        id: passage1.id,
        name: 'Opening',
        content: 'Remote content',
      });

      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      localStory.passages.clear(); localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      remoteStory.passages.clear(); remoteStory.passages.set(passage2.id, passage2);

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const result = ConflictDetector.autoMerge(context);

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.mergedStory).toBeUndefined();
    });

    it('should auto-resolve position conflicts', () => {
      const passage1 = new Passage({
        name: 'Opening',
        content: 'Content',
        position: { x: 100, y: 100 },
      });

      const passage2 = new Passage({
        id: passage1.id,
        name: 'Opening',
        content: 'Content',
        position: { x: 200, y: 200 },
      });

      const localStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      localStory.passages.clear(); localStory.passages.set(passage1.id, passage1);

      const remoteStory = new Story({
        metadata: { title: 'Story', author: '', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() },
      });
      remoteStory.passages.clear(); remoteStory.passages.set(passage2.id, passage2);

      const context: MergeContext = {
        local: localStory,
        remote: remoteStory,
      };

      const result = ConflictDetector.autoMerge(context);

      expect(result.success).toBe(true);
      expect(result.mergedStory).toBeDefined();
      // Position should be resolved to remote value
      const mergedPassage = Array.from(result.mergedStory!.passages.values())[0] as Passage;
      expect(mergedPassage.position).toEqual({ x: 200, y: 200 });
    });
  });
});
