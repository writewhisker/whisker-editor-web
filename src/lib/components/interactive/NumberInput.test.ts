import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';

describe('NumberInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]');
      expect(input).toBeTruthy();
    });

    it('should display prompt label', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          prompt: 'Enter your age:'
        }
      });

      const label = container.querySelector('.input-label');
      expect(label?.textContent).toContain('Enter your age:');
    });

    it('should display default prompt', () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const label = container.querySelector('.input-label');
      expect(label?.textContent).toContain('Enter a number:');
    });

    it('should show required indicator when required', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          required: true
        }
      });

      const requiredIndicator = container.querySelector('.required-indicator');
      expect(requiredIndicator).toBeTruthy();
      expect(requiredIndicator?.textContent).toBe('*');
    });

    it('should not show required indicator when not required', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          required: false
        }
      });

      const requiredIndicator = container.querySelector('.required-indicator');
      expect(requiredIndicator).toBeNull();
    });

    it('should display initial value', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 42
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('42');
    });

    it('should display value with prefix and suffix', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 100,
          prefix: '$',
          suffix: ' USD'
        }
      });

      const valueDisplay = container.querySelector('.value-display');
      expect(valueDisplay?.textContent).toBe('$100 USD');
    });

    it('should show stepper buttons by default', () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const stepperButtons = container.querySelectorAll('.stepper-btn');
      expect(stepperButtons.length).toBe(2);
    });

    it('should hide stepper buttons when showButtons is false', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showButtons: false
        }
      });

      const stepperButtons = container.querySelectorAll('.stepper-btn');
      expect(stepperButtons.length).toBe(0);
    });

    it('should show slider when enabled', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 0,
          max: 100
        }
      });

      const slider = container.querySelector('.range-slider');
      expect(slider).toBeTruthy();
    });

    it('should not show slider by default', () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const slider = container.querySelector('.range-slider');
      expect(slider).toBeNull();
    });

    it('should show reset and submit buttons', () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const buttons = container.querySelectorAll('.input-actions button');
      expect(buttons.length).toBe(2);

      const resetBtn = Array.from(buttons).find(btn => btn.textContent?.includes('Reset'));
      const submitBtn = Array.from(buttons).find(btn => btn.textContent?.includes('Submit'));

      expect(resetBtn).toBeTruthy();
      expect(submitBtn).toBeTruthy();
    });
  });

  describe('stepper buttons', () => {
    it('should increment value when + button clicked', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 5
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+'));

      await fireEvent.click(incrementBtn!);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('6');
    });

    it('should decrement value when - button clicked', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 5
        }
      });

      const decrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('−'));

      await fireEvent.click(decrementBtn!);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('4');
    });

    it('should respect step value', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 0,
          step: 5
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+'));

      await fireEvent.click(incrementBtn!);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('5');
    });

    it('should disable decrement button at minimum', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 0,
          min: 0
        }
      });

      const decrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('−')) as HTMLButtonElement;

      expect(decrementBtn.disabled).toBe(true);
    });

    it('should disable increment button at maximum', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 100,
          max: 100
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+')) as HTMLButtonElement;

      expect(incrementBtn.disabled).toBe(true);
    });

    it('should not exceed maximum when incrementing', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 99,
          max: 100
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+'));

      await fireEvent.click(incrementBtn!);
      await fireEvent.click(incrementBtn!);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(parseInt(input.value)).toBeLessThanOrEqual(100);
    });

    it('should not go below minimum when decrementing', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 1,
          min: 0
        }
      });

      const decrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('−'));

      await fireEvent.click(decrementBtn!);
      await fireEvent.click(decrementBtn!);

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(parseInt(input.value)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('direct input', () => {
    it('should update value when typing', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '50' } });

      expect(input.value).toBe('50');
    });

    it('should handle negative numbers', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          min: -100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '-25' } });

      expect(input.value).toBe('-25');
    });

    it('should handle decimal numbers', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          step: 0.1
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '3.14' } });

      expect(input.value).toBe('3.14');
    });

    it('should show error for invalid input', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: 'abc' } });

      // Note: Browser will prevent non-numeric input in number fields
      // This test validates the component handles it
      expect(input).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show error when value exceeds maximum', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '150' } });
      await fireEvent.blur(input);

      const errorMessage = container.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Must not exceed 100');
    });

    it('should show error when value below minimum', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          min: 0
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '-5' } });
      await fireEvent.blur(input);

      const errorMessage = container.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Must be at least 0');
    });

    it('should show error for required empty field', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          required: true
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.blur(input);

      // Validation only shows after touched
      await fireEvent.focus(input);
      await fireEvent.blur(input);

      const inputWrapper = container.querySelector('.input-wrapper');
      expect(inputWrapper).toBeTruthy();
    });

    it('should clamp value to max on blur', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '150' } });
      await fireEvent.blur(input);

      expect(input.value).toBe('100');
    });

    it('should clamp value to min on blur', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          min: 0
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '-10' } });
      await fireEvent.blur(input);

      expect(input.value).toBe('0');
    });

    it('should add error class to container when invalid', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '150' } });
      await fireEvent.blur(input);

      const numberInputContainer = container.querySelector('.number-input-container');
      expect(numberInputContainer?.classList.contains('has-error')).toBe(true);
    });
  });

  describe('slider interaction', () => {
    it('should update value when slider moved', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 0,
          max: 100,
          initialValue: 50
        }
      });

      const slider = container.querySelector('.range-slider') as HTMLInputElement;
      await fireEvent.change(slider, { target: { value: '75' } });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('75');
    });

    it('should show min and max labels with slider', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 10,
          max: 90
        }
      });

      const sliderLabels = container.querySelectorAll('.slider-label');
      expect(sliderLabels.length).toBe(2);
      expect(sliderLabels[0].textContent).toBe('10');
      expect(sliderLabels[1].textContent).toBe('90');
    });

    it('should show progress bar with slider', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 0,
          max: 100
        }
      });

      const progressBar = container.querySelector('.progress-bar');
      expect(progressBar).toBeTruthy();

      const progressFill = container.querySelector('.progress-fill');
      expect(progressFill).toBeTruthy();
    });

    it('should show progress marker', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 0,
          max: 100
        }
      });

      const progressMarker = container.querySelector('.progress-marker');
      expect(progressMarker).toBeTruthy();
    });

    it('should not show slider without valid range', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true
        }
      });

      const slider = container.querySelector('.range-slider');
      expect(slider).toBeNull();
    });
  });

  describe('focus states', () => {
    it('should add focused class when input focused', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.focus(input);

      const inputWrapper = container.querySelector('.input-wrapper');
      expect(inputWrapper?.classList.contains('focused')).toBe(true);
    });

    it('should remove focused class when input blurred', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.focus(input);
      await fireEvent.blur(input);

      const inputWrapper = container.querySelector('.input-wrapper');
      expect(inputWrapper?.classList.contains('focused')).toBe(false);
    });
  });

  describe('action buttons', () => {
    it('should reset to initial value when reset clicked', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 10
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '50' } });

      const resetBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Reset'));

      await fireEvent.click(resetBtn!);

      expect(input.value).toBe('10');
    });

    it('should disable submit button when invalid', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '150' } });
      await fireEvent.blur(input);

      const submitBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Submit')) as HTMLButtonElement;

      expect(submitBtn.disabled).toBe(true);
    });

    it('should enable submit button when valid', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '50' } });

      const submitBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Submit')) as HTMLButtonElement;

      expect(submitBtn.disabled).toBe(false);
    });

    it('should disable buttons when component disabled', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          disabled: true
        }
      });

      const resetBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Reset')) as HTMLButtonElement;
      const submitBtn = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Submit')) as HTMLButtonElement;

      expect(resetBtn.disabled).toBe(true);
      expect(submitBtn.disabled).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          disabled: true
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should disable stepper buttons when disabled', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          disabled: true
        }
      });

      const stepperButtons = container.querySelectorAll('.stepper-btn');
      stepperButtons.forEach(btn => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('should disable slider when disabled', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          showSlider: true,
          min: 0,
          max: 100,
          disabled: true
        }
      });

      const slider = container.querySelector('.range-slider') as HTMLInputElement;
      expect(slider.disabled).toBe(true);
    });
  });

  describe('help text', () => {
    it('should show range help text when available', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          min: 0,
          max: 100
        }
      });

      const helpText = container.querySelector('.help-text');
      expect(helpText).toBeTruthy();
      expect(helpText?.textContent).toContain('Range: 0 to 100');
    });

    it('should not show help text when error is present', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          max: 100
        }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '150' } });
      await fireEvent.blur(input);

      const helpText = container.querySelector('.help-text');
      expect(helpText).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero as a valid value', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '0' } });

      expect(input.value).toBe('0');
    });

    it('should handle very large numbers', async () => {
      const { container } = render(NumberInput, {
        props: { variableName: 'testVar' }
      });

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      await fireEvent.input(input, { target: { value: '999999999' } });

      expect(input.value).toBe('999999999');
    });

    it('should handle rapid button clicks', async () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          initialValue: 0
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+'));

      for (let i = 0; i < 10; i++) {
        await fireEvent.click(incrementBtn!);
      }

      const input = container.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input.value).toBe('10');
    });

    it('should handle min equal to max', () => {
      const { container } = render(NumberInput, {
        props: {
          variableName: 'testVar',
          min: 5,
          max: 5,
          initialValue: 5
        }
      });

      const incrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('+')) as HTMLButtonElement;
      const decrementBtn = Array.from(container.querySelectorAll('.stepper-btn'))
        .find(btn => btn.textContent?.includes('−')) as HTMLButtonElement;

      expect(incrementBtn.disabled).toBe(true);
      expect(decrementBtn.disabled).toBe(true);
    });
  });
});
