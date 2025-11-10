import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TextInput from './TextInput.svelte';

describe('TextInput', () => {
  let onInput: ReturnType<typeof vi.fn>;
  let onChange: ReturnType<typeof vi.fn>;
  let onBlur: ReturnType<typeof vi.fn>;
  let onFocus: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;
  let onClear: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onInput = vi.fn();
    onChange = vi.fn();
    onBlur = vi.fn();
    onFocus = vi.fn();
    onSubmit = vi.fn();
    onClear = vi.fn();
  });

  describe('rendering', () => {
    it('should render with prompt label', () => {
      const { container } = render(TextInput, {
        prompt: 'Enter your name:',
        variableName: 'userName',
      });

      expect(container.textContent).toContain('Enter your name:');
    });

    it('should render input field with placeholder', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        placeholder: 'Type here...',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Type here...');
    });

    it('should render textarea when multiline is true', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        multiline: true,
      });

      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should render with initial value', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'John Doe',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('John Doe');
    });

    it('should show required indicator when required is true', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      expect(container.textContent).toContain('*');
    });

    it('should show character count when showCharCount is true', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        showCharCount: true,
        maxLength: 100,
      });

      expect(container.textContent).toContain('0/100');
    });

    it('should show submit button', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
      });

      const submitButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Submit');
      expect(submitButton).toBeTruthy();
    });

    it('should show clear button when input has value', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
      });

      const clearButton = container.querySelector('.clear-btn');
      expect(clearButton).toBeTruthy();
    });

    it('should not show clear button when input is empty', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
      });

      const clearButton = container.querySelector('.clear-btn');
      expect(clearButton).toBeFalsy();
    });

    it('should show help text for minimum length when not touched', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        minLength: 5,
      });

      expect(container.textContent).toContain('Minimum 5 characters');
    });
  });

  describe('user interactions', () => {
    it('should dispatch input event on text input', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
      });

      (component as any).$on('input', onInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });

      expect(onInput).toHaveBeenCalled();
      expect(onInput.mock.calls[0][0].detail.value).toBe('test');
      expect(onInput.mock.calls[0][0].detail.variableName).toBe('userName');
    });

    it('should dispatch change event on change', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
      });

      (component as any).$on('change', onChange);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });
      await fireEvent.change(input);

      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0].detail.value).toBe('test');
    });

    it('should dispatch focus event on focus', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
      });

      (component as any).$on('focus', onFocus);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.focus(input);

      expect(onFocus).toHaveBeenCalled();
      expect(onFocus.mock.calls[0][0].detail.variableName).toBe('userName');
    });

    it('should dispatch blur event on blur', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
      });

      (component as any).$on('blur', onBlur);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });
      await fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
      expect(onBlur.mock.calls[0][0].detail.value).toBe('test');
    });

    it('should dispatch submit event when submit button clicked', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
      });

      (component as any).$on('submit', onSubmit);

      const submitButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Submit') as HTMLButtonElement;

      await fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalled();
      expect(onSubmit.mock.calls[0][0].detail.value).toBe('test');
    });

    it('should dispatch clear event when clear button clicked', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
      });

      (component as any).$on('clear', onClear);

      const clearButton = container.querySelector('.clear-btn') as HTMLButtonElement;
      await fireEvent.click(clearButton);

      expect(onClear).toHaveBeenCalled();
      expect(onClear.mock.calls[0][0].detail.variableName).toBe('userName');
    });

    it('should clear input when clear button clicked', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
      });

      const clearButton = container.querySelector('.clear-btn') as HTMLButtonElement;
      await fireEvent.click(clearButton);

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should show focused state when input is focused', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.focus(input);

      const wrapper = container.querySelector('.input-wrapper');
      expect(wrapper?.className).toContain('focused');
    });

    it('should remove focused state when input is blurred', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.focus(input);
      await fireEvent.blur(input);

      const wrapper = container.querySelector('.input-wrapper');
      expect(wrapper?.className).not.toContain('focused');
    });
  });

  describe('validation - required', () => {
    it('should show error when required field is empty and touched', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      expect(container.textContent).toContain('This field is required');
    });

    it('should not show error when required field is filled', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });
      await fireEvent.blur(input);

      expect(container.textContent).not.toContain('This field is required');
    });

    it('should not validate until field is touched', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      expect(container.textContent).not.toContain('This field is required');
    });
  });

  describe('validation - min length', () => {
    it('should show error when input is shorter than minLength', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        minLength: 5,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abc' } });
      await fireEvent.blur(input);

      expect(container.textContent).toContain('Must be at least 5 characters');
    });

    it('should not show error when input meets minLength', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        minLength: 5,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdef' } });
      await fireEvent.blur(input);

      expect(container.textContent).not.toContain('Must be at least');
    });
  });

  describe('validation - max length', () => {
    it('should show error when input exceeds maxLength', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        maxLength: 5,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdefgh' } });
      await fireEvent.blur(input);

      expect(container.textContent).toContain('Must not exceed 5 characters');
    });

    it('should truncate input when it exceeds maxLength', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        maxLength: 5,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdefgh' } });

      expect(input.value).toBe('abcde');
    });

    it('should update character count as user types', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        maxLength: 10,
        showCharCount: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'hello' } });

      expect(container.textContent).toContain('5/10');
    });

    it('should show warning when approaching max length', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        maxLength: 10,
        showCharCount: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdefghij' } });

      const charCount = container.querySelector('.char-count');
      expect(charCount?.className).toContain('warning');
    });
  });

  describe('validation - pattern', () => {
    it('should validate against regex pattern', async () => {
      const { container } = render(TextInput, {
        variableName: 'email',
        pattern: '^[a-z0-9]+@[a-z]+\\.[a-z]{2,3}$',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'invalid-email' } });
      await fireEvent.blur(input);

      expect(container.textContent).toContain('Invalid format');
    });

    it('should not show error when pattern matches', async () => {
      const { container } = render(TextInput, {
        variableName: 'email',
        pattern: '^[a-z0-9]+@[a-z]+\\.[a-z]{2,3}$',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test@example.com' } });
      await fireEvent.blur(input);

      expect(container.textContent).not.toContain('Invalid format');
    });

    it('should handle invalid regex pattern gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(TextInput, {
        variableName: 'test',
        pattern: '[invalid(regex',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'test' } });
      await fireEvent.blur(input);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('state management', () => {
    it('should track touched state', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      // Should not show error before touched
      expect(container.textContent).not.toContain('This field is required');

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      // Should show error after touched
      expect(container.textContent).toContain('This field is required');
    });

    it('should reset touched state when cleared', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      const clearButton = container.querySelector('.clear-btn') as HTMLButtonElement;
      await fireEvent.click(clearButton);

      // Error should not show immediately after clear
      expect(container.textContent).not.toContain('This field is required');
    });

    it('should provide validity status in events', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      (component as any).$on('input', onInput);

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '' } });
      await fireEvent.blur(input);
      await fireEvent.input(input, { target: { value: 'valid' } });

      const lastCall = onInput.mock.calls[onInput.mock.calls.length - 1];
      expect(lastCall[0].detail.isValid).toBe(true);
    });
  });

  describe('progress bar', () => {
    it('should show progress bar when showCharCount is true', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        showCharCount: true,
        maxLength: 100,
      });

      const progressBar = container.querySelector('.progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('should update progress bar width based on input length', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        showCharCount: true,
        maxLength: 10,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'hello' } });

      const progressFill = container.querySelector('.progress-fill') as HTMLElement;
      expect(progressFill.style.width).toBe('50%');
    });

    it('should show warning color when over 80% capacity', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        showCharCount: true,
        maxLength: 10,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdefghi' } });

      const progressFill = container.querySelector('.progress-fill');
      expect(progressFill?.className).toContain('warning');
    });

    it('should show danger color when at 100% capacity', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        showCharCount: true,
        maxLength: 10,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abcdefghij' } });

      const progressFill = container.querySelector('.progress-fill');
      expect(progressFill?.className).toContain('danger');
    });
  });

  describe('multiline mode', () => {
    it('should render textarea with correct rows', () => {
      const { container } = render(TextInput, {
        variableName: 'description',
        multiline: true,
        rows: 5,
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
    });

    it('should handle textarea input', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'description',
        multiline: true,
      });

      (component as any).$on('input', onInput);

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await fireEvent.input(textarea, { target: { value: 'multiline\ntext' } });

      expect(onInput).toHaveBeenCalled();
      expect(onInput.mock.calls[0][0].detail.value).toBe('multiline\ntext');
    });

    it('should show clear button for textarea', () => {
      const { container } = render(TextInput, {
        variableName: 'description',
        multiline: true,
        initialValue: 'test',
      });

      const clearButton = container.querySelector('.clear-btn');
      expect(clearButton).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        disabled: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should not show clear button when disabled', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        disabled: true,
        initialValue: 'test',
      });

      const clearButton = container.querySelector('.clear-btn');
      expect(clearButton).toBeFalsy();
    });

    it('should disable submit button when disabled', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        disabled: true,
      });

      const submitButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Submit') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should disable submit button when invalid and touched', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      const submitButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Submit') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have correct aria-invalid attribute', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have aria-describedby when error present', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      expect(input.getAttribute('aria-describedby')).toBe('userName-error');
    });

    it('should have error role on error message', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.blur(input);

      const errorMessage = container.querySelector('.error-message');
      expect(errorMessage?.getAttribute('role')).toBe('alert');
    });

    it('should have accessible label', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        prompt: 'Enter name',
      });

      const label = container.querySelector('label');
      expect(label?.getAttribute('for')).toBe('userName');
    });

    it('should have accessible clear button', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: 'test',
      });

      const clearButton = container.querySelector('.clear-btn');
      expect(clearButton?.getAttribute('aria-label')).toBe('Clear input');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string as initial value', () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        initialValue: '',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle special characters in value', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
      });

      const input = container.querySelector('input') as HTMLInputElement;
      const specialChars = '<script>alert("test")</script>';
      await fireEvent.input(input, { target: { value: specialChars } });

      expect(input.value).toBe(specialChars);
    });

    it('should handle very long input', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        maxLength: 10,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      const longString = 'a'.repeat(100);
      await fireEvent.input(input, { target: { value: longString } });

      expect(input.value.length).toBe(10);
    });

    it('should handle rapid input changes', async () => {
      const { container, component } = render(TextInput, {
        variableName: 'userName',
      });

      (component as any).$on('input', onInput);

      const input = container.querySelector('input') as HTMLInputElement;

      for (let i = 0; i < 10; i++) {
        await fireEvent.input(input, { target: { value: `test${i}` } });
      }

      expect(onInput).toHaveBeenCalledTimes(10);
    });

    it('should handle whitespace-only input for required field', async () => {
      const { container } = render(TextInput, {
        variableName: 'userName',
        required: true,
      });

      const input = container.querySelector('input') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '   ' } });
      await fireEvent.blur(input);

      expect(container.textContent).toContain('This field is required');
    });
  });
});
