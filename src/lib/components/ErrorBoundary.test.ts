import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ErrorBoundary from './ErrorBoundary.svelte';

describe('ErrorBoundary', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original location for cleanup
    originalLocation = window.location;
    // Mock window.location.reload
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      reload: vi.fn(),
    };
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe('rendering without error', () => {
    it('should not show error UI when no error', () => {
      const { container } = render(ErrorBoundary);
      const text = container.textContent || '';
      expect(text).not.toContain('Oops! Something went wrong');
    });
  });

  describe('error handling', () => {
    it('should catch and display window error events', async () => {
      const { container } = render(ErrorBoundary);

      // Trigger an error event
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Test error message'),
        message: 'Test error message',
      });
      window.dispatchEvent(errorEvent);

      // Wait for component to update
      await new Promise(resolve => setTimeout(resolve, 0));

      const text = container.textContent || '';
      expect(text).toContain('Oops! Something went wrong');
      expect(text).toContain('Test error message');
    });

    it('should catch and display unhandled promise rejections', async () => {
      const { container } = render(ErrorBoundary);

      // Create a resolved promise and use it to avoid actual rejection in test environment
      const testError = new Error('Promise rejection test');
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(), // Use resolved promise to avoid test errors
        reason: testError,
      });

      // Manually call preventDefault to prevent actual unhandled rejection
      rejectionEvent.preventDefault();
      window.dispatchEvent(rejectionEvent);

      // Wait for component to update
      await new Promise(resolve => setTimeout(resolve, 0));

      const text = container.textContent || '';
      expect(text).toContain('Oops! Something went wrong');
      expect(text).toContain('Unhandled promise rejection');
      expect(text).toContain('Promise rejection test');
    });

    it('should handle non-Error rejection reasons', async () => {
      const { container } = render(ErrorBoundary);

      // Use resolved promise to avoid test errors
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: 'String rejection',
      });

      rejectionEvent.preventDefault();
      window.dispatchEvent(rejectionEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const text = container.textContent || '';
      expect(text).toContain('String rejection');
    });
  });

  describe('error UI', () => {
    it('should display all error UI elements', async () => {
      const { container } = render(ErrorBoundary);

      // Trigger an error
      const errorEvent = new ErrorEvent('error', {
        error: new Error('UI Test Error'),
        message: 'UI Test Error',
      });
      window.dispatchEvent(errorEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const text = container.textContent || '';

      // Check all UI elements
      expect(text).toContain('💥'); // Error icon
      expect(text).toContain('Oops! Something went wrong'); // Title
      expect(text).toContain('The application encountered an unexpected error'); // Subtitle
      expect(text).toContain('Error Details:'); // Error details section
      expect(text).toContain('UI Test Error'); // Error message
      expect(text).toContain('Your work is safe!'); // Recovery message
      expect(text).toContain('Auto-save has preserved your recent changes');
      expect(text).toContain('You can reload the page to recover');
      expect(text).toContain('Reload Application'); // Reload button
      expect(text).toContain('Try to Continue'); // Continue button

      // Check GitHub link
      const link = container.querySelector('a[href*="github.com"]');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toContain('whisker-editor-web/issues');
    });
  });

  describe('stack trace', () => {
    it('should show stack trace in details/summary', async () => {
      const { container } = render(ErrorBoundary);

      const testError = new Error('Stack trace test');
      const errorEvent = new ErrorEvent('error', {
        error: testError,
        message: 'Stack trace test',
      });
      window.dispatchEvent(errorEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const summary = container.querySelector('summary');
      expect(summary).toBeTruthy();
      expect(summary?.textContent).toContain('Show stack trace');
    });

    it('should display stack trace in pre element', async () => {
      const { container } = render(ErrorBoundary);

      const testError = new Error('Stack test');
      const errorEvent = new ErrorEvent('error', {
        error: testError,
        message: 'Stack test',
      });
      window.dispatchEvent(errorEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();
      // Stack trace should contain the error message
      expect(pre?.textContent).toContain('Error: Stack test');
    });
  });

  describe('reload action', () => {
    it('should call window.location.reload when reload button clicked', async () => {
      const { container, component } = render(ErrorBoundary);

      const errorEvent = new ErrorEvent('error', {
        error: new Error('Reload test'),
        message: 'Reload test',
      });
      window.dispatchEvent(errorEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      const reloadButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Reload Application')
      );

      expect(reloadButton).toBeTruthy();

      if (reloadButton) {
        await fireEvent.click(reloadButton);
        expect(window.location.reload).toHaveBeenCalled();
      }
    });
  });

  describe('clear error action', () => {
    it('should clear error when continue button clicked', async () => {
      const { container } = render(ErrorBoundary);

      // Trigger error
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Clear test'),
        message: 'Clear test',
      });
      window.dispatchEvent(errorEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify error is shown
      let text = container.textContent || '';
      expect(text).toContain('Oops! Something went wrong');

      // Click continue button
      const continueButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Try to Continue')
      );

      expect(continueButton).toBeTruthy();

      if (continueButton) {
        await fireEvent.click(continueButton);

        // Wait for update
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify error is cleared
        text = container.textContent || '';
        expect(text).not.toContain('Oops! Something went wrong');
      }
    });
  });
});
