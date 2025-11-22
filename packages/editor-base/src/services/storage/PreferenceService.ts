/**
 * Preference Service
 * Re-exports PreferenceManager from @writewhisker/storage for backwards compatibility
 */

import { PreferenceManager, LocalStorageBackend } from '@writewhisker/storage';

// Singleton instance
let instance: PreferenceManager | null = null;

export function getPreferenceService(): PreferenceManager {
  if (!instance) {
    const backend = new LocalStorageBackend();
    instance = new PreferenceManager(backend);
  }
  return instance;
}

export function resetPreferenceService(): void {
  instance = null;
}

// Re-export the PreferenceManager class
export { PreferenceManager };
