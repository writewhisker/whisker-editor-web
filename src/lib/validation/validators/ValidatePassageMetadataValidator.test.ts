import { describe, it, expect } from 'vitest';
import { ValidatePassageMetadataValidator } from './ValidatePassageMetadataValidator';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';

const createStory = () => {
  const story = new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  });
  story.passages.clear();
  return story;
};

describe('ValidatePassageMetadataValidator', () => {
  it('should have correct metadata', () => {
    const validator = new ValidatePassageMetadataValidator();
    expect(validator.name).toBe('validate_passage_metadata');
    expect(validator.category).toBe('structure');
  });

  it('should pass with valid passage size', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 150 },
    });
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should error on invalid width', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
      size: { width: 0, height: 150 },
    });
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Invalid width');
    expect(issues[0].fixable).toBe(true);
  });

  it('should error on invalid height', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
      size: { width: 200, height: -1 },
    });
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Invalid height');
  });

  it('should provide fix for invalid width', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
      size: { width: -5, height: 150 },
    });
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues[0].fixAction).toBeDefined();
    issues[0].fixAction?.();

    expect(passage.size.width).toBe(200);
  });

  it('should warn about reserved metadata keys', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
    });
    passage.setMetadata('title', 'Shadow Title'); // Reserved
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Reserved metadata key');
  });

  it('should warn about very large passage metadata', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
    });
    // Create large metadata (> 50KB)
    const largeData = 'x'.repeat(60000);
    passage.setMetadata('large', largeData);
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Large metadata');
  });

  it('should warn about reserved choice metadata keys', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
    });
    const choice = new Choice({ text: 'Option', target: 'somewhere' });
    choice.setMetadata('text', 'Shadow Text'); // Reserved
    passage.addChoice(choice);
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Reserved metadata key');
  });

  it('should pass with custom metadata', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
    });
    passage.setMetadata('customKey', 'customValue');
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should warn about very large dimensions', () => {
    const story = createStory();
    const passage = new Passage({
      title: 'Test',
      content: 'Content',
      position: { x: 0, y: 0 },
      size: { width: 2000, height: 1500 },
    });
    story.addPassage(passage);

    const validator = new ValidatePassageMetadataValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('Very large dimensions');
  });
});
