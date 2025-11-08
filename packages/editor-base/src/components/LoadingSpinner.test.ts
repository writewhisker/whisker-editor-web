import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LoadingSpinner from './LoadingSpinner.svelte';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      const { container } = render(LoadingSpinner);
      expect(container.querySelector('.animate-spin')).toBeTruthy();
    });

    it('should display default message', () => {
      const { getByText } = render(LoadingSpinner);
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should display custom message', () => {
      const { getByText } = render(LoadingSpinner, {
        props: { message: 'Please wait' },
      });
      expect(getByText('Please wait')).toBeTruthy();
    });

    it('should not display message when empty', () => {
      const { container } = render(LoadingSpinner, { props: { message: '' } });
      const text = container.textContent || '';
      expect(text.trim()).toBe('');
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(LoadingSpinner, { props: { size: 'small' } });
      const spinner = container.querySelector('.w-4.h-4');
      expect(spinner).toBeTruthy();
    });

    it('should render medium size by default', () => {
      const { container } = render(LoadingSpinner);
      const spinner = container.querySelector('.w-8.h-8');
      expect(spinner).toBeTruthy();
    });

    it('should render large size', () => {
      const { container } = render(LoadingSpinner, { props: { size: 'large' } });
      const spinner = container.querySelector('.w-12.h-12');
      expect(spinner).toBeTruthy();
    });
  });

  describe('structure', () => {
    it('should have spinner with blue colors', () => {
      const { container } = render(LoadingSpinner);
      const blueElements = container.querySelectorAll('.border-blue-200, .border-blue-600');
      expect(blueElements.length).toBeGreaterThan(0);
    });

    it('should have transparent border on spinning element', () => {
      const { container } = render(LoadingSpinner);
      const spinningElement = container.querySelector('.border-t-transparent');
      expect(spinningElement).toBeTruthy();
    });
  });
});
