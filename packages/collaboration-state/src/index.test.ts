import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  collaborationStore,
  collaboratingUser,
  session,
  isCollaborating,
  collaborators,
  activeCollaborators,
  pendingChanges,
  conflictedChanges,
  hasConflicts,
  configureCollaborationStorage,
  type CollaborationStorage,
} from './index';

describe('@writewhisker/collaboration-state', () => {
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    const adapter: CollaborationStorage = {
      getItem: (key) => mockStorage.get(key) || null,
      setItem: (key, value) => mockStorage.set(key, value),
    };
    configureCollaborationStorage(adapter);
    collaborationStore.clear();
  });

  it('should initialize with current user', () => {
    const user = get(collaboratingUser);
    expect(user).not.toBeNull();
    expect(user?.id).toBeDefined();
    expect(user?.name).toBe('Anonymous');
  });

  it('should init session', () => {
    collaborationStore.initSession('test-context');
    expect(get(isCollaborating)).toBe(true);
    const sessionState = get(session);
    expect(sessionState?.contextId).toBe('test-context');
  });

  it('should leave session', () => {
    collaborationStore.initSession('test');
    collaborationStore.leaveSession();
    expect(get(isCollaborating)).toBe(false);
  });

  it('should update user', () => {
    collaborationStore.updateUser({ name: 'Test User' });
    const user = get(collaboratingUser);
    expect(user?.name).toBe('Test User');
  });

  it('should set current context', () => {
    collaborationStore.setCurrentContext('context-1');
    const user = get(collaboratingUser);
    expect(user?.currentContext).toBe('context-1');
  });

  it('should broadcast change', () => {
    collaborationStore.initSession('test');
    collaborationStore.broadcastChange({
      type: 'edit',
      action: 'update',
      targetId: 'test-id',
      data: {},
    });
    const sessionState = get(session);
    expect(sessionState?.changes.length).toBe(1);
  });

  it('should detect conflicts', () => {
    expect(get(hasConflicts)).toBe(false);
  });
});
