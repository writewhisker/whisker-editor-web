import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import ValidationPanel from './ValidationPanel.svelte';
import {
  validationResult,
  qualityMetrics,
  isValidating,
  autoValidate,
  validationActions,
} from '../../stores/validationStore';
import { currentStory } from '../../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';
import type { ValidationResult, QualityMetrics } from '@whisker/core-ts';

describe('ValidationPanel', () => {
  let story: Story;

  beforeEach(async () => {
    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Clear stores
    validationActions.clear();
    autoValidate.set(false);
    currentStory.set(story);
  });

  describe('rendering', () => {
    it('should render the validation panel', () => {
      const { getByText } = render(ValidationPanel);

      expect(getByText('Validation')).toBeTruthy();
    });

    it('should show validation status when no results', () => {
      const { getByText } = render(ValidationPanel);

      expect(getByText('No validation results')).toBeTruthy();
    });

    it('should render validate button', () => {
      const { getByText } = render(ValidationPanel);

      const button = getByText('Validate');
      expect(button).toBeTruthy();
    });

    it('should render auto checkbox', () => {
      const { getByLabelText } = render(ValidationPanel);

      const checkbox = getByLabelText('Auto') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');
    });
  });

  describe('validation status', () => {
    it('should show valid status when no errors', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: true,
        errorCount: 0,
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
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('✓ Valid')).toBeTruthy();
      });
    });

    it('should show invalid status when errors exist', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 2,
        warningCount: 1,
        infoCount: 0,
        issues: [
          {
            id: 'test1',
            severity: 'error',
            category: 'links',
            message: 'Test error',
            fixable: false,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('✗ Invalid')).toBeTruthy();
        expect(getByText('🔴 2')).toBeTruthy();
        expect(getByText('⚠️ 1')).toBeTruthy();
      });
    });

    it('should show validation duration', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 1234,
        valid: true,
        errorCount: 0,
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
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('1.23s')).toBeTruthy();
      });
    });
  });

  describe('tabs', () => {
    it('should render both tabs', () => {
      const { getByText } = render(ValidationPanel);

      expect(getByText(/Issues/)).toBeTruthy();
      expect(getByText(/Metrics/)).toBeTruthy();
    });

    it('should switch to metrics tab when clicked', async () => {
      const mockMetrics: QualityMetrics = {
        depth: 3,
        branchingFactor: 2.5,
        density: 0.4,
        totalPassages: 10,
        totalChoices: 25,
        totalVariables: 5,
        totalWords: 1000,
        avgWordsPerPassage: 100,
        uniqueEndings: 3,
        reachabilityScore: 90,
        conditionalComplexity: 20,
        variableComplexity: 1.5,
        estimatedPlayTime: 7,
        estimatedPaths: 12,
      };

      qualityMetrics.set(mockMetrics);

      const { getByText } = render(ValidationPanel);

      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        expect(getByText('Structure')).toBeTruthy();
        expect(getByText('Content')).toBeTruthy();
        expect(getByText('Complexity')).toBeTruthy();
      });
    });
  });

  describe('issues list', () => {
    it('should render issues when available', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 1,
        infoCount: 0,
        issues: [
          {
            id: 'error1',
            severity: 'error',
            category: 'links',
            message: 'Dead link in "Start"',
            description: 'Choice points to non-existent passage',
            passageTitle: 'Start',
            fixable: true,
          },
          {
            id: 'warning1',
            severity: 'warning',
            category: 'structure',
            message: 'Unreachable passage: "Hidden"',
            passageTitle: 'Hidden',
            fixable: true,
          },
        ],
        stats: {
          totalPassages: 2,
          reachablePassages: 1,
          unreachablePassages: 1,
          orphanedPassages: 0,
          deadLinks: 1,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('Dead link in "Start"')).toBeTruthy();
        expect(getByText('Unreachable passage: "Hidden"')).toBeTruthy();
      });
    });

    it('should show "No issues" when no issues found', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: true,
        errorCount: 0,
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
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('✓ No issues found')).toBeTruthy();
      });
    });

    it('should display fixable badge on fixable issues', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'fixable1',
            severity: 'error',
            category: 'links',
            message: 'Fixable issue',
            fixable: true,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('Fixable')).toBeTruthy();
      });
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 2,
        warningCount: 1,
        infoCount: 1,
        issues: [
          {
            id: 'error1',
            severity: 'error',
            category: 'links',
            message: 'Error 1',
            fixable: true,
          },
          {
            id: 'error2',
            severity: 'error',
            category: 'variables',
            message: 'Error 2',
            fixable: false,
          },
          {
            id: 'warning1',
            severity: 'warning',
            category: 'structure',
            message: 'Warning 1',
            fixable: true,
          },
          {
            id: 'info1',
            severity: 'info',
            category: 'quality',
            message: 'Info 1',
            fixable: false,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);
    });

    it('should filter by severity', async () => {
      const { getByText, queryByText, container } = render(ValidationPanel);

      // Select errors only
      const severitySelect = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(severitySelect, { target: { value: 'error' } });

      await waitFor(() => {
        expect(getByText('Error 1')).toBeTruthy();
        expect(getByText('Error 2')).toBeTruthy();
        expect(queryByText('Warning 1')).toBeNull();
        expect(queryByText('Info 1')).toBeNull();
      });
    });

    it('should filter by category', async () => {
      const { getByText, queryByText, container } = render(ValidationPanel);

      // Get the category select (second select)
      const selects = container.querySelectorAll('select');
      const categorySelect = selects[1] as HTMLSelectElement;
      await fireEvent.change(categorySelect, { target: { value: 'links' } });

      await waitFor(() => {
        expect(getByText('Error 1')).toBeTruthy();
        expect(queryByText('Error 2')).toBeNull();
      });
    });

    it('should filter by fixable only', async () => {
      const { getByText, queryByText, getByLabelText } = render(ValidationPanel);

      const fixableCheckbox = getByLabelText('Fixable only') as HTMLInputElement;
      await fireEvent.click(fixableCheckbox);

      await waitFor(() => {
        expect(getByText('Error 1')).toBeTruthy();
        expect(getByText('Warning 1')).toBeTruthy();
        expect(queryByText('Error 2')).toBeNull();
        expect(queryByText('Info 1')).toBeNull();
      });
    });
  });

  describe('metrics display', () => {
    it('should display quality metrics', async () => {
      const mockMetrics: QualityMetrics = {
        depth: 5,
        branchingFactor: 3.2,
        density: 0.45,
        totalPassages: 20,
        totalChoices: 64,
        totalVariables: 8,
        totalWords: 2500,
        avgWordsPerPassage: 125,
        uniqueEndings: 4,
        reachabilityScore: 95.5,
        conditionalComplexity: 30.5,
        variableComplexity: 2.1,
        estimatedPlayTime: 17,
        estimatedPaths: 128,
      };

      qualityMetrics.set(mockMetrics);

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        // Structure metrics
        expect(getByText('5')).toBeTruthy(); // depth
        expect(getByText('3.20')).toBeTruthy(); // branching factor

        // Content metrics
        expect(getByText('20')).toBeTruthy(); // passages
        expect(getByText('64')).toBeTruthy(); // choices
        expect(getByText('8')).toBeTruthy(); // variables
        expect(getByText('4')).toBeTruthy(); // endings

        // Estimates
        expect(getByText('17 min')).toBeTruthy(); // play time
      });
    });

    it('should show message when no metrics available', async () => {
      qualityMetrics.set(null);

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        expect(getByText('Run validation to see metrics')).toBeTruthy();
      });
    });
  });

  describe('actions', () => {
    it('should call validate when validate button clicked', async () => {
      const validateSpy = vi.spyOn(validationActions, 'validate');

      const { getByText } = render(ValidationPanel);

      const validateButton = getByText('Validate');
      await fireEvent.click(validateButton);

      expect(validateSpy).toHaveBeenCalled();
    });

    it('should toggle auto-validate when checkbox clicked', async () => {
      const setAutoValidateSpy = vi.spyOn(validationActions, 'setAutoValidate');

      const { getByLabelText } = render(ValidationPanel);

      const autoCheckbox = getByLabelText('Auto') as HTMLInputElement;
      await fireEvent.click(autoCheckbox);

      expect(setAutoValidateSpy).toHaveBeenCalledWith(true);
    });

    it('should show auto-fix button when fixable issues exist', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'fixable1',
            severity: 'error',
            category: 'links',
            message: 'Fixable issue',
            fixable: true,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText(/Auto-fix \(1\)/)).toBeTruthy();
      });
    });

    it('should not show auto-fix button when no fixable issues', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'unfixable1',
            severity: 'error',
            category: 'content',
            message: 'Unfixable issue',
            fixable: false,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { queryByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(queryByText(/Auto-fix/)).toBeNull();
      });
    });
  });

  describe('issue display details', () => {
    it('should show passage title in issue', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'error1',
            severity: 'error',
            category: 'links',
            message: 'Dead link',
            passageTitle: 'The Dark Forest',
            fixable: false,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('📄 The Dark Forest')).toBeTruthy();
      });
    });

    it('should show variable name in issue', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'var1',
            severity: 'error',
            category: 'variables',
            message: 'Undefined variable',
            variableName: 'player_health',
            fixable: true,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('🔢 player_health')).toBeTruthy();
      });
    });

    it('should show issue description', async () => {
      const mockResult: ValidationResult = {
        timestamp: Date.now(),
        duration: 50,
        valid: false,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issues: [
          {
            id: 'error1',
            severity: 'error',
            category: 'links',
            message: 'Dead link',
            description: 'This choice points to a passage that does not exist',
            fixable: false,
          },
        ],
        stats: {
          totalPassages: 1,
          reachablePassages: 1,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      };

      validationResult.set(mockResult);

      const { getByText } = render(ValidationPanel);

      await waitFor(() => {
        expect(getByText('This choice points to a passage that does not exist')).toBeTruthy();
      });
    });
  });

  describe('export functionality', () => {
    const mockResult: ValidationResult = {
      timestamp: Date.now(),
      duration: 50,
      valid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
      stats: {
        totalPassages: 5,
        reachablePassages: 5,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0,
      },
    };

    const mockMetrics: QualityMetrics = {
      depth: 3,
      branchingFactor: 2.5,
      density: 0.4,
      totalPassages: 5,
      totalChoices: 10,
      totalVariables: 3,
      totalWords: 500,
      avgWordsPerPassage: 100,
      uniqueEndings: 2,
      reachabilityScore: 100,
      conditionalComplexity: 20,
      variableComplexity: 1.5,
      estimatedPlayTime: 5,
      estimatedPaths: 4,
    };

    it('should show export buttons in metrics tab', async () => {
      validationResult.set(mockResult);
      qualityMetrics.set(mockMetrics);

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        expect(getByText('Export Report')).toBeTruthy();
        expect(getByText('JSON')).toBeTruthy();
        expect(getByText('CSV')).toBeTruthy();
        expect(getByText('Markdown')).toBeTruthy();
      });
    });

    it('should disable export buttons when no validation result', async () => {
      validationResult.set(null);
      qualityMetrics.set(null);

      const { getByText, container } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        expect(getByText('Run validation to see metrics')).toBeTruthy();
      });
    });

    it('should enable export buttons when validation result exists', async () => {
      validationResult.set(mockResult);
      qualityMetrics.set(mockMetrics);

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      await waitFor(() => {
        const jsonButton = getByText('JSON') as HTMLButtonElement;
        const csvButton = getByText('CSV') as HTMLButtonElement;
        const markdownButton = getByText('Markdown') as HTMLButtonElement;

        expect(jsonButton.disabled).toBe(false);
        expect(csvButton.disabled).toBe(false);
        expect(markdownButton.disabled).toBe(false);
      });
    });

    it('should call exportJSON when JSON button clicked', async () => {
      validationResult.set(mockResult);
      qualityMetrics.set(mockMetrics);

      const exportJSONSpy = vi.spyOn(validationActions, 'exportJSON');

      // Mock URL API
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      const jsonButton = getByText('JSON');
      await fireEvent.click(jsonButton);

      expect(exportJSONSpy).toHaveBeenCalled();
    });

    it('should call exportCSV when CSV button clicked', async () => {
      validationResult.set(mockResult);
      qualityMetrics.set(mockMetrics);

      const exportCSVSpy = vi.spyOn(validationActions, 'exportCSV');

      // Mock URL API
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      const csvButton = getByText('CSV');
      await fireEvent.click(csvButton);

      expect(exportCSVSpy).toHaveBeenCalled();
    });

    it('should call exportMarkdown when Markdown button clicked', async () => {
      validationResult.set(mockResult);
      qualityMetrics.set(mockMetrics);

      const exportMarkdownSpy = vi.spyOn(validationActions, 'exportMarkdown');

      // Mock URL API
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const { getByText } = render(ValidationPanel);

      // Switch to metrics tab
      const metricsTab = getByText(/Metrics/);
      await fireEvent.click(metricsTab);

      const markdownButton = getByText('Markdown');
      await fireEvent.click(markdownButton);

      expect(exportMarkdownSpy).toHaveBeenCalled();
    });
  });
});
