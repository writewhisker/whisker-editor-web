/**
 * Parental Controls Store
 * Manage parental control settings
 */

import { writable } from 'svelte/store';

export interface ParentalControlSettings {
  enabled: boolean;
  contentFilterLevel: 'strict' | 'moderate' | 'permissive';
  allowedGenres: string[];
  blockedWords: string[];
  maxPlaytimeMinutes?: number;
  requireAdultApproval: boolean;
  exportRestricted?: boolean;
  allowLocalExport?: boolean;
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
};
