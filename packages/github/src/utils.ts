/**
 * Utility functions for GitHub package
 */

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Retry configuration
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      const status = error.status || error.statusCode;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}
