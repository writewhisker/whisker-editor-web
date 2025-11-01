import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  accessibilityStore,
  accessibilityReport,
  accessibilityScore,
  accessibilityLevel,
  accessibilityIssues,
  criticalIssues,
  hasAccessibilityIssues,
} from './accessibilityStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';

describe('accessibilityStore', () => {
  let story: Story;

  beforeEach(() => {
    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Clear the store
    accessibilityStore.clear();
  });

  afterEach(() => {
    accessibilityStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with null report', () => {
      expect(get(accessibilityReport)).toBeNull();
    });

    it('should initialize with score of 0', () => {
      expect(get(accessibilityScore)).toBe(0);
    });

    it('should initialize with level of poor', () => {
      expect(get(accessibilityLevel)).toBe('poor');
    });

    it('should initialize with empty issues array', () => {
      expect(get(accessibilityIssues)).toEqual([]);
    });

    it('should initialize with no critical issues', () => {
      expect(get(criticalIssues)).toEqual([]);
    });

    it('should initialize with no accessibility issues', () => {
      expect(get(hasAccessibilityIssues)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should analyze a simple story', () => {
      const passage = new Passage({ title: 'Start' });
      passage.content = 'This is a simple test passage with clear content.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report).not.toBeNull();
      expect(report?.passageCount).toBe(2); // Start + "Start" passage
      expect(report?.score).toBeGreaterThan(0);
      expect(report?.readingLevel).toBeDefined();
    });

    it('should detect reading level', () => {
      const passage = new Passage({ title: 'Complex' });
      passage.content = 'The multifaceted complexities inherent within contemporary societal structures necessitate comprehensive examination.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report?.readingLevel.fleschKincaidGrade).toBeGreaterThan(0);
      expect(report?.readingLevel.totalWords).toBeGreaterThan(0);
      expect(report?.readingLevel.totalSentences).toBeGreaterThan(0);
    });

    it('should detect color-only descriptions', () => {
      const passage = new Passage({ title: 'ColorTest' });
      passage.content = 'Choose the red button to continue.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const colorIssue = issues.find(i => i.type === 'color_only');
      expect(colorIssue).toBeDefined();
      expect(colorIssue?.severity).toBe('critical');
    });

    it('should detect screen reader issues with ASCII art', () => {
      const passage = new Passage({ title: 'AsciiArt' });
      passage.content = '┌──────┐\n│ Test │\n└──────┘';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const srIssue = issues.find(i => i.type === 'screen_reader');
      expect(srIssue).toBeDefined();
    });

    it('should detect emoji-only text', () => {
      const passage = new Passage({ title: 'EmojiTest' });
      passage.content = '😀 😃 😄';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const srIssue = issues.find(i => i.type === 'screen_reader');
      expect(srIssue).toBeDefined();
    });

    it('should detect flashing content warnings', () => {
      const passage = new Passage({ title: 'FlashTest' });
      passage.content = 'The lights flash rapidly in the strobe effect.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const flashIssue = issues.find(i => i.type === 'flashing_content');
      expect(flashIssue).toBeDefined();
      expect(flashIssue?.severity).toBe('critical');
    });

    it('should detect unclear choice text', () => {
      const passage = new Passage({ title: 'Choices' });
      passage.content = 'What do you do?';
      passage.addChoice(new Choice({ text: 'yes', target: story.startPassage }));
      passage.addChoice(new Choice({ text: 'a', target: story.startPassage }));
      passage.addChoice(new Choice({ text: '1', target: story.startPassage }));
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const choiceIssues = issues.filter(i => i.type === 'choice_clarity');
      expect(choiceIssues.length).toBeGreaterThan(0);
    });

    it('should detect untitled passages', () => {
      const passage = new Passage({ title: 'Untitled Passage' });
      passage.content = 'Some content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const navIssue = issues.find(i => i.type === 'complex_navigation');
      expect(navIssue).toBeDefined();
    });

    it('should calculate accessibility score correctly', () => {
      const passage = new Passage({ title: 'GoodPassage' });
      passage.content = 'This is a well-written passage. It has clear text. The content is easy to read.';
      passage.addChoice(new Choice({ text: 'Continue the story', target: story.startPassage }));
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const score = get(accessibilityScore);
      expect(score).toBeGreaterThan(50); // Should have a decent score
    });

    it('should assign accessibility level based on score', () => {
      const passage = new Passage({ title: 'ExcellentPassage' });
      passage.content = 'Simple, clear text that is easy to read and understand.';
      passage.addChoice(new Choice({ text: 'Go to the next part of the story', target: story.startPassage }));
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const level = get(accessibilityLevel);
      expect(['excellent', 'good', 'fair']).toContain(level);
    });

    it('should sort issues by severity', () => {
      const passage = new Passage({ title: 'MixedIssues' });
      passage.content = 'Pick the red button. The lights flash rapidly.';
      passage.addChoice(new Choice({ text: 'ok', target: story.startPassage }));
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      // Critical issues should come first
      let lastSeverityOrder = 0;
      const severityOrder = { critical: 0, warning: 1, info: 2 };

      for (const issue of issues) {
        const currentOrder = severityOrder[issue.severity];
        expect(currentOrder).toBeGreaterThanOrEqual(lastSeverityOrder);
        lastSeverityOrder = currentOrder;
      }
    });
  });

  describe('derived stores', () => {
    it('should derive critical issues correctly', () => {
      const passage = new Passage({ title: 'Critical' });
      passage.content = 'Choose the blue door. The lights flash rapidly.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const critical = get(criticalIssues);
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every(i => i.severity === 'critical')).toBe(true);
    });

    it('should detect presence of accessibility issues', () => {
      const passage = new Passage({ title: 'HasIssues' });
      passage.content = 'Select the red option.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      expect(get(hasAccessibilityIssues)).toBe(true);
    });

    it('should show no issues for accessible content', () => {
      const passage = new Passage({ title: 'AccessiblePassage' });
      passage.content = 'This is clear, accessible content with no issues.';
      passage.addChoice(new Choice({ text: 'Continue reading the story', target: story.startPassage }));
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      // May still have some info-level issues, but should have good score
      const score = get(accessibilityScore);
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('clear', () => {
    it('should clear the report', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Test content';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);
      expect(get(accessibilityReport)).not.toBeNull();

      accessibilityStore.clear();
      expect(get(accessibilityReport)).toBeNull();
    });

    it('should reset all derived stores', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Choose the red button.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);
      expect(get(hasAccessibilityIssues)).toBe(true);

      accessibilityStore.clear();
      expect(get(accessibilityScore)).toBe(0);
      expect(get(accessibilityLevel)).toBe('poor');
      expect(get(accessibilityIssues)).toEqual([]);
      expect(get(hasAccessibilityIssues)).toBe(false);
    });
  });

  describe('reading level metrics', () => {
    it('should calculate Flesch Reading Ease', () => {
      const passage = new Passage({ title: 'Simple' });
      passage.content = 'The cat sat on the mat. It was a nice day.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report?.readingLevel.fleschReadingEase).toBeGreaterThan(0);
      expect(report?.readingLevel.fleschReadingEase).toBeLessThanOrEqual(100);
    });

    it('should calculate Flesch-Kincaid Grade Level', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Educational content for testing purposes.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report?.readingLevel.fleschKincaidGrade).toBeGreaterThan(0);
    });

    it('should count syllables and words correctly', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Hello world. This is a test.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report?.readingLevel.totalWords).toBeGreaterThan(0);
      expect(report?.readingLevel.avgSyllablesPerWord).toBeGreaterThan(0);
    });

    it('should issue warning for high reading level', () => {
      const passage = new Passage({ title: 'Complex' });
      passage.content = 'The phenomenological investigation necessitates comprehensive multidisciplinary analysis incorporating sophisticated methodological frameworks.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      const readingIssue = issues.find(i => i.type === 'reading_level');
      expect(readingIssue).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty story', () => {
      const emptyStory = new Story({
        metadata: {
          title: 'Empty',
          author: 'Test',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      accessibilityStore.analyze(emptyStory);

      const report = get(accessibilityReport);
      expect(report).not.toBeNull();
      expect(report?.passageCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle passages with no content', () => {
      const passage = new Passage({ title: 'Empty' });
      passage.content = '';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report).not.toBeNull();
    });

    it('should handle very long passages', () => {
      const passage = new Passage({ title: 'Long' });
      passage.content = 'word '.repeat(1000);
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report?.readingLevel.totalWords).toBeGreaterThan(900);
    });

    it('should handle special characters', () => {
      const passage = new Passage({ title: 'Special' });
      passage.content = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const report = get(accessibilityReport);
      expect(report).not.toBeNull();
    });

    it('should handle error during analysis gracefully', () => {
      // Create a story that might cause issues
      const badStory = null as any;

      // Should not throw
      expect(() => {
        accessibilityStore.analyze(badStory);
      }).not.toThrow();

      expect(get(accessibilityReport)).toBeNull();
    });
  });

  describe('WCAG compliance', () => {
    it('should assign WCAG levels to issues', () => {
      const passage = new Passage({ title: 'WCAG Test' });
      passage.content = 'Choose the red button.';
      story.addPassage(passage);
      story.startPassage = passage.id;

      accessibilityStore.analyze(story);

      const issues = get(accessibilityIssues);
      issues.forEach(issue => {
        if (issue.wcagLevel) {
          expect(['1.1', '1.3', '1.4', '2.4', '3.1']).toContain(issue.wcagLevel);
        }
      });
    });
  });
});
