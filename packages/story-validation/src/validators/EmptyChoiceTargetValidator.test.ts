import { describe, it, expect } from 'vitest';
import { EmptyChoiceTargetValidator } from './EmptyChoiceTargetValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';

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

describe('EmptyChoiceTargetValidator', () => {
  it('should have correct metadata', () => {
    const validator = new EmptyChoiceTargetValidator();

    expect(validator.name).toBe('empty_choice_target');
    expect(validator.category).toBe('links');
  });

  it('should pass when all choices have targets', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });
    const p2 = new Passage({ id: 'p2', title: 'End' });

    p1.addChoice(new Choice({ text: 'Go', target: 'p2' }));

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect choice with empty target', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'Go nowhere', target: '' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].code).toBe('WLS-LNK-005');
    expect(issues[0].message).toContain('no target');
  });

  it('should detect choice with undefined target', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'Go nowhere' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
  });

  it('should allow special target END', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'End', target: 'END' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should allow special target BACK', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'Back', target: 'BACK' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should allow special target RESTART', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'Restart', target: 'RESTART' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect multiple empty targets', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });

    p1.addChoice(new Choice({ text: 'Choice 1', target: '' }));
    p1.addChoice(new Choice({ text: 'Choice 2' }));

    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
  });

  it('should include passage and choice info in issue', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'TestPassage' });
    const choice = new Choice({ text: 'Missing target', target: '' });

    p1.addChoice(choice);
    story.addPassage(p1);

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues[0].passageId).toBe('p1');
    expect(issues[0].passageTitle).toBe('TestPassage');
    expect(issues[0].choiceId).toBe(choice.id);
    expect(issues[0].context?.choiceText).toBe('Missing target');
  });

  it('should handle story with no passages', () => {
    const story = createStory();

    const validator = new EmptyChoiceTargetValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
