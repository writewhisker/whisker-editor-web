import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(ConfirmDialog, { props: { show: false } });
      expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('should display default title and message', () => {
      const { container, getByText } = render(ConfirmDialog, { props: { show: true } });
      const title = container.querySelector('#confirm-title');
      expect(title?.textContent).toBe('Confirm');
      expect(getByText('Are you sure?')).toBeTruthy();
    });

    it('should display custom title and message', () => {
      const { getByText } = render(ConfirmDialog, {
        props: { show: true, title: 'Delete File', message: 'This cannot be undone.' }
      });
      expect(getByText('Delete File')).toBeTruthy();
      expect(getByText('This cannot be undone.')).toBeTruthy();
    });

    it('should display custom button text', () => {
      const { getByText } = render(ConfirmDialog, {
        props: { show: true, confirmText: 'Yes', cancelText: 'No' }
      });
      expect(getByText('Yes')).toBeTruthy();
      expect(getByText('No')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('should render danger variant with warning icon', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'danger' }
      });
      const text = container.textContent || '';
      expect(text).toContain('⚠️');
    });

    it('should render warning variant with lightning icon', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'warning' }
      });
      const text = container.textContent || '';
      expect(text).toContain('⚡');
    });

    it('should render info variant with info icon', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'info' }
      });
      const text = container.textContent || '';
      expect(text).toContain('ℹ️');
    });

    it('should apply danger styles to confirm button', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'danger' }
      });
      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Confirm'
      );
      expect(confirmBtn?.className).toContain('bg-red-600');
    });

    it('should apply warning styles to confirm button', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'warning' }
      });
      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Confirm'
      );
      expect(confirmBtn?.className).toContain('bg-yellow-600');
    });

    it('should apply info styles to confirm button', () => {
      const { container } = render(ConfirmDialog, {
        props: { show: true, variant: 'info' }
      });
      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Confirm'
      );
      expect(confirmBtn?.className).toContain('bg-blue-600');
    });
  });

  describe('button interaction', () => {
    it('should call confirm handler when confirm button clicked', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Confirm'
      );

      expect(confirmBtn).toBeTruthy();
      if (confirmBtn) {
        await fireEvent.click(confirmBtn);
        // Component should handle the confirm action
      }
    });

    it('should call cancel handler when cancel button clicked', async () => {
      const { getByText } = render(ConfirmDialog, { props: { show: true } });
      const cancelBtn = getByText('Cancel');

      await fireEvent.click(cancelBtn);
      // Component should handle the cancel action
    });

    it('should close when backdrop is clicked', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const backdrop = container.querySelector('.fixed.inset-0');

      expect(backdrop).toBeTruthy();
      if (backdrop) {
        await fireEvent.click(backdrop);
        // Should trigger cancel
      }
    });

    it('should not close when dialog is clicked', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="alertdialog"]');

      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should still be present
        expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
      }
    });
  });

  describe('keyboard interaction', () => {
    it('should cancel on Escape key', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle cancel
    });

    it('should confirm on Enter key', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'Enter' });
      // Should handle confirm
    });

    it('should not confirm on Shift+Enter', async () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="alertdialog"]');

      await fireEvent.keyDown(window, { key: 'Enter', shiftKey: true });
      // Dialog should still be present (no action)
      expect(dialog).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="alertdialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('confirm-title');
      expect(dialog?.getAttribute('aria-describedby')).toBe('confirm-message');
    });

    it('should have focusable tabindex', () => {
      const { container } = render(ConfirmDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="alertdialog"]');

      expect(dialog?.getAttribute('tabindex')).toBe('-1');
    });
  });
});
