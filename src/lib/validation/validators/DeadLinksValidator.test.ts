import { describe, it, expect } from 'vitest';
import { DeadLinksValidator } from './DeadLinksValidator';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';

describe('DeadLinksValidator', () => {
  it('should have correct metadata', () => {
    const validator = new DeadLinksValidator();

    expect(validator.name).toBe('dead_links');
    expect(validator.category).toBe('links');
  });

  it('should pass when all links point to existing passages', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    const p2 = new Passage({ id: 'p2', title: 'Passage 2' });

    p1.addChoice(new Choice({ text: 'Go to P2', target: 'p2' }));

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect choice pointing to non-existent passage', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    p1.addChoice(new Choice({ text: 'Go nowhere', target: 'non-existent' }));

    story.addPassage(p1);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].category).toBe('links');
    expect(issues[0].message).toContain('Dead link');
    expect(issues[0].passageId).toBe(p1.id);
    expect(issues[0].choiceId).toBeDefined();
    expect(issues[0].fixable).toBe(true);
  });

  it('should ignore choices with no target', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    p1.addChoice(new Choice({ text: 'End story', target: '' }));

    story.addPassage(p1);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect multiple dead links in same passage', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    p1.addChoice(new Choice({ text: 'Link 1', target: 'nowhere1' }));
    p1.addChoice(new Choice({ text: 'Link 2', target: 'nowhere2' }));

    story.addPassage(p1);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
  });

  it('should detect dead links across multiple passages', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    const p2 = new Passage({ title: 'Passage 2' });

    p1.addChoice(new Choice({ text: 'Bad link', target: 'nowhere' }));
    p2.addChoice(new Choice({ text: 'Another bad link', target: 'elsewhere' }));

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
    expect(issues[0].passageId).not.toBe(issues[1].passageId);
  });

  it('should include passage and choice information in issue', () => {
    const story = new Story({ title: 'Test Story' });
    const passage = new Passage({ title: 'Start' });
    const choice = new Choice({ text: 'Go somewhere', target: 'missing' });
    passage.addChoice(choice);

    story.addPassage(passage);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues[0].passageId).toBe(passage.id);
    expect(issues[0].passageTitle).toBe('Start');
    expect(issues[0].choiceId).toBe(choice.id);
    expect(issues[0].description).toContain('Go somewhere');
    expect(issues[0].description).toContain('missing');
  });

  it('should handle story with no passages', () => {
    const story = new Story({ title: 'Empty Story' });

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should provide fix description', () => {
    const story = new Story({ title: 'Test Story' });
    const p1 = new Passage({ title: 'Passage 1' });
    p1.addChoice(new Choice({ text: 'Bad link', target: 'nowhere' }));

    story.addPassage(p1);

    const validator = new DeadLinksValidator();
    const issues = validator.validate(story);

    expect(issues[0].fixDescription).toBe('Remove this choice');
  });
});
