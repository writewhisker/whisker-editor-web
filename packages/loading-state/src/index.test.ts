import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  loadingStore,
  isGitHubLoading,
  isSyncLoading,
} from './index';

describe('@writewhisker/loading-state', () => {
  beforeEach(() => {
    loadingStore.clear();
  });

  it('should start loading operation', () => {
    loadingStore.start('github:auth', 'Authenticating...');
    expect(loadingStore.isLoading('github:auth')).toBe(true);
  });

  it('should stop loading operation', () => {
    loadingStore.start('github:auth');
    loadingStore.stop('github:auth');
    expect(loadingStore.isLoading('github:auth')).toBe(false);
  });

  it('should detect GitHub loading', () => {
    loadingStore.start('github:auth');
    expect(get(isGitHubLoading)).toBe(true);
    loadingStore.stop('github:auth');
    expect(get(isGitHubLoading)).toBe(false);
  });

  it('should detect sync loading', () => {
    loadingStore.start('sync:manual');
    expect(get(isSyncLoading)).toBe(true);
  });

  it('should clear all operations', () => {
    loadingStore.start('github:auth');
    loadingStore.start('sync:manual');
    loadingStore.clear();
    expect(loadingStore.isLoading('github:auth')).toBe(false);
    expect(loadingStore.isLoading('sync:manual')).toBe(false);
  });
});
