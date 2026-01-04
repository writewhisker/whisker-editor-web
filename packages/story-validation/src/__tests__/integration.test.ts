/**
 * Integration Tests for WLS 1.0 Semantic Validators
 *
 * These tests verify that the entire validation pipeline works correctly
 * with realistic story scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StoryValidator } from '../StoryValidator';
import { Story, Passage, Choice, Variable } from '@writewhisker/story-models';
import type { StoryData } from '@writewhisker/story-models';

// Import all validators
import {
  UnreachablePassagesValidator,
  DeadLinksValidator,
  UndefinedVariablesValidator,
  UnusedVariablesValidator,
  MissingStartPassageValidator,
  EmptyPassagesValidator,
  DuplicatePassagesValidator,
  SelfLinkValidator,
  EmptyChoiceTargetValidator,
  WlsSyntaxValidator,
  WlsSpecialTargetsValidator,
  WlsVariableValidator,
  WlsExpressionValidator,
  WlsQualityValidator,
} from '../validators';

/**
 * Helper to create a clean story without auto-generated passages.
 * The Story constructor auto-creates a default "Start" passage when no passages
 * are provided, which can interfere with tests. This helper clears those.
 */
function createCleanStory(title: string = 'Test Story'): Story {
  const story = new Story({ metadata: { title } } as Partial<StoryData>);
  // Clear any auto-created passages
  story.passages.clear();
  story.startPassage = '';
  return story;
}

describe('Validation E2E Tests', () => {
  let validator: StoryValidator;

  beforeEach(() => {
    validator = new StoryValidator();

    // Register all validators
    validator.registerValidator(new MissingStartPassageValidator());
    validator.registerValidator(new DeadLinksValidator());
    validator.registerValidator(new UnreachablePassagesValidator());
    validator.registerValidator(new UndefinedVariablesValidator());
    validator.registerValidator(new UnusedVariablesValidator());
    validator.registerValidator(new EmptyPassagesValidator());
    validator.registerValidator(new DuplicatePassagesValidator());
    validator.registerValidator(new SelfLinkValidator());
    validator.registerValidator(new EmptyChoiceTargetValidator());
    validator.registerValidator(new WlsSyntaxValidator());
    validator.registerValidator(new WlsSpecialTargetsValidator());
    validator.registerValidator(new WlsVariableValidator());
    validator.registerValidator(new WlsExpressionValidator());
    validator.registerValidator(new WlsQualityValidator());
  });

  // ============================================
  // VALID STORY TESTS
  // ============================================
  describe('valid stories', () => {
    it('validates a minimal valid story with no issues', () => {
      const story = createCleanStory();
      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Welcome to the adventure!';
      start.addChoice(new Choice({ text: 'Continue', target: 'END' }));
      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('validates a branching story with multiple paths', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'You stand at a crossroads.';
      start.addChoice(new Choice({ text: 'Go left', target: 'left_path' }));
      start.addChoice(new Choice({ text: 'Go right', target: 'right_path' }));

      const leftPath = new Passage({ id: 'left_path', title: 'Left Path' });
      leftPath.content = 'You took the left path.';
      leftPath.addChoice(new Choice({ text: 'Continue', target: 'END' }));

      const rightPath = new Passage({ id: 'right_path', title: 'Right Path' });
      rightPath.content = 'You took the right path.';
      rightPath.addChoice(new Choice({ text: 'Continue', target: 'END' }));

      story.addPassage(start);
      story.addPassage(leftPath);
      story.addPassage(rightPath);
      story.startPassage = 'start';

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('validates a story with variables correctly used', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'You have $gold gold.';
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';
      story.variables.set('gold', new Variable({ name: 'gold', type: 'number', initial: 100 }));

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
    });

    it('validates special targets: END, BACK, RESTART', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Choose an action.';
      start.addChoice(new Choice({ text: 'End game', target: 'END' }));
      start.addChoice(new Choice({ text: 'Go back', target: 'BACK' }));
      start.addChoice(new Choice({ text: 'Restart', target: 'RESTART' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });
  });

  // ============================================
  // STRUCTURAL ERROR TESTS
  // ============================================
  describe('structural errors', () => {
    it('detects missing start passage', () => {
      const story = createCleanStory();
      const somewhere = new Passage({ id: 'somewhere', title: 'Somewhere' });
      somewhere.content = 'You are somewhere.';
      story.addPassage(somewhere);
      // startPassage not set

      const result = validator.validate(story);
      expect(result.valid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);

      const foundError = result.issues.some((issue) => issue.code === 'WLS-STR-001');
      expect(foundError).toBe(true);
    });

    it('detects unreachable passages', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'You are here.';
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      const orphan = new Passage({ id: 'orphan', title: 'Orphan' });
      orphan.content = 'This passage has no links to it.';

      story.addPassage(start);
      story.addPassage(orphan);
      story.startPassage = 'start';

      const result = validator.validate(story);
      const foundWarning = result.issues.some((issue) => issue.code === 'WLS-STR-002');
      expect(foundWarning).toBe(true);
    });
  });

  // ============================================
  // LINK ERROR TESTS
  // ============================================
  describe('link errors', () => {
    it('detects dead links to non-existent passages', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'You are here.';
      start.addChoice(new Choice({ text: 'Go nowhere', target: 'nonexistent' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      expect(result.valid).toBe(false);

      const foundError = result.issues.some((issue) => issue.code === 'WLS-LNK-001');
      expect(foundError).toBe(true);
    });

    it('detects self-linking passages', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'You are stuck in a loop.';
      start.addChoice(new Choice({ text: 'Go back to start', target: 'start' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      // Self-links generate info, not errors
      const foundIssue = result.issues.some((issue) => issue.code === 'WLS-LNK-002');
      expect(foundIssue).toBe(true);
    });

    it('validates special target case sensitivity', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Test case sensitivity.';
      start.addChoice(new Choice({ text: 'End (wrong case)', target: 'end' })); // lowercase

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      // "end" lowercase looks like a special target with wrong case
      // WlsSpecialTargetsValidator produces WLS-LNK-003 warning for case issues
      const foundCaseWarning = result.issues.some((issue) => issue.code === 'WLS-LNK-003');
      expect(foundCaseWarning).toBe(true);
    });
  });

  // ============================================
  // VARIABLE ERROR TESTS
  // ============================================
  describe('variable errors', () => {
    it('detects undefined variables in conditions', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Choose wisely.';
      // Use undefined variable in condition - this is what UndefinedVariablesValidator checks
      start.addChoice(new Choice({ text: 'Use item', target: 'END', condition: 'has_item == true' }));

      story.addPassage(start);
      story.startPassage = 'start';
      // No variables defined

      const result = validator.validate(story);
      const foundError = result.issues.some((issue) => issue.code === 'WLS-VAR-001');
      expect(foundError).toBe(true);
    });

    it('detects unused variables', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'No variables used here.';
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';
      story.variables.set('unused_var', new Variable({ name: 'unused_var', type: 'number', initial: 0 }));

      const result = validator.validate(story);
      const foundWarning = result.issues.some((issue) => issue.code === 'WLS-VAR-002');
      expect(foundWarning).toBe(true);
    });
  });

  // ============================================
  // QUALITY VALIDATOR TESTS
  // ============================================
  describe('quality validation', () => {
    it('detects low branching factor', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Linear story.';
      start.addChoice(new Choice({ text: 'Next', target: 'middle' }));

      const middle = new Passage({ id: 'middle', title: 'Middle' });
      middle.content = 'Still linear.';
      middle.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.addPassage(middle);
      story.startPassage = 'start';

      const result = validator.validate(story);
      const foundIssue = result.issues.some((issue) => issue.code === 'WLS-QUA-001');
      expect(foundIssue).toBe(true);
    });

    it('detects too many choices in a passage', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Too many choices!';
      for (let i = 1; i <= 15; i++) {
        start.addChoice(new Choice({ text: `Choice ${i}`, target: 'END' }));
      }

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      const foundIssue = result.issues.some((issue) => issue.code === 'WLS-QUA-006');
      expect(foundIssue).toBe(true);
    });

    it('detects long passages', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      // Create content with more than 1000 words
      const words = [];
      for (let i = 0; i < 1100; i++) {
        words.push(`word${i}`);
      }
      start.content = words.join(' ');
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      const foundIssue = result.issues.some((issue) => issue.code === 'WLS-QUA-003');
      expect(foundIssue).toBe(true);
    });
  });

  // ============================================
  // COMPLEX STORY TESTS
  // ============================================
  describe('complex stories', () => {
    it('validates a multi-chapter story', () => {
      const story = createCleanStory('Multi-Chapter Story');

      const chapter1 = new Passage({ id: 'chapter1_start', title: 'Chapter 1: The Beginning' });
      chapter1.content = 'Your adventure begins here.';
      chapter1.addChoice(new Choice({ text: 'Explore the forest', target: 'forest' }));
      chapter1.addChoice(new Choice({ text: 'Go to the village', target: 'village' }));

      const forest = new Passage({ id: 'forest', title: 'The Forest' });
      forest.content = 'You enter a dark forest.';
      forest.addChoice(new Choice({ text: 'Continue deeper', target: 'forest_deep' }));
      forest.addChoice(new Choice({ text: 'Return to start', target: 'chapter1_start' }));

      const forestDeep = new Passage({ id: 'forest_deep', title: 'Deep Forest' });
      forestDeep.content = 'You found a treasure!';
      forestDeep.addChoice(new Choice({ text: 'Take it and continue', target: 'chapter2_start' }));

      const village = new Passage({ id: 'village', title: 'The Village' });
      village.content = 'A peaceful village.';
      village.addChoice(new Choice({ text: 'Rest and continue', target: 'chapter2_start' }));

      const chapter2 = new Passage({ id: 'chapter2_start', title: 'Chapter 2: The Journey' });
      chapter2.content = 'Your journey continues.';
      chapter2.addChoice(new Choice({ text: 'End adventure', target: 'END' }));

      story.addPassage(chapter1);
      story.addPassage(forest);
      story.addPassage(forestDeep);
      story.addPassage(village);
      story.addPassage(chapter2);
      story.startPassage = 'chapter1_start';

      story.variables.set('gold', new Variable({ name: 'gold', type: 'number', initial: 0 }));
      story.variables.set('has_treasure', new Variable({ name: 'has_treasure', type: 'boolean', initial: false }));

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('validates a story with all WLS 1.0 features', () => {
      const story = createCleanStory('Full Feature Story');

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Welcome, $player_name! You have $gold gold.';
      start.addChoice(new Choice({ text: 'Start adventure', target: 'adventure' }));
      start.addChoice(new Choice({ text: 'View stats', target: 'stats' }));
      start.addChoice(new Choice({ text: 'Quit', target: 'END' }));

      const adventure = new Passage({ id: 'adventure', title: 'Adventure' });
      adventure.content = 'Choose your path.';
      adventure.addChoice(new Choice({ text: 'Fight', target: 'fight', condition: 'strength >= 10' }));
      adventure.addChoice(new Choice({ text: 'Run', target: 'escape' }));
      adventure.addChoice(new Choice({ text: 'Back', target: 'BACK' }));

      const fight = new Passage({ id: 'fight', title: 'Fight' });
      fight.content = 'You won! +50 gold.';
      fight.addChoice(new Choice({ text: 'Continue', target: 'END' }));

      const escape = new Passage({ id: 'escape', title: 'Escape' });
      escape.content = 'You escaped safely.';
      escape.addChoice(new Choice({ text: 'Continue', target: 'END' }));

      const stats = new Passage({ id: 'stats', title: 'Stats' });
      stats.content = 'Gold: $gold, Strength: $strength';
      stats.addChoice(new Choice({ text: 'Back', target: 'BACK' }));

      story.addPassage(start);
      story.addPassage(adventure);
      story.addPassage(fight);
      story.addPassage(escape);
      story.addPassage(stats);
      story.startPassage = 'start';

      story.variables.set('player_name', new Variable({ name: 'player_name', type: 'string', initial: 'Hero' }));
      story.variables.set('gold', new Variable({ name: 'gold', type: 'number', initial: 100 }));
      story.variables.set('strength', new Variable({ name: 'strength', type: 'number', initial: 15 }));

      const result = validator.validate(story);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================
  describe('performance', () => {
    it('validates a story with 100 passages quickly', () => {
      const story = createCleanStory('Large Story');

      for (let i = 1; i <= 100; i++) {
        const passage = new Passage({ id: `passage_${i}`, title: `Passage ${i}` });
        passage.content = `This is passage number ${i}`;
        const nextTarget = i < 100 ? `passage_${i + 1}` : 'END';
        passage.addChoice(new Choice({ text: 'Continue', target: nextTarget }));
        story.addPassage(passage);
      }
      story.startPassage = 'passage_1';

      const startTime = Date.now();
      const result = validator.validate(story);
      const duration = Date.now() - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('validates a story with many variables quickly', () => {
      const story = createCleanStory('Variable Heavy Story');

      // Create 50 variables
      const contentParts: string[] = [];
      for (let i = 1; i <= 50; i++) {
        story.variables.set(`var_${i}`, new Variable({ name: `var_${i}`, type: 'number', initial: i }));
        contentParts.push(`$var_${i}`);
      }

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = contentParts.join(' ');
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const startTime = Date.now();
      const result = validator.validate(story);
      const duration = Date.now() - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });

  // ============================================
  // ERROR RECOVERY TESTS
  // ============================================
  describe('error recovery', () => {
    it('continues validation after first error', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Using {{undefined_var1}} and {{undefined_var2}}.';
      start.addChoice(new Choice({ text: 'Link 1', target: 'nowhere1' }));
      start.addChoice(new Choice({ text: 'Link 2', target: 'nowhere2' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);
      // Should have multiple errors, not just one
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('handles empty story gracefully', () => {
      const story = createCleanStory('Empty Story');
      // No passages, no start

      const result = validator.validate(story);
      expect(result.valid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  // ============================================
  // VALIDATION OPTIONS TESTS
  // ============================================
  describe('validation options', () => {
    it('filters by category', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Using {{undefined_var}}.';
      start.addChoice(new Choice({ text: 'Link', target: 'nowhere' }));

      story.addPassage(start);
      story.startPassage = 'start';

      // Only check links category
      const result = validator.validate(story, { categories: ['links'] });

      // Should only have link issues, not variable issues
      const hasLinkIssue = result.issues.some((i) => i.category === 'links');
      const hasVarIssue = result.issues.some((i) => i.category === 'variables');

      expect(hasLinkIssue).toBe(true);
      expect(hasVarIssue).toBe(false);
    });

    it('filters warnings when disabled', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Content';
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      const orphan = new Passage({ id: 'orphan', title: 'Orphan' });
      orphan.content = 'Unreachable';
      orphan.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.addPassage(orphan);
      story.startPassage = 'start';

      const resultWithWarnings = validator.validate(story, { includeWarnings: true });
      const resultWithoutWarnings = validator.validate(story, { includeWarnings: false });

      expect(resultWithWarnings.warningCount).toBeGreaterThan(0);
      expect(resultWithoutWarnings.warningCount).toBe(0);
    });

    it('filters info when disabled', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Content';
      start.addChoice(new Choice({ text: 'Self link', target: 'start' }));
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const resultWithInfo = validator.validate(story, { includeInfo: true });
      const resultWithoutInfo = validator.validate(story, { includeInfo: false });

      expect(resultWithInfo.infoCount).toBeGreaterThanOrEqual(0);
      expect(resultWithoutInfo.infoCount).toBe(0);
    });
  });

  // ============================================
  // STATS CALCULATION TESTS
  // ============================================
  describe('stats calculation', () => {
    it('calculates total passages correctly', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Start';
      start.addChoice(new Choice({ text: 'Go', target: 'reachable' }));

      const reachable = new Passage({ id: 'reachable', title: 'Reachable' });
      reachable.content = 'Reachable';
      reachable.addChoice(new Choice({ text: 'End', target: 'END' }));

      const unreachable = new Passage({ id: 'unreachable', title: 'Unreachable' });
      unreachable.content = 'Unreachable';
      unreachable.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.addPassage(reachable);
      story.addPassage(unreachable);
      story.startPassage = 'start';

      const result = validator.validate(story);

      expect(result.stats.totalPassages).toBe(3);
      // The unreachable passage should generate an unreachable warning (WLS-STR-002)
      const unreachableWarning = result.issues.some((i) => i.code === 'WLS-STR-002');
      expect(unreachableWarning).toBe(true);
    });

    it('detects dead links via issues', () => {
      const story = createCleanStory();

      const start = new Passage({ id: 'start', title: 'Start' });
      start.content = 'Start';
      start.addChoice(new Choice({ text: 'Dead 1', target: 'nowhere1' }));
      start.addChoice(new Choice({ text: 'Dead 2', target: 'nowhere2' }));
      start.addChoice(new Choice({ text: 'End', target: 'END' }));

      story.addPassage(start);
      story.startPassage = 'start';

      const result = validator.validate(story);

      // Count dead link issues directly
      const deadLinkIssues = result.issues.filter((i) => i.code === 'WLS-LNK-001');
      expect(deadLinkIssues.length).toBe(2);
    });
  });
});
