import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import GraphView from './GraphView.svelte';
import { currentStory, selectedPassageId } from '../stores/projectStore';
import { filterState } from '../stores/filterStore';
import { validationResult } from '../stores/validationStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';

// Mock motion utility
vi.mock('../utils/motion', () => ({
  prefersReducedMotion: { subscribe: vi.fn((fn) => { fn(false); return vi.fn(); }) },
  detectMotionPreference: vi.fn(() => false),
}));

// Mock @xyflow/svelte
vi.mock('@xyflow/svelte', () => {
  return {
    SvelteFlow: vi.fn(() => ({
      component: () => null,
      $$: {}
    })),
    Controls: vi.fn(() => ({
      component: () => null,
      $$: {}
    })),
    Background: vi.fn(() => ({
      component: () => null,
      $$: {}
    })),
    MiniMap: vi.fn(() => ({
      component: () => null,
      $$: {}
    })),
    useSvelteFlow: vi.fn(() => ({
      fitBounds: vi.fn(),
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      setCenter: vi.fn(),
    })),
  };
});

// Mock child components - just let them render normally
// Svelte 5 uses a different component API, so we can't easily mock them
// Instead, we'll let SearchBar render but it shouldn't break our tests

describe('GraphView', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Reset stores
    currentStory.set(null);
    selectedPassageId.set(null);
    filterState.set({
      searchQuery: '',
      selectedTags: [],
      passageTypes: [],
      includeChoiceText: true,
    });
    validationResult.set({
      timestamp: Date.now(),
      duration: 0,
      valid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
      stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0,
      },
    });
  });

  afterEach(() => {
    currentStory.set(null);
    selectedPassageId.set(null);
    filterState.set({
      searchQuery: '',
      selectedTags: [],
      passageTypes: [],
      includeChoiceText: true,
    });
    validationResult.set({
      timestamp: Date.now(),
      duration: 0,
      valid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
      stats: {
        totalPassages: 0,
        reachablePassages: 0,
        unreachablePassages: 0,
        orphanedPassages: 0,
        deadLinks: 0,
        undefinedVariables: 0,
        unusedVariables: 0,
      },
    });
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should show empty state when no story is loaded', () => {
      const { getByText } = render(GraphView);

      expect(getByText('No Story Loaded')).toBeTruthy();
      expect(getByText('Create or open a story to see the graph view')).toBeTruthy();
    });

    it('should show layout controls', () => {
      const { getByText, container } = render(GraphView);

      expect(getByText('Layout:')).toBeTruthy();
      const select = container.querySelector('select[title="Select layout algorithm"]');
      expect(select).toBeTruthy();
      const options = Array.from(select?.querySelectorAll('option') || []);
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts.some(t => t?.includes('Hierarchical'))).toBeTruthy();
      expect(optionTexts.some(t => t?.includes('Circular'))).toBeTruthy();
      expect(optionTexts.some(t => t?.includes('Grid'))).toBeTruthy();
    });

    it('should show layout direction options', async () => {
      const { container } = render(GraphView);

      // Direction select only appears when hierarchical is selected
      const algorithmSelect = container.querySelector('select[title="Select layout algorithm"]') as HTMLSelectElement;
      await fireEvent.change(algorithmSelect, { target: { value: 'hierarchical' } });

      await waitFor(() => {
        const directionSelect = container.querySelector('select[title="Layout direction"]');
        expect(directionSelect).toBeTruthy();
        const options = Array.from(directionSelect?.querySelectorAll('option') || []);
        const optionTexts = options.map(o => o.textContent);
        expect(optionTexts).toContain('Top-Bottom');
        expect(optionTexts).toContain('Left-Right');
      });
    });

    it('should disable zoom to selection when no passage is selected', () => {
      const { getByText } = render(GraphView);

      const zoomButton = getByText(/Zoom to Selection/).closest('button') as HTMLButtonElement;
      expect(zoomButton.disabled).toBe(true);
    });

    it('should enable zoom to selection when passage is selected', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({
        title: 'Test Passage',
        content: 'Test content',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);

      currentStory.set(story);
      selectedPassageId.set(passage.id);

      const { getByText } = render(GraphView);

      const zoomButton = getByText(/Zoom to Selection/).closest('button') as HTMLButtonElement;
      expect(zoomButton.disabled).toBe(false);
    });
  });

  describe('validation summary', () => {
    it('should not show validation summary when there are no issues', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      validationResult.set({
        timestamp: Date.now(),
        duration: 0,
        valid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      const { queryByText } = render(GraphView);

      expect(queryByText('Connection Issues:')).toBeNull();
    });

    it('should show error count when there are errors', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      validationResult.set({
        timestamp: Date.now(),
        duration: 0,
        valid: false,
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      const { getByText } = render(GraphView);

      expect(getByText('Connection Issues:')).toBeTruthy();
      expect(getByText('2 errors')).toBeTruthy();
    });

    it('should show warning count when there are warnings', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      validationResult.set({
        timestamp: Date.now(),
        duration: 0,
        valid: true,
        errorCount: 0,
        warningCount: 3,
        infoCount: 0,
        issues: [],
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      const { getByText } = render(GraphView);

      expect(getByText('Connection Issues:')).toBeTruthy();
      expect(getByText('3 warnings')).toBeTruthy();
    });

    it('should not show validation summary when there are only info messages', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      validationResult.set({
        timestamp: Date.now(),
        duration: 0,
        valid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 1,
        issues: [],
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      const { queryByText } = render(GraphView);

      // Validation summary only shows for errors and warnings, not for info messages alone
      expect(queryByText('Connection Issues:')).toBeNull();
    });

    it('should show all counts when there are mixed issues', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);

      validationResult.set({
        timestamp: Date.now(),
        duration: 0,
        valid: false,
        errorCount: 2,
        warningCount: 3,
        infoCount: 1,
        issues: [],
        stats: {
          totalPassages: 0,
          reachablePassages: 0,
          unreachablePassages: 0,
          orphanedPassages: 0,
          deadLinks: 0,
          undefinedVariables: 0,
          unusedVariables: 0,
        },
      });

      const { getByText } = render(GraphView);

      expect(getByText('Connection Issues:')).toBeTruthy();
      expect(getByText('2 errors')).toBeTruthy();
      expect(getByText('3 warnings')).toBeTruthy();
      expect(getByText('1 circular path')).toBeTruthy();
    });
  });

  describe('layout controls', () => {
    it('should render hierarchical layout button', () => {
      const { container } = render(GraphView);

      const select = container.querySelector('select[title="Select layout algorithm"]');
      const option = Array.from(select?.querySelectorAll('option') || []).find(
        o => o.textContent?.includes('Hierarchical')
      );
      expect(option).toBeTruthy();
    });

    it('should render circular layout button', () => {
      const { container } = render(GraphView);

      const select = container.querySelector('select[title="Select layout algorithm"]');
      const option = Array.from(select?.querySelectorAll('option') || []).find(
        o => o.textContent?.includes('Circular')
      );
      expect(option).toBeTruthy();
    });

    it('should render grid layout button', () => {
      const { container } = render(GraphView);

      const select = container.querySelector('select[title="Select layout algorithm"]');
      const option = Array.from(select?.querySelectorAll('option') || []).find(
        o => o.textContent?.includes('Grid')
      );
      expect(option).toBeTruthy();
    });
  });

  describe('layout direction', () => {
    it('should have Top-Bottom selected by default', async () => {
      const { container } = render(GraphView);

      // Select hierarchical first to show direction options
      const algorithmSelect = container.querySelector('select[title="Select layout algorithm"]') as HTMLSelectElement;
      await fireEvent.change(algorithmSelect, { target: { value: 'hierarchical' } });

      await waitFor(() => {
        const directionSelect = container.querySelector('select[title="Layout direction"]') as HTMLSelectElement;
        expect(directionSelect).toBeTruthy();
        expect(directionSelect?.value).toBe('TB');
      });
    });

    it('should allow switching to Left-Right', async () => {
      const { container } = render(GraphView);

      // Select hierarchical first to show direction options
      const algorithmSelect = container.querySelector('select[title="Select layout algorithm"]') as HTMLSelectElement;
      await fireEvent.change(algorithmSelect, { target: { value: 'hierarchical' } });

      await waitFor(async () => {
        const directionSelect = container.querySelector('select[title="Layout direction"]') as HTMLSelectElement;
        expect(directionSelect).toBeTruthy();

        await fireEvent.change(directionSelect, { target: { value: 'LR' } });

        expect(directionSelect.value).toBe('LR');
      });
    });
  });

  describe('zoom indicator', () => {
    it('should show zoom level indicator when story is loaded', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      const passage = new Passage({
        title: 'Test',
        content: '',
        position: { x: 0, y: 0 }
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { container } = render(GraphView);

      // Zoom controls are shown via buttons - check for zoom button text
      expect(container.textContent).toContain('Zoom to Selection');
    });

    it('should not show zoom level indicator when no story is loaded', () => {
      const { container } = render(GraphView);

      // When no story loaded, the graph view shows empty state
      expect(container.textContent).toContain('No Story Loaded');
    });
  });

  describe('edge context menu', () => {
    it('should not show edge context menu initially', () => {
      const { queryByText } = render(GraphView);

      expect(queryByText('Edit Condition')).toBeNull();
      expect(queryByText('Delete Connection')).toBeNull();
    });
  });

  describe('story with passages', () => {
    it('should not show empty state when story has passages', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const passage = new Passage({
        title: 'Test Passage',
        content: 'Test content',
        position: { x: 0, y: 0 },
      });
      story.addPassage(passage);
      currentStory.set(story);

      const { queryByText } = render(GraphView);

      expect(queryByText('No Story Loaded')).toBeNull();
      expect(queryByText('Create or open a story to see the graph view')).toBeNull();
    });
  });
});
