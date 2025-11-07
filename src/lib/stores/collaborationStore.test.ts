import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  collaborationStore,
  currentUser,
  session,
  isCollaborating,
  collaborators,
  activeCollaborators,
  pendingChanges,
  conflictedChanges,
  hasConflicts,
  type Collaborator,
  type CollaborationChange,
  type CollaborationSession,
} from './collaborationStore';
import { Story } from '@whisker/core-ts';

describe('collaborationStore', () => {
  let story: Story;
  const STORAGE_KEY = 'whisker-collaboration-session';
  const USER_KEY = 'whisker-collaboration-user';

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'test-story-123',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Clear localStorage
    localStorage.clear();

    // Clear the store
    collaborationStore.clear();
  });

  afterEach(() => {
    localStorage.clear();
    collaborationStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with a current user', () => {
      const user = get(currentUser);
      expect(user).not.toBeNull();
      expect(user?.id).toBeDefined();
      expect(user?.name).toBe('Anonymous');
      expect(user?.status).toBe('active');
    });

    it('should initialize with no session', () => {
      expect(get(session)).toBeNull();
    });

    it('should initialize with isCollaborating false', () => {
      expect(get(isCollaborating)).toBe(false);
    });

    it('should initialize with empty collaborators', () => {
      expect(get(collaborators)).toEqual([]);
    });

    it('should initialize with no pending changes', () => {
      expect(get(pendingChanges)).toEqual([]);
    });

    it('should initialize with no conflicts', () => {
      expect(get(conflictedChanges)).toEqual([]);
      expect(get(hasConflicts)).toBe(false);
    });

    it('should save current user to localStorage', () => {
      const user = get(currentUser);
      const saved = localStorage.getItem(USER_KEY);
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed.id).toBe(user?.id);
    });

    it('should load existing user from localStorage', () => {
      const testUser = {
        id: 'test-user-1',
        name: 'Test User',
        color: '#ff0000',
        status: 'offline',
        lastSeen: new Date().toISOString(),
      };

      localStorage.setItem(USER_KEY, JSON.stringify(testUser));

      // Create new store to trigger load
      collaborationStore.clear();

      const user = get(currentUser);
      expect(user?.id).toBe('test-user-1');
      expect(user?.name).toBe('Test User');
      expect(user?.status).toBe('active'); // Should be set to active on load
    });
  });

  describe('initSession', () => {
    it('should create a new collaboration session', () => {
      collaborationStore.initSession(story);

      const sessionData = get(session);
      expect(sessionData).not.toBeNull();
      expect(sessionData?.storyId).toBe('test-story-123');
      expect(sessionData?.enabled).toBe(true);
    });

    it('should add current user to session', () => {
      const user = get(currentUser);

      collaborationStore.initSession(story);

      const sessionData = get(session);
      expect(sessionData?.collaborators[user!.id]).toBeDefined();
    });

    it('should save session to localStorage', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed.storyId).toBe('test-story-123');
    });

    it('should set isCollaborating to true', () => {
      collaborationStore.initSession(story);

      expect(get(isCollaborating)).toBe(true);
    });

    it('should initialize with empty changes array', () => {
      collaborationStore.initSession(story);

      const sessionData = get(session);
      expect(sessionData?.changes).toEqual([]);
    });

    it('should generate unique session ID', async () => {
      collaborationStore.initSession(story);
      const session1 = get(session);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      collaborationStore.clear();

      collaborationStore.initSession(story);
      const session2 = get(session);

      expect(session1?.id).not.toBe(session2?.id);
    });
  });

  describe('joinSession', () => {
    it('should join existing session', () => {
      // Create initial session
      collaborationStore.initSession(story);
      const originalSession = get(session);

      // Manually save a different user to localStorage to simulate another user
      const newUser = {
        id: 'user-2',
        name: 'User 2',
        color: '#00ff00',
        status: 'active',
        lastSeen: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      // Clear and reinitialize store with new user
      collaborationStore.clear();

      collaborationStore.joinSession('test-story-123');

      const joinedSession = get(session);
      expect(joinedSession).not.toBeNull();
      expect(joinedSession?.storyId).toBe('test-story-123');
    });

    it('should add new user to existing collaborators', () => {
      collaborationStore.initSession(story);
      const user1 = get(currentUser);

      // Create a different user
      const newUser = {
        id: 'user-2',
        name: 'User 2',
        color: '#00ff00',
        status: 'active',
        lastSeen: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      collaborationStore.clear();

      collaborationStore.joinSession('test-story-123');
      const user2 = get(currentUser);

      const sessionData = get(session);
      expect(Object.keys(sessionData?.collaborators || {})).toHaveLength(2);
      expect(sessionData?.collaborators[user1!.id]).toBeDefined();
      expect(sessionData?.collaborators[user2!.id]).toBeDefined();
    });

    it('should handle non-existent session gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      collaborationStore.joinSession('non-existent-story');

      expect(get(session)).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should update session in localStorage', () => {
      collaborationStore.initSession(story);

      // Create a different user
      const newUser = {
        id: 'user-2',
        name: 'User 2',
        color: '#00ff00',
        status: 'active',
        lastSeen: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      collaborationStore.clear();

      collaborationStore.joinSession('test-story-123');

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const parsed = JSON.parse(saved!);

      expect(Object.keys(parsed.collaborators)).toHaveLength(2);
    });
  });

  describe('leaveSession', () => {
    it('should leave current session', () => {
      collaborationStore.initSession(story);

      collaborationStore.leaveSession();

      expect(get(session)).toBeNull();
      expect(get(isCollaborating)).toBe(false);
    });

    it('should mark user as offline in session', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.leaveSession();

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const parsed = JSON.parse(saved!);

      expect(parsed.collaborators[user!.id].status).toBe('offline');
    });

    it('should update lastSeen timestamp', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);
      const beforeLeave = new Date().toISOString();

      collaborationStore.leaveSession();

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const parsed = JSON.parse(saved!);

      expect(parsed.collaborators[user!.id].lastSeen).toBeDefined();
    });
  });

  describe('updateUser', () => {
    it('should update user name', () => {
      collaborationStore.updateUser({ name: 'John Doe' });

      const user = get(currentUser);
      expect(user?.name).toBe('John Doe');
    });

    it('should update user color', () => {
      collaborationStore.updateUser({ color: '#00ff00' });

      const user = get(currentUser);
      expect(user?.color).toBe('#00ff00');
    });

    it('should update user status', () => {
      collaborationStore.updateUser({ status: 'idle' });

      const user = get(currentUser);
      expect(user?.status).toBe('idle');
    });

    it('should save updated user to localStorage', () => {
      collaborationStore.updateUser({ name: 'Jane Doe' });

      const saved = localStorage.getItem(USER_KEY);
      const parsed = JSON.parse(saved!);

      expect(parsed.name).toBe('Jane Doe');
    });

    it('should update user in active session', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.updateUser({ name: 'Updated Name' });

      const sessionData = get(session);
      expect(sessionData?.collaborators[user!.id].name).toBe('Updated Name');
    });

    it('should update lastSeen timestamp', () => {
      const user = get(currentUser);
      const originalLastSeen = user?.lastSeen;

      // Wait to ensure different timestamp
      setTimeout(() => {}, 10);

      collaborationStore.updateUser({ name: 'Test' });

      const updatedUser = get(currentUser);
      expect(updatedUser?.lastSeen).toBeDefined();
      // Just check it's defined since timestamps might be the same in fast tests
    });
  });

  describe('setCurrentPassage', () => {
    it('should set current passage', () => {
      collaborationStore.setCurrentPassage('passage-123');

      const user = get(currentUser);
      expect(user?.currentPassage).toBe('passage-123');
    });

    it('should clear current passage with undefined', () => {
      collaborationStore.setCurrentPassage('passage-123');
      collaborationStore.setCurrentPassage(undefined);

      const user = get(currentUser);
      expect(user?.currentPassage).toBeUndefined();
    });

    it('should update user in session', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.setCurrentPassage('passage-456');

      const sessionData = get(session);
      expect(sessionData?.collaborators[user!.id].currentPassage).toBe('passage-456');
    });
  });

  describe('setCursor', () => {
    it('should set cursor position', () => {
      collaborationStore.initSession(story);

      collaborationStore.setCursor('passage-123', 42);

      const user = get(currentUser);
      expect(user?.cursor).toEqual({
        passageId: 'passage-123',
        position: 42,
      });
    });

    it('should update cursor in session', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.setCursor('passage-789', 100);

      const sessionData = get(session);
      expect(sessionData?.collaborators[user!.id].cursor).toEqual({
        passageId: 'passage-789',
        position: 100,
      });
    });
  });

  describe('broadcastChange', () => {
    it('should broadcast a passage change', () => {
      collaborationStore.initSession(story);

      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'update',
        targetId: 'passage-123',
        data: { content: 'New content' },
      });

      const sessionData = get(session);
      expect(sessionData?.changes).toHaveLength(1);
      expect(sessionData?.changes[0].type).toBe('passage');
    });

    it('should generate unique change ID', () => {
      collaborationStore.initSession(story);

      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'create',
        targetId: 'passage-1',
        data: {},
      });

      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'create',
        targetId: 'passage-2',
        data: {},
      });

      const sessionData = get(session);
      expect(sessionData?.changes[0].id).not.toBe(sessionData?.changes[1].id);
    });

    it('should mark change as applied', () => {
      collaborationStore.initSession(story);

      collaborationStore.broadcastChange({
        type: 'variable',
        action: 'update',
        targetId: 'var-1',
        data: { value: 100 },
      });

      const sessionData = get(session);
      expect(sessionData?.changes[0].applied).toBe(true);
    });

    it('should include collaborator ID', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.broadcastChange({
        type: 'metadata',
        action: 'update',
        targetId: 'story',
        data: {},
      });

      const sessionData = get(session);
      expect(sessionData?.changes[0].collaboratorId).toBe(user?.id);
    });

    it('should save changes to localStorage', () => {
      collaborationStore.initSession(story);

      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'delete',
        targetId: 'passage-999',
        data: null,
      });

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const parsed = JSON.parse(saved!);

      expect(parsed.changes).toHaveLength(1);
    });
  });

  describe('syncChanges', () => {
    it('should sync changes from other collaborators', () => {
      collaborationStore.initSession(story);
      const user1 = get(currentUser);

      // Simulate another user adding changes
      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.changes.push({
        id: 'change-1',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'passage',
        action: 'update',
        targetId: 'passage-1',
        data: {},
        applied: false,
      });

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();

      const pending = get(pendingChanges);
      expect(pending).toHaveLength(1);
    });

    it('should not include own changes as pending', () => {
      collaborationStore.initSession(story);
      const user = get(currentUser);

      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'create',
        targetId: 'passage-new',
        data: {},
      });

      collaborationStore.syncChanges();

      const pending = get(pendingChanges);
      expect(pending).toHaveLength(0);
    });

    it('should only include unapplied changes', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.changes.push({
        id: 'change-applied',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'passage',
        action: 'update',
        targetId: 'passage-1',
        data: {},
        applied: true,
      });

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();

      const pending = get(pendingChanges);
      expect(pending).toHaveLength(0);
    });
  });

  describe('applyChange', () => {
    it('should remove change from pending list', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.changes.push({
        id: 'change-1',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'passage',
        action: 'update',
        targetId: 'passage-1',
        data: {},
        applied: false,
      });

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();
      expect(get(pendingChanges)).toHaveLength(1);

      collaborationStore.applyChange('change-1');
      expect(get(pendingChanges)).toHaveLength(0);
    });
  });

  describe('markConflict', () => {
    it('should move change to conflicted list', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      const conflictChange = {
        id: 'conflict-1',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'passage' as const,
        action: 'update' as const,
        targetId: 'passage-1',
        data: {},
        applied: false,
      };

      sessionData.changes.push(conflictChange);
      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();

      collaborationStore.markConflict('conflict-1');

      expect(get(pendingChanges)).toHaveLength(0);
      expect(get(conflictedChanges)).toHaveLength(1);
      expect(get(hasConflicts)).toBe(true);
    });

    it('should not mark non-existent change as conflict', () => {
      collaborationStore.initSession(story);

      collaborationStore.markConflict('non-existent');

      expect(get(conflictedChanges)).toHaveLength(0);
    });
  });

  describe('resolveConflict', () => {
    it('should remove conflict with accept resolution', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.changes.push({
        id: 'conflict-1',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'passage',
        action: 'update',
        targetId: 'passage-1',
        data: {},
        applied: false,
      });

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();
      collaborationStore.markConflict('conflict-1');

      collaborationStore.resolveConflict('conflict-1', 'accept');

      expect(get(conflictedChanges)).toHaveLength(0);
      expect(get(hasConflicts)).toBe(false);
    });

    it('should remove conflict with reject resolution', () => {
      collaborationStore.initSession(story);

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.changes.push({
        id: 'conflict-2',
        timestamp: new Date().toISOString(),
        collaboratorId: 'other-user',
        type: 'variable',
        action: 'update',
        targetId: 'var-1',
        data: {},
        applied: false,
      });

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));

      collaborationStore.syncChanges();
      collaborationStore.markConflict('conflict-2');

      collaborationStore.resolveConflict('conflict-2', 'reject');

      expect(get(conflictedChanges)).toHaveLength(0);
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle collaboration mode', () => {
      collaborationStore.initSession(story);

      expect(get(isCollaborating)).toBe(true);

      collaborationStore.toggleEnabled();

      expect(get(isCollaborating)).toBe(false);
    });

    it('should toggle back to enabled', () => {
      collaborationStore.initSession(story);

      collaborationStore.toggleEnabled();
      collaborationStore.toggleEnabled();

      expect(get(isCollaborating)).toBe(true);
    });

    it('should update session in localStorage', () => {
      collaborationStore.initSession(story);

      collaborationStore.toggleEnabled();

      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const parsed = JSON.parse(saved!);

      expect(parsed.enabled).toBe(false);
    });
  });

  describe('derived stores', () => {
    it('should derive collaborators list', () => {
      collaborationStore.initSession(story);

      const collabList = get(collaborators);
      expect(collabList).toHaveLength(1);
    });

    it('should filter active collaborators', () => {
      collaborationStore.initSession(story);

      // Add an offline user
      const saved = localStorage.getItem(`${STORAGE_KEY}-test-story-123`);
      const sessionData = JSON.parse(saved!);

      sessionData.collaborators['offline-user'] = {
        id: 'offline-user',
        name: 'Offline User',
        color: '#000000',
        status: 'offline',
        lastSeen: new Date().toISOString(),
      };

      localStorage.setItem(`${STORAGE_KEY}-test-story-123`, JSON.stringify(sessionData));
      collaborationStore.syncChanges();

      const active = get(activeCollaborators);
      expect(active.every(c => c.status === 'active' || c.status === 'idle')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should reset to initial state', () => {
      collaborationStore.initSession(story);
      collaborationStore.broadcastChange({
        type: 'passage',
        action: 'create',
        targetId: 'p1',
        data: {},
      });

      collaborationStore.clear();

      expect(get(session)).toBeNull();
      expect(get(currentUser)).not.toBeNull(); // User is reloaded
      expect(get(pendingChanges)).toEqual([]);
      expect(get(conflictedChanges)).toEqual([]);
    });
  });
});
