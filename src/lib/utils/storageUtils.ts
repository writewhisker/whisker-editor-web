/**
 * Storage Utilities
 *
 * Provides utilities for safe localStorage operations with proper error handling
 */

export interface StorageError {
  type: 'quota_exceeded' | 'not_available' | 'parse_error' | 'unknown';
  message: string;
  originalError?: Error;
}

export interface StorageResult<T = void> {
  success: boolean;
  error?: StorageError;
  data?: T;
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get estimated localStorage usage (in bytes)
 */
export function getStorageUsage(): number {
  if (!isLocalStorageAvailable()) return 0;

  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      // Count both key and value, plus overhead
      total += (key.length + (value?.length || 0)) * 2; // UTF-16 encoding
    }
  }
  return total;
}

/**
 * Get available storage quota (approximate - most browsers limit to 5-10MB)
 */
export function getApproximateQuota(): number {
  // Most browsers limit localStorage to 5-10MB
  // We'll use 5MB as a conservative estimate
  return 5 * 1024 * 1024; // 5MB in bytes
}

/**
 * Get percentage of storage used
 */
export function getStorageUsagePercentage(): number {
  const used = getStorageUsage();
  const quota = getApproximateQuota();
  return (used / quota) * 100;
}

/**
 * Check if we're approaching storage quota (>80%)
 */
export function isApproachingQuota(): boolean {
  return getStorageUsagePercentage() > 80;
}

/**
 * Estimate size of object when JSON stringified (in bytes)
 */
export function estimateObjectSize(obj: any): number {
  try {
    const str = JSON.stringify(obj);
    return str.length * 2; // UTF-16 encoding
  } catch {
    return 0;
  }
}

/**
 * Safe localStorage.setItem with proper error handling
 */
export function safeSetItem(key: string, value: string): StorageResult {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: {
        type: 'not_available',
        message: 'localStorage is not available in this browser',
      },
    };
  }

  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    const err = error as Error;

    // Detect QuotaExceededError
    if (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
      err.message?.includes('quota') ||
      err.message?.includes('storage')
    ) {
      return {
        success: false,
        error: {
          type: 'quota_exceeded',
          message: 'Storage quota exceeded. Try clearing old data or exporting your project.',
          originalError: err,
        },
      };
    }

    return {
      success: false,
      error: {
        type: 'unknown',
        message: err.message || 'Failed to save to localStorage',
        originalError: err,
      },
    };
  }
}

/**
 * Safe localStorage.getItem with proper error handling
 */
export function safeGetItem(key: string): StorageResult<string | null> {
  if (!isLocalStorageAvailable()) {
    return {
      success: false,
      error: {
        type: 'not_available',
        message: 'localStorage is not available in this browser',
      },
    };
  }

  try {
    const value = localStorage.getItem(key);
    return { success: true, data: value };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: {
        type: 'unknown',
        message: err.message || 'Failed to read from localStorage',
        originalError: err,
      },
    };
  }
}

/**
 * Safe JSON.parse with proper error handling
 */
export function safeJSONParse<T>(str: string): StorageResult<T> {
  try {
    const data = JSON.parse(str) as T;
    return { success: true, data };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: {
        type: 'parse_error',
        message: 'Failed to parse JSON data. Data may be corrupted.',
        originalError: err,
      },
    };
  }
}

/**
 * Safe setItem with JSON stringify
 */
export function safeSetJSON(key: string, value: any): StorageResult {
  try {
    const str = JSON.stringify(value);
    return safeSetItem(key, str);
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      error: {
        type: 'unknown',
        message: 'Failed to serialize data to JSON',
        originalError: err,
      },
    };
  }
}

/**
 * Safe getItem with JSON parse
 */
export function safeGetJSON<T>(key: string): StorageResult<T | null> {
  const result = safeGetItem(key);
  if (!result.success || !result.data) {
    return result;
  }

  return safeJSONParse<T>(result.data);
}

/**
 * Clear old data from localStorage to free up space
 * @param excludeKeys Keys to preserve
 */
export function clearOldData(excludeKeys: string[] = []): number {
  if (!isLocalStorageAvailable()) return 0;

  let clearedCount = 0;
  const keysToRemove: string[] = [];

  // Identify keys that can be cleared (not in exclude list)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !excludeKeys.includes(key)) {
      // Check if it's old data (timestamps, history, etc.)
      if (
        key.includes('-history') ||
        key.includes('-timestamp') ||
        key.includes('-preferences')
      ) {
        keysToRemove.push(key);
      }
    }
  }

  // Remove the identified keys
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      clearedCount++;
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  });

  return clearedCount;
}
