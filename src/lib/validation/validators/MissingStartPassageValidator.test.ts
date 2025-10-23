import { describe, it, expect } from 'vitest';
import { MissingStartPassageValidator } from './MissingStartPassageValidator';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import type { StoryData } from '../../models/types';

describe('MissingStartPassageValidator', () => {
  it('should have correct metadata', () => {
    const validator = new MissingStartPassageValidator();

    expect(validator.name).toBe('missing_start_passage');
    expect(validator.category).toBe('structure');
  });

  it('should pass when story has valid start passage', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const start = new Passage({ title: 'Start' });
    story.addPassage(start);
    story.startPassage = start.id;

    const validator = new MissingStartPassageValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should fail when story has no start passage defined', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Some Passage' });
    story.addPassage(passage);
    story.startPassage = '';

    const validator = new MissingStartPassageValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].category).toBe('structure');
    expect(issues[0].message).toBe('No start passage defined');
    expect(issues[0].fixable).toBe(false);
  });

  it('should fail when start passage ID does not exist', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Some Passage' });
    story.addPassage(passage);
    story.startPassage = 'non-existent-id';

    const validator = new MissingStartPassageValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].category).toBe('structure');
    expect(issues[0].message).toBe('Start passage does not exist');
    expect(issues[0].fixable).toBe(false);
  });

  it('should return early when start passage is not defined', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    story.startPassage = '';

    const validator = new MissingStartPassageValidator();
    const issues = validator.validate(story);

    // Should only return one issue (missing start passage)
    // Not the "invalid start passage" issue
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('missing_start_passage');
  });

  it('should handle empty story', () => {
    const story = new Story({ metadata: { title: 'Empty Story' } } as Partial<StoryData>);
    story.startPassage = '';

    const validator = new MissingStartPassageValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe('No start passage defined');
  });
});
