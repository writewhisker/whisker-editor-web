/**
 * Tests for Error Handling Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorCategory,
  ErrorSeverity,
  createError,
  classifyError,
  isRetryableError,
  getUserFriendlyMessage,
  withRetry,
  handleError,
  isOnline,
  waitForOnline,
  whenOnline,
} from './errorHandling';

describe('Error Handling Utilities', () => {
  describe('Error Classification', () => {
    it('should classify network errors', () => {
      const error = { message: 'Network timeout', status: 0 };
      expect(classifyError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should classify authentication errors', () => {
      const error = { message: 'Unauthorized', status: 401 };
      expect(classifyError(error)).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should classify storage errors', () => {
      const error = { message: 'QuotaExceededError: Storage full', name: 'QuotaExceededError' };
      expect(classifyError(error)).toBe(ErrorCategory.STORAGE);
    });

    it('should classify validation errors', () => {
      const error = { message: 'Invalid input', status: 400 };
      expect(classifyError(error)).toBe(ErrorCategory.VALIDATION);
    });

    it('should classify sync errors', () => {
      const error = { message: 'Sync conflict detected', status: 409 };
      expect(classifyError(error)).toBe(ErrorCategory.SYNC);
    });

    it('should default to unknown category', () => {
      const error = { message: 'Something weird happened' };
      expect(classifyError(error)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('Retryable Error Detection', () => {
    it('should mark network errors as retryable', () => {
      expect(isRetryableError('Network timeout', ErrorCategory.NETWORK)).toBe(true);
    });

    it('should mark unauthorized errors as non-retryable', () => {
      expect(isRetryableError('Unauthorized access', ErrorCategory.AUTHENTICATION)).toBe(false);
    });

    it('should mark quota errors as non-retryable', () => {
      expect(isRetryableError('Quota exceeded', ErrorCategory.STORAGE)).toBe(false);
    });

    it('should mark rate limit errors as retryable', () => {
      expect(isRetryableError('Rate limit exceeded (429)', ErrorCategory.UNKNOWN)).toBe(true);
    });

    it('should mark 500 errors as retryable', () => {
      expect(isRetryableError('Internal server error 500', ErrorCategory.UNKNOWN)).toBe(true);
    });

    it('should mark sync errors as retryable', () => {
      expect(isRetryableError('Sync failed', ErrorCategory.SYNC)).toBe(true);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide network error message', () => {
      const message = getUserFriendlyMessage('Connection failed', ErrorCategory.NETWORK);
      expect(message).toContain('internet connection');
    });

    it('should provide timeout message', () => {
      const message = getUserFriendlyMessage('Request timeout', ErrorCategory.NETWORK);
      expect(message).toContain('timed out');
    });

    it('should provide auth error message', () => {
      const message = getUserFriendlyMessage('Token expired', ErrorCategory.AUTHENTICATION);
      expect(message).toContain('sign in');
    });

    it('should provide storage quota message', () => {
      const message = getUserFriendlyMessage('Quota exceeded', ErrorCategory.STORAGE);
      expect(message).toContain('Storage is full');
    });

    it('should provide conflict message', () => {
      const message = getUserFriendlyMessage('Conflict detected', ErrorCategory.SYNC);
      expect(message).toContain('conflict');
    });
  });

  describe('Create Error', () => {
    it('should create error with all fields', () => {
      const error = createError(
        'Test error',
        ErrorCategory.NETWORK,
        ErrorSeverity.ERROR,
        {
          userMessage: 'Something went wrong',
          retryable: true,
          context: { location: 'test' },
        }
      );

      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.userMessage).toBe('Something went wrong');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ location: 'test' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should auto-generate user message', () => {
      const error = createError('Network timeout', ErrorCategory.NETWORK);
      expect(error.userMessage).toContain('internet connection');
    });

    it('should auto-determine retryability', () => {
      const retryable = createError('Network error', ErrorCategory.NETWORK);
      const nonRetryable = createError('Unauthorized', ErrorCategory.AUTHENTICATION);

      expect(retryable.retryable).toBe(true);
      expect(nonRetryable.retryable).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Network timeout'), { status: 0 }))
        .mockRejectedValueOnce(Object.assign(new Error('Network timeout'), { status: 0 }))
        .mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10, // Fast for testing
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Network error 503'), { status: 503 })
      );

      await expect(
        withRetry(operation, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow('Network error 503');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { status: 401 })
      );

      await expect(
        withRetry(operation, { maxRetries: 3 })
      ).rejects.toThrow('Unauthorized');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Network error'), { status: 0 }))
        .mockResolvedValue('success');

      await withRetry(operation, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('handleError', () => {
    it('should handle error and return AppError', () => {
      const error = new Error('Test error');
      const appError = handleError(error, 'TestContext', { silent: true });

      expect(appError.message).toBe('Test error');
      expect(appError.category).toBeDefined();
      expect(appError.severity).toBeDefined();
      expect(appError.context?.location).toBe('TestContext');
    });

    it('should call notify callback', () => {
      const notify = vi.fn();
      const error = new Error('Test error');

      handleError(error, 'TestContext', { notify });

      expect(notify).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status', () => {
      // This depends on browser environment
      const online = isOnline();
      expect(typeof online).toBe('boolean');
    });

    it('should wait for online connection', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const result = await waitForOnline(1000);
      expect(result).toBe(true);
    });

    it('should timeout if offline too long', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const result = await waitForOnline(100);
      expect(result).toBe(false);
    });
  });

  describe('whenOnline', () => {
    it('should execute operation when online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const operation = vi.fn().mockResolvedValue('success');
      const result = await whenOnline(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw error if offline and cannot wait', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const operation = vi.fn().mockResolvedValue('success');

      await expect(
        whenOnline(operation, { waitTimeout: 100 })
      ).rejects.toThrow();
    });
  });
});
