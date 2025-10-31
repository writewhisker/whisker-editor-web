/**
 * Tests for Loading State Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  loadingStore,
  isGitHubLoading,
  isSyncLoading,
  activeOperations,
  loadingMessage,
  withLoading,
} from './loadingStore';

describe('Loading Store', () => {
  beforeEach(() => {
    loadingStore.clear();
  });

  describe('Basic Operations', () => {
    it('should start a loading operation', () => {
      loadingStore.start('github:save-file', 'Saving your story...');

      const state = get(loadingStore);
      expect(state.operations.has('github:save-file')).toBe(true);

      const operation = state.operations.get('github:save-file');
      expect(operation?.message).toBe('Saving your story...');
    });

    it('should stop a loading operation', () => {
      loadingStore.start('github:load-file');
      loadingStore.stop('github:load-file');

      const state = get(loadingStore);
      expect(state.operations.has('github:load-file')).toBe(false);
    });

    it('should clear all operations', () => {
      loadingStore.start('github:save-file');
      loadingStore.start('sync:background');
      loadingStore.clear();

      const state = get(loadingStore);
      expect(state.operations.size).toBe(0);
    });
  });

  describe('Derived Stores', () => {
    it('should detect GitHub operations', () => {
      loadingStore.start('github:save-file');
      expect(get(isGitHubLoading)).toBe(true);

      loadingStore.stop('github:save-file');
      expect(get(isGitHubLoading)).toBe(false);
    });

    it('should detect sync operations', () => {
      loadingStore.start('sync:background');
      expect(get(isSyncLoading)).toBe(true);

      loadingStore.stop('sync:background');
      expect(get(isSyncLoading)).toBe(false);
    });

    it('should return active operations', () => {
      loadingStore.start('github:save-file', 'Saving...');
      loadingStore.start('sync:background', 'Syncing...');

      const operations = get(activeOperations);
      expect(operations).toHaveLength(2);
      expect(operations.map(op => op.operation)).toContain('github:save-file');
      expect(operations.map(op => op.operation)).toContain('sync:background');
    });

    it('should return loading message', () => {
      loadingStore.start('github:save-file', 'Saving your story...');

      const message = get(loadingMessage);
      expect(message).toBe('Saving your story...');
    });

    it('should return default message when not provided', () => {
      loadingStore.start('github:load-file');

      const message = get(loadingMessage);
      expect(message).toBe('Loading from GitHub...');
    });

    it('should return null when no operations', () => {
      const message = get(loadingMessage);
      expect(message).toBeNull();
    });
  });

  describe('withLoading Wrapper', () => {
    it('should execute operation with loading state', async () => {
      const result = await withLoading('github:save-file', async () => {
        // During execution, operation should be loading
        const state = get(loadingStore);
        expect(state.operations.has('github:save-file')).toBe(true);
        return 'success';
      });

      expect(result).toBe('success');

      // After execution, operation should be stopped
      const state = get(loadingStore);
      expect(state.operations.has('github:save-file')).toBe(false);
    });

    it('should stop loading even on error', async () => {
      try {
        await withLoading('github:save-file', async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      // Operation should be stopped even after error
      const state = get(loadingStore);
      expect(state.operations.has('github:save-file')).toBe(false);
    });

    it('should pass custom message', async () => {
      const promise = withLoading(
        'github:save-file',
        async () => {
          const message = get(loadingMessage);
          expect(message).toBe('Custom message');
          return 'done';
        },
        'Custom message'
      );

      await promise;
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple operations simultaneously', () => {
      loadingStore.start('github:save-file');
      loadingStore.start('sync:background');
      loadingStore.start('storage:save');

      const state = get(loadingStore);
      expect(state.operations.size).toBe(3);
    });

    it('should return most recent message', () => {
      loadingStore.start('github:save-file', 'First');
      // Wait a tiny bit to ensure different timestamps
      setTimeout(() => {
        loadingStore.start('sync:background', 'Second');
      }, 10);

      setTimeout(() => {
        const message = get(loadingMessage);
        expect(message).toBe('Second');
      }, 20);
    });
  });
});
