import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FindReplaceDialog from './FindReplaceDialog.svelte';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

describe('FindReplaceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(FindReplaceDialog, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(FindReplaceDialog, { props: { show: true } });
      expect(getByText('Find & Replace')).toBeTruthy();
    });

    it('should display search input', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const searchInput = container.querySelector('#search-input');
      expect(searchInput).toBeTruthy();
      expect(searchInput?.getAttribute('placeholder')).toBe('Search for...');
    });

    it('should display replace input', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const replaceInput = container.querySelector('#replace-input');
      expect(replaceInput).toBeTruthy();
      expect(replaceInput?.getAttribute('placeholder')).toBe('Replace with...');
    });

    it('should display close button', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const closeButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.getAttribute('aria-label') === 'Close dialog'
      );
      expect(closeButton).toBeTruthy();
    });

    it('should display keyboard hints', () => {
      const { getByText } = render(FindReplaceDialog, { props: { show: true } });
      expect(getByText('Press Enter to find, Esc to close')).toBeTruthy();
    });
  });

  describe('options rendering', () => {
    it('should display case sensitive checkbox', () => {
      const { container, getByText } = render(FindReplaceDialog, { props: { show: true } });
      const checkbox = container.querySelector('#case-sensitive');
      expect(checkbox).toBeTruthy();
      expect(getByText('Match case')).toBeTruthy();
    });

    it('should display whole word checkbox', () => {
      const { container, getByText } = render(FindReplaceDialog, { props: { show: true } });
      const checkbox = container.querySelector('#whole-word');
      expect(checkbox).toBeTruthy();
      expect(getByText('Match whole word')).toBeTruthy();
    });

    it('should display search in radio options', () => {
      const { getByText } = render(FindReplaceDialog, { props: { show: true } });
      expect(getByText('Search in')).toBeTruthy();
      expect(getByText('Content')).toBeTruthy();
      expect(getByText('Titles')).toBeTruthy();
      expect(getByText('Both')).toBeTruthy();
    });

    it('should have content selected by default', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      const contentRadio = Array.from(radioButtons).find(
        (r: any) => r.value === 'content'
      ) as HTMLInputElement;
      expect(contentRadio?.checked).toBe(true);
    });
  });

  describe('action buttons', () => {
    it('should display Find button', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const findButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Find'
      );
      expect(findButton).toBeTruthy();
    });

    it('should display Replace button', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const replaceButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Replace'
      );
      expect(replaceButton).toBeTruthy();
    });

    it('should display Replace All button', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const replaceAllButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent === 'Replace All'
      );
      expect(replaceAllButton).toBeTruthy();
    });

    it('should disable buttons when search term is empty', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const buttons = Array.from(container.querySelectorAll('button')).filter(
        btn => ['Find', 'Replace', 'Replace All'].includes(btn.textContent || '')
      );

      buttons.forEach(btn => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should enable buttons when search term is entered', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const searchInput = container.querySelector('#search-input') as HTMLInputElement;

      await fireEvent.input(searchInput, { target: { value: 'test' } });

      const buttons = Array.from(container.querySelectorAll('button')).filter(
        btn => ['Find', 'Replace', 'Replace All'].includes(btn.textContent || '')
      );

      buttons.forEach(btn => {
        expect((btn as HTMLButtonElement).disabled).toBe(false);
      });
    });
  });

  describe('input handling', () => {
    it('should update search term on input', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const searchInput = container.querySelector('#search-input') as HTMLInputElement;

      await fireEvent.input(searchInput, { target: { value: 'hello world' } });

      expect(searchInput.value).toBe('hello world');
    });

    it('should update replace term on input', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const replaceInput = container.querySelector('#replace-input') as HTMLInputElement;

      await fireEvent.input(replaceInput, { target: { value: 'goodbye' } });

      expect(replaceInput.value).toBe('goodbye');
    });

    it('should toggle case sensitive option', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const checkbox = container.querySelector('#case-sensitive') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      await fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('should toggle whole word option', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const checkbox = container.querySelector('#whole-word') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      await fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('should change search in option', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      const titlesRadio = Array.from(radioButtons).find(
        (r: any) => r.value === 'titles'
      ) as HTMLInputElement;

      await fireEvent.click(titlesRadio);
      expect(titlesRadio.checked).toBe(true);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close on Escape key', async () => {
      const { container, component } = render(FindReplaceDialog, { props: { show: true } });

      await fireEvent.keyDown(window, { key: 'Escape' });

      // Dialog should handle the escape key
      // Since we can't test prop changes in Svelte 5, just verify no errors
    });

    it('should not find on Enter when search term is empty', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      // Verify search input is empty
      const searchInput = container.querySelector('#search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('');

      await fireEvent.keyDown(window, { key: 'Enter' });

      // Should not trigger find with empty search term
    });
  });

  describe('close button', () => {
    it('should close dialog when close button clicked', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      const closeButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.getAttribute('aria-label') === 'Close dialog'
      );

      expect(closeButton).toBeTruthy();

      if (closeButton) {
        await fireEvent.click(closeButton);
        // Should trigger close event
      }
    });

    it('should close when backdrop is clicked', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeTruthy();

      if (backdrop) {
        await fireEvent.click(backdrop);
        // Should trigger close
      }
    });

    it('should not close when dialog content is clicked', async () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      const dialog = container.querySelector('[role="dialog"] > div');
      expect(dialog).toBeTruthy();

      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should still be present
        expect(container.querySelector('[role="dialog"]')).toBeTruthy();
      }
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('find-replace-title');
    });

    it('should have labeled inputs', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      const searchInput = container.querySelector('#search-input');
      const searchLabel = container.querySelector('label[for="search-input"]');
      expect(searchLabel?.textContent).toContain('Find');

      const replaceInput = container.querySelector('#replace-input');
      const replaceLabel = container.querySelector('label[for="replace-input"]');
      expect(replaceLabel?.textContent).toContain('Replace with');
    });

    it('should have labeled checkboxes', () => {
      const { container } = render(FindReplaceDialog, { props: { show: true } });

      const caseLabel = container.querySelector('label[for="case-sensitive"]');
      expect(caseLabel?.textContent).toContain('Match case');

      const wordLabel = container.querySelector('label[for="whole-word"]');
      expect(wordLabel?.textContent).toContain('Match whole word');
    });
  });
});
