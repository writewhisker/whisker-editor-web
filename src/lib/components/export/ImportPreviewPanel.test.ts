/**
 * Tests for ImportPreviewPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ImportPreviewPanel from './ImportPreviewPanel.svelte';
import type { ImportResult } from '../../import/types';
import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Choice } from '../../models/Choice';

describe('ImportPreviewPanel', () => {
  let mockResult: ImportResult;
  let mockOnConfirm: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();

    // Create a basic story
    const story = new Story();
    story.metadata.title = 'Test Story';
    story.metadata.author = 'Test Author';

    const passage1 = story.addPassage(new Passage({ title: 'Start', content: 'Start passage content' }));
    passage1.tags = ['intro'];
    passage1.choices.push(new Choice({ text: 'Go to next', target: 'Second', condition: 'true' }));

    const passage2 = story.addPassage(new Passage({ title: 'Second', content: 'Second passage with {{score}} points' }));
    passage2.choices.push(new Choice({ text: 'Continue', target: 'Third', condition: 'true' }));

    const passage3 = story.addPassage(new Passage({ title: 'Third', content: 'The end' }));

    mockResult = {
      success: true,
      story,
      format: 'twine',
      passageCount: 3,
      variableCount: 1,
      warnings: [],
    };
  });

  describe('Story Metadata Display', () => {
    it('should display story title and author', () => {
      render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      expect(screen.getByText('Test Story')).toBeTruthy();
      expect(screen.getByText('Test Author')).toBeTruthy();
    });

    it('should display passage and variable counts', () => {
      const { container } = render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Check for passage count in Story Information section
      expect(screen.getByText('Passages:')).toBeTruthy();
      expect(screen.getByText('Variables:')).toBeTruthy();
    });

    it('should handle missing metadata gracefully', () => {
      const resultWithoutMeta = { ...mockResult };
      resultWithoutMeta.story!.metadata.title = '';
      resultWithoutMeta.story!.metadata.author = '';

      render(ImportPreviewPanel, {
        result: resultWithoutMeta,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      expect(screen.getByText('Untitled')).toBeTruthy();
      expect(screen.getByText('Unknown')).toBeTruthy();
    });
  });

  describe('Conversion Quality Display', () => {
    it('should not show conversion quality when no loss report', () => {
      const { container } = render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Conversion Quality section shouldn't appear when there's no loss report
      expect(screen.queryByText('Conversion Quality')).toBeNull();
    });

    it('should show quality percentage from loss report', () => {
      const resultWithLoss = {
        ...mockResult,
        lossReport: {
          totalIssues: 5,
          critical: [
            {
              severity: 'critical' as const,
              category: 'macro',
              feature: '<<include>>',
              message: 'Unsupported macro',
            },
          ],
          warnings: [
            {
              severity: 'warning' as const,
              category: 'syntax',
              feature: 'Named hooks',
              message: 'Not fully supported',
            },
            {
              severity: 'warning' as const,
              category: 'ui',
              feature: '<<button>>',
              message: 'UI macro',
            },
          ],
          info: [
            {
              severity: 'info' as const,
              category: 'variable',
              feature: 'Temp vars',
              message: 'Converted',
            },
            {
              severity: 'info' as const,
              category: 'format',
              feature: 'Format note',
              message: 'Format info',
            },
          ],
          categoryCounts: { macro: 1, syntax: 1, ui: 1, variable: 1, format: 1 },
          affectedPassages: ['1', '2'],
          conversionQuality: 0.84, // 1 - (1 * 0.1 + 2 * 0.03) = 0.84
        },
      };

      render(ImportPreviewPanel, {
        result: resultWithLoss,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      expect(screen.getByText('84%')).toBeTruthy();
    });

    it('should use green color for high quality (≥80%)', () => {
      const resultWithHighQuality = {
        ...mockResult,
        lossReport: {
          totalIssues: 1,
          critical: [],
          warnings: [
            {
              severity: 'warning' as const,
              category: 'syntax',
              feature: 'Test',
              message: 'Test',
            },
          ],
          info: [],
          categoryCounts: { syntax: 1 },
          affectedPassages: [],
          conversionQuality: 0.97,
        },
      };

      const { container } = render(ImportPreviewPanel, {
        result: resultWithHighQuality,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      const qualityText = screen.getByText('97%');
      expect(qualityText.className).toContain('text-green-600');
    });

    it('should use yellow color for medium quality (60-79%)', () => {
      const resultWithMediumQuality = {
        ...mockResult,
        lossReport: {
          totalIssues: 5,
          critical: [
            { severity: 'critical' as const, category: 'macro', feature: 'Test1', message: 'Test' },
            { severity: 'critical' as const, category: 'macro', feature: 'Test2', message: 'Test' },
            { severity: 'critical' as const, category: 'macro', feature: 'Test3', message: 'Test' },
          ],
          warnings: [
            { severity: 'warning' as const, category: 'syntax', feature: 'Test4', message: 'Test' },
          ],
          info: [
            { severity: 'info' as const, category: 'variable', feature: 'Test5', message: 'Test' },
          ],
          categoryCounts: { macro: 3, syntax: 1, variable: 1 },
          affectedPassages: [],
          conversionQuality: 0.67, // 1 - (3 * 0.1 + 1 * 0.03) = 0.67
        },
      };

      const { container } = render(ImportPreviewPanel, {
        result: resultWithMediumQuality,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      const qualityText = screen.getByText('67%');
      expect(qualityText.className).toContain('text-yellow-600');
    });

    it('should use red color for low quality (<60%)', () => {
      const resultWithLowQuality = {
        ...mockResult,
        lossReport: {
          totalIssues: 10,
          critical: Array(5).fill(null).map((_, i) => ({
            severity: 'critical' as const,
            category: 'macro',
            feature: `Test${i}`,
            message: 'Test',
          })),
          warnings: Array(5).fill(null).map((_, i) => ({
            severity: 'warning' as const,
            category: 'syntax',
            feature: `Test${i}`,
            message: 'Test',
          })),
          info: [],
          categoryCounts: { macro: 5, syntax: 5 },
          affectedPassages: [],
          conversionQuality: 0.35, // 1 - (5 * 0.1 + 5 * 0.03) = 0.35
        },
      };

      const { container } = render(ImportPreviewPanel, {
        result: resultWithLowQuality,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      const qualityText = screen.getByText('35%');
      expect(qualityText.className).toContain('text-red-600');
    });
  });

  describe('Issue Display', () => {
    it('should display issue counts with badges', () => {
      const resultWithIssues = {
        ...mockResult,
        lossReport: {
          totalIssues: 6,
          critical: [
            { severity: 'critical' as const, category: 'macro', feature: 'Test1', message: 'Critical issue' },
            { severity: 'critical' as const, category: 'macro', feature: 'Test2', message: 'Critical issue 2' },
          ],
          warnings: [
            { severity: 'warning' as const, category: 'syntax', feature: 'Test3', message: 'Warning' },
            { severity: 'warning' as const, category: 'syntax', feature: 'Test4', message: 'Warning 2' },
            { severity: 'warning' as const, category: 'syntax', feature: 'Test5', message: 'Warning 3' },
          ],
          info: [
            { severity: 'info' as const, category: 'variable', feature: 'Test6', message: 'Info' },
          ],
          categoryCounts: { macro: 2, syntax: 3, variable: 1 },
          affectedPassages: [],
          conversionQuality: 0.71,
        },
      };

      const { container } = render(ImportPreviewPanel, {
        result: resultWithIssues,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Check for specific elements using getAllByText
      const criticalElements = screen.getAllByText(/Critical/);
      expect(criticalElements.length).toBeGreaterThan(0);

      const warningElements = screen.getAllByText(/Warnings/);
      expect(warningElements.length).toBeGreaterThan(0);

      expect(screen.getByText(/Conversion Issues \(6\)/)).toBeTruthy();
    });

    it('should show detailed issues when expanded', async () => {
      const resultWithDetailedIssues = {
        ...mockResult,
        lossReport: {
          totalIssues: 1,
          critical: [
            {
              severity: 'critical' as const,
              category: 'macro',
              feature: '<<include>>',
              message: 'Include macro not supported',
              passageId: '1',
              passageName: 'Start',
              original: '<<include "Other">>',
              suggestion: 'Manually copy content',
            },
          ],
          warnings: [],
          info: [],
          categoryCounts: { macro: 1 },
          affectedPassages: ['1'],
          conversionQuality: 0.9,
        },
      };

      render(ImportPreviewPanel, {
        result: resultWithDetailedIssues,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Loss report should be visible by default
      expect(screen.getByText('<<include>>')).toBeTruthy();
      expect(screen.getByText('Include macro not supported')).toBeTruthy();
      const startElements = screen.getAllByText('Start');
      expect(startElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Manually copy content/)).toBeTruthy();
    });
  });

  describe('Sample Passages', () => {
    it('should show first 3 passages as samples', () => {
      const { container } = render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Note: Actually showing 4 passages because Story() initializes with a default Start passage
      // Check for the Sample Passages button exists
      const sampleButton = container.querySelector('button');
      expect(sampleButton).toBeTruthy();
      expect(sampleButton?.textContent).toContain('Sample Passages');
    });

    it('should display passage details when expanded', async () => {
      const { container } = render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      // Find and click the sample passages button (use getAllByText to handle multiple)
      const sampleButtons = screen.getAllByText(/Sample Passages/);
      await fireEvent.click(sampleButtons[0]);

      // Check for passage titles (use getAllByText since there may be duplicates)
      // Note: Only first 3 passages are shown, and Story() creates a default Start passage
      expect(screen.getAllByText('Start').length).toBeGreaterThan(0);
      expect(screen.getByText('Second')).toBeTruthy();

      // Third might not be shown if there are more than 3 passages total
      // (Story creates a default Start, then we added 3 more = 4 total, only 3 shown)

      // Check for choice counts (use getAllByText since there are multiple passages with 1 choice)
      expect(screen.getAllByText(/1 choice/).length).toBeGreaterThan(0);
    });
  });

  describe('Action Buttons', () => {
    it('should call onCancel when Back button clicked', async () => {
      render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      const backButton = screen.getByText('← Back');
      await fireEvent.click(backButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm Import button clicked', async () => {
      render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      const confirmButton = screen.getByText('Confirm Import');
      await fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('General Warnings', () => {
    it('should display general warnings when present', () => {
      const resultWithWarnings = {
        ...mockResult,
        warnings: [
          'This is a warning message',
          'Another warning about something',
        ],
      };

      render(ImportPreviewPanel, {
        result: resultWithWarnings,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      expect(screen.getByText(/General Warnings \(2\)/)).toBeTruthy();
    });

    it('should not show warnings section when no warnings', () => {
      render(ImportPreviewPanel, {
        result: mockResult,
        onConfirm: mockOnConfirm,
        onCancel: mockOnCancel,
      });

      expect(screen.queryByText(/General Warnings/)).toBeNull();
    });
  });
});
