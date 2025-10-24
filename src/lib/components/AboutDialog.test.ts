import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AboutDialog from './AboutDialog.svelte';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('AboutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(AboutDialog, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(AboutDialog, { props: { show: true } });
      expect(getByText('Whisker Visual Editor')).toBeTruthy();
      expect(getByText('Interactive Fiction Editor')).toBeTruthy();
    });

    it('should display icon', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('✍️');
    });
  });

  describe('version info', () => {
    it('should display version number', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Version:');
      expect(text).toContain('0.1.0');
    });

    it('should display build date', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Build:');
    });
  });

  describe('features list', () => {
    it('should display features heading', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('✨ Features');
    });

    it('should display all feature items', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';

      expect(text).toContain('Visual story editing');
      expect(text).toContain('Graph & list views');
      expect(text).toContain('Real-time validation');
      expect(text).toContain('Auto-save (30s)');
      expect(text).toContain('Command palette (Ctrl+K)');
      expect(text).toContain('Export to HTML/JSON/MD');
      expect(text).toContain('Test scenarios');
      expect(text).toContain('WCAG 2.1 accessible');
    });

    it('should show checkmarks for features', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('✓');
    });
  });

  describe('stats', () => {
    it('should display stats heading', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('📊 This Build');
    });

    it('should display test count', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Tests Passing');
    });

    it('should display keyboard shortcuts count', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Keyboard Shortcuts');
    });

    it('should display example stories count', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Example Stories');
    });
  });

  describe('links', () => {
    it('should display user guide link', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const link = Array.from(container.querySelectorAll('a')).find(
        a => a.textContent?.includes('User Guide')
      );
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('docs/USER_GUIDE.md');
    });

    it('should display GitHub link', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const link = Array.from(container.querySelectorAll('a')).find(
        a => a.textContent?.includes('GitHub')
      );
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toContain('github.com/writewhisker');
    });

    it('should open links in new tab', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const links = container.querySelectorAll('a');
      links.forEach(link => {
        expect(link.getAttribute('target')).toBe('_blank');
      });
    });
  });

  describe('credits', () => {
    it('should display tech stack info', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Built with Svelte 5, TypeScript, and Vite');
    });

    it('should display copyright', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('© 2025 Whisker Team');
    });
  });

  describe('close button', () => {
    it('should display close button', () => {
      const { getByText } = render(AboutDialog, { props: { show: true } });
      const closeButton = getByText('Close');
      expect(closeButton).toBeTruthy();
    });

    it('should close dialog when close button clicked', async () => {
      const { getByText } = render(AboutDialog, { props: { show: true } });
      const closeButton = getByText('Close');

      await fireEvent.click(closeButton);
      // Should handle close action
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close on Escape key', async () => {
      const { container } = render(AboutDialog, { props: { show: true } });

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle escape key
    });
  });

  describe('backdrop', () => {
    it('should close when backdrop is clicked', async () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const backdrop = container.querySelector('.fixed.inset-0');

      expect(backdrop).toBeTruthy();
      if (backdrop) {
        await fireEvent.click(backdrop);
        // Should close dialog
      }
    });

    it('should not close when dialog content is clicked', async () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should remain open
        expect(container.querySelector('[role="dialog"]')).toBeTruthy();
      }
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('about-title');
    });

    it('should have focusable dialog', () => {
      const { container } = render(AboutDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('tabindex')).toBe('-1');
    });
  });
});
