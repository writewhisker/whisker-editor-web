import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
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
    validationResult.set({ issues: [], isValid: true });
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
    validationResult.set({ issues: [], isValid: true });
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should show empty state when no story is loaded', () => {
      const { getByText } = render(GraphView);

      expect(getByText('No Story Loaded')).toBeTruthy();
      expect(getByText('Create or open a story to see the graph view')).toBeTruthy();
    });

    it('should show layout controls', () => {
      const { getByText } = render(GraphView);

      expect(getByText('Layout:')).toBeTruthy();
      expect(getByText('Hierarchical')).toBeTruthy();
      expect(getByText('Circular')).toBeTruthy();
      expect(getByText('Grid')).toBeTruthy();
    });

    it('should show layout direction options', () => {
      const { getByText } = render(GraphView);

      expect(getByText('Top-Bottom')).toBeTruthy();
      expect(getByText('Left-Right')).toBeTruthy();
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
        issues: [],
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
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
        issues: [],
        isValid: false,
        errorCount: 2,
        warningCount: 0,
        infoCount: 0,
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
        issues: [],
        isValid: true,
        errorCount: 0,
        warningCount: 3,
        infoCount: 0,
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
        issues: [],
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 1,
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
        issues: [],
        isValid: false,
        errorCount: 2,
        warningCount: 3,
        infoCount: 1,
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
      const { getByText } = render(GraphView);

      const button = getByText('Hierarchical').closest('button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.title).toBe('Arrange passages hierarchically');
    });

    it('should render circular layout button', () => {
      const { getByText } = render(GraphView);

      const button = getByText('Circular').closest('button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.title).toBe('Arrange passages in a circle');
    });

    it('should render grid layout button', () => {
      const { getByText } = render(GraphView);

      const button = getByText('Grid').closest('button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.title).toBe('Arrange passages in a grid');
    });
  });

  describe('layout direction', () => {
    it('should have Top-Bottom selected by default', () => {
      const { container } = render(GraphView);

      const tbRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
        (input) => (input as HTMLInputElement).value === 'TB'
      ) as HTMLInputElement;

      expect(tbRadio).toBeTruthy();
      expect(tbRadio.checked).toBe(true);
    });

    it('should allow switching to Left-Right', async () => {
      const { container } = render(GraphView);

      const lrRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
        (input) => (input as HTMLInputElement).value === 'LR'
      ) as HTMLInputElement;

      expect(lrRadio).toBeTruthy();

      await fireEvent.click(lrRadio);

      expect(lrRadio.checked).toBe(true);
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
      currentStory.set(story);

      const { getByText } = render(GraphView);

      expect(getByText('Zoom:')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
    });

    it('should not show zoom level indicator when no story is loaded', () => {
      const { queryByText } = render(GraphView);

      expect(queryByText('Zoom:')).toBeNull();
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
