import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PreviewPanel from './PreviewPanel.svelte';

// Mock playerStore
vi.mock('../stores/playerStore', () => ({
  playerActions: {
    loadStory: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    undo: vi.fn(),
    togglePause: vi.fn(),
    toggleDebugMode: vi.fn(),
    makeChoice: vi.fn(),
    getVariable: vi.fn(() => undefined),
  },
  isPlayerActive: { subscribe: vi.fn((fn) => { fn(false); return vi.fn(); }) },
  isPlayerPaused: { subscribe: vi.fn((fn) => { fn(false); return vi.fn(); }) },
  currentPreviewPassage: { subscribe: vi.fn((fn) => { fn(null); return vi.fn(); }) },
  availableChoices: { subscribe: vi.fn((fn) => { fn([]); return vi.fn(); }) },
  debugMode: { subscribe: vi.fn((fn) => { fn(false); return vi.fn(); }) },
  playthroughDuration: { subscribe: vi.fn((fn) => { fn(0); return vi.fn(); }) },
}));

// Mock projectStore
vi.mock('../stores/projectStore', () => ({
  currentStory: { subscribe: vi.fn((fn) => { fn(null); return vi.fn(); }) },
  selectedPassageId: { subscribe: vi.fn((fn) => { fn(null); return vi.fn(); }) },
}));

// Note: Child components (VariableInspector, HistoryPanel, BreakpointPanel, TestScenarioManager)
// are not mocked - they render naturally. Svelte 5 component API makes mocking difficult.

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      const { container } = render(PreviewPanel);

      expect(container.querySelector('.preview-panel')).toBeTruthy();
    });

    it('should have proper styling', () => {
      const { container } = render(PreviewPanel);

      const panel = container.querySelector('.preview-panel');
      expect(panel).toBeTruthy();
      expect(panel?.className).toContain('bg-gray-50');
    });
  });

  describe('toolbar', () => {
    it('should render toolbar', () => {
      const { container } = render(PreviewPanel);

      const toolbar = container.querySelector('.toolbar');
      expect(toolbar).toBeTruthy();
      expect(toolbar?.className).toContain('bg-white');
    });

    it('should show Play button when player is not active', () => {
      const { getByText } = render(PreviewPanel);

      expect(getByText(/Play/)).toBeTruthy();
    });

    it('should show Debug toggle button', () => {
      const { getByText } = render(PreviewPanel);

      expect(getByText(/Debug Off/)).toBeTruthy();
    });
  });

  describe('welcome screen', () => {
    it('should show welcome screen when player is not active', () => {
      const { getByText } = render(PreviewPanel);

      expect(getByText('Preview & Test')).toBeTruthy();
      expect(getByText(/Test your story by playing through it/)).toBeTruthy();
    });

    it('should show start preview button on welcome screen', () => {
      const { getByText } = render(PreviewPanel);

      expect(getByText(/Start Preview/)).toBeTruthy();
    });
  });
});
