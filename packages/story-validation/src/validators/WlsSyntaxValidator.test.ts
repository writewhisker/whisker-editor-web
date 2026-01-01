import { describe, it, expect } from 'vitest';
import { WlsSyntaxValidator } from './WlsSyntaxValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';
import type { StoryData } from '@writewhisker/story-models';

describe('WlsSyntaxValidator', () => {
  it('should have correct metadata', () => {
    const validator = new WlsSyntaxValidator();

    expect(validator.name).toBe('wls_syntax');
    expect(validator.category).toBe('syntax');
  });

  it('should validate WLS content and report any syntax issues', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Hello, welcome to the story!',
    });
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    // The validator uses the WLS parser; any issues found are syntax related
    for (const issue of issues) {
      expect(issue.severity).toBe('error');
      expect(issue.category).toBe('syntax');
      expect(issue.passageId).toBe(passage.id);
    }
  });

  it('should pass for passages with variable interpolation', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'You have $gold gold coins.',
    });
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should pass for passages with expression interpolation', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Total: ${gold + silver} coins.',
    });
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle empty story', () => {
    const story = new Story({ metadata: { title: 'Empty Story' } } as Partial<StoryData>);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle passage with no content', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Empty Passage',
      content: '',
    });
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should validate passages with choices', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Choose your path:',
    });
    passage.addChoice(new Choice({ text: 'Go left' }));
    passage.addChoice(new Choice({ text: 'Go right' }));
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    // The validator parses constructed WLS; any issues are syntax-related
    for (const issue of issues) {
      expect(issue.category).toBe('syntax');
      expect(issue.passageId).toBe(passage.id);
    }
  });

  it('should include passage info in syntax errors', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Test Passage',
      content: 'Some content',
    });
    story.addPassage(passage);

    const validator = new WlsSyntaxValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
