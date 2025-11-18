import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  currentMetrics,
  isAnalyzing,
  lastAnalyzed,
  hasIssues,
  criticalIssues,
  warnings,
  infos,
  analyticsActions,
} from './analyticsStore';
import { currentStory } from './projectStore';
import { StoryAnalytics } from '../analytics/StoryAnalytics';
import type { Story } from '@writewhisker/core-ts';
import type { StoryMetrics } from '../analytics/types';

// Mock StoryAnalytics
vi.mock('../analytics/StoryAnalytics', () => ({
  StoryAnalytics: {
    analyze: vi.fn(),
  },
}));

describe('analyticsStore', () => {
  let mockStory: Story;
  let mockMetrics: StoryMetrics;

  beforeEach(() => {
    // Clear stores
    analyticsActions.clear();
    currentStory.set(null);
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.clearAllTimers(); // Clear any pending timers from module load

    // Mock story
    mockStory = {
      metadata: {
        id: 'test-story-1',
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: Date.now().toString(),
        modified: Date.now().toString(),
      },
      passages: new Map([
        [
          'start',
          {
            id: 'start',
            name: 'Start',
            content: 'Test content',
            tags: [],
            metadata: {},
          } as any,
        ],
      ]),
      variables: new Map(),
      startPassage: 'start',
    } as any;

    // Mock metrics
    mockMetrics = {
      totalPassages: 5,
      totalChoices: 8,
      totalVariables: 3,
      avgChoicesPerPassage: 1.6,
      maxDepth: 4,
      maxBreadth: 3,
      complexityScore: 45,
      estimatedReadingTime: 12,
      reachablePassages: 5,
      unreachablePassages: 0,
      deadEnds: 1,
      issues: [
        {
          severity: 'error',
          type: 'dead-end',
          passageId: 'ending',
          passageName: 'The End',
          message: 'Dead end passage with no choices',
          suggestion: 'Add choices or mark as ending',
        },
        {
          severity: 'warning',
          type: 'missing-choice',
          passageId: 'middle',
          passageName: 'Middle',
          message: 'Only one choice available',
          suggestion: 'Add more choices for branching',
        },
        {
          severity: 'info',
          type: 'circular',
          passageId: 'loop',
          passageName: 'Loop',
          message: 'Circular reference detected',
        },
      ],
    };

    vi.mocked(StoryAnalytics.analyze).mockReturnValue(mockMetrics);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start with null metrics', () => {
      expect(get(currentMetrics)).toBeNull();
    });

    it('should start with analyzing as false', () => {
      expect(get(isAnalyzing)).toBe(false);
    });

    it('should start with null last analyzed timestamp', () => {
      expect(get(lastAnalyzed)).toBeNull();
    });
  });

  describe('derived stores', () => {
    it('should calculate hasIssues correctly when no issues', () => {
      currentMetrics.set({ ...mockMetrics, issues: [] });
      expect(get(hasIssues)).toBe(false);
    });

    it('should calculate hasIssues correctly when issues exist', () => {
      currentMetrics.set(mockMetrics);
      expect(get(hasIssues)).toBe(true);
    });

    it('should filter critical issues (errors)', () => {
      currentMetrics.set(mockMetrics);
      const issues = get(criticalIssues);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].type).toBe('dead-end');
    });

    it('should filter warnings', () => {
      currentMetrics.set(mockMetrics);
      const warns = get(warnings);

      expect(warns).toHaveLength(1);
      expect(warns[0].severity).toBe('warning');
      expect(warns[0].type).toBe('missing-choice');
    });

    it('should filter info issues', () => {
      currentMetrics.set(mockMetrics);
      const information = get(infos);

      expect(information).toHaveLength(1);
      expect(information[0].severity).toBe('info');
      expect(information[0].type).toBe('circular');
    });

    it('should return empty arrays when metrics is null', () => {
      currentMetrics.set(null);

      expect(get(criticalIssues)).toEqual([]);
      expect(get(warnings)).toEqual([]);
      expect(get(infos)).toEqual([]);
    });
  });

  describe('analyticsActions.analyzeStory', () => {
    it('should analyze current story', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      expect(StoryAnalytics.analyze).toHaveBeenCalledWith(mockStory);
      expect(get(currentMetrics)).toEqual(mockMetrics);
      expect(get(lastAnalyzed)).toBeGreaterThan(0);
    });

    it('should set analyzing flag during analysis', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      expect(get(isAnalyzing)).toBe(true);

      await vi.runAllTimersAsync();
      await promise;

      expect(get(isAnalyzing)).toBe(false);
    });

    it('should handle null story', async () => {
      currentStory.set(null);

      await analyticsActions.analyzeStory();

      expect(StoryAnalytics.analyze).not.toHaveBeenCalled();
      expect(get(currentMetrics)).toBeNull();
    });

    it('should handle analysis errors gracefully', async () => {
      currentStory.set(mockStory);
      vi.mocked(StoryAnalytics.analyze).mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to analyze story:',
        expect.any(Error)
      );
      expect(get(currentMetrics)).toBeNull();
      expect(get(isAnalyzing)).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should update lastAnalyzed timestamp', async () => {
      currentStory.set(mockStory);
      const beforeTime = Date.now();

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      const timestamp = get(lastAnalyzed);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('analyticsActions.generateReport', () => {
    it('should generate report with story and metrics', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      const report = analyticsActions.generateReport();

      expect(report).toBeDefined();
      expect(report?.storyId).toBe('test-story-1');
      expect(report?.storyTitle).toBe('Test Story');
      expect(report?.metrics).toEqual(mockMetrics);
      expect(report?.generatedAt).toBeGreaterThan(0);
    });

    it('should return null when no story', () => {
      currentStory.set(null);
      currentMetrics.set(mockMetrics);

      const report = analyticsActions.generateReport();

      expect(report).toBeNull();
    });

    it('should return null when no metrics', () => {
      currentStory.set(mockStory);
      currentMetrics.set(null);

      const report = analyticsActions.generateReport();

      expect(report).toBeNull();
    });

    it('should return null when neither story nor metrics exist', () => {
      currentStory.set(null);
      currentMetrics.set(null);

      const report = analyticsActions.generateReport();

      expect(report).toBeNull();
    });
  });

  describe('analyticsActions.exportReport', () => {
    let createElementSpy: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;
    let mockAnchor: HTMLAnchorElement;

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;

      // Mock URL methods before using them
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL');
      revokeObjectURLSpy = vi.spyOn(global.URL, 'revokeObjectURL');
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);
    });

    it('should export report as JSON', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      analyticsActions.exportReport();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toBe('Test Story-analytics.json');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should create valid JSON blob', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      let capturedBlob: Blob | null = null;
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
        capturedBlob = blob as Blob;
        return 'blob:mock-url';
      });

      analyticsActions.exportReport();

      expect(capturedBlob).toBeInstanceOf(Blob);
      expect((capturedBlob as unknown as Blob)?.type).toBe('application/json');
    });

    it('should do nothing when no report available', () => {
      currentStory.set(null);
      currentMetrics.set(null);

      analyticsActions.exportReport();

      expect(createElementSpy).not.toHaveBeenCalled();
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });
  });

  describe('analyticsActions.clear', () => {
    it('should clear metrics and timestamp', async () => {
      currentStory.set(mockStory);

      const promise = analyticsActions.analyzeStory();
      await vi.runAllTimersAsync();
      await promise;

      expect(get(currentMetrics)).not.toBeNull();
      expect(get(lastAnalyzed)).not.toBeNull();

      analyticsActions.clear();

      expect(get(currentMetrics)).toBeNull();
      expect(get(lastAnalyzed)).toBeNull();
    });
  });

  describe('auto-analysis on story change', () => {
    it('should auto-analyze when story changes', async () => {
      // Clear mocks from initial module load
      vi.clearAllMocks();

      currentStory.set(mockStory);

      // Wait for debounce (500ms) and any async operations
      await vi.advanceTimersByTimeAsync(500);
      await vi.runAllTimersAsync();

      expect(StoryAnalytics.analyze).toHaveBeenCalledWith(mockStory);
      expect(get(currentMetrics)).toEqual(mockMetrics);
    });

    it('should debounce rapid story changes', async () => {
      // Clear mocks from initial module load
      vi.clearAllMocks();

      // Change story multiple times rapidly
      currentStory.set(mockStory);
      await vi.advanceTimersByTimeAsync(100);

      currentStory.set({ ...mockStory, metadata: { ...mockStory.metadata, title: 'Updated' } } as any);
      await vi.advanceTimersByTimeAsync(100);

      currentStory.set({ ...mockStory, metadata: { ...mockStory.metadata, title: 'Updated Again' } } as any);
      await vi.advanceTimersByTimeAsync(100);

      // Analysis should not have run yet
      expect(StoryAnalytics.analyze).not.toHaveBeenCalled();

      // Wait for full debounce
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();

      // Should have analyzed only once
      expect(StoryAnalytics.analyze).toHaveBeenCalledTimes(1);
    });

    it('should clear previous timeout on new story change', async () => {
      // Clear mocks from initial module load
      vi.clearAllMocks();

      currentStory.set(mockStory);
      await vi.advanceTimersByTimeAsync(400);

      // Change again before timeout completes
      currentStory.set({ ...mockStory, metadata: { ...mockStory.metadata, title: 'Updated' } } as any);

      // Original timeout should be cancelled
      expect(StoryAnalytics.analyze).not.toHaveBeenCalled();

      // Wait for new timeout
      await vi.advanceTimersByTimeAsync(500);
      await vi.runAllTimersAsync();

      expect(StoryAnalytics.analyze).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle metrics with no issues array', () => {
      const metricsWithoutIssues: any = { ...mockMetrics };
      delete metricsWithoutIssues.issues;

      currentMetrics.set(metricsWithoutIssues);

      // hasIssues should be falsy when issues is undefined
      expect(get(hasIssues)).toBeFalsy();
      expect(get(criticalIssues)).toEqual([]);
      expect(get(warnings)).toEqual([]);
      expect(get(infos)).toEqual([]);
    });

    it('should handle empty issues array', () => {
      currentMetrics.set({ ...mockMetrics, issues: [] });

      expect(get(hasIssues)).toBe(false);
      expect(get(criticalIssues)).toEqual([]);
      expect(get(warnings)).toEqual([]);
      expect(get(infos)).toEqual([]);
    });

    it('should handle multiple errors of same type', () => {
      const metricsWithMultipleErrors: StoryMetrics = {
        ...mockMetrics,
        issues: [
          {
            severity: 'error',
            type: 'dead-end',
            passageId: 'end1',
            passageName: 'End 1',
            message: 'Dead end 1',
          },
          {
            severity: 'error',
            type: 'dead-end',
            passageId: 'end2',
            passageName: 'End 2',
            message: 'Dead end 2',
          },
          {
            severity: 'error',
            type: 'broken-link',
            passageId: 'broken',
            passageName: 'Broken',
            message: 'Broken link',
          },
        ],
      };

      currentMetrics.set(metricsWithMultipleErrors);

      const errors = get(criticalIssues);
      expect(errors).toHaveLength(3);
      expect(errors.filter((i) => i.type === 'dead-end')).toHaveLength(2);
      expect(errors.filter((i) => i.type === 'broken-link')).toHaveLength(1);
    });
  });
});
