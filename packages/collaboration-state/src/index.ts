/**
 * Collaboration State
 *
 * Generic collaboration state for real-time multi-user editing.
 * Handles user presence, cursors, and change synchronization.
 * Storage-agnostic design - works with localStorage, WebSocket, WebRTC, etc.
 */

import { writable, derived } from 'svelte/store';

export type CollaboratorStatus = 'active' | 'idle' | 'away' | 'offline';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  status: CollaboratorStatus;
  lastSeen: string;
  currentContext?: string;
  cursor?: {
    contextId: string;
    position: number;
  };
}

export interface CollaborationChange {
  id: string;
  timestamp: string;
  collaboratorId: string;
  type: string;
  action: 'create' | 'update' | 'delete';
  targetId: string;
  data: any;
  applied: boolean;
}

export interface CollaborationSession {
  id: string;
  contextId: string;
  started: string;
  collaborators: Record<string, Collaborator>;
  changes: CollaborationChange[];
  enabled: boolean;
}

export interface CollaborationStoreState {
  currentUser: Collaborator | null;
  session: CollaborationSession | null;
  pendingChanges: CollaborationChange[];
  conflictedChanges: CollaborationChange[];
}

// Storage adapter
export interface CollaborationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultStorage: CollaborationStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
};

let storage: CollaborationStorage = defaultStorage;

export function configureCollaborationStorage(adapter: CollaborationStorage): void {
  storage = adapter;
}

const USER_KEY = 'collaboration-user';

// Generate random color
function generateCollaboratorColor(): string {
  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Load or create current user
function loadCurrentUser(): Collaborator {
  const saved = storage.getItem(USER_KEY);
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

  const newUser: Collaborator = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Anonymous',
    color: generateCollaboratorColor(),
    status: 'active',
    lastSeen: new Date().toISOString(),
  };

  storage.setItem(USER_KEY, JSON.stringify(newUser));
  return newUser;
}

function saveCurrentUser(user: Collaborator): void {
  storage.setItem(USER_KEY, JSON.stringify(user));
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

    initSession: (contextId: string) => {
      update(state => {
        if (!state.currentUser) return state;

        const session: CollaborationSession = {
          id: `session-${Date.now()}`,
          contextId,
          started: new Date().toISOString(),
          collaborators: {
            [state.currentUser.id]: state.currentUser,
          },
          changes: [],
          enabled: true,
        };

        return { ...state, session };
      });
    },

    leaveSession: () => {
      update(state => ({ ...state, session: null }));
    },

    updateUser: (updates: Partial<Omit<Collaborator, 'id'>>) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          ...updates,
          lastSeen: new Date().toISOString(),
        };

        saveCurrentUser(updatedUser);

        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
        }

        return { ...state, currentUser: updatedUser };
      });
    },

    setCurrentContext: (contextId: string | undefined) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          currentContext: contextId,
          lastSeen: new Date().toISOString(),
        };

        saveCurrentUser(updatedUser);

        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
        }

        return { ...state, currentUser: updatedUser };
      });
    },

    setCursor: (contextId: string, position: number) => {
      update(state => {
        if (!state.currentUser) return state;

        const updatedUser = {
          ...state.currentUser,
          cursor: { contextId, position },
          lastSeen: new Date().toISOString(),
        };

        if (state.session) {
          state.session.collaborators[updatedUser.id] = updatedUser;
        }

        return { ...state, currentUser: updatedUser };
      });
    },

    broadcastChange: (change: Omit<CollaborationChange, 'id' | 'timestamp' | 'collaboratorId' | 'applied'>) => {
      update(state => {
        if (!state.session || !state.currentUser) return state;

        const newChange: CollaborationChange = {
          ...change,
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          collaboratorId: state.currentUser.id,
          applied: true,
        };

        state.session.changes.push(newChange);
        return state;
      });
    },

    applyChange: (changeId: string) => {
      update(state => ({
        ...state,
        pendingChanges: state.pendingChanges.filter(c => c.id !== changeId),
      }));
    },

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

    resolveConflict: (changeId: string, resolution: 'accept' | 'reject') => {
      update(state => ({
        ...state,
        conflictedChanges: state.conflictedChanges.filter(c => c.id !== changeId),
      }));
    },

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
