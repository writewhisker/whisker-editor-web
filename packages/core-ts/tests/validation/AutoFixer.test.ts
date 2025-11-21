import { describe, it, expect, beforeEach } from 'vitest';
import { AutoFixer } from '@writewhisker/core-ts';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import { Variable } from '@writewhisker/core-ts';
import type { ValidationIssue } from '@writewhisker/core-ts';

describe('AutoFixer', () => {
  let fixer: AutoFixer;
  let story: Story;

  beforeEach(() => {
    fixer = new AutoFixer();
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  describe('fix unreachable passages', () => {
    it('should delete unreachable passages', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      const issues: ValidationIssue[] = [
        {
          id: `unreachable_${unreachable.id}`,
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable passage',
          passageId: unreachable.id,
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
      expect(result.passagesDeleted).toContain(unreachable.id);
      expect(story.getPassage(unreachable.id)).toBeUndefined();
    });

    it('should not delete start passage even if marked unreachable', () => {
      const startPassageId = story.startPassage!;

      const issues: ValidationIssue[] = [
        {
          id: `unreachable_${startPassageId}`,
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable passage',
          passageId: startPassageId,
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.issuesFixed).toBe(0);
      expect(result.issuesFailed).toBe(1);
      expect(story.getPassage(startPassageId)).not.toBeNull();
    });
  });

  describe('fix dead links', () => {
    it('should remove choices with dead links', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const badChoice = new Choice({
        text: 'Bad link',
        target: 'nonexistent-id',
      });
      startPassage.addChoice(badChoice);

      const issues: ValidationIssue[] = [
        {
          id: `dead_link_${startPassage.id}_${badChoice.id}`,
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: startPassage.id,
          choiceId: badChoice.id,
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
      expect(result.choicesDeleted).toContain(badChoice.id);
      expect(startPassage.choices.find(c => c.id === badChoice.id)).toBeUndefined();
    });

    it('should handle multiple dead links', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const badChoice1 = new Choice({ text: 'Bad1', target: 'nonexistent1' });
      const badChoice2 = new Choice({ text: 'Bad2', target: 'nonexistent2' });
      startPassage.addChoice(badChoice1);
      startPassage.addChoice(badChoice2);

      const issues: ValidationIssue[] = [
        {
          id: `dead_link_${startPassage.id}_${badChoice1.id}`,
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: startPassage.id,
          choiceId: badChoice1.id,
          fixable: true,
        },
        {
          id: `dead_link_${startPassage.id}_${badChoice2.id}`,
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: startPassage.id,
          choiceId: badChoice2.id,
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(2);
      expect(startPassage.choices).toHaveLength(0);
    });
  });

  describe('fix undefined variables', () => {
    it('should add undefined variables to story', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'undefined_var_health_passage1',
          severity: 'error',
          category: 'variables',
          message: 'Undefined variable: health',
          variableName: 'health',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
      expect(result.variablesAdded).toContain('health');
      expect(story.variables.has('health')).toBe(true);
    });

    it('should not fail if variable already exists', () => {
      story.variables.set('health', { name: 'health', type: 'number', initial: 100 } as any);

      const issues: ValidationIssue[] = [
        {
          id: 'undefined_var_health_passage1',
          severity: 'error',
          category: 'variables',
          message: 'Undefined variable: health',
          variableName: 'health',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
    });
  });

  describe('fix unused variables', () => {
    it('should delete unused variables from story', () => {
      story.variables.set('unused', { name: 'unused', type: 'number', initial: 0 } as any);

      const issues: ValidationIssue[] = [
        {
          id: 'unused_var_unused',
          severity: 'info',
          category: 'variables',
          message: 'Unused variable: unused',
          variableName: 'unused',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
      expect(result.variablesDeleted).toContain('unused');
      expect(story.variables.has('unused')).toBe(false);
    });

    it('should not fail if variable already deleted', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'unused_var_nonexistent',
          severity: 'info',
          category: 'variables',
          message: 'Unused variable: nonexistent',
          variableName: 'nonexistent',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(1);
    });
  });

  describe('fix multiple issues', () => {
    it('should fix multiple different types of issues', () => {
      const startPassage = story.getPassage(story.startPassage!)!;

      // Add unreachable passage
      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      // Add dead link
      const badChoice = new Choice({ text: 'Bad', target: 'nonexistent' });
      startPassage.addChoice(badChoice);

      // Add unused variable
      story.variables.set('unused', { name: 'unused', type: 'number', initial: 0 } as any);

      const issues: ValidationIssue[] = [
        {
          id: `unreachable_${unreachable.id}`,
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable',
          passageId: unreachable.id,
          fixable: true,
        },
        {
          id: `dead_link_${startPassage.id}_${badChoice.id}`,
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          passageId: startPassage.id,
          choiceId: badChoice.id,
          fixable: true,
        },
        {
          id: 'unused_var_unused',
          severity: 'info',
          category: 'variables',
          message: 'Unused',
          variableName: 'unused',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(true);
      expect(result.issuesFixed).toBe(3);
      expect(result.issuesFailed).toBe(0);
    });

    it('should handle errors gracefully', () => {
      // Create an issue that can't be fixed (unknown type)
      const issues: ValidationIssue[] = [
        {
          id: 'unknown_issue_type',
          severity: 'error',
          category: 'content',
          message: 'Unknown issue',
          fixable: true,
        },
      ];

      const result = fixer.fix(story, issues);

      expect(result.success).toBe(false);
      expect(result.issuesFixed).toBe(0);
      expect(result.issuesFailed).toBe(1);
    });
  });

  describe('canFix', () => {
    it('should identify fixable issues', () => {
      const fixableIssues: ValidationIssue[] = [
        {
          id: 'unreachable_123',
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable',
          fixable: true,
        },
        {
          id: 'dead_link_123_456',
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          fixable: true,
        },
        {
          id: 'undefined_var_health_123',
          severity: 'error',
          category: 'variables',
          message: 'Undefined variable',
          fixable: true,
        },
        {
          id: 'unused_var_unused',
          severity: 'info',
          category: 'variables',
          message: 'Unused variable',
          fixable: true,
        },
      ];

      for (const issue of fixableIssues) {
        expect(fixer.canFix(issue)).toBe(true);
      }
    });

    it('should identify non-fixable issues', () => {
      const nonFixableIssue: ValidationIssue = {
        id: 'some_other_issue',
        severity: 'error',
        category: 'content',
        message: 'Other issue',
        fixable: false,
      };

      expect(fixer.canFix(nonFixableIssue)).toBe(false);
    });
  });

  describe('getFixDescription', () => {
    it('should describe fixes to be made', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'unreachable_1',
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable',
          fixable: true,
        },
        {
          id: 'unreachable_2',
          severity: 'warning',
          category: 'structure',
          message: 'Unreachable',
          fixable: true,
        },
        {
          id: 'dead_link_1_2',
          severity: 'error',
          category: 'links',
          message: 'Dead link',
          fixable: true,
        },
      ];

      const description = fixer.getFixDescription(issues);

      expect(description).toContain('2');
      expect(description).toContain('unreachable');
      expect(description).toContain('1');
      expect(description).toContain('dead link');
    });

    it('should handle no fixable issues', () => {
      const issues: ValidationIssue[] = [];

      const description = fixer.getFixDescription(issues);

      expect(description).toBe('No fixable issues');
    });
  });
});
