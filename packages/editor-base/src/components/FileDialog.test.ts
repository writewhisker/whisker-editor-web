import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FileDialog from './FileDialog.svelte';

describe('FileDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(FileDialog, { show: false });

      const dialog = container.querySelector('.fixed');
      expect(dialog).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(FileDialog, { show: true });

      const dialog = container.querySelector('.fixed');
      expect(dialog).toBeTruthy();
    });

    it('should display the title', () => {
      const { getByText } = render(FileDialog, { show: true, title: 'Test Title' });

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should display the message when provided', () => {
      const { getByText } = render(FileDialog, {
        show: true,
        message: 'Test message content',
      });

      expect(getByText('Test message content')).toBeTruthy();
    });

    it('should not display message area when message is empty', () => {
      const { queryByText } = render(FileDialog, {
        show: true,
        title: 'Title',
        message: '',
      });

      const dialog = queryByText((content, element) => {
        return element?.className?.includes('text-gray-700') || false;
      });

      expect(dialog).toBeNull();
    });

    it('should display input field when showInput is true', () => {
      const { container } = render(FileDialog, {
        show: true,
        showInput: true,
        inputPlaceholder: 'Enter value',
      });

      const input = container.querySelector('input');
      expect(input).toBeTruthy();
      expect(input?.placeholder).toBe('Enter value');
    });

    it('should not display input field when showInput is false', () => {
      const { container } = render(FileDialog, {
        show: true,
        showInput: false,
      });

      const input = container.querySelector('input');
      expect(input).toBeNull();
    });

    it('should display OK and Cancel buttons', () => {
      const { getByText } = render(FileDialog, { show: true });

      expect(getByText('OK')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  // Note: Button interactions and event dispatching cannot be tested in Svelte 5
  // because component.$on() API has been removed. Event testing would require
  // integration or E2E tests.

  describe('input handling', () => {
    it('should update input value when typing', async () => {
      const { container } = render(FileDialog, {
        show: true,
        showInput: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input).toBeTruthy();

      await fireEvent.input(input, { target: { value: 'new value' } });

      expect(input.value).toBe('new value');
    });

    it('should use initial inputValue prop', () => {
      const { container } = render(FileDialog, {
        show: true,
        showInput: true,
        inputValue: 'initial value',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('initial value');
    });
  });

  // Note: Keyboard and overlay interactions cannot be tested in Svelte 5
  // because component.$on() API has been removed. These would require
  // integration or E2E tests.

  describe('styling', () => {
    it('should have proper overlay styling', () => {
      const { container } = render(FileDialog, { show: true });

      const overlay = container.querySelector('.fixed');
      expect(overlay?.className).toContain('bg-black');
      expect(overlay?.className).toContain('bg-opacity-50');
      expect(overlay?.className).toContain('z-50');
    });

    it('should have proper dialog content styling', () => {
      const { container } = render(FileDialog, { show: true });

      const content = container.querySelector('.bg-white');
      expect(content?.className).toContain('rounded-lg');
      expect(content?.className).toContain('shadow-xl');
    });
  });
});
