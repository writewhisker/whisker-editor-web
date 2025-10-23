import { describe, it, expect } from 'vitest';
import { EmptyPassagesValidator } from './EmptyPassagesValidator';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';

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

describe('EmptyPassagesValidator', () => {
  it('should have correct metadata', () => {
    const validator = new EmptyPassagesValidator();

    expect(validator.name).toBe('empty_passages');
    expect(validator.category).toBe('content');
  });

  it('should pass when all passages have content and choices', () => {
    const story = createStory();
    const p1 = new Passage({ title: 'Passage 1', content: 'Some content' });
    p1.addChoice(new Choice({ text: 'Choice 1', target: 'p2' }));
    const p2 = new Passage({ id: 'p2', title: 'Passage 2', content: 'More content' });

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    // p2 has no choices, so it will generate an info issue
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
  });

  it('should detect passages with empty content', () => {
    const story = createStory();
    const empty = new Passage({ title: 'Empty Passage', content: '' });
    empty.addChoice(new Choice({ text: 'Go somewhere' }));
    story.addPassage(empty);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].category).toBe('content');
    expect(issues[0].message).toContain('Empty passage');
    expect(issues[0].passageId).toBe(empty.id);
    expect(issues[0].passageTitle).toBe('Empty Passage');
  });

  it('should detect passages with whitespace-only content', () => {
    const story = createStory();
    const whitespace = new Passage({ title: 'Whitespace', content: '   \n\t  ' });
    story.addPassage(whitespace);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues.some(i => i.severity === 'warning')).toBe(true);
    const emptyIssue = issues.find(i => i.severity === 'warning');
    expect(emptyIssue?.message).toContain('Empty passage');
  });

  it('should detect terminal passages (no choices) as info', () => {
    const story = createStory();
    const terminal = new Passage({ title: 'The End', content: 'Story ends here.' });
    story.addPassage(terminal);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].category).toBe('content');
    expect(issues[0].message).toContain('Terminal passage');
    expect(issues[0].passageId).toBe(terminal.id);
  });

  it('should report both empty content and no choices', () => {
    const story = createStory();
    const empty = new Passage({ title: 'Empty', content: '' });
    story.addPassage(empty);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
    expect(issues.some(i => i.severity === 'info')).toBe(true);
  });

  it('should handle passages with content but no choices', () => {
    const story = createStory();
    const ending = new Passage({ title: 'Good Ending', content: 'You won!' });
    story.addPassage(ending);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].description).toContain('This is fine if intentional');
  });

  it('should handle story with no passages', () => {
    const story = createStory();

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should mark issues as not fixable', () => {
    const story = createStory();
    const empty = new Passage({ title: 'Empty', content: '' });
    story.addPassage(empty);

    const validator = new EmptyPassagesValidator();
    const issues = validator.validate(story);

    expect(issues.every(i => i.fixable === false)).toBe(true);
  });
});
