/**
 * Store Adapter Pattern
 *
 * Allows Whisker components to work with different state management systems
 * without modification. Supports Supabase, Redux, Zustand, and other state solutions.
 */

import type { Story, Passage } from '@whisker/core-ts';
import type { Writable, Readable } from 'svelte/store';

/**
 * Generic store adapter - compatible with Svelte store contract
 */
export interface StoreAdapter<T> {
  subscribe(run: (value: T) => void): () => void;
}

/**
 * Writable store adapter
 */
export interface WritableStoreAdapter<T> extends StoreAdapter<T> {
  set(value: T): void;
  update(updater: (value: T) => T): void;
}

/**
 * Story state adapter
 */
export interface StoryStateAdapter {
  currentStory: StoreAdapter<Story | null>;
  passages: StoreAdapter<Map<string, Passage>>;
  selectedPassageId: WritableStoreAdapter<string | null>;
  filteredPassages?: StoreAdapter<Map<string, Passage>>;

  // Optional operations
  updatePassage?: (passageId: string, updates: Partial<Passage>) => Promise<void>;
  deletePassage?: (passageId: string) => Promise<void>;
  createPassage?: (passage: Partial<Passage>) => Promise<Passage>;
}

/**
 * History/undo-redo adapter
 */
export interface HistoryAdapter {
  canUndo: StoreAdapter<boolean>;
  canRedo: StoreAdapter<boolean>;
  undo?: () => void;
  redo?: () => void;
  clear?: () => void;
}

/**
 * Notification adapter
 */
export interface NotificationAdapter {
  show: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismiss?: (id: string) => void;
}

/**
 * Validation adapter
 */
export interface ValidationAdapter {
  errors: StoreAdapter<Map<string, string[]>>;
  warnings: StoreAdapter<Map<string, string[]>>;
  validate?: (story: Story) => void;
}

/**
 * Complete editor adapter
 */
export interface EditorAdapter {
  story: StoryStateAdapter;
  history?: HistoryAdapter;
  notifications?: NotificationAdapter;
  validation?: ValidationAdapter;

  // Cleanup function
  _cleanup?: () => void;
}

/**
 * Wrap a Svelte store as an adapter
 */
export function svelteStoreAdapter<T>(store: Readable<T>): StoreAdapter<T>;
export function svelteStoreAdapter<T>(store: Writable<T>): WritableStoreAdapter<T>;
export function svelteStoreAdapter<T>(store: any): any {
  if ('set' in store && 'update' in store) {
    return {
      subscribe: store.subscribe.bind(store),
      set: store.set.bind(store),
      update: store.update.bind(store),
    };
  }
  return {
    subscribe: store.subscribe.bind(store),
  };
}

/**
 * Create default Svelte editor adapter
 */
export function createSvelteEditorAdapter(): EditorAdapter {
  // Note: imports are at function scope to avoid circular dependencies
  const { currentStory, passages } = require('../stores/storyStateStore');
  const { selectedPassageIds } = require('../stores/selectionStore');
  const { canUndo, canRedo, historyStore } = require('../stores/historyStore');
  const { notificationStore } = require('../stores/notificationStore');

  return {
    story: {
      currentStory: { subscribe: currentStory.subscribe },
      passages: { subscribe: passages.subscribe },
      selectedPassageId: {
        subscribe: (run) => {
          return selectedPassageIds.subscribe((ids: Set<string>) => {
            run(ids.size > 0 ? Array.from(ids)[0] : null);
          });
        },
        set: (id: string | null) => {
          selectedPassageIds.set(id ? new Set([id]) : new Set());
        },
        update: (updater: (value: string | null) => string | null) => {
          selectedPassageIds.update((ids: Set<string>) => {
            const current = ids.size > 0 ? Array.from(ids)[0] : null;
            const updated = updater(current);
            return updated ? new Set([updated]) : new Set();
          });
        },
      },
    },
    history: {
      canUndo: { subscribe: canUndo.subscribe },
      canRedo: { subscribe: canRedo.subscribe },
      undo: () => historyStore.undo(),
      redo: () => historyStore.redo(),
    },
    notifications: {
      show: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        notificationStore.show({ type, message, duration: 5000 });
      },
    },
  };
}

/**
 * Create Supabase editor adapter
 *
 * Integrates Whisker components with Supabase realtime for SaaS applications.
 */
export function createSupabaseEditorAdapter(
  supabase: any,
  projectId: string,
  userId: string
): EditorAdapter {
  const { Passage } = require('@whisker/core-ts');

  let currentStoryValue: Story | null = null;
  let selectedPassageIdValue: string | null = null;

  const storySubscribers: Set<(value: Story | null) => void> = new Set();
  const selectedPassageSubscribers: Set<(value: string | null) => void> = new Set();

  // Load initial data
  supabase
    .from('projects')
    .select('story_data')
    .eq('id', projectId)
    .single()
    .then(({ data, error }: any) => {
      if (!error && data) {
        currentStoryValue = data.story_data;
        storySubscribers.forEach((sub) => sub(currentStoryValue));
      }
    });

  // Subscribe to realtime changes
  const channel = supabase
    .channel(`project:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`,
      },
      (payload: any) => {
        currentStoryValue = payload.new.story_data;
        storySubscribers.forEach((sub) => sub(currentStoryValue));
      }
    )
    .subscribe();

  return {
    story: {
      currentStory: {
        subscribe: (run: (value: Story | null) => void) => {
          run(currentStoryValue);
          storySubscribers.add(run);
          return () => {
            storySubscribers.delete(run);
          };
        },
      },

      passages: {
        subscribe: (run: (value: Map<string, Passage>) => void) => {
          const passagesMap = currentStoryValue?.passages || new Map();
          run(passagesMap);

          const handler = (story: Story | null) => {
            run(story?.passages || new Map());
          };
          storySubscribers.add(handler);
          return () => {
            storySubscribers.delete(handler);
          };
        },
      },

      selectedPassageId: {
        subscribe: (run: (value: string | null) => void) => {
          run(selectedPassageIdValue);
          selectedPassageSubscribers.add(run);
          return () => {
            selectedPassageSubscribers.delete(run);
          };
        },
        set: (value: string | null) => {
          selectedPassageIdValue = value;
          selectedPassageSubscribers.forEach((sub) => sub(value));
        },
        update: (updater: (value: string | null) => string | null) => {
          selectedPassageIdValue = updater(selectedPassageIdValue);
          selectedPassageSubscribers.forEach((sub) => sub(selectedPassageIdValue));
        },
      },

      updatePassage: async (passageId: string, updates: Partial<Passage>) => {
        if (currentStoryValue) {
          const passage = currentStoryValue.passages.get(passageId);
          if (passage) {
            Object.assign(passage, updates);
            storySubscribers.forEach((sub) => sub(currentStoryValue));
          }
        }

        await supabase
          .from('projects')
          .update({
            story_data: currentStoryValue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
      },

      deletePassage: async (passageId: string) => {
        if (currentStoryValue) {
          currentStoryValue.passages.delete(passageId);
          storySubscribers.forEach((sub) => sub(currentStoryValue));

          await supabase
            .from('projects')
            .update({ story_data: currentStoryValue })
            .eq('id', projectId);
        }
      },

      createPassage: async (passage: Partial<Passage>) => {
        const newPassage = new Passage(passage);

        if (currentStoryValue) {
          currentStoryValue.passages.set(newPassage.id, newPassage);
          storySubscribers.forEach((sub) => sub(currentStoryValue));

          await supabase
            .from('projects')
            .update({ story_data: currentStoryValue })
            .eq('id', projectId);
        }

        return newPassage;
      },
    },

    notifications: {
      show: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        console.log(`[${type.toUpperCase()}] ${message}`);
      },
    },

    _cleanup: () => {
      channel.unsubscribe();
      storySubscribers.clear();
      selectedPassageSubscribers.clear();
    },
  };
}
