/**
 * Comprehensive tests for GitHub utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isOnline, withRetry } from './utils';

describe('GitHub Utils', () => {
  describe('isOnline', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('should return true when navigator.onLine is true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });
      expect(isOnline()).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });
      expect(isOnline()).toBe(false);
    });

    it('should return true when navigator is undefined (SSR)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isOnline()).toBe(true);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const promise = withRetry(fn);

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      const promise = withRetry(fn, { maxRetries: 2, initialDelay: 100 });

      // Handle rejection expectation first to avoid unhandled rejection warning
      const expectation = expect(promise).rejects.toThrow('fail');
      await vi.runAllTimersAsync();
      await expectation;
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry on 4xx client errors', async () => {
      const clientError = new Error('Not Found');
      (clientError as any).status = 404;

      const fn = vi.fn().mockRejectedValue(clientError);
      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await expect(promise).rejects.toThrow('Not Found');
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on 400 bad request', async () => {
      const badRequest = new Error('Bad Request');
      (badRequest as any).status = 400;

      const fn = vi.fn().mockRejectedValue(badRequest);
      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await expect(promise).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 unauthorized', async () => {
      const unauthorized = new Error('Unauthorized');
      (unauthorized as any).status = 401;

      const fn = vi.fn().mockRejectedValue(unauthorized);
      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await expect(promise).rejects.toThrow('Unauthorized');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limit', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      const fn = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success after rate limit');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success after rate limit');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx server errors', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      const fn = vi.fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce('recovered');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 service unavailable', async () => {
      const serviceUnavailable = new Error('Service Unavailable');
      (serviceUnavailable as any).status = 503;

      const fn = vi.fn()
        .mockRejectedValueOnce(serviceUnavailable)
        .mockRejectedValueOnce(serviceUnavailable)
        .mockResolvedValueOnce('recovered');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2,
      });

      // First call happens immediately
      expect(fn).toHaveBeenCalledTimes(1);

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should respect maxDelay option', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, {
        maxRetries: 5,
        initialDelay: 100,
        backoffFactor: 10,
        maxDelay: 500, // Should cap at 500ms
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should use default options when none provided', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const promise = withRetry(fn);

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle errors without status code', async () => {
      const genericError = new Error('Network error');

      const fn = vi.fn()
        .mockRejectedValueOnce(genericError)
        .mockResolvedValueOnce('recovered');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle statusCode property (alternative error format)', async () => {
      const errorWithStatusCode = new Error('Bad Request');
      (errorWithStatusCode as any).statusCode = 400;

      const fn = vi.fn().mockRejectedValue(errorWithStatusCode);
      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

      await expect(promise).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
