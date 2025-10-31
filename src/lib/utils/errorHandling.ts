/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling patterns across the application,
 * including retry logic, error classification, and user-friendly messages.
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  STORAGE = 'storage',
  AUTHENTICATION = 'auth',
  VALIDATION = 'validation',
  SYNC = 'sync',
  UNKNOWN = 'unknown',
}

export interface AppError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError?: Error;
  userMessage?: string;
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Create a structured error object
 */
export function createError(
  message: string,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options: {
    originalError?: Error;
    userMessage?: string;
    retryable?: boolean;
    context?: Record<string, any>;
  } = {}
): AppError {
  return {
    message,
    category,
    severity,
    originalError: options.originalError,
    userMessage: options.userMessage || getUserFriendlyMessage(message, category),
    retryable: options.retryable ?? isRetryableError(message, category),
    timestamp: new Date(),
    context: options.context,
  };
}

/**
 * Classify error by analyzing the error object
 */
export function classifyError(error: any): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;

  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.statusCode;

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    status === 0 ||
    error.name === 'NetworkError'
  ) {
    return ErrorCategory.NETWORK;
  }

  // Auth errors
  if (
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('token')
  ) {
    return ErrorCategory.AUTHENTICATION;
  }

  // Storage errors
  if (
    message.includes('quota') ||
    message.includes('storage') ||
    message.includes('indexeddb') ||
    message.includes('localstorage') ||
    error.name === 'QuotaExceededError'
  ) {
    return ErrorCategory.STORAGE;
  }

  // Validation errors
  if (
    status === 400 ||
    status === 422 ||
    message.includes('validation') ||
    message.includes('invalid')
  ) {
    return ErrorCategory.VALIDATION;
  }

  // Sync errors
  if (
    message.includes('sync') ||
    message.includes('conflict') ||
    status === 409
  ) {
    return ErrorCategory.SYNC;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(message: string, category: ErrorCategory): boolean {
  const lowerMessage = message.toLowerCase();

  // Network errors are generally retryable
  if (category === ErrorCategory.NETWORK) {
    return true;
  }

  // Specific non-retryable cases
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('quota exceeded') ||
    lowerMessage.includes('invalid')
  ) {
    return false;
  }

  // Rate limiting is retryable
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return true;
  }

  // Temporary server errors are retryable
  if (lowerMessage.includes('500') || lowerMessage.includes('503')) {
    return true;
  }

  // Default based on category
  return category === ErrorCategory.SYNC || category === ErrorCategory.NETWORK;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(message: string, category: ErrorCategory): string {
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (category === ErrorCategory.NETWORK) {
    if (lowerMessage.includes('timeout')) {
      return 'The request timed out. Please check your internet connection and try again.';
    }
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Auth errors
  if (category === ErrorCategory.AUTHENTICATION) {
    if (lowerMessage.includes('token')) {
      return 'Your session has expired. Please sign in again.';
    }
    return 'Authentication failed. Please sign in again.';
  }

  // Storage errors
  if (category === ErrorCategory.STORAGE) {
    if (lowerMessage.includes('quota')) {
      return 'Storage is full. Please free up space or save to a file.';
    }
    return 'Unable to save locally. Please try saving to a file instead.';
  }

  // Sync errors
  if (category === ErrorCategory.SYNC) {
    if (lowerMessage.includes('conflict')) {
      return 'Changes conflict with remote version. Please review and resolve conflicts.';
    }
    return 'Sync failed. Your changes are saved locally and will sync when possible.';
  }

  // Validation errors
  if (category === ErrorCategory.VALIDATION) {
    return 'Invalid data. Please check your input and try again.';
  }

  // Default
  return 'An error occurred. Please try again.';
}

/**
 * Retry logic with exponential backoff
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const category = classifyError(error);
      if (!isRetryableError(error.message || '', category)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Handle error with logging and optional notification
 */
export function handleError(
  error: any,
  context: string,
  options: {
    silent?: boolean;
    notify?: (message: string, severity: ErrorSeverity) => void;
  } = {}
): AppError {
  const category = classifyError(error);
  const severity = determineSeverity(error, category);

  const appError = createError(
    error.message || 'An error occurred',
    category,
    severity,
    {
      originalError: error,
      context: { location: context },
    }
  );

  // Log the error
  if (!options.silent) {
    const logFn = severity === ErrorSeverity.CRITICAL ? console.error : console.warn;
    logFn(`[${context}] ${appError.message}`, error);
  }

  // Notify user if callback provided
  if (options.notify) {
    options.notify(appError.userMessage || appError.message, severity);
  }

  return appError;
}

/**
 * Determine error severity
 */
function determineSeverity(error: any, category: ErrorCategory): ErrorSeverity {
  const message = error.message?.toLowerCase() || '';

  // Critical errors
  if (
    message.includes('critical') ||
    message.includes('fatal') ||
    category === ErrorCategory.AUTHENTICATION
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // Warnings
  if (
    message.includes('deprecated') ||
    message.includes('warning') ||
    category === ErrorCategory.STORAGE
  ) {
    return ErrorSeverity.WARNING;
  }

  // Default to error
  return ErrorSeverity.ERROR;
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeout: number = 60000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      resolve(false);
    }, timeout);

    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };

    window.addEventListener('online', onlineHandler);
  });
}

/**
 * Execute operation only when online
 */
export async function whenOnline<T>(
  operation: () => Promise<T>,
  options: {
    waitTimeout?: number;
    offlineMessage?: string;
  } = {}
): Promise<T> {
  if (!isOnline()) {
    const online = await waitForOnline(options.waitTimeout);
    if (!online) {
      throw new Error(
        options.offlineMessage || 'Operation requires internet connection'
      );
    }
  }

  return operation();
}
