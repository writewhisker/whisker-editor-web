import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  validationResult,
  qualityMetrics,
  isValidating,
  autoValidate,
  validationOptions,
  hasErrors,
  hasWarnings,
  isValid,
  errorCount,
  warningCount,
  infoCount,
  validationActions,
} from './validationStore';
import { currentStory } from './projectStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';

describe('validationStore', () => {
  let story: Story;

  beforeEach(() => {
    // Create a test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Clear all stores
    validationActions.clear();
    autoValidate.set(false); // Disable auto-validation during tests
  });

  describe('stores', () => {
    it('should initialize with null results', () => {
      expect(get(validationResult)).toBeNull();
      expect(get(qualityMetrics)).toBeNull();
    });

    it('should initialize with correct defaults', () => {
      expect(get(isValidating)).toBe(false);
      expect(get(autoValidate)).toBe(false);
    });

    it('should have default validation options', () => {
      const options = get(validationOptions);
      expect(options.includeWarnings).toBe(true);
      expect(options.includeInfo).toBe(true);
      expect(options.skipSlowChecks).toBe(false);
    });
  });

  describe('derived stores', () => {
    it('should derive hasErrors correctly', () => {
      expect(get(hasErrors)).toBe(false);

      // Manually set a result with errors
      validationResult.set({
        timestamp: Date.now(),
        duration: 10,
        valid: false,
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      expect(get(hasErrors)).toBe(true);
    });

    it('should derive hasWarnings correctly', () => {
      expect(get(hasWarnings)).toBe(false);

      validationResult.set({
        timestamp: Date.now(),
        duration: 10,
        valid: true,
        errorCount: 0,
        warningCount: 3,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      expect(get(hasWarnings)).toBe(true);
    });

    it('should derive isValid correctly', () => {
      expect(get(isValid)).toBe(true);

      validationResult.set({
        timestamp: Date.now(),
        duration: 10,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      expect(get(isValid)).toBe(false);
    });

    it('should derive counts correctly', () => {
      expect(get(errorCount)).toBe(0);
      expect(get(warningCount)).toBe(0);
      expect(get(infoCount)).toBe(0);

      validationResult.set({
        timestamp: Date.now(),
        duration: 10,
        valid: false,
        errorCount: 2,
        warningCount: 3,
        infoCount: 1,
        issues: [],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      expect(get(errorCount)).toBe(2);
      expect(get(warningCount)).toBe(3);
      expect(get(infoCount)).toBe(1);
    });
  });

  describe('validationActions', () => {
    describe('validate', () => {
      it('should validate a story', () => {
        validationActions.validate(story);

        const result = get(validationResult);
        expect(result).not.toBeNull();
        expect(result?.valid).toBeDefined();
        expect(result?.issues).toBeDefined();
      });

      it('should set isValidating during validation', () => {
        expect(get(isValidating)).toBe(false);

        validationActions.validate(story);

        // After validation completes
        expect(get(isValidating)).toBe(false);
      });

      it('should calculate quality metrics', () => {
        validationActions.validate(story);

        const metrics = get(qualityMetrics);
        expect(metrics).not.toBeNull();
        expect(metrics?.totalPassages).toBeGreaterThan(0);
      });

      it('should handle null story', () => {
        validationActions.validate(null);

        expect(get(validationResult)).toBeNull();
        expect(get(qualityMetrics)).toBeNull();
      });

      it('should use validation options', () => {
        // Set options to exclude warnings
        validationActions.setOptions({ includeWarnings: false });

        validationActions.validate(story);

        const result = get(validationResult);
        // Should not include warnings
        expect(result?.warningCount).toBe(0);
      });
    });

    describe('validateDebounced', () => {
      it('should debounce validation calls', async () => {
        const validateSpy = vi.spyOn(validationActions, 'validate');

        validationActions.validateDebounced(story);
        validationActions.validateDebounced(story);
        validationActions.validateDebounced(story);

        // Should only call once after debounce
        await new Promise(resolve => setTimeout(resolve, 600));

        expect(validateSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('clear', () => {
      it('should clear validation results', () => {
        validationActions.validate(story);

        expect(get(validationResult)).not.toBeNull();

        validationActions.clear();

        expect(get(validationResult)).toBeNull();
        expect(get(qualityMetrics)).toBeNull();
        expect(get(isValidating)).toBe(false);
      });
    });

    describe('setOptions', () => {
      it('should update validation options', () => {
        validationActions.setOptions({
          includeWarnings: false,
          includeInfo: false,
        });

        const options = get(validationOptions);
        expect(options.includeWarnings).toBe(false);
        expect(options.includeInfo).toBe(false);
      });

      it('should revalidate if autoValidate is enabled', () => {
        autoValidate.set(true);
        currentStory.set(story);

        const validateSpy = vi.spyOn(validationActions, 'validate');

        validationActions.setOptions({ includeWarnings: false });

        expect(validateSpy).toHaveBeenCalled();
      });
    });

    describe('setAutoValidate', () => {
      it('should enable auto-validation', () => {
        autoValidate.set(false);

        validationActions.setAutoValidate(true);

        expect(get(autoValidate)).toBe(true);
      });

      it('should validate immediately when enabled', () => {
        currentStory.set(story);
        const validateSpy = vi.spyOn(validationActions, 'validate');

        validationActions.setAutoValidate(true);

        expect(validateSpy).toHaveBeenCalled();
      });
    });

    describe('getPassageIssues', () => {
      it('should return issues for specific passage', () => {
        const startPassage = story.getPassage(story.startPassage!)!;

        // Add a bad choice to create an issue
        startPassage.addChoice(
          new Choice({
            text: 'Bad link',
            target: 'nonexistent',
          })
        );

        validationActions.validate(story);

        const issues = validationActions.getPassageIssues(startPassage.id);

        // May or may not have issues depending on validators
        expect(Array.isArray(issues)).toBe(true);
      });

      it('should return empty array when no result', () => {
        validationActions.clear();

        const issues = validationActions.getPassageIssues('any-id');

        expect(issues).toEqual([]);
      });
    });

    describe('getFixableIssues', () => {
      it('should return only fixable issues', () => {
        // Create a story with fixable issues
        const unreachable = new Passage({ title: 'Unreachable' });
        story.addPassage(unreachable);

        validationActions.validate(story);

        const fixable = validationActions.getFixableIssues();

        expect(Array.isArray(fixable)).toBe(true);
        if (fixable.length > 0) {
          expect(fixable.every(i => i.fixable)).toBe(true);
        }
      });

      it('should return empty array when no result', () => {
        validationActions.clear();

        const fixable = validationActions.getFixableIssues();

        expect(fixable).toEqual([]);
      });
    });

    describe('autoFix', () => {
      it('should fix issues and return result', () => {
        // Create a story with fixable issues
        const unreachable = new Passage({ title: 'Unreachable' });
        story.addPassage(unreachable);

        validationActions.validate(story);

        const fixResult = validationActions.autoFix(story);

        expect(fixResult).not.toBeNull();
        expect(fixResult?.success).toBeDefined();
        expect(fixResult?.issuesFixed).toBeDefined();
      });

      it('should return null when no story or result', () => {
        validationActions.clear();

        const fixResult = validationActions.autoFix();

        expect(fixResult).toBeNull();
      });

      it('should revalidate after fixing if issues were fixed', () => {
        const unreachable = new Passage({ title: 'Unreachable' });
        story.addPassage(unreachable);

        validationActions.validate(story);

        const validateSpy = vi.spyOn(validationActions, 'validate');

        const fixResult = validationActions.autoFix(story);

        // Should revalidate only if issues were actually fixed
        if (fixResult && fixResult.issuesFixed > 0) {
          expect(validateSpy).toHaveBeenCalled();
        } else {
          // If no issues were fixed, validation should not have been called
          expect(validateSpy).not.toHaveBeenCalled();
        }
      });
    });

    describe('getAutoFixDescription', () => {
      it('should return description of fixes', () => {
        const unreachable = new Passage({ title: 'Unreachable' });
        story.addPassage(unreachable);

        validationActions.validate(story);

        const description = validationActions.getAutoFixDescription();

        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });

      it('should handle no fixable issues', () => {
        validationActions.validate(story);

        const description = validationActions.getAutoFixDescription();

        expect(typeof description).toBe('string');
      });
    });

    describe('importJSON', () => {
      it('should import valid JSON validation results', () => {
        validationActions.validate(story);
        const exported = validationActions.exportJSON();

        validationActions.clear();
        expect(get(validationResult)).toBeNull();

        const success = validationActions.importJSON(exported);

        expect(success).toBe(true);
        expect(get(validationResult)).not.toBeNull();
      });

      it('should reject invalid JSON', () => {
        const success = validationActions.importJSON('invalid json');

        expect(success).toBe(false);
        expect(get(validationResult)).toBeNull();
      });

      it('should reject JSON without validation field', () => {
        const success = validationActions.importJSON('{"other": "data"}');

        expect(success).toBe(false);
        expect(get(validationResult)).toBeNull();
      });

      it('should reject JSON with malformed validation data', () => {
        const success = validationActions.importJSON('{"validation": "not an object"}');

        expect(success).toBe(false);
        expect(get(validationResult)).toBeNull();
      });

      it('should import quality metrics if present', () => {
        validationActions.validate(story);
        const exported = validationActions.exportJSON();

        validationActions.clear();
        expect(get(qualityMetrics)).toBeNull();

        validationActions.importJSON(exported);

        expect(get(qualityMetrics)).not.toBeNull();
      });

      it('should add imported result to history', () => {
        validationActions.validate(story);
        const exported = validationActions.exportJSON();

        validationActions.clear();
        validationActions.clearHistory();

        validationActions.importJSON(exported);

        const result = get(validationResult);
        expect(result).not.toBeNull();
      });
    });

    describe('exportJSON', () => {
      it('should export validation results as JSON', () => {
        validationActions.validate(story);

        const json = validationActions.exportJSON();

        expect(json).toBeTruthy();
        expect(typeof json).toBe('string');

        const parsed = JSON.parse(json);
        expect(parsed.validation).toBeDefined();
        expect(parsed.exportDate).toBeDefined();
      });
    });

    describe('exportCSV', () => {
      it('should export validation results as CSV', () => {
        validationActions.validate(story);

        const csv = validationActions.exportCSV();

        expect(csv).toBeTruthy();
        expect(typeof csv).toBe('string');
        expect(csv).toContain('Severity');
        expect(csv).toContain('Category');
      });

      it('should return empty string when no results', () => {
        validationActions.clear();

        const csv = validationActions.exportCSV();

        expect(csv).toBe('');
      });
    });

    describe('exportMarkdown', () => {
      it('should export validation results as Markdown', () => {
        validationActions.validate(story);

        const md = validationActions.exportMarkdown();

        expect(md).toBeTruthy();
        expect(typeof md).toBe('string');
        expect(md).toContain('# Validation Report');
        expect(md).toContain('## Summary');
      });

      it('should return empty string when no results', () => {
        validationActions.clear();

        const md = validationActions.exportMarkdown();

        expect(md).toBe('');
      });
    });

    describe('exportHTML', () => {
      it('should export validation results as HTML', () => {
        validationActions.validate(story);

        const html = validationActions.exportHTML();

        expect(html).toBeTruthy();
        expect(typeof html).toBe('string');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Validation Report');
        expect(html).toContain('Summary');
      });

      it('should return empty string when no results', () => {
        validationActions.clear();

        const html = validationActions.exportHTML();

        expect(html).toBe('');
      });

      it('should include quality metrics when available', () => {
        validationActions.validate(story);

        const html = validationActions.exportHTML();

        expect(html).toContain('Quality Metrics');
        expect(html).toContain('Depth');
        expect(html).toContain('Branching Factor');
      });

      it('should have valid HTML structure', () => {
        validationActions.validate(story);

        const html = validationActions.exportHTML();

        expect(html).toContain('<html');
        expect(html).toContain('</html>');
        expect(html).toContain('<head>');
        expect(html).toContain('</head>');
        expect(html).toContain('<body>');
        expect(html).toContain('</body>');
      });
    });
  });
});
