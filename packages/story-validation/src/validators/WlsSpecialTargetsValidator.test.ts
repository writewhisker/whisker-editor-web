import { describe, it, expect } from 'vitest';
import { WlsSpecialTargetsValidator } from './WlsSpecialTargetsValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';
import type { StoryData } from '@writewhisker/story-models';

describe('WlsSpecialTargetsValidator', () => {
  it('should have correct metadata', () => {
    const validator = new WlsSpecialTargetsValidator();

    expect(validator.name).toBe('wls_special_targets');
    expect(validator.category).toBe('links');
  });

  it('should pass for correct uppercase special targets', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'End the story', target: 'END' }));
    passage.addChoice(new Choice({ text: 'Go back', target: 'BACK' }));
    passage.addChoice(new Choice({ text: 'Restart', target: 'RESTART' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should warn about lowercase "end"', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'End the story', target: 'end' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Incorrect case');
    expect(issues[0].description).toContain('END');
    expect(issues[0].fixable).toBe(true);
  });

  it('should warn about lowercase "back"', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Go back', target: 'back' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].description).toContain('BACK');
  });

  it('should warn about lowercase "restart"', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Restart', target: 'restart' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].description).toContain('RESTART');
  });

  it('should warn about mixed case special targets', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'End', target: 'End' }));
    passage.addChoice(new Choice({ text: 'Back', target: 'Back' }));
    passage.addChoice(new Choice({ text: 'Restart', target: 'ReStArT' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(3);
    expect(issues.every(i => i.severity === 'warning')).toBe(true);
  });

  it('should warn about BACK on start passage with single choice', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ id: 'start-id', title: 'Start' });
    passage.addChoice(new Choice({ text: 'Go back', target: 'BACK' }));
    story.addPassage(passage);
    story.startPassage = 'start-id';

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('BACK target on start passage');
  });

  it('should not warn about BACK on start passage with multiple choices', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ id: 'start-id', title: 'Start' });
    passage.addChoice(new Choice({ text: 'Go back', target: 'BACK' }));
    passage.addChoice(new Choice({ text: 'Continue', target: 'next' }));
    story.addPassage(passage);
    story.startPassage = 'start-id';

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not warn about BACK on non-start passages', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const start = new Passage({ id: 'start-id', title: 'Start' });
    const middle = new Passage({ id: 'middle-id', title: 'Middle' });
    start.addChoice(new Choice({ text: 'Continue', target: 'middle-id' }));
    middle.addChoice(new Choice({ text: 'Go back', target: 'BACK' }));
    story.addPassage(start);
    story.addPassage(middle);
    story.startPassage = 'start-id';

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for regular passage targets', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Go to Ending', target: 'Ending' }));
    passage.addChoice(new Choice({ text: 'Go to Background', target: 'Background' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should ignore choices with no target', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'No target' }));
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle empty story', () => {
    const story = new Story({ metadata: { title: 'Empty Story' } } as Partial<StoryData>);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should include passage and choice info in issues', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'My Passage' });
    const choice = new Choice({ text: 'End story', target: 'end' });
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new WlsSpecialTargetsValidator();
    const issues = validator.validate(story);

    expect(issues[0].passageId).toBe(passage.id);
    expect(issues[0].passageTitle).toBe('My Passage');
    expect(issues[0].choiceId).toBe(choice.id);
  });
});
