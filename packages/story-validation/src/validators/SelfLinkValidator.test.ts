import { describe, it, expect } from 'vitest';
import { SelfLinkValidator } from './SelfLinkValidator';
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

describe('SelfLinkValidator', () => {
  it('should have correct metadata', () => {
    const validator = new SelfLinkValidator();

    expect(validator.name).toBe('self_link');
    expect(validator.category).toBe('links');
  });

  it('should pass when no self-links exist', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Start' });
    const p2 = new Passage({ id: 'p2', title: 'End' });

    p1.addChoice(new Choice({ text: 'Go to End', target: 'p2' }));

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect self-link without state change', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Loop' });

    p1.addChoice(new Choice({ text: 'Stay here', target: 'p1' }));

    story.addPassage(p1);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].code).toBe('WLS-LNK-002');
    expect(issues[0].message).toContain('Self-link');
  });

  it('should allow self-link with action script', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Counter' });

    p1.addChoice(new Choice({ text: 'Increment', target: 'p1', action: 'count = count + 1' }));

    story.addPassage(p1);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect multiple self-links', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Loop' });

    p1.addChoice(new Choice({ text: 'Stay 1', target: 'p1' }));
    p1.addChoice(new Choice({ text: 'Stay 2', target: 'p1' }));

    story.addPassage(p1);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2);
  });

  it('should not flag whitespace-only action', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'Loop' });

    p1.addChoice(new Choice({ text: 'Stay', target: 'p1', action: '   ' }));

    story.addPassage(p1);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
  });

  it('should include passage and choice info in issue', () => {
    const story = createStory();
    const p1 = new Passage({ id: 'p1', title: 'TestPassage' });
    const choice = new Choice({ text: 'Loop back', target: 'p1' });

    p1.addChoice(choice);
    story.addPassage(p1);

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues[0].passageId).toBe('p1');
    expect(issues[0].passageTitle).toBe('TestPassage');
    expect(issues[0].choiceId).toBe(choice.id);
    expect(issues[0].context?.choiceText).toBe('Loop back');
  });

  it('should handle story with no passages', () => {
    const story = createStory();

    const validator = new SelfLinkValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
