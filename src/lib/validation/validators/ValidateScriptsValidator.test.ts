import { describe, it, expect } from 'vitest';
import { ValidateScriptsValidator } from './ValidateScriptsValidator';
import { Story } from '../../models/Story';

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

describe('ValidateScriptsValidator', () => {
  it('should have correct metadata', () => {
    const validator = new ValidateScriptsValidator();
    expect(validator.name).toBe('validate_scripts');
    expect(validator.category).toBe('content');
  });

  it('should pass with valid Lua scripts', () => {
    const story = createStory();
    story.addScript('function init() end');
    story.addScript('if health > 0 then print("alive") end');

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect empty scripts', () => {
    const story = createStory();
    story.addScript('   ');

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('Empty');
    expect(issues[0].fixable).toBe(true);
  });

  it('should provide fix for empty scripts', () => {
    const story = createStory();
    story.addScript('function test() end');
    story.addScript('');

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues[0].fix).toBeDefined();
    issues[0].fix?.apply();

    expect(story.scripts).toHaveLength(1);
    expect(story.scripts[0]).toBe('function test() end');
  });

  it('should detect unmatched function/end', () => {
    const story = createStory();
    story.addScript('function test()'); // Missing end

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Unmatched function/end');
  });

  it('should detect unmatched if/then', () => {
    const story = createStory();
    story.addScript('if health > 0'); // Missing then

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Unmatched if/then');
  });

  it('should warn about dangerous functions', () => {
    const story = createStory();
    story.addScript('os.execute("rm -rf /")');

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('os.execute');
    expect(issues[0].fixable).toBe(false);
  });

  it('should warn about very large scripts', () => {
    const story = createStory();
    const largeScript = 'function test() end\n'.repeat(5000); // > 50KB
    story.addScript(largeScript);

    const validator = new ValidateScriptsValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Very large');
  });
});
