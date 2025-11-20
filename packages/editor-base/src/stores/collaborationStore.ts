/**
 * Live Collaboration Store
 *
 * Manages real-time collaboration features including:
 * - User presence and awareness
 * - Collaborative editing state
 * - Change synchronization
 * - Conflict detection and resolution
 *
 * Note: This is a client-side only implementation using localStorage for demo purposes.
 * In production, this would integrate with WebSocket/WebRTC for real-time sync.
 */

import { writable, derived, get } from 'svelte/store';
import type { Story } from '@writewhisker/core-ts';

export type CollaboratorStatus = 'active' | 'idle' | 'away' | 'offline';

// Renamed to avoid conflict with core-ts Collaborator
export interface EditorCollaborator {
  id: string;
  name: string;
  color: string;              // Hex color for cursor/selection
  status: CollaboratorStatus;
  lastSeen: string;            // ISO timestamp
  currentPassage?: string;     // Passage ID they're viewing/editing
  cursor?: {
    passageId: string;
    position: number;          // Character position in content
  };
}

export interface CollaborationChange {
  id: string;
  timestamp: string;
  collaboratorId: string;
  type: 'passage' | 'variable' | 'metadata';
  action: 'create' | 'update' | 'delete';
  targetId: string;            // ID of affected entity
  data: any;                   // Change payload
  applied: boolean;            // Whether change has been applied locally
}

export interface CollaborationSession {
  id: string;
  storyId: string;
  started: string;
  collaborators: Record<string, EditorCollaborator>;
  changes: CollaborationChange[];
  enabled: boolean;
}

export interface CollaborationStoreState {
  currentUser: EditorCollaborator | null;
  session: CollaborationSession | null;
  pendingChanges: CollaborationChange[];
  conflictedChanges: CollaborationChange[];
}

const STORAGE_KEY = 'whisker-collaboration-session';
const USER_KEY = 'whisker-collaboration-user';

// Generate random color for collaborator
function generateCollaboratorColor(): string {
  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Load or create current user
function loadCurrentUser(): EditorCollaborator {
  const saved = localStorage.getItem(USER_KEY);
  if (saved) {
    try {
      const user = JSON.parse(saved);
      return {
        ...user,
        status: 'active' as CollaboratorStatus,
        lastSeen: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    }
  }

  // Create new user
  const newUser: EditorCollaborator = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Anonymous',
    color: generateCollaboratorColor(),
    status: 'active',
    lastSeen: new Date().toISOString(),
  };

  localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  return newUser;
}

// Save current user
function saveCurrentUser(user: EditorCollaborator): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Create collaboration store
const createCollaborationStore = () => {
  const { subscribe, set, update } = writable<CollaborationStoreState>({
    currentUser: loadCurrentUser(),
    session: null,
    pendingChanges: [],
    conflictedChanges: [],
  });

  return {
    subscribe,

    /**
     * Initialize collaboration session for a story
     */
    initSession: (story: Story) => {
      update(state => {
        if (!state.currentUser) return state;

        const session: CollaborationSession = {
          id: `session-${Date.now()}`,
          storyId: story.metadata.id || story.metadata.title,
          started: new Date().toISOString(),
          collaborators: {
            [state.currentUser.id]: state.currentUser,
          },
          changes: [],
          enabled: true,
        };

        // Save session to localStorage (in production, this would be server-side)
        localStorage.setItem(`${STORAGE_KEY}-${session.storyId}`, JSON.stringify(session));

        return {
          ...state,
          session,
        };
      });
    },

    /**
     * Join existing collaboration session
     */
    joinSession: (storyId: string) => {
      const sessionData = localStorage.getItem(`${STORAGE_KEY}-${storyId}`);
      if (!sessionData) {
        console.warn('No collaboration session found for story:', storyId);
        return;
      }

      try {
        const session: CollaborationSession = JSON.parse(sessionData);
        update(state => {
          if (!state.currentUser) return state;

          // Add current user to session
          session.collaborators[state.currentUser.id] = state.currentUser;

          // Save updated session
          localStorage.setItem(`${STORAGE_KEY}-${storyId}`, JSON.stringify(session));

          return {
            ...state,
            session,
          };
        });
      } catch (e) {
        console.error('Failed to join collaboration session:', e);
      }
    },

    /**
     * Leave current collaboration session
     */
    leaveSession: () => {
      update(state => {
        if (!state.session || !state.currentUser) return state;

        // Mark user as offline
        const updatedSession = {
          ...state.session,
          collaborators: {
            ...state.session.collaborators,
            [state.currentUser.id]: {
              ...state.currentUser,
              status: 'offline' as CollaboratorStatus,
              lastSeen: new Date().toISOString(),
            },
          },
        };

        // Save session
        localStorage.setItem(
          `${STORAGE_KEY}-${state.session.storyId}`,
          JSON.stringify(updatedSession)
        );

        return {
          ...state,
          session: null,
        };
      });
    },

    /**
     * Update current user profile
     */
    updateUser: (updates: Partial<Omit<EditorCollaborator, 'id'>>) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          ...updates,
          lastSeen: new Date().toISOString(),
        };

        saveCurrentUser(updatedUser);

        // Update in session if active
        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
          localStorage.setItem(
            `${STORAGE_KEY}-${state.session.storyId}`,
            JSON.stringify(state.session)
          );
        }

        return {
          ...state,
          currentUser: updatedUser,
        };
      });
    },

    /**
     * Update user's current passage
     */
    setCurrentPassage: (passageId: string | undefined) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          currentPassage: passageId,
          lastSeen: new Date().toISOString(),
        };

        saveCurrentUser(updatedUser);

        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
          localStorage.setItem(
            `${STORAGE_KEY}-${state.session.storyId}`,
            JSON.stringify(state.session)
          );
        }

        return {
          ...state,
          currentUser: updatedUser,
        };
      });
    },

    /**
     * Update user's cursor position
     */
    setCursor: (passageId: string, position: number) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          cursor: { passageId, position },
          lastSeen: new Date().toISOString(),
        };

        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
          localStorage.setItem(
            `${STORAGE_KEY}-${state.session.storyId}`,
            JSON.stringify(state.session)
          );
        }

        return {
          ...state,
          currentUser: updatedUser,
        };
      });
    },

    /**
     * Broadcast a change to other collaborators
     */
    broadcastChange: (change: Omit<CollaborationChange, 'id' | 'timestamp' | 'collaboratorId' | 'applied'>) => {
      update(state => {
        if (!state.session || !state.currentUser) return state;

        const newChange: CollaborationChange = {
          ...change,
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          collaboratorId: state.currentUser.id,
          applied: true, // Already applied locally
        };

        state.session.changes.push(newChange);

        // Save session
        localStorage.setItem(
          `${STORAGE_KEY}-${state.session.storyId}`,
          JSON.stringify(state.session)
        );

        return state;
      });
    },

    /**
     * Sync changes from other collaborators
     */
    syncChanges: () => {
      update(state => {
        if (!state.session) return state;

        // Reload session from storage
        const sessionData = localStorage.getItem(`${STORAGE_KEY}-${state.session.storyId}`);
        if (!sessionData) return state;

        try {
          const updatedSession: CollaborationSession = JSON.parse(sessionData);

          // Find new changes not yet applied
          const pendingChanges = updatedSession.changes.filter(
            change => !change.applied && change.collaboratorId !== state.currentUser?.id
          );

          return {
            ...state,
            session: updatedSession,
            pendingChanges,
          };
        } catch (e) {
          console.error('Failed to sync changes:', e);
          return state;
        }
      });
    },

    /**
     * Apply pending changes
     */
    applyChange: (changeId: string) => {
      update(state => ({
        ...state,
        pendingChanges: state.pendingChanges.filter(c => c.id !== changeId),
      }));
    },

    /**
     * Mark change as conflicted
     */
    markConflict: (changeId: string) => {
      update(state => {
        const change = state.pendingChanges.find(c => c.id === changeId);
        if (!change) return state;

        return {
          ...state,
          pendingChanges: state.pendingChanges.filter(c => c.id !== changeId),
          conflictedChanges: [...state.conflictedChanges, change],
        };
      });
    },

    /**
     * Resolve conflict
     */
    resolveConflict: (changeId: string, resolution: 'accept' | 'reject') => {
      update(state => ({
        ...state,
        conflictedChanges: state.conflictedChanges.filter(c => c.id !== changeId),
      }));
    },

    /**
     * Toggle collaboration mode
     */
    toggleEnabled: () => {
      update(state => {
        if (!state.session) return state;

        state.session.enabled = !state.session.enabled;

        localStorage.setItem(
          `${STORAGE_KEY}-${state.session.storyId}`,
          JSON.stringify(state.session)
        );

        return state;
      });
    },

    /**
     * Clear all data
     */
    clear: () => {
      set({
        currentUser: loadCurrentUser(),
        session: null,
        pendingChanges: [],
        conflictedChanges: [],
      });
    },
  };
};

export const collaborationStore = createCollaborationStore();

// Derived stores
export const collaboratingUser = derived(collaborationStore, $store => $store.currentUser);
export const session = derived(collaborationStore, $store => $store.session);
export const isCollaborating = derived(collaborationStore, $store =>
  $store.session !== null && $store.session.enabled
);
export const collaborators = derived(collaborationStore, $store =>
  $store.session ? Object.values($store.session.collaborators) : []
);
export const activeCollaborators = derived(collaborators, $collaborators =>
  $collaborators.filter(c => c.status === 'active' || c.status === 'idle')
);
export const pendingChanges = derived(collaborationStore, $store => $store.pendingChanges);
export const conflictedChanges = derived(collaborationStore, $store => $store.conflictedChanges);
export const hasConflicts = derived(conflictedChanges, $conflicts => $conflicts.length > 0);
