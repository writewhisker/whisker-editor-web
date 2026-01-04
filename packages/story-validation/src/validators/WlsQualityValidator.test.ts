/**
 * Tests for WlsQualityValidator
 */

import { describe, it, expect } from 'vitest';
import { WlsQualityValidator, DEFAULT_THRESHOLDS } from './WlsQualityValidator';
import { Story, Passage, Variable, Choice } from '@writewhisker/story-models';

/**
 * Helper to create a minimal story
 */
function createStory(passageCount: number, choicesPerPassage: number, variableCount: number = 0): Story {
  const story = new Story();

  for (let i = 0; i < passageCount; i++) {
    const passageId = `passage_${i}`;
    const passage = new Passage({ id: passageId, title: i === 0 ? 'Start' : `Passage ${i}` });
    passage.content = 'This is test content for the passage.';

    for (let j = 0; j < choicesPerPassage; j++) {
      const targetIndex = (i + 1 + j) % passageCount;
      const choice = new Choice({ text: `Choice ${j}`, target: `passage_${targetIndex}` });
      passage.addChoice(choice);
    }

    story.addPassage(passage);
  }

  for (let i = 0; i < variableCount; i++) {
    const variable = new Variable({ name: `var_${i}`, type: 'number', initial: i });
    story.variables.set(`var_${i}`, variable);
  }

  if (passageCount > 0) {
    story.startPassage = 'passage_0';
  }

  return story;
}

describe('WlsQualityValidator', () => {
  describe('default thresholds', () => {
    it('exports default thresholds matching Lua', () => {
      expect(DEFAULT_THRESHOLDS.minBranchingFactor).toBe(1.5);
      expect(DEFAULT_THRESHOLDS.maxComplexity).toBe(100);
      expect(DEFAULT_THRESHOLDS.maxPassageWords).toBe(1000);
      expect(DEFAULT_THRESHOLDS.maxNestingDepth).toBe(5);
      expect(DEFAULT_THRESHOLDS.maxVariableCount).toBe(50);
    });
  });

  describe('WLS-QUA-001: low_branching', () => {
    it('detects low branching factor', () => {
      const validator = new WlsQualityValidator();
      // 5 passages with 1 choice each = branching factor 1.0 (below 1.5)
      const story = createStory(5, 1);

      const issues = validator.validate(story);
      const lowBranching = issues.filter(i => i.code === 'WLS-QUA-001');

      expect(lowBranching.length).toBe(1);
      expect(lowBranching[0].severity).toBe('info');
    });

    it('passes with adequate branching', () => {
      const validator = new WlsQualityValidator();
      // 5 passages with 2 choices each = branching factor 2.0 (above 1.5)
      const story = createStory(5, 2);

      const issues = validator.validate(story);
      const lowBranching = issues.filter(i => i.code === 'WLS-QUA-001');

      expect(lowBranching.length).toBe(0);
    });

    it('respects custom threshold', () => {
      const validator = new WlsQualityValidator({ minBranchingFactor: 0.5 });
      const story = createStory(5, 1);

      const issues = validator.validate(story);
      const lowBranching = issues.filter(i => i.code === 'WLS-QUA-001');

      expect(lowBranching.length).toBe(0);
    });
  });

  describe('WLS-QUA-002: high_complexity', () => {
    it('detects high complexity', () => {
      const validator = new WlsQualityValidator({ maxComplexity: 10 });
      // 10 passages * 2 choices * (1 + 5/10) = 30 complexity
      const story = createStory(10, 2, 5);

      const issues = validator.validate(story);
      const highComplexity = issues.filter(i => i.code === 'WLS-QUA-002');

      expect(highComplexity.length).toBe(1);
      expect(highComplexity[0].severity).toBe('warning');
    });

    it('passes with low complexity', () => {
      const validator = new WlsQualityValidator();
      const story = createStory(3, 1);

      const issues = validator.validate(story);
      const highComplexity = issues.filter(i => i.code === 'WLS-QUA-002');

      expect(highComplexity.length).toBe(0);
    });
  });

  describe('WLS-QUA-003: long_passage', () => {
    it('detects long passages', () => {
      const validator = new WlsQualityValidator({ maxPassageWords: 10 });
      const story = new Story();

      // Create a passage with long content directly using object syntax
      const longPassage = new Passage({ id: 'passage_long', title: 'LongPassage' });
      longPassage.content = 'word '.repeat(20); // 20 words
      story.addPassage(longPassage);
      story.startPassage = 'passage_long';

      const issues = validator.validate(story);
      const longPassageIssues = issues.filter(i => i.code === 'WLS-QUA-003');

      expect(longPassageIssues.length).toBe(1);
      expect(longPassageIssues[0].severity).toBe('info');
      expect(longPassageIssues[0].passageId).toBe('passage_long');
    });

    it('passes with short passages', () => {
      const validator = new WlsQualityValidator();
      const story = createStory(2, 1);

      const issues = validator.validate(story);
      const longPassage = issues.filter(i => i.code === 'WLS-QUA-003');

      expect(longPassage.length).toBe(0);
    });
  });

  describe('WLS-QUA-004: deep_nesting', () => {
    it('detects deep conditional nesting', () => {
      const validator = new WlsQualityValidator({ maxNestingDepth: 2 });
      const story = new Story();

      // Create a passage with deeply nested conditionals directly using object syntax
      const nestedPassage = new Passage({ id: 'passage_nested', title: 'NestedPassage' });
      nestedPassage.content = `
        {$a
          {$b
            {$c
              Deeply nested content
            {/}
          {/}
        {/}
      `;
      story.addPassage(nestedPassage);
      story.startPassage = 'passage_nested';

      const issues = validator.validate(story);
      const deepNesting = issues.filter(i => i.code === 'WLS-QUA-004');

      expect(deepNesting.length).toBe(1);
      expect(deepNesting[0].severity).toBe('warning');
    });

    it('passes with shallow nesting', () => {
      const validator = new WlsQualityValidator();
      const story = new Story();

      const passage = new Passage({ id: 'passage_shallow', title: 'ShallowPassage' });
      passage.content = '{$flag Some content {/}';
      story.addPassage(passage);
      story.startPassage = 'passage_shallow';

      const issues = validator.validate(story);
      const deepNesting = issues.filter(i => i.code === 'WLS-QUA-004');

      expect(deepNesting.length).toBe(0);
    });
  });

  describe('WLS-QUA-005: too_many_variables', () => {
    it('detects many variables', () => {
      const validator = new WlsQualityValidator({ maxVariableCount: 5 });
      const story = createStory(2, 1, 10);

      const issues = validator.validate(story);
      const manyVars = issues.filter(i => i.code === 'WLS-QUA-005');

      expect(manyVars.length).toBe(1);
      expect(manyVars[0].severity).toBe('info');
    });

    it('passes with few variables', () => {
      const validator = new WlsQualityValidator();
      const story = createStory(2, 1, 5);

      const issues = validator.validate(story);
      const manyVars = issues.filter(i => i.code === 'WLS-QUA-005');

      expect(manyVars.length).toBe(0);
    });
  });

  describe('empty story', () => {
    it('handles empty story gracefully', () => {
      const validator = new WlsQualityValidator();
      const story = new Story();

      const issues = validator.validate(story);
      expect(issues).toBeDefined();
    });
  });
});
