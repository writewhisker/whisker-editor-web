import { describe, it, expect } from 'vitest';
import { UnreachablePassagesValidator } from './UnreachablePassagesValidator';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';

// Helper to create story without default passage
const createStory = () => {
  const story = new Story({ metadata: { title: 'Test Story', author: 'Test Author', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() }, passages: {} });
  // Remove auto-created default passage
  story.passages.clear();
  story.startPassage = '';
  return story;
};

describe('UnreachablePassagesValidator', () => {
  it('should have correct metadata', () => {
    const validator = new UnreachablePassagesValidator();

    expect(validator.name).toBe('unreachable_passages');
    expect(validator.category).toBe('structure');
  });

  it('should pass when all passages are reachable', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const p2 = new Passage({ id: 'p2', title: 'Passage 2' });
    const p3 = new Passage({ id: 'p3', title: 'Passage 3' });

    start.addChoice(new Choice({ text: 'Go to P2', target: 'p2' }));
    p2.addChoice(new Choice({ text: 'Go to P3', target: 'p3' }));

    story.addPassage(start);
    story.addPassage(p2);
    story.addPassage(p3);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect unreachable passage', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const unreachable = new Passage({ title: 'Unreachable' });

    story.addPassage(start);
    story.addPassage(unreachable);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].category).toBe('structure');
    expect(issues[0].message).toContain('Unreachable passage');
    expect(issues[0].passageId).toBe(unreachable.id);
    expect(issues[0].fixable).toBe(true);
  });

  it('should detect multiple unreachable passages', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const unreachable1 = new Passage({ title: 'Unreachable 1' });
    const unreachable2 = new Passage({ title: 'Unreachable 2' });

    story.addPassage(start);
    story.addPassage(unreachable1);
    story.addPassage(unreachable2);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.severity === 'warning')).toBe(true);
  });

  it('should handle branching paths correctly', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const left = new Passage({ id: 'left', title: 'Left' });
    const right = new Passage({ id: 'right', title: 'Right' });

    start.addChoice(new Choice({ text: 'Go left', target: 'left' }));
    start.addChoice(new Choice({ text: 'Go right', target: 'right' }));

    story.addPassage(start);
    story.addPassage(left);
    story.addPassage(right);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle circular references', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'P1' });
    const p2 = new Passage({ id: 'p2', title: 'P2' });

    p1.addChoice(new Choice({ text: 'To P2', target: 'p2' }));
    p2.addChoice(new Choice({ text: 'Back to P1', target: 'p1' }));

    story.addPassage(p1);
    story.addPassage(p2);
    story.startPassage = 'p1';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle deep paths', () => {
    const story = createStory();
    const passages = [];

    for (let i = 0; i < 10; i++) {
      const p = new Passage({ id: `p${i}`, title: `Passage ${i}` });
      if (i > 0) {
        passages[i - 1].addChoice(new Choice({ text: 'Next', target: `p${i}` }));
      }
      passages.push(p);
      story.addPassage(p);
    }

    story.startPassage = 'p0';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should return empty when no start passage', () => {
    const story = createStory();
    const p1 = new Passage({ title: 'Passage 1' });
    story.addPassage(p1);
    story.startPassage = '';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    // Should return empty - MissingStartPassageValidator handles this
    expect(issues).toHaveLength(0);
  });

  it('should handle story with only start passage', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });

    story.addPassage(start);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should provide fix description', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const unreachable = new Passage({ title: 'Unreachable' });

    story.addPassage(start);
    story.addPassage(unreachable);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues[0].fixDescription).toBe('Delete this passage');
  });

  it('should handle passages reachable through multiple paths', () => {
    const story = createStory();
    const start = new Passage({ id: 's', title: 'Start' });
    const middle = new Passage({ id: 'm', title: 'Middle' });
    const end = new Passage({ id: 'e', title: 'End' });

    // Two ways to reach 'end'
    start.addChoice(new Choice({ text: 'To middle', target: 'm' }));
    start.addChoice(new Choice({ text: 'To end', target: 'e' }));
    middle.addChoice(new Choice({ text: 'To end', target: 'e' }));

    story.addPassage(start);
    story.addPassage(middle);
    story.addPassage(end);
    story.startPassage = 's';

    const validator = new UnreachablePassagesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
