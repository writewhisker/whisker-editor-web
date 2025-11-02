/**
 * Parental Controls Store
 *
 * Manages parental control settings for Kids Mode to ensure safe usage.
 * Features password protection and content filtering.
 */

import { writable, derived } from 'svelte/store';
import { getPreferenceService } from '../services/storage/PreferenceService';

const PARENTAL_CONTROLS_KEY = 'whisker-parental-controls';
const PARENTAL_PIN_KEY = 'whisker-parental-pin';

// Get preference service instance
const prefService = getPreferenceService();

/**
 * Content filter levels
 */
export type ContentFilterLevel = 'none' | 'mild' | 'strict';

/**
 * Activity log entry
 */
export interface ActivityLogEntry {
  timestamp: Date;
  action: string;
  details: string;
}

/**
 * Parental control settings
 */
export interface ParentalControls {
  enabled: boolean;
  pin: string | null; // Hashed PIN for parent access
  exportRestricted: boolean; // Block all exports
  allowLocalExport: boolean; // Allow local exports only
  allowOnlineSharing: boolean; // Allow online sharing
  contentFilterLevel: ContentFilterLevel;
  requireApprovalForExport: boolean;
  activityLog: ActivityLogEntry[];
  maxSessionTime: number | null; // In minutes, null = unlimited
}

/**
 * Default parental control settings
 */
const DEFAULT_CONTROLS: ParentalControls = {
  enabled: false,
  pin: null,
  exportRestricted: false,
  allowLocalExport: true,
  allowOnlineSharing: false, // Safer default
  contentFilterLevel: 'mild',
  requireApprovalForExport: false,
  activityLog: [],
  maxSessionTime: null,
};

/**
 * Load parental controls from storage
 */
function loadControls(): ParentalControls {
  try {
    const stored = prefService.getPreferenceSync<Partial<ParentalControls>>(
      PARENTAL_CONTROLS_KEY,
      {}
    );

    return {
      ...DEFAULT_CONTROLS,
      ...stored,
      // Ensure activityLog is an array
      activityLog: Array.isArray(stored.activityLog) ? stored.activityLog : [],
    };
  } catch (error) {
    console.error('Failed to load parental controls:', error);
    return DEFAULT_CONTROLS;
  }
}

/**
 * Save parental controls to storage
 */
function saveControls(controls: ParentalControls): void {
  try {
    // Don't store more than 100 log entries
    const trimmedControls = {
      ...controls,
      activityLog: controls.activityLog.slice(-100),
    };
    prefService.setPreferenceSync(PARENTAL_CONTROLS_KEY, trimmedControls);
  } catch (error) {
    console.error('Failed to save parental controls:', error);
  }
}

/**
 * Simple hash function for PIN (not cryptographically secure, just basic protection)
 */
function hashPIN(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Create the main store
export const parentalControlsStore = writable<ParentalControls>(loadControls());

// Derived stores for common checks
export const exportAllowed = derived(
  parentalControlsStore,
  $controls => !$controls.exportRestricted || $controls.allowLocalExport
);

export const onlineSharingAllowed = derived(
  parentalControlsStore,
  $controls => !$controls.exportRestricted && $controls.allowOnlineSharing
);

/**
 * Actions for managing parental controls
 */
export const parentalControlsActions = {
  /**
   * Set parental controls enabled/disabled
   */
  setEnabled(enabled: boolean) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, enabled };
      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Set parental PIN
   */
  setPIN(pin: string) {
    const hashed = hashPIN(pin);
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, pin: hashed };
      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Verify parental PIN
   */
  verifyPIN(pin: string): boolean {
    let isValid = false;
    parentalControlsStore.subscribe(controls => {
      if (!controls.pin) {
        isValid = true; // No PIN set
      } else {
        isValid = hashPIN(pin) === controls.pin;
      }
    })();
    return isValid;
  },

  /**
   * Check if PIN is required
   */
  isPINRequired(): boolean {
    let required = false;
    parentalControlsStore.subscribe(controls => {
      required = controls.enabled && controls.pin !== null;
    })();
    return required;
  },

  /**
   * Set export restriction
   */
  setExportRestricted(restricted: boolean) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, exportRestricted: restricted };
      saveControls(newControls);
      this.logActivity('Setting Changed', `Export restricted: ${restricted}`);
      return newControls;
    });
  },

  /**
   * Set local export permission
   */
  setAllowLocalExport(allow: boolean) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, allowLocalExport: allow };
      saveControls(newControls);
      this.logActivity('Setting Changed', `Allow local export: ${allow}`);
      return newControls;
    });
  },

  /**
   * Set online sharing permission
   */
  setAllowOnlineSharing(allow: boolean) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, allowOnlineSharing: allow };
      saveControls(newControls);
      this.logActivity('Setting Changed', `Allow online sharing: ${allow}`);
      return newControls;
    });
  },

  /**
   * Set content filter level
   */
  setContentFilterLevel(level: ContentFilterLevel) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, contentFilterLevel: level };
      saveControls(newControls);
      this.logActivity('Setting Changed', `Content filter: ${level}`);
      return newControls;
    });
  },

  /**
   * Set export approval requirement
   */
  setRequireApprovalForExport(require: boolean) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, requireApprovalForExport: require };
      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Set maximum session time
   */
  setMaxSessionTime(minutes: number | null) {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, maxSessionTime: minutes };
      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Log an activity
   */
  logActivity(action: string, details: string) {
    parentalControlsStore.update(controls => {
      const newEntry: ActivityLogEntry = {
        timestamp: new Date(),
        action,
        details,
      };

      const newControls = {
        ...controls,
        activityLog: [...controls.activityLog, newEntry],
      };

      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Get activity log
   */
  getActivityLog(): ActivityLogEntry[] {
    let log: ActivityLogEntry[] = [];
    parentalControlsStore.subscribe(controls => {
      log = [...controls.activityLog];
    })();
    return log;
  },

  /**
   * Clear activity log
   */
  clearActivityLog() {
    parentalControlsStore.update(controls => {
      const newControls = { ...controls, activityLog: [] };
      saveControls(newControls);
      return newControls;
    });
  },

  /**
   * Reset all parental controls to defaults
   */
  reset() {
    parentalControlsStore.set(DEFAULT_CONTROLS);
    saveControls(DEFAULT_CONTROLS);
  },
};
