import { describe, it, expect } from 'vitest';
import { WlsExpressionValidator } from './WlsExpressionValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';
import type { StoryData } from '@writewhisker/story-models';

describe('WlsExpressionValidator', () => {
  it('should have correct metadata', () => {
    const validator = new WlsExpressionValidator();

    expect(validator.name).toBe('wls_expressions');
    expect(validator.category).toBe('expression');
  });

  it('should pass for valid expressions', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Total: ${gold + silver}',
    });
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect empty expression interpolation', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Value: ${}',
    });
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    const emptyExprIssue = issues.find(i => i.message.includes('Empty expression'));
    expect(emptyExprIssue).toBeDefined();
    expect(emptyExprIssue?.severity).toBe('error');
  });

  it('should detect empty expression with whitespace', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Value: ${   }',
    });
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    const emptyExprIssue = issues.find(i => i.message.includes('Empty expression'));
    expect(emptyExprIssue).toBeDefined();
  });

  it('should not warn about equality comparison', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start', content: 'Choose:' });
    const choice = new Choice({ text: 'Option', target: 'next' });
    choice.condition = 'gold == 10';
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    // Should not warn about == (proper equality)
    const assignmentIssues = issues.filter(i =>
      i.message.toLowerCase().includes('assignment')
    );
    expect(assignmentIssues).toHaveLength(0);
  });

  it('should validate choice conditions', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({ title: 'Start', content: 'Choose:' });
    const choice = new Choice({ text: 'Option', target: 'next' });
    choice.condition = 'gold >= 10';
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    // Any issues found are expression-related
    for (const issue of issues) {
      expect(issue.category).toBe('expression');
      expect(issue.passageId).toBe(passage.id);
    }
  });

  it('should handle empty story', () => {
    const story = new Story({ metadata: { title: 'Empty Story' } } as Partial<StoryData>);

    const validator = new WlsExpressionValidator();
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

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should include passage info in issues', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'My Passage',
      content: 'Value: ${}',
    });
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].passageId).toBe(passage.id);
    expect(issues[0].passageTitle).toBe('My Passage');
  });

  it('should check multiple passages', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const p1 = new Passage({
      title: 'Passage 1',
      content: 'Value 1: ${}',
    });
    const p2 = new Passage({
      title: 'Passage 2',
      content: 'Value 2: ${}',
    });
    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('should pass for text without expressions', () => {
    const story = new Story({ metadata: { title: 'Test Story' } } as Partial<StoryData>);
    const passage = new Passage({
      title: 'Start',
      content: 'Just regular text without any expressions.',
    });
    story.addPassage(passage);

    const validator = new WlsExpressionValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
