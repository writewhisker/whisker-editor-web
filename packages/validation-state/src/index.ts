/**
 * Validation State
 *
 * Generic validation state management for real-time validation in Svelte apps.
 * Designed to work with any validation system or framework.
 */

import { writable, derived } from 'svelte/store';

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = string;

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  description?: string;
  fixable?: boolean;
  fixDescription?: string;
  // Context fields (optional, depends on use case)
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  timestamp: number;
  duration: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

export interface ValidationOptions {
  includeWarnings: boolean;
  includeInfo: boolean;
  skipSlowChecks: boolean;
  categories: string[];
}

export interface ValidatorConfig {
  enabled: boolean;
  severity?: ValidationSeverity;
}

export type ValidatorConfigMap = Record<string, ValidatorConfig>;

// Storage keys
const STORAGE_KEY_OPTIONS = 'validation_options';
const STORAGE_KEY_AUTO_VALIDATE = 'auto_validate';
const STORAGE_KEY_VALIDATOR_CONFIG = 'validator_config';

// Storage adapter interface
export interface ValidationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Default localStorage adapter
const defaultStorage: ValidationStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

let storage: ValidationStorage = defaultStorage;

export function configureValidationStorage(adapter: ValidationStorage): void {
  storage = adapter;
}

// Load settings
function loadOptions(): ValidationOptions {
  try {
    const saved = storage.getItem(STORAGE_KEY_OPTIONS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load validation options:', error);
  }
  return {
    includeWarnings: true,
    includeInfo: true,
    skipSlowChecks: false,
    categories: [],
  };
}

function loadAutoValidate(): boolean {
  try {
    const saved = storage.getItem(STORAGE_KEY_AUTO_VALIDATE);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch (error) {
    console.error('Failed to load auto-validate setting:', error);
  }
  return true;
}

function loadValidatorConfig(): ValidatorConfigMap {
  try {
    const saved = storage.getItem(STORAGE_KEY_VALIDATOR_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load validator config:', error);
  }
  return {};
}

// Validation state stores
export const validationResult = writable<ValidationResult | null>(null);
export const isValidating = writable<boolean>(false);
export const autoValidate = writable<boolean>(loadAutoValidate());
export const validationOptions = writable<ValidationOptions>(loadOptions());
export const validatorConfig = writable<ValidatorConfigMap>(loadValidatorConfig());

// Validation history
export const validationHistory = writable<ValidationResult[]>([]);
const MAX_HISTORY = 20;

// Derived stores
export const hasErrors = derived(validationResult, ($result) => {
  return $result ? $result.errorCount > 0 : false;
});

export const hasWarnings = derived(validationResult, ($result) => {
  return $result ? $result.warningCount > 0 : false;
});

export const isValid = derived(validationResult, ($result) => {
  return $result ? $result.valid : true;
});

export const errorCount = derived(validationResult, ($result) => {
  return $result?.errorCount || 0;
});

export const warningCount = derived(validationResult, ($result) => {
  return $result?.warningCount || 0;
});

export const infoCount = derived(validationResult, ($result) => {
  return $result?.infoCount || 0;
});

// Performance metrics
export const performanceMetrics = derived(validationHistory, ($history) => {
  if ($history.length === 0) {
    return null;
  }

  const durations = $history.map(h => h.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  let trend: 'improving' | 'degrading' | 'stable' = 'stable';
  if ($history.length >= 4) {
    const mid = Math.floor($history.length / 2);
    const recentAvg = durations.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const olderAvg = durations.slice(mid).reduce((a, b) => a + b, 0) / (durations.length - mid);

    if (recentAvg < olderAvg * 0.9) {
      trend = 'improving';
    } else if (recentAvg > olderAvg * 1.1) {
      trend = 'degrading';
    }
  }

  return {
    avgDuration: Math.round(avgDuration),
    minDuration,
    maxDuration,
    trend,
    totalRuns: $history.length,
  };
});

/**
 * Set validation result
 */
export function setValidationResult(result: ValidationResult): void {
  validationResult.set(result);

  // Add to history
  validationHistory.update(history => {
    const newHistory = [result, ...history];
    return newHistory.slice(0, MAX_HISTORY);
  });
}

/**
 * Clear validation results
 */
export function clearValidation(): void {
  validationResult.set(null);
  isValidating.set(false);
}

/**
 * Update validation options
 */
export function setValidationOptions(options: Partial<ValidationOptions>): void {
  validationOptions.update((current) => ({
    ...current,
    ...options,
  }));
}

/**
 * Toggle auto-validation
 */
export function setAutoValidate(enabled: boolean): void {
  autoValidate.set(enabled);
}

/**
 * Update validator configuration
 */
export function setValidatorEnabled(validatorName: string, enabled: boolean): void {
  validatorConfig.update(config => ({
    ...config,
    [validatorName]: { ...config[validatorName], enabled },
  }));
}

/**
 * Reset validator configuration to defaults
 */
export function resetValidatorConfig(): void {
  validatorConfig.set({});
}

/**
 * Clear validation history
 */
export function clearValidationHistory(): void {
  validationHistory.set([]);
}

// Save settings to storage when they change
validationOptions.subscribe((options) => {
  try {
    storage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(options));
  } catch (error) {
    console.error('Failed to save validation options:', error);
  }
});

autoValidate.subscribe((enabled) => {
  try {
    storage.setItem(STORAGE_KEY_AUTO_VALIDATE, String(enabled));
  } catch (error) {
    console.error('Failed to save auto-validate setting:', error);
  }
});

validatorConfig.subscribe((config) => {
  try {
    storage.setItem(STORAGE_KEY_VALIDATOR_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save validator config:', error);
  }
});
