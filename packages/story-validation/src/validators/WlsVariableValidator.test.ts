import { describe, it, expect } from 'vitest';
import { WlsVariableValidator } from './WlsVariableValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';
import type { StoryData } from '@writewhisker/story-models';

describe('WlsVariableValidator', () => {
  it('should have correct metadata', () => {
    const validator = new WlsVariableValidator();

    expect(validator.name).toBe('wls_variables');
    expect(validator.category).toBe('variables');
  });

  it('should pass for valid variable syntax', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'You have $gold gold and $_tempItem.',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for valid expression interpolation', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Total: ${gold + silver} coins.',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for regular text without variables', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Hello, welcome to the story!',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for underscore-prefixed temp variables', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Temp value: $_count.',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle empty story', () => {
    const story = new Story({ metadata: { title: 'Empty Story' } } as Partial<StoryData>);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle passage with no content', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Empty',
      content: '',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should validate variables in choice conditions', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start', content: 'Choose:' });
    const choice = new Choice({ text: 'Option A', target: 'next' });
    choice.condition = 'gold > 10';
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should validate variables in choice actions', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start', content: 'Choose:' });
    const choice = new Choice({ text: 'Option A', target: 'next' });
    choice.action = 'gold = gold + 10';
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for dollar signs in regular context', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Price: $10 dollars.',
    });
    story.addPassage(passage);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should check multiple passages', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const p1 = new Passage({
      title: 'Passage 1',
      content: 'You have $gold.',
    });
    const p2 = new Passage({
      title: 'Passage 2',
      content: 'Inventory: $_items.',
    });
    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new WlsVariableValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
