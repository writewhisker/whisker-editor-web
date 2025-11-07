import { describe, it, expect, beforeEach } from 'vitest';
import { StoryValidator } from './StoryValidator';
import { createDefaultValidator } from './defaultValidator';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';
import { UnreachablePassagesValidator } from './validators/UnreachablePassagesValidator';
import { DeadLinksValidator } from './validators/DeadLinksValidator';

describe('StoryValidator', () => {
  let validator: StoryValidator;
  let story: Story;

  beforeEach(() => {
    validator = new StoryValidator();
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

  describe('validator registration', () => {
    it('should register validators', () => {
      const testValidator = new UnreachablePassagesValidator();
      validator.registerValidator(testValidator);

      const validators = validator.getValidators();
      expect(validators).toHaveLength(1);
      expect(validators[0].name).toBe('unreachable_passages');
    });

    it('should unregister validators', () => {
      const testValidator = new UnreachablePassagesValidator();
      validator.registerValidator(testValidator);
      validator.unregisterValidator('unreachable_passages');

      const validators = validator.getValidators();
      expect(validators).toHaveLength(0);
    });

    it('should register multiple validators', () => {
      validator.registerValidator(new UnreachablePassagesValidator());
      validator.registerValidator(new DeadLinksValidator());

      const validators = validator.getValidators();
      expect(validators).toHaveLength(2);
    });
  });

  describe('validate', () => {
    it('should validate a story with no issues', () => {
      // Create a simple valid story
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.title = 'Start';
      startPassage.content = 'This is the start.';

      const secondPassage = new Passage({ title: 'Second' });
      secondPassage.content = 'This is the second passage.';
      story.addPassage(secondPassage);

      startPassage.addChoice(
        new Choice({
          text: 'Go to second',
          target: secondPassage.id,
        })
      );

      validator.registerValidator(new UnreachablePassagesValidator());
      validator.registerValidator(new DeadLinksValidator());

      const result = validator.validate(story);

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect unreachable passages', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.title = 'Start';

      const unreachablePassage = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachablePassage);

      validator.registerValidator(new UnreachablePassagesValidator());

      const result = validator.validate(story);

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warningCount).toBe(1);
      expect(result.issues[0].message).toContain('Unreachable passage');
    });

    it('should detect dead links', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.title = 'Start';

      startPassage.addChoice(
        new Choice({
          text: 'Go nowhere',
          target: 'nonexistent-id',
        })
      );

      validator.registerValidator(new DeadLinksValidator());

      const result = validator.validate(story);

      expect(result.valid).toBe(false); // Errors make it invalid
      expect(result.errorCount).toBe(1);
      expect(result.issues[0].message).toContain('Dead link');
    });

    it('should respect validation options - categories', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.addChoice(
        new Choice({
          text: 'Bad link',
          target: 'nonexistent',
        })
      );

      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      validator.registerValidator(new UnreachablePassagesValidator());
      validator.registerValidator(new DeadLinksValidator());

      // Only check links
      const result = validator.validate(story, {
        categories: ['links'],
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].category).toBe('links');
    });

    it('should respect validation options - includeWarnings', () => {
      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      validator.registerValidator(new UnreachablePassagesValidator());

      const result = validator.validate(story, {
        includeWarnings: false,
      });

      expect(result.issues).toHaveLength(0);
    });

    it('should calculate stats correctly', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      const second = new Passage({ title: 'Second' });
      story.addPassage(second);

      startPassage.addChoice(
        new Choice({
          text: 'Go to second',
          target: second.id,
        })
      );

      validator.registerValidator(new UnreachablePassagesValidator());

      const result = validator.validate(story);

      expect(result.stats.totalPassages).toBe(2);
      expect(result.stats.reachablePassages).toBe(2);
      expect(result.stats.unreachablePassages).toBe(0);
    });

    it('should record validation duration', () => {
      validator.registerValidator(new UnreachablePassagesValidator());

      const result = validator.validate(story);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      validator.registerValidator(new UnreachablePassagesValidator());
      validator.registerValidator(new DeadLinksValidator());
    });

    it('should perform quick validation', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.content = 'Start';

      const isValid = validator.quickValidate(story);
      expect(isValid).toBe(true);
    });

    it('should get passage issues', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.addChoice(
        new Choice({
          text: 'Bad link',
          target: 'nonexistent',
        })
      );

      const issues = validator.getPassageIssues(story, startPassage.id);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].passageId).toBe(startPassage.id);
    });

    it('should filter issues by category', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.addChoice(
        new Choice({
          text: 'Bad link',
          target: 'nonexistent',
        })
      );

      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      const result = validator.validate(story);
      const linkIssues = validator.getIssuesByCategory(result, 'links');

      expect(linkIssues.length).toBeGreaterThan(0);
      expect(linkIssues.every(i => i.category === 'links')).toBe(true);
    });

    it('should filter issues by severity', () => {
      const startPassage = story.getPassage(story.startPassage!)!;
      startPassage.addChoice(
        new Choice({
          text: 'Bad link',
          target: 'nonexistent',
        })
      );

      const result = validator.validate(story);
      const errors = validator.getIssuesBySeverity(result, 'error');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every(i => i.severity === 'error')).toBe(true);
    });

    it('should get fixable issues', () => {
      const unreachable = new Passage({ title: 'Unreachable' });
      story.addPassage(unreachable);

      const result = validator.validate(story);
      const fixable = validator.getFixableIssues(result);

      expect(fixable.length).toBeGreaterThan(0);
      expect(fixable.every(i => i.fixable)).toBe(true);
    });
  });

  describe('createDefaultValidator', () => {
    it('should create validator with standard validators registered', () => {
      const defaultValidator = createDefaultValidator();
      const validators = defaultValidator.getValidators();

      expect(validators.length).toBeGreaterThan(0);
      expect(validators.some(v => v.name === 'missing_start_passage')).toBe(true);
      expect(validators.some(v => v.name === 'dead_links')).toBe(true);
    });
  });
});
