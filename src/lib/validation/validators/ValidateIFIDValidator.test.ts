import { describe, it, expect } from 'vitest';
import { ValidateIFIDValidator } from './ValidateIFIDValidator';
import { Story } from '../../models/Story';

const createStory = (ifid?: string) => {
  return new Story({
    metadata: {
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ifid,
    },
  });
};

describe('ValidateIFIDValidator', () => {
  it('should have correct metadata', () => {
    const validator = new ValidateIFIDValidator();
    expect(validator.name).toBe('validate_ifid');
    expect(validator.category).toBe('structure');
  });

  it('should pass when IFID is valid UUID v4', () => {
    const story = createStory('12345678-1234-4234-8234-123456789012');
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should warn when IFID is missing', () => {
    const story = createStory(undefined);
    // Explicitly remove auto-generated IFID
    story.metadata.ifid = undefined;

    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].id).toBe('missing_ifid');
    expect(issues[0].message).toContain('Missing IFID');
    expect(issues[0].fixable).toBe(true);
  });

  it('should provide fix for missing IFID', () => {
    const story = createStory(undefined);
    // Explicitly remove auto-generated IFID
    story.metadata.ifid = undefined;

    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues[0].fix).toBeDefined();
    expect(issues[0].fix?.description).toContain('Generate');

    // Apply fix
    issues[0].fix?.apply();

    // Verify IFID was generated
    expect(story.metadata.ifid).toBeDefined();
    expect(story.metadata.ifid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should error when IFID is invalid format', () => {
    const story = createStory('invalid-uuid');
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].id).toBe('invalid_ifid');
    expect(issues[0].message).toContain('Invalid IFID format');
    expect(issues[0].fixable).toBe(true);
  });

  it('should provide fix for invalid IFID', () => {
    const story = createStory('not-a-uuid');
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues[0].fix).toBeDefined();

    // Apply fix
    const originalIfid = story.metadata.ifid;
    issues[0].fix?.apply();

    // Verify new valid IFID was generated
    expect(story.metadata.ifid).not.toBe(originalIfid);
    expect(story.metadata.ifid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should reject UUID with wrong version', () => {
    const story = createStory('12345678-1234-3234-8234-123456789012'); // Version 3, not 4
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('should reject UUID with wrong variant', () => {
    const story = createStory('12345678-1234-4234-1234-123456789012'); // Invalid variant
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
  });

  it('should accept uppercase UUID', () => {
    const story = createStory('12345678-1234-4234-8234-123456789ABC');
    const validator = new ValidateIFIDValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
