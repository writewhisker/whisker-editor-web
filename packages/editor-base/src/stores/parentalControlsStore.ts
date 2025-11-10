/**
 * Parental Controls Store
 * Manage parental control settings
 */

import { writable } from 'svelte/store';

export type ContentFilterLevel = 'strict' | 'moderate' | 'permissive';

export interface ParentalControlSettings {
  enabled: boolean;
  contentFilterLevel: ContentFilterLevel;
  allowedGenres: string[];
  blockedWords: string[];
  maxPlaytimeMinutes?: number;
  requireAdultApproval: boolean;
  exportRestricted?: boolean;
  allowLocalExport?: boolean;
  allowOnlineSharing?: boolean;
  requireApprovalForExport?: boolean;
  maxSessionTime?: number;
  pin?: string;
  activityLog?: Array<{
    timestamp: number;
    action: string;
    details?: any;
  }>;
}

const defaultSettings: ParentalControlSettings = {
  enabled: false,
  contentFilterLevel: 'moderate',
  allowedGenres: [],
  blockedWords: [],
  requireAdultApproval: false,
};

function createParentalControlsStore() {
  const { subscribe, set, update } = writable<ParentalControlSettings>(defaultSettings);

  return {
    subscribe,
    set,
    update,
    enable: () => update((s) => ({ ...s, enabled: true })),
    disable: () => update((s) => ({ ...s, enabled: false })),
    setContentFilterLevel: (level: ParentalControlSettings['contentFilterLevel']) =>
      update((s) => ({ ...s, contentFilterLevel: level })),
    addBlockedWord: (word: string) =>
      update((s) => ({ ...s, blockedWords: [...s.blockedWords, word] })),
    removeBlockedWord: (word: string) =>
      update((s) => ({ ...s, blockedWords: s.blockedWords.filter((w) => w !== word) })),
    reset: () => set(defaultSettings),
    applyAgeDefaults: (age: number) => update((s) => {
      if (age < 13) {
        return { ...s, contentFilterLevel: 'strict', enabled: true };
      } else if (age < 18) {
        return { ...s, contentFilterLevel: 'moderate', enabled: true };
      }
      return { ...s, contentFilterLevel: 'permissive' };
    }),
    verifyPIN: (pin: string) => {
      let isValid = false;
      update((s) => {
        isValid = s.pin === pin;
        return s;
      });
      return isValid;
    },
    setPIN: (pin: string) => update((s) => ({ ...s, pin })),
    setEnabled: (enabled: boolean) => update((s) => ({ ...s, enabled })),
    setExportRestricted: (restricted: boolean) => update((s) => ({ ...s, exportRestricted: restricted })),
    setAllowLocalExport: (allow: boolean) => update((s) => ({ ...s, allowLocalExport: allow })),
    setAllowOnlineSharing: (allow: boolean) => update((s) => ({ ...s, allowOnlineSharing: allow })),
    setRequireApprovalForExport: (require: boolean) => update((s) => ({ ...s, requireApprovalForExport: require })),
    setMaxSessionTime: (minutes: number) => update((s) => ({ ...s, maxSessionTime: minutes })),
    clearActivityLog: () => update((s) => ({ ...s, activityLog: [] })),
    isPINRequired: () => {
      let required = false;
      subscribe((s) => { required = s.enabled && !!s.pin; })();
      return required;
    },
  };
}

export const parentalControlsStore = createParentalControlsStore();

// Export actions for convenience
export const parentalControlsActions = {
  enable: parentalControlsStore.enable,
  disable: parentalControlsStore.disable,
  setContentFilterLevel: parentalControlsStore.setContentFilterLevel,
  addBlockedWord: parentalControlsStore.addBlockedWord,
  removeBlockedWord: parentalControlsStore.removeBlockedWord,
  reset: parentalControlsStore.reset,
  applyAgeDefaults: parentalControlsStore.applyAgeDefaults,
  verifyPIN: parentalControlsStore.verifyPIN,
  setPIN: parentalControlsStore.setPIN,
  setEnabled: parentalControlsStore.setEnabled,
  setExportRestricted: parentalControlsStore.setExportRestricted,
  setAllowLocalExport: parentalControlsStore.setAllowLocalExport,
  setAllowOnlineSharing: parentalControlsStore.setAllowOnlineSharing,
  setRequireApprovalForExport: parentalControlsStore.setRequireApprovalForExport,
  setMaxSessionTime: parentalControlsStore.setMaxSessionTime,
  clearActivityLog: parentalControlsStore.clearActivityLog,
  isPINRequired: parentalControlsStore.isPINRequired,
};
