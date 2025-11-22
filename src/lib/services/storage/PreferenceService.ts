/**
 * Preference Service
 * Re-exports PreferenceManager from @writewhisker/storage for backwards compatibility
 */

import { PreferenceManager } from '@writewhisker/storage';

// Singleton instance
let instance: PreferenceManager | null = null;

export function getPreferenceService(): PreferenceManager {
  if (!instance) {
    instance = new PreferenceManager();
  }
  return instance;
}

export function resetPreferenceService(): void {
  instance = null;
}

// Re-export the PreferenceManager class
export { PreferenceManager };
