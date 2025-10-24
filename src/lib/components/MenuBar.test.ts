import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';

import MenuBar from './MenuBar.svelte';

// Mock recent files utility
vi.mock('../utils/recentFiles', () => ({
  getRecentFiles: vi.fn(() => []),
  formatLastOpened: vi.fn((date) => '2 hours ago'),
  clearRecentFiles: vi.fn(),
}));

// Mock theme store
vi.mock('../stores/themeStore', () => ({
  theme: { subscribe: vi.fn((fn) => { fn('light'); return vi.fn(); }) },
  themeActions: { setTheme: vi.fn(), toggleTheme: vi.fn() },
}));

describe('MenuBar', () => {
  let onNew: ReturnType<typeof vi.fn>;
  let onOpen: ReturnType<typeof vi.fn>;
  let onSave: ReturnType<typeof vi.fn>;
  let onSaveAs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onNew = vi.fn();
    onOpen = vi.fn();
    onSave = vi.fn();
    onSaveAs = vi.fn();
  });

  describe('rendering', () => {
    it('should render all menu buttons', () => {
      const { getByText } = render(MenuBar, { onNew, onOpen, onSave, onSaveAs });

      expect(getByText('File')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('View')).toBeTruthy();
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Help')).toBeTruthy();
    });

    it('should have proper styling', () => {
      const { container } = render(MenuBar, { onNew, onOpen, onSave, onSaveAs });

      const nav = container.querySelector('nav');
      expect(nav).toBeTruthy();
      expect(nav?.className).toContain('bg-gray-800');
    });
  });
});
