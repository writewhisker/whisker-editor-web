import { describe, it, expect, beforeEach } from 'vitest';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import {
  validateConnections,
  getBrokenConnections,
  getOrphanedPassages,
  getDeadEndPassages,
  cleanupBrokenConnections,
  removeConnectionsToPassage,
} from './connectionValidator';

describe('connectionValidator', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  describe('validateConnections', () => {
    it('should return valid result for story with no issues', () => {
      // Start passage exists by default, but has no choices
      // Start passage is exempt from dead-end warnings
      const result = validateConnections(story);

      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0); // Start is exempt from dead-end warning
      expect(result.issues).toHaveLength(0);
    });

    it('should detect broken connections', () => {
      const passage = new Passage({ title: 'Test' });
      const brokenChoice = new Choice({
        text: 'Go nowhere',
        target: 'non-existent-id',
      });
      passage.addChoice(brokenChoice);
      story.addPassage(passage);

      const result = validateConnections(story);

      expect(result.isValid).toBe(false);
      expect(result.errorCount).toBe(1);
      const brokenIssue = result.issues.find(i => i.type === 'broken');
      expect(brokenIssue).toBeDefined();
      expect(brokenIssue?.severity).toBe('error');
      expect(brokenIssue?.choiceId).toBe(brokenChoice.id);
    });

    it('should detect unreachable passages', () => {
      const orphan = new Passage({ title: 'Orphan' });
      story.addPassage(orphan);

      const result = validateConnections(story);

      expect(result.warningCount).toBeGreaterThan(0);
      const unreachableIssue = result.issues.find(
        i => i.type === 'unreachable' && i.passageId === orphan.id
      );
      expect(unreachableIssue).toBeDefined();
      expect(unreachableIssue?.severity).toBe('warning');
    });

    it('should detect dead-end passages', () => {
      const start = story.getPassage(story.startPassage!);
      const deadEnd = new Passage({ title: 'Dead End' });
      story.addPassage(deadEnd);

      // Connect start to dead end
      start?.addChoice(new Choice({ text: 'To dead end', target: deadEnd.id }));

      const result = validateConnections(story);

      const deadEndIssue = result.issues.find(
        i => i.type === 'dead-end' && i.passageId === deadEnd.id
      );
      expect(deadEndIssue).toBeDefined();
      expect(deadEndIssue?.severity).toBe('warning');
    });

    it('should detect circular references', () => {
      const start = story.getPassage(story.startPassage!);
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      story.addPassage(p1);
      story.addPassage(p2);

      // Create circular path: start -> p1 -> p2 -> start
      start?.addChoice(new Choice({ text: 'To P1', target: p1.id }));
      p1.addChoice(new Choice({ text: 'To P2', target: p2.id }));
      p2.addChoice(new Choice({ text: 'Back to start', target: story.startPassage! }));

      const result = validateConnections(story);

      const circularIssue = result.issues.find(i => i.type === 'circular');
      expect(circularIssue).toBeDefined();
      expect(circularIssue?.severity).toBe('info');
      expect(result.infoCount).toBeGreaterThan(0);
    });

    it('should count issues by severity correctly', () => {
      const start = story.getPassage(story.startPassage!);
      const orphan = new Passage({ title: 'Orphan' });
      const broken = new Passage({ title: 'Broken' });

      story.addPassage(orphan);
      story.addPassage(broken);

      // Add broken connection
      broken.addChoice(new Choice({ text: 'Nowhere', target: 'invalid-id' }));

      const result = validateConnections(story);

      expect(result.errorCount).toBe(1); // Broken connection
      expect(result.warningCount).toBeGreaterThan(0); // Orphan, dead-ends
      expect(result.issues.length).toBe(result.errorCount + result.warningCount + result.infoCount);
    });
  });

  describe('getBrokenConnections', () => {
    it('should return empty array for valid connections', () => {
      const start = story.getPassage(story.startPassage!);
      const target = new Passage({ title: 'Target' });
      story.addPassage(target);

      start?.addChoice(new Choice({ text: 'Valid', target: target.id }));

      const broken = getBrokenConnections(story);
      expect(broken).toHaveLength(0);
    });

    it('should find broken connections', () => {
      const passage = new Passage({ title: 'Source' });
      const brokenChoice = new Choice({
        text: 'Broken link',
        target: 'non-existent',
      });
      passage.addChoice(brokenChoice);
      story.addPassage(passage);

      const broken = getBrokenConnections(story);

      expect(broken).toHaveLength(1);
      expect(broken[0].passage).toBe(passage);
      expect(broken[0].choiceId).toBe(brokenChoice.id);
      expect(broken[0].targetId).toBe('non-existent');
    });

    it('should find multiple broken connections', () => {
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });

      p1.addChoice(new Choice({ text: 'Broken 1', target: 'bad-1' }));
      p1.addChoice(new Choice({ text: 'Broken 2', target: 'bad-2' }));
      p2.addChoice(new Choice({ text: 'Broken 3', target: 'bad-3' }));

      story.addPassage(p1);
      story.addPassage(p2);

      const broken = getBrokenConnections(story);
      expect(broken).toHaveLength(3);
    });
  });

  describe('getOrphanedPassages', () => {
    it('should return empty array when all passages are reachable', () => {
      const start = story.getPassage(story.startPassage!);
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      story.addPassage(p1);
      story.addPassage(p2);

      start?.addChoice(new Choice({ text: 'To P1', target: p1.id }));
      p1.addChoice(new Choice({ text: 'To P2', target: p2.id }));

      const orphans = getOrphanedPassages(story);
      expect(orphans).toHaveLength(0);
    });

    it('should find orphaned passages', () => {
      const orphan = new Passage({ title: 'Orphan' });
      story.addPassage(orphan);

      const orphans = getOrphanedPassages(story);

      expect(orphans).toHaveLength(1);
      expect(orphans[0]).toBe(orphan);
    });

    it('should not include start passage as orphaned', () => {
      const orphans = getOrphanedPassages(story);
      const startPassage = story.getPassage(story.startPassage!);

      expect(orphans).not.toContain(startPassage);
    });

    it('should find multiple orphaned passages', () => {
      const o1 = new Passage({ title: 'Orphan 1' });
      const o2 = new Passage({ title: 'Orphan 2' });
      const o3 = new Passage({ title: 'Orphan 3' });

      story.addPassage(o1);
      story.addPassage(o2);
      story.addPassage(o3);

      const orphans = getOrphanedPassages(story);
      expect(orphans).toHaveLength(3);
    });
  });

  describe('getDeadEndPassages', () => {
    it('should find passages with no choices', () => {
      const deadEnd = new Passage({ title: 'The End' });
      story.addPassage(deadEnd);

      const deadEnds = getDeadEndPassages(story);

      // Start passage also has no choices by default
      expect(deadEnds.length).toBeGreaterThan(0);
      expect(deadEnds).toContainEqual(deadEnd);
    });

    it('should not include passages with choices', () => {
      const start = story.getPassage(story.startPassage!);
      const target = new Passage({ title: 'Target' });
      story.addPassage(target);

      start?.addChoice(new Choice({ text: 'Continue', target: target.id }));

      const deadEnds = getDeadEndPassages(story);

      expect(deadEnds).not.toContain(start);
      expect(deadEnds).toContain(target); // Target has no choices
    });

    it('should return empty array when all passages have choices', () => {
      const start = story.getPassage(story.startPassage!);
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });

      story.addPassage(p1);
      story.addPassage(p2);

      start?.addChoice(new Choice({ text: 'To P1', target: p1.id }));
      p1.addChoice(new Choice({ text: 'To P2', target: p2.id }));
      p2.addChoice(new Choice({ text: 'Back', target: start!.id }));

      const deadEnds = getDeadEndPassages(story);
      expect(deadEnds).toHaveLength(0);
    });
  });

  describe('cleanupBrokenConnections', () => {
    it('should remove broken connections from a passage', () => {
      const passage = new Passage({ title: 'Source' });
      const validTarget = new Passage({ title: 'Valid' });

      story.addPassage(passage);
      story.addPassage(validTarget);

      passage.addChoice(new Choice({ text: 'Valid', target: validTarget.id }));
      passage.addChoice(new Choice({ text: 'Broken', target: 'invalid-id' }));

      expect(passage.choices).toHaveLength(2);

      const removed = cleanupBrokenConnections(story, passage.id);

      expect(removed).toBe(1);
      expect(passage.choices).toHaveLength(1);
      expect(passage.choices[0].target).toBe(validTarget.id);
    });

    it('should return 0 when no broken connections exist', () => {
      const passage = new Passage({ title: 'Source' });
      const target = new Passage({ title: 'Target' });

      story.addPassage(passage);
      story.addPassage(target);

      passage.addChoice(new Choice({ text: 'Valid', target: target.id }));

      const removed = cleanupBrokenConnections(story, passage.id);
      expect(removed).toBe(0);
      expect(passage.choices).toHaveLength(1);
    });

    it('should handle passage with no choices', () => {
      const passage = new Passage({ title: 'Empty' });
      story.addPassage(passage);

      const removed = cleanupBrokenConnections(story, passage.id);
      expect(removed).toBe(0);
    });

    it('should return 0 for non-existent passage', () => {
      const removed = cleanupBrokenConnections(story, 'non-existent-id');
      expect(removed).toBe(0);
    });
  });

  describe('removeConnectionsToPassage', () => {
    it('should remove all connections to a target passage', () => {
      const start = story.getPassage(story.startPassage!);
      const p1 = new Passage({ title: 'P1' });
      const target = new Passage({ title: 'Target' });

      story.addPassage(p1);
      story.addPassage(target);

      // Multiple connections to target
      start?.addChoice(new Choice({ text: 'From start', target: target.id }));
      p1.addChoice(new Choice({ text: 'From P1', target: target.id }));

      expect(start?.choices).toHaveLength(1);
      expect(p1.choices).toHaveLength(1);

      const removed = removeConnectionsToPassage(story, target.id);

      expect(removed).toBe(2);
      expect(start?.choices).toHaveLength(0);
      expect(p1.choices).toHaveLength(0);
    });

    it('should preserve other connections', () => {
      const start = story.getPassage(story.startPassage!);
      const keep = new Passage({ title: 'Keep' });
      const remove = new Passage({ title: 'Remove' });

      story.addPassage(keep);
      story.addPassage(remove);

      start?.addChoice(new Choice({ text: 'Keep this', target: keep.id }));
      start?.addChoice(new Choice({ text: 'Remove this', target: remove.id }));

      expect(start?.choices).toHaveLength(2);

      const removed = removeConnectionsToPassage(story, remove.id);

      expect(removed).toBe(1);
      expect(start?.choices).toHaveLength(1);
      expect(start?.choices[0].target).toBe(keep.id);
    });

    it('should return 0 when no connections exist to target', () => {
      const orphan = new Passage({ title: 'Orphan' });
      story.addPassage(orphan);

      const removed = removeConnectionsToPassage(story, orphan.id);
      expect(removed).toBe(0);
    });

    it('should handle removing connections to non-existent passage', () => {
      const removed = removeConnectionsToPassage(story, 'non-existent-id');
      expect(removed).toBe(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle complex graph with multiple issue types', () => {
      const start = story.getPassage(story.startPassage!);
      const p1 = new Passage({ title: 'P1' });
      const p2 = new Passage({ title: 'P2' });
      const orphan = new Passage({ title: 'Orphan' });
      const deadEnd = new Passage({ title: 'Dead End' });

      story.addPassage(p1);
      story.addPassage(p2);
      story.addPassage(orphan);
      story.addPassage(deadEnd);

      // Valid connections
      start?.addChoice(new Choice({ text: 'To P1', target: p1.id }));
      p1.addChoice(new Choice({ text: 'To P2', target: p2.id }));
      p2.addChoice(new Choice({ text: 'To dead end', target: deadEnd.id }));

      // Broken connection
      p1.addChoice(new Choice({ text: 'Broken', target: 'invalid' }));

      // Circular reference
      p2.addChoice(new Choice({ text: 'Back to start', target: start!.id }));

      const result = validateConnections(story);

      expect(result.errorCount).toBe(1); // Broken connection
      expect(result.warningCount).toBeGreaterThan(0); // Orphan, dead-end
      expect(result.infoCount).toBeGreaterThan(0); // Circular reference
    });

    it('should handle self-referencing passage', () => {
      const start = story.getPassage(story.startPassage!);
      const passage = new Passage({ title: 'Loop' });
      story.addPassage(passage);

      // Connect from start to make it reachable
      start?.addChoice(new Choice({ text: 'To loop', target: passage.id }));

      // Self-reference (loop to itself)
      passage.addChoice(new Choice({ text: 'Loop', target: passage.id }));

      const result = validateConnections(story);

      // Self-referencing passage has incoming connection (from itself and start)
      // so it's not orphaned
      const orphans = getOrphanedPassages(story);
      expect(orphans).not.toContain(passage);

      // Should detect circular reference (passage -> passage)
      expect(result.infoCount).toBeGreaterThan(0);
      const circular = result.issues.filter(i => i.type === 'circular');
      expect(circular.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested circular paths', () => {
      const start = story.getPassage(story.startPassage!);
      const passages = [];

      // Create a chain of 10 passages
      for (let i = 0; i < 10; i++) {
        const p = new Passage({ title: `P${i}` });
        story.addPassage(p);
        passages.push(p);
      }

      // Connect them in a chain
      start?.addChoice(new Choice({ text: 'Start chain', target: passages[0].id }));
      for (let i = 0; i < passages.length - 1; i++) {
        passages[i].addChoice(new Choice({ text: 'Next', target: passages[i + 1].id }));
      }

      // Close the loop back to start
      passages[passages.length - 1].addChoice(
        new Choice({ text: 'Back to start', target: start!.id })
      );

      const result = validateConnections(story);

      expect(result.infoCount).toBeGreaterThan(0);
      const circular = result.issues.filter(i => i.type === 'circular');
      expect(circular.length).toBeGreaterThan(0);
    });
  });
});
