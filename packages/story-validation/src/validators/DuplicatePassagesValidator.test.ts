import { describe, it, expect } from 'vitest';
import { DuplicatePassagesValidator } from './DuplicatePassagesValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';

// Helper to create story without default passage
const createStory = () => {
  const story = new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    },
    passages: {}
  });
  // Remove auto-created default passage
  story.passages.clear();
  story.startPassage = '';
  return story;
};

describe('DuplicatePassagesValidator', () => {
  it('should have correct metadata', () => {
    const validator = new DuplicatePassagesValidator();

    expect(validator.name).toBe('duplicate_passages');
    expect(validator.category).toBe('structure');
  });

  it('should pass when all passages have unique names', () => {
    const story = createStory();
    story.addPassage(new Passage({ title: 'Start' }));
    story.addPassage(new Passage({ title: 'Middle' }));
    story.addPassage(new Passage({ title: 'End' }));

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect duplicate passage names', () => {
    const story = createStory();
    const p1 = new Passage({ title: 'Start' });
    const p2 = new Passage({ title: 'Start' });

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
    expect(issues.every(i => i.code === 'WLS-STR-003')).toBe(true);
    expect(issues.every(i => i.message.includes('Duplicate passage name'))).toBe(true);
  });

  it('should detect duplicates with different cases', () => {
    const story = createStory();
    story.addPassage(new Passage({ title: 'Start' }));
    story.addPassage(new Passage({ title: 'START' }));
    story.addPassage(new Passage({ title: 'start' }));

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(3);
  });

  it('should handle multiple groups of duplicates', () => {
    const story = createStory();
    story.addPassage(new Passage({ title: 'Start' }));
    story.addPassage(new Passage({ title: 'Start' }));
    story.addPassage(new Passage({ title: 'End' }));
    story.addPassage(new Passage({ title: 'End' }));

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(4);
  });

  it('should handle story with no passages', () => {
    const story = createStory();

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should include passage information in issue', () => {
    const story = createStory();
    const p1 = new Passage({ title: 'Duplicate' });
    const p2 = new Passage({ title: 'Duplicate' });

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues[0].passageId).toBeDefined();
    expect(issues[0].passageTitle).toBe('Duplicate');
    expect(issues[0].context?.count).toBe(2);
  });

  it('should mark issues as not fixable', () => {
    const story = createStory();
    story.addPassage(new Passage({ title: 'Test' }));
    story.addPassage(new Passage({ title: 'Test' }));

    const validator = new DuplicatePassagesValidator();
    const issues = validator.validate(story);

    expect(issues.every(i => i.fixable === false)).toBe(true);
  });
});
