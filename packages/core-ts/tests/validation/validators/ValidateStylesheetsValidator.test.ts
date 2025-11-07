import { describe, it, expect } from 'vitest';
import { ValidateStylesheetsValidator } from '../../../src/validation/validators/ValidateStylesheetsValidator';
import { Story } from '../../../src/models';

const createStory = () => {
  return new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  });
};

describe('ValidateStylesheetsValidator', () => {
  it('should have correct metadata', () => {
    const validator = new ValidateStylesheetsValidator();
    expect(validator.name).toBe('validate_stylesheets');
    expect(validator.category).toBe('content');
  });

  it('should pass with valid stylesheets', () => {
    const story = createStory();
    story.addStylesheet('body { color: red; }');
    story.addStylesheet('h1 { font-size: 24px; }');

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should error on unmatched braces', () => {
    const story = createStory();
    story.addStylesheet('body { color: red;'); // Missing closing brace

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Unmatched braces');
    expect(issues[0].fixable).toBe(false);
  });

  it('should detect empty stylesheets', () => {
    const story = createStory();
    story.addStylesheet('   '); // Empty/whitespace only

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('Empty');
    expect(issues[0].fixable).toBe(true);
  });

  it('should provide fix for empty stylesheets', () => {
    const story = createStory();
    story.addStylesheet('body { color: red; }');
    story.addStylesheet('');

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].fixAction).toBeDefined();

    // Apply fix
    issues[0].fixAction?.();

    // Empty stylesheet should be removed
    expect(story.stylesheets).toHaveLength(1);
    expect(story.stylesheets[0]).toBe('body { color: red; }');
  });

  it('should warn about very large stylesheets', () => {
    const story = createStory();
    const largeCSS = 'a { color: red; }'.repeat(5000); // > 50KB
    story.addStylesheet(largeCSS);

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Very large');
    expect(issues[0].fixable).toBe(false);
  });

  it('should pass with no stylesheets', () => {
    const story = createStory();

    const validator = new ValidateStylesheetsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
