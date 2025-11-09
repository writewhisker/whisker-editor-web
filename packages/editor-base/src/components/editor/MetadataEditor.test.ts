import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MetadataEditor from './MetadataEditor.svelte';

describe('MetadataEditor', () => {
  let mockMetadata: Record<string, any>;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMetadata = {
      difficulty: 'hard',
      points: 100,
      completed: false,
    };
    mockOnChange = vi.fn();
  });

  describe('rendering', () => {
    it('should render metadata entries', () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: mockMetadata,
          onChange: mockOnChange,
        },
      });

      // Check that input fields have the keys as values
      const keyInputs = container.querySelectorAll('.key-input') as NodeListOf<HTMLInputElement>;
      const keyValues = Array.from(keyInputs).map(input => input.value);
      expect(keyValues).toContain('difficulty');
      expect(keyValues).toContain('points');
      expect(keyValues).toContain('completed');
    });

    it('should display custom label', () => {
      const { getByText } = render(MetadataEditor, {
        props: {
          metadata: mockMetadata,
          onChange: mockOnChange,
          label: 'Custom Label',
        },
      });

      expect(getByText('Custom Label')).toBeTruthy();
    });

    it('should show empty state when no metadata', () => {
      const { getByText } = render(MetadataEditor, {
        props: {
          metadata: {},
          onChange: mockOnChange,
        },
      });

      expect(getByText('No metadata entries')).toBeTruthy();
    });
  });

  describe('adding entries', () => {
    it('should add new entry when clicking add button', async () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: {},
          onChange: mockOnChange,
        },
      });

      const addButton = container.querySelector('.btn-add') as HTMLButtonElement;
      await fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalled();
      const newMetadata = mockOnChange.mock.calls[0][0];
      expect(Object.keys(newMetadata).length).toBeGreaterThan(0);
    });
  });

  describe('editing entries', () => {
    it('should update value when input changes', async () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: { test: 'value' },
          onChange: mockOnChange,
        },
      });

      const input = container.querySelector('.value-input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'new value' } });

      expect(mockOnChange).toHaveBeenCalled();
      const newMetadata = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(newMetadata.test).toBe('new value');
    });

    it('should delete entry when delete button clicked', async () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: { test: 'value' },
          onChange: mockOnChange,
        },
      });

      const deleteButton = container.querySelector('.btn-delete') as HTMLButtonElement;
      await fireEvent.click(deleteButton);

      expect(mockOnChange).toHaveBeenCalled();
      const newMetadata = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(newMetadata.test).toBeUndefined();
    });
  });

  describe('type handling', () => {
    it('should render boolean select for boolean type', () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: { flag: true },
          onChange: mockOnChange,
        },
      });

      const selects = container.querySelectorAll('select.value-input');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should render number input for number type', () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: { count: 42 },
          onChange: mockOnChange,
        },
      });

      const numberInputs = container.querySelectorAll('input[type="number"]');
      expect(numberInputs.length).toBeGreaterThan(0);
    });

    it('should handle type conversion when type changed', async () => {
      const { container } = render(MetadataEditor, {
        props: {
          metadata: { value: '123' },
          onChange: mockOnChange,
        },
      });

      const typeSelect = container.querySelector('.type-select') as HTMLSelectElement;
      await fireEvent.change(typeSelect, { target: { value: 'number' } });

      expect(mockOnChange).toHaveBeenCalled();
      const newMetadata = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(typeof newMetadata.value).toBe('number');
    });
  });
});
