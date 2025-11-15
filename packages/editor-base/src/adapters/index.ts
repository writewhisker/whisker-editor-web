/**
 * Store Adapters
 * Flexible state management for components
 */

export type {
  StoreAdapter,
  WritableStoreAdapter,
  StoryStateAdapter,
  HistoryAdapter,
  NotificationAdapter,
  ValidationAdapter,
  EditorAdapter,
} from './StoreAdapter';

export {
  svelteStoreAdapter,
  createSvelteEditorAdapter,
  createSupabaseEditorAdapter,
} from './StoreAdapter';

// Storage adapter
export { SvelteStorageAdapter, storageAdapter, initializeStorage } from './storageAdapter.js';

// App initialization
export { initializeApp, getMigrationStatus } from './initializeApp.js';
export type { InitializationOptions, InitializationResult } from './initializeApp.js';
