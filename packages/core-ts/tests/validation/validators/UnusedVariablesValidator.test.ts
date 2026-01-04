import { describe, it, expect } from 'vitest';
import { UnusedVariablesValidator } from '@writewhisker/core-ts';
import { Story } from '@writewhisker/core-ts';
import { Passage } from '@writewhisker/core-ts';
import { Choice } from '@writewhisker/core-ts';
import { Variable } from '@writewhisker/core-ts';

// Helper to create story without default passage
const createStory = () => {
  const story = new Story({ metadata: { title: 'Test Story', author: 'Test Author', version: '1.0.0', created: new Date().toISOString(), modified: new Date().toISOString() }, passages: {} });
  // Remove auto-created default passage
  story.passages.clear();
  story.startPassage = '';
  return story;
};

describe('UnusedVariablesValidator', () => {
  it('should have correct metadata', () => {
    const validator = new UnusedVariablesValidator();

    expect(validator.name).toBe('unused_variables');
    expect(validator.category).toBe('variables');
  });

  it('should pass when all variables are used', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'health = 50' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should detect unused variable', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'unused', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', content: 'Hello' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].category).toBe('variables');
    expect(issues[0].variableName).toBe('unused');
    expect(issues[0].fixable).toBe(true);
  });

  it('should detect multiple unused variables', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'var1', type: 'number', initial: 0 }));
    story.addVariable(new Variable({ name: 'var2', type: 'string', initial: '' }));
    story.addVariable(new Variable({ name: 'var3', type: 'boolean', initial: false }));

    const passage = new Passage({ title: 'Start', content: 'Hello' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(3);
    const varNames = issues.map(i => i.variableName);
    expect(varNames).toContain('var1');
    expect(varNames).toContain('var2');
    expect(varNames).toContain('var3');
  });

  it('should not flag variable used in passage script', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'score', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'score = score + 10' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not flag variable used in choice condition', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'hasKey', type: 'boolean', initial: false }));

    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Open door', condition: 'hasKey == true' }));
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not flag variable used in choice on_select', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'karma', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start' });
    passage.addChoice(new Choice({ text: 'Be kind', action: 'karma = karma + 1' }));
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle mixed used and unused variables', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'used', type: 'number', initial: 0 }));
    story.addVariable(new Variable({ name: 'unused', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'used = 10' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('unused');
  });

  it('should provide fix description', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'old_var', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', content: 'Hello' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues[0].fixDescription).toContain('Remove variable "old_var"');
  });

  it('should handle story with no variables', () => {
    const story = createStory();
    const passage = new Passage({ title: 'Start', content: 'Hello' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should handle variable used in multiple places', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'x', type: 'number', initial: 0 }));

    const p1 = new Passage({ title: 'P1', onEnterScript: 'x = 10' });
    const p2 = new Passage({ title: 'P2' });
    p2.addChoice(new Choice({ text: 'Check', condition: 'x > 5' }));

    story.addPassage(p1);
    story.addPassage(p2);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not confuse similar variable names', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'health', type: 'number', initial: 100 }));
    story.addVariable(new Variable({ name: 'healthMax', type: 'number', initial: 100 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'health = 50' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('healthMax');
  });

  it('should handle variables with underscores', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'player_gold', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', onEnterScript: 'player_gold = 100' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(0);
  });

  it('should not flag Lua keywords', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'x', type: 'number', initial: 0 }));

    // Use Lua keywords in script
    const passage = new Passage({
      title: 'Start',
      onEnterScript: 'if x > 0 then x = x + 1 end',
    });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    // Should not report 'if', 'then', 'end' as unused
    expect(issues).toHaveLength(0);
  });

  it('should handle empty scripts', () => {
    const story = createStory();
    story.addVariable(new Variable({ name: 'unused', type: 'number', initial: 0 }));

    const passage = new Passage({ title: 'Start', onEnterScript: '' });
    story.addPassage(passage);

    const validator = new UnusedVariablesValidator();
    const issues = validator.validate(story);

    expect(issues).toHaveLength(1);
    expect(issues[0].variableName).toBe('unused');
  });
});
