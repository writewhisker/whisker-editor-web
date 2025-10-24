import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AutoSaveRecovery from './AutoSaveRecovery.svelte';

// Mock trapFocus utility
vi.mock('$lib/utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

// Mock autoSave utilities
const mockLoadFromLocalStorage = vi.fn();
const mockClearLocalStorage = vi.fn();
const mockFormatAutoSaveTime = vi.fn();

vi.mock('$lib/utils/autoSave', () => ({
  loadFromLocalStorage: () => mockLoadFromLocalStorage(),
  clearLocalStorage: () => mockClearLocalStorage(),
  formatAutoSaveTime: (timestamp: number) => mockFormatAutoSaveTime(timestamp),
}));

describe('AutoSaveRecovery', () => {
  const mockAutoSaveData = {
    storyTitle: 'Test Story',
    storyData: { metadata: { title: 'Test Story' }, passages: [] },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadFromLocalStorage.mockReturnValue(null);
    mockFormatAutoSaveTime.mockReturnValue('2 minutes ago');
  });

  describe('rendering without autosave data', () => {
    it('should not show dialog when no autosave data', () => {
      mockLoadFromLocalStorage.mockReturnValue(null);

      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should not call onRecover or onDismiss on mount when no data', () => {
      mockLoadFromLocalStorage.mockReturnValue(null);

      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(onRecover).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('rendering with autosave data', () => {
    beforeEach(() => {
      mockLoadFromLocalStorage.mockReturnValue(mockAutoSaveData);
    });

    it('should show dialog when autosave data exists', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display title', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(getByText('Unsaved Work Found')).toBeTruthy();
    });

    it('should display story title', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const text = container.textContent || '';
      expect(text).toContain('Test Story');
    });

    it('should display formatted timestamp', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const text = container.textContent || '';
      expect(text).toContain('2 minutes ago');
      expect(mockFormatAutoSaveTime).toHaveBeenCalledWith(mockAutoSaveData.timestamp);
    });

    it('should display icon', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const text = container.textContent || '';
      expect(text).toContain('💾');
    });

    it('should display explanation message', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const text = container.textContent || '';
      expect(text).toContain('What happened?');
      expect(text).toContain('automatically saves your work every 30 seconds');
    });

    it('should display recover button', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(getByText('Recover My Work')).toBeTruthy();
    });

    it('should display discard button', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      expect(getByText('Discard')).toBeTruthy();
    });
  });

  describe('recover action', () => {
    beforeEach(() => {
      mockLoadFromLocalStorage.mockReturnValue(mockAutoSaveData);
    });

    it('should call onRecover with autosave data when recover button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const recoverButton = getByText('Recover My Work');
      await fireEvent.click(recoverButton);

      expect(onRecover).toHaveBeenCalledWith(mockAutoSaveData);
      expect(onRecover).toHaveBeenCalledTimes(1);
    });

    it('should not call onDismiss when recover button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const recoverButton = getByText('Recover My Work');
      await fireEvent.click(recoverButton);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should not clear localStorage when recover button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const recoverButton = getByText('Recover My Work');
      await fireEvent.click(recoverButton);

      expect(mockClearLocalStorage).not.toHaveBeenCalled();
    });
  });

  describe('dismiss action', () => {
    beforeEach(() => {
      mockLoadFromLocalStorage.mockReturnValue(mockAutoSaveData);
    });

    it('should call onDismiss when discard button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const discardButton = getByText('Discard');
      await fireEvent.click(discardButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should clear localStorage when discard button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const discardButton = getByText('Discard');
      await fireEvent.click(discardButton);

      expect(mockClearLocalStorage).toHaveBeenCalledTimes(1);
    });

    it('should not call onRecover when discard button clicked', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { getByText } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const discardButton = getByText('Discard');
      await fireEvent.click(discardButton);

      expect(onRecover).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interaction', () => {
    beforeEach(() => {
      mockLoadFromLocalStorage.mockReturnValue(mockAutoSaveData);
    });

    it('should dismiss on Escape key', async () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const backdrop = container.querySelector('[role="presentation"]');
      expect(backdrop).toBeTruthy();

      if (backdrop) {
        await fireEvent.keyDown(backdrop, { key: 'Escape' });

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(mockClearLocalStorage).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockLoadFromLocalStorage.mockReturnValue(mockAutoSaveData);
    });

    it('should have proper ARIA attributes', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('recovery-title');
    });

    it('should have id on title for aria-labelledby', () => {
      const onRecover = vi.fn();
      const onDismiss = vi.fn();

      const { container } = render(AutoSaveRecovery, {
        props: { onRecover, onDismiss },
      });

      const title = container.querySelector('#recovery-title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Unsaved Work Found');
    });
  });
});
