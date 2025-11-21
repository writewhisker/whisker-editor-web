/**
 * Loading State Store
 *
 * Manages loading states for GitHub operations to provide user feedback
 */

import { writable, derived } from 'svelte/store';

export type LoadingOperation =
  | 'github:auth'
  | 'github:list-repos'
  | 'github:create-repo'
  | 'github:load-file'
  | 'github:save-file'
  | 'github:delete-file'
  | 'github:commit-history'
  | 'sync:background'
  | 'sync:manual'
  | 'storage:save'
  | 'storage:load';

interface LoadingState {
  operation: LoadingOperation;
  message?: string;
  startTime: number;
}

interface LoadingStoreState {
  operations: Map<LoadingOperation, LoadingState>;
}

function createLoadingStore() {
  const { subscribe, update } = writable<LoadingStoreState>({
    operations: new Map(),
  });

  return {
    subscribe,

    /**
     * Start a loading operation
     */
    start(operation: LoadingOperation, message?: string) {
      update(state => {
        const newOperations = new Map(state.operations);
        newOperations.set(operation, {
          operation,
          message,
          startTime: Date.now(),
        });
        return { operations: newOperations };
      });
    },

    /**
     * Stop a loading operation
     */
    stop(operation: LoadingOperation) {
      update(state => {
        const newOperations = new Map(state.operations);
        newOperations.delete(operation);
        return { operations: newOperations };
      });
    },

    /**
     * Check if a specific operation is loading
     */
    isLoading(operation: LoadingOperation): boolean {
      let result = false;
      subscribe(state => {
        result = state.operations.has(operation);
      })();
      return result;
    },

    /**
     * Clear all loading states
     */
    clear() {
      update(() => ({ operations: new Map() }));
    },
  };
}

export const loadingStore = createLoadingStore();

/**
 * Derived store: is any GitHub operation loading?
 */
export const isGitHubLoading = derived(
  loadingStore,
  $loading => {
    for (const [key] of $loading.operations) {
      if (key.startsWith('github:')) {
        return true;
      }
    }
    return false;
  }
);

/**
 * Derived store: is any sync operation loading?
 */
export const isSyncLoading = derived(
  loadingStore,
  $loading => {
    for (const [key] of $loading.operations) {
      if (key.startsWith('sync:')) {
        return true;
      }
    }
    return false;
  }
);

/**
 * Derived store: get all active loading operations
 */
export const activeOperations = derived(
  loadingStore,
  $loading => Array.from($loading.operations.values())
);

/**
 * Derived store: get loading message for display
 */
export const loadingMessage = derived(
  activeOperations,
  $operations => {
    if ($operations.length === 0) return null;

    // Return the most recent operation's message
    const latest = $operations.reduce((latest, op) =>
      op.startTime > latest.startTime ? op : latest
    );

    return latest.message || getDefaultMessage(latest.operation);
  }
);

/**
 * Get default loading message for an operation
 */
function getDefaultMessage(operation: LoadingOperation): string {
  const messages: Record<LoadingOperation, string> = {
    'github:auth': 'Authenticating with GitHub...',
    'github:list-repos': 'Loading repositories...',
    'github:create-repo': 'Creating repository...',
    'github:load-file': 'Loading from GitHub...',
    'github:save-file': 'Saving to GitHub...',
    'github:delete-file': 'Deleting file...',
    'github:commit-history': 'Loading commit history...',
    'sync:background': 'Syncing with GitHub...',
    'sync:manual': 'Syncing now...',
    'storage:save': 'Saving locally...',
    'storage:load': 'Loading story...',
  };

  return messages[operation] || 'Loading...';
}

/**
 * Wrapper function to execute an operation with loading state
 */
export async function withLoading<T>(
  operation: LoadingOperation,
  fn: () => Promise<T>,
  message?: string
): Promise<T> {
  loadingStore.start(operation, message);
  try {
    return await fn();
  } finally {
    loadingStore.stop(operation);
  }
}
