import { describe, it, expect } from 'vitest';
import { UndefinedVariablesValidator } from './UndefinedVariablesValidator';
import { Story } from '@writewhisker/story-models';
import { Passage } from '@writewhisker/story-models';
import { Choice } from '@writewhisker/story-models';
import { Variable } from '@writewhisker/story-models';

// Helper to create story without default passage
const createStory = () => {
  const story = new Story({ metadata: { title: 'Test Story', author: 'Test Author', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() }, passages: {} });
  // Remove auto-created default passage
  story.passages.clear();
  story.startPassage = '';
  return story;
};

describe('UndefinedVariablesValidator', () => {
  it('should have correct metadata', () => {
    const validator = new UndefinedVariablesValidator();

    expect(validator.name).toBe('undefined_variables');
    expect(validator.category).toBe('variables');
  });

  it('should pass when all referenced variables are defined', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'health = 50' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect undefined variable in passage script', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', onEnterScript: 'score = 10' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].category).toBe('variables');
    expect(issues[0].variableName).toBe('score');
    expect(issues[0].passageId).toBe(passage.id);
    expect(issues[0].fixable).toBe(true);
  });

  it('should detect undefined variable in choice condition', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Check', condition: 'hasKey == true' }));
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('hasKey');
    expect(issues[0].description).toContain('condition');
  });

  it('should detect undefined variable in choice action script', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Act', action: 'karma = karma + 1' }));
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('karma');
    expect(issues[0].description).toContain('action');
  });

  it('should detect multiple undefined variables', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', onEnterScript: 'x = 1; y = 2; z = 3' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues.length).toBeGreaterThan(0);
    const varNames = issues.map(i => i.variableName);
    expect(varNames).toContain('x');
    expect(varNames).toContain('y');
    expect(varNames).toContain('z');
  });

  it('should not flag Lua keywords as variables', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'x', type: 'number', initial: 0 }));

    const passage = new Passage({
      title: 'Start',
      onEnterScript: 'if x > 0 then x = x + 1 end',
    });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    // Should not flag 'if', 'then', 'end' as undefined variables
    expect(issues).toHaveLength(0);
  });

  it('should handle same undefined variable in multiple passages', () => {
    const story = createStory();
    const p1 = new Passage({ title: 'P1', onEnterScript: 'score = 10' });
    const p2 = new Passage({ title: 'P2', onEnterScript: 'score = 20' });

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(2); // One issue per passage
    expect(issues.every(i => i.variableName === 'score')).toBe(true);
  });

  it('should provide fix description', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', onEnterScript: 'gold = 100' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues[0].fixDescription).toContain('Add variable "gold"');
  });

  it('should handle complex variable expressions', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'a', type: 'number', initial: 0 }));

    const passage = new Passage({
      title: 'Start',
      onEnterScript: 'b = a * 2',
    });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('b');
  });

  it('should handle empty scripts gracefully', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', onEnterScript: '' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle story with no variables and no scripts', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', content: 'Hello' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not duplicate issues for same variable in same passage', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'C1', condition: 'x > 0' }));
    passage.addChoice(new Choice({ text: 'C2', condition: 'x < 10' }));

    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    // Should only create one issue for variable 'x' in this passage
    expect(issues).toHaveLength(1);
  });

  it('should handle underscores in variable names', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'player_health', type: 'number', initial: 100 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'player_health = 50' });
    story.addPassage(passage);

    const validator = new UndefinedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });
});
