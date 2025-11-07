/**
 * Auto-Save Utility
 *
 * Provides automatic saving to localStorage to prevent data loss.
 * - Auto-saves every 30 seconds
 * - Detects unsaved changes on page load
 * - Offers recovery after crash/refresh
 */

import type { Story } from '@whisker/core-ts';
import { safeSetJSON, safeGetJSON, safeSetItem, type StorageResult } from './storageUtils';

const AUTO_SAVE_KEY = 'whisker-autosave';
const AUTO_SAVE_TIMESTAMP_KEY = 'whisker-autosave-timestamp';
const AUTO_SAVE_INTERVAL_KEY = 'whisker-autosave-interval';
const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Get the auto-save interval from localStorage (or use default)
 */
export function getAutoSaveInterval(): number {
  try {
    const saved = localStorage.getItem(AUTO_SAVE_INTERVAL_KEY);
    if (saved) {
      const interval = parseInt(saved, 10);
      // Validate: must be between 10 seconds and 10 minutes
      if (interval >= 10000 && interval <= 600000) {
        return interval;
      }
    }
  } catch (error) {
    console.error('Failed to load auto-save interval:', error);
  }
  return DEFAULT_AUTO_SAVE_INTERVAL;
}

/**
 * Set the auto-save interval in localStorage
 */
export function setAutoSaveInterval(intervalMs: number): void {
  try {
    // Validate: must be between 10 seconds and 10 minutes
    if (intervalMs >= 10000 && intervalMs <= 600000) {
      localStorage.setItem(AUTO_SAVE_INTERVAL_KEY, intervalMs.toString());
    } else {
      throw new Error('Interval must be between 10 seconds and 10 minutes');
    }
  } catch (error) {
    console.error('Failed to set auto-save interval:', error);
    throw error;
  }
}

export interface AutoSaveData {
  story: any;
  timestamp: number;
  storyTitle: string;
}

/**
 * Save story to localStorage
 */
export function saveToLocalStorage(story: Story): StorageResult {
  const data: AutoSaveData = {
    story: story.serialize(),
    timestamp: Date.now(),
    storyTitle: story.metadata.title || 'Untitled Story',
  };

  const result = safeSetJSON(AUTO_SAVE_KEY, data);

  if (result.success) {
    // Also save timestamp separately for quick access
    safeSetItem(AUTO_SAVE_TIMESTAMP_KEY, data.timestamp.toString());
  }

  return result;
}

/**
 * Load auto-saved story from localStorage
 */
export function loadFromLocalStorage(): AutoSaveData | null {
  const result = safeGetJSON<AutoSaveData>(AUTO_SAVE_KEY);

  if (!result.success || !result.data) {
    if (result.error?.type === 'parse_error') {
      // Data is corrupted, clear it
      clearLocalStorage();
    }
    return null;
  }

  const data = result.data;

  // Validate data structure
  if (!data.story || !data.timestamp) {
    clearLocalStorage();
    return null;
  }

  return data;
}

/**
 * Clear auto-save from localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
    localStorage.removeItem(AUTO_SAVE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Check if there's a recent auto-save (within last 24 hours)
 */
export function hasRecentAutoSave(): boolean {
  try {
    const timestampStr = localStorage.getItem(AUTO_SAVE_TIMESTAMP_KEY);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return age < twentyFourHours;
  } catch (error) {
    return false;
  }
}

/**
 * Format timestamp for display
 */
export function formatAutoSaveTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Auto-save manager
 */
export class AutoSaveManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private saveCallback: (() => void) | null = null;

  /**
   * Start auto-saving
   */
  start(callback: () => void): void {
    this.stop(); // Clear any existing interval
    this.saveCallback = callback;

    const interval = getAutoSaveInterval();
    this.intervalId = setInterval(() => {
      if (this.saveCallback) {
        this.saveCallback();
      }
    }, interval);
  }

  /**
   * Stop auto-saving
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Trigger immediate save
   */
  saveNow(): void {
    if (this.saveCallback) {
      this.saveCallback();
    }
  }

  /**
   * Update the auto-save interval and restart if running
   */
  updateInterval(intervalMs: number): void {
    setAutoSaveInterval(intervalMs);
    // Restart if currently running
    if (this.intervalId && this.saveCallback) {
      this.start(this.saveCallback);
    }
  }

  /**
   * Get current interval
   */
  getInterval(): number {
    return getAutoSaveInterval();
  }
}

// Global auto-save manager instance
export const autoSaveManager = new AutoSaveManager();
