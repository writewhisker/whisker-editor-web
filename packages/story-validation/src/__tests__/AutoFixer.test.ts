/**
 * AutoFixer Tests
 */

import { describe, it, expect } from 'vitest';
import { AutoFixer } from '../AutoFixer';
import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';
import type { ValidationIssue } from '../types';

describe('AutoFixer', () => {
  const autoFixer = new AutoFixer();

  function createTestStory(): Story {
    const story = new Story();
    const startPassage = new Passage('start', 'Start');
    startPassage.choices = [
      (() => { const c = new Choice('c1', 'Go'); c.target = 'end'; return c; })()
    ];
    const endPassage = new Passage('end', 'End');
    const unreachable = new Passage('unreachable', 'Unreachable');

    story.passages.set('start', startPassage);
    story.passages.set('end', endPassage);
    story.passages.set('unreachable', unreachable);
    story.startPassage = 'start';

    return story;
  }

  describe('fix', () => {
    it('should return success for empty issues', () => {
      const story = createTestStory();
      const result = autoFixer.fix(story, []);
      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(0);
      expect(result.issuesFailed).toBe(0);
    });

    it('should skip non-fixable issues', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'some_issue',
          code: 'WLS-STR-001',
          severity: 'error',
          category: 'structure',
          message: 'Some error',
          fixable: false,
        }
      ];
      const result = autoFixer.fix(story, issues);
      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(0);
    });

    it('should fix unreachable passage', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'unreachable_unreachable',
          code: 'WLS-STR-005',
          severity: 'warning',
          category: 'structure',
          message: 'Passage "Unreachable" is unreachable',
          passageId: 'unreachable',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFixed).toBe(1);
      expect(result.passagesDeleted).toContain('unreachable');
      expect(story.passages.has('unreachable')).toBe(false);
    });

    it('should not delete start passage', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'unreachable_start',
          code: 'WLS-STR-005',
          severity: 'warning',
          category: 'structure',
          message: 'Passage "Start" is unreachable',
          passageId: 'start',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFailed).toBe(1);
      expect(story.passages.has('start')).toBe(true);
    });

    it('should fix dead link by removing choice', () => {
      const story = createTestStory();
      // Get the first choice from start passage
      const startPassage = story.getPassage('start')!;
      const existingChoiceId = startPassage.choices[0].id;

      const issues: ValidationIssue[] = [
        {
          id: 'dead_link_start_' + existingChoiceId,
          code: 'WLS-LNK-001',
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: 'start',
          choiceId: existingChoiceId,
          fixable: true,
        }
      ];

      const choiceCountBefore = startPassage.choices.length;
      const result = autoFixer.fix(story, issues);

      expect(result.issuesFixed).toBe(1);
      expect(result.choicesDeleted).toContain(existingChoiceId);
      expect(startPassage.choices.length).toBe(choiceCountBefore - 1);
    });

    it('should fix undefined variable by adding it', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'undefined_var_score',
          code: 'WLS-VAR-001',
          severity: 'error',
          category: 'variables',
          message: 'Undefined variable "$score"',
          variableName: 'score',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFixed).toBe(1);
      expect(result.variablesAdded).toContain('score');
    });

    it('should fix unused variable by deleting it', () => {
      const story = createTestStory();
      // Add a variable
      story.variables.set('unused', new Variable('unused', 0, 'story'));

      const issues: ValidationIssue[] = [
        {
          id: 'unused_var_unused',
          code: 'WLS-VAR-003',
          severity: 'warning',
          category: 'variables',
          message: 'Unused variable "$unused"',
          variableName: 'unused',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFixed).toBe(1);
      expect(result.variablesDeleted).toContain('unused');
    });

    it('should handle errors during fix', () => {
      const story = createTestStory();
      // Create an issue that references non-existent passage
      const issues: ValidationIssue[] = [
        {
          id: 'unreachable_nonexistent',
          code: 'WLS-STR-005',
          severity: 'warning',
          category: 'structure',
          message: 'Passage not found',
          passageId: 'nonexistent',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFailed).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should handle unknown fixable issues', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'unknown_issue_type',
          code: 'WLS-XXX-001',
          severity: 'error',
          category: 'unknown',
          message: 'Unknown issue',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      // Should fail because it doesn't know how to fix this issue type
      expect(result.issuesFailed).toBe(1);
    });

    it('should fix multiple issues', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'unreachable_unreachable',
          code: 'WLS-STR-005',
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable passage',
          passageId: 'unreachable',
          fixable: true,
        },
        {
          id: 'undefined_var_score',
          code: 'WLS-VAR-001',
          severity: 'error',
          category: 'variables',
          message: 'Undefined variable',
          variableName: 'score',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFixed).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle choice removal for non-existent passage', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'dead_link_nonexistent_c1',
          code: 'WLS-LNK-001',
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: 'nonexistent',
          choiceId: 'c1',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFailed).toBe(1);
    });

    it('should handle choice removal for non-existent choice', () => {
      const story = createTestStory();
      const issues: ValidationIssue[] = [
        {
          id: 'dead_link_start_nonexistent',
          code: 'WLS-LNK-001',
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: 'start',
          choiceId: 'nonexistent',
          fixable: true,
        }
      ];

      const result = autoFixer.fix(story, issues);
      expect(result.issuesFailed).toBe(1);
    });
  });
});
