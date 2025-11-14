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
