/**
 * Authentication Service
 *
 * Implements anonymous + GitHub OAuth authentication strategy.
 * Users start as anonymous and can optionally connect GitHub for cloud features.
 */

import { writable, derived, get } from 'svelte/store';
import {
  githubToken,
  githubUser,
  isAuthenticated as isGitHubAuthenticated,
  startGitHubAuth,
  signOut as githubSignOut,
  type GitHubUser,
} from '@writewhisker/github';
import { createIndexedDBStorage } from '@writewhisker/storage';

export type AuthProvider = 'anonymous' | 'github';

export interface User {
  id: string;
  name: string;
  email?: string;
  provider: AuthProvider;
  createdAt: Date;
  githubLogin?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  hasGitHubConnected: boolean;
}

// Storage keys
const USER_STORAGE_KEY = 'whisker_user';

// Storage instance
const storage = createIndexedDBStorage();

// Stores
export const currentUser = writable<User | null>(null);
export const isAuthenticated = writable<boolean>(false);

// Derived stores
export const isAnonymous = derived(
  currentUser,
  $user => $user?.provider === 'anonymous'
);

export const hasGitHubConnected = derived(
  [currentUser, isGitHubAuthenticated],
  ([$user, $isGitHubAuth]) => $user?.provider === 'github' && $isGitHubAuth
);

export const authState = derived(
  [currentUser, isAuthenticated, isAnonymous, hasGitHubConnected],
  ([$user, $isAuth, $isAnon, $hasGitHub]): AuthState => ({
    user: $user,
    isAuthenticated: $isAuth,
    isAnonymous: $isAnon,
    hasGitHubConnected: $hasGitHub,
  })
);

/**
 * Generate anonymous user ID
 */
function generateAnonymousId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create anonymous user
 */
function createAnonymousUser(): User {
  return {
    id: generateAnonymousId(),
    name: 'Guest',
    provider: 'anonymous',
    createdAt: new Date(),
  };
}

/**
 * Convert GitHub user to our User type
 */
function githubUserToUser(ghUser: GitHubUser, anonymousUser?: User): User {
  return {
    // Keep the same ID if upgrading from anonymous
    id: anonymousUser?.id || `github_${ghUser.id}`,
    name: ghUser.name || ghUser.login,
    email: ghUser.email || undefined,
    provider: 'github',
    createdAt: anonymousUser?.createdAt || new Date(),
    githubLogin: ghUser.login,
    avatarUrl: ghUser.avatarUrl,
  };
}

/**
 * Save user to storage
 */
async function saveUser(user: User): Promise<void> {
  try {
    await storage.initialize();
    const backend = storage.getBackend();

    if (backend.savePreference) {
      await backend.savePreference(USER_STORAGE_KEY, 'global', user);
    } else {
      // Fallback to localStorage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to save user:', error);
    // Fallback to localStorage
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Load user from storage
 */
async function loadUser(): Promise<User | null> {
  try {
    await storage.initialize();
    const backend = storage.getBackend();

    if (backend.loadPreference) {
      const user = await backend.loadPreference<User>(USER_STORAGE_KEY, 'global');
      return user || null;
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error('Failed to load user:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }

  return null;
}

/**
 * Delete user from storage
 */
async function deleteUser(): Promise<void> {
  try {
    await storage.initialize();
    const backend = storage.getBackend();

    if (backend.deletePreference) {
      await backend.deletePreference(USER_STORAGE_KEY, 'global');
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
  }

  // Always clear localStorage
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Initialize auth service
 *
 * Automatically creates anonymous user if no user exists
 */
export async function initializeAuth(): Promise<void> {
  // Load existing user
  const savedUser = await loadUser();

  if (savedUser) {
    currentUser.set(savedUser);
    isAuthenticated.set(true);

    // If user has GitHub connected, verify GitHub auth is still valid
    if (savedUser.provider === 'github' && !get(isGitHubAuthenticated)) {
      // GitHub auth expired, downgrade to anonymous
      console.warn('GitHub authentication expired, switching to anonymous mode');
      await switchToAnonymous();
    }

    return;
  }

  // No saved user - create anonymous user
  const anonUser = createAnonymousUser();
  currentUser.set(anonUser);
  isAuthenticated.set(true);
  await saveUser(anonUser);
}

/**
 * Switch to anonymous mode
 */
export async function switchToAnonymous(): Promise<void> {
  const anonUser = createAnonymousUser();
  currentUser.set(anonUser);
  isAuthenticated.set(true);
  await saveUser(anonUser);
}

/**
 * Connect GitHub account
 *
 * Upgrades anonymous user to GitHub user while preserving user data
 */
export async function connectGitHub(): Promise<void> {
  // Start GitHub OAuth flow
  await startGitHubAuth();

  // Note: The actual connection happens in handleGitHubConnection
  // which should be called from the OAuth callback page
}

/**
 * Handle GitHub connection after OAuth callback
 *
 * Should be called after GitHub OAuth completes
 */
export async function handleGitHubConnection(): Promise<void> {
  const ghUser = get(githubUser);
  if (!ghUser) {
    throw new Error('GitHub user not available. OAuth may not have completed.');
  }

  // Get current user (may be anonymous)
  const current = get(currentUser);

  // Create new user with GitHub data, preserving anonymous user's creation date
  const newUser = githubUserToUser(ghUser, current || undefined);

  // Update stores
  currentUser.set(newUser);
  isAuthenticated.set(true);

  // Save to storage
  await saveUser(newUser);
}

/**
 * Disconnect GitHub account
 *
 * Downgrades to anonymous user
 */
export async function disconnectGitHub(): Promise<void> {
  // Sign out from GitHub
  await githubSignOut();

  // Switch to anonymous
  await switchToAnonymous();
}

/**
 * Sign out completely
 *
 * Returns to anonymous mode
 */
export async function signOut(): Promise<void> {
  const current = get(currentUser);

  if (current?.provider === 'github') {
    await githubSignOut();
  }

  await switchToAnonymous();
}

/**
 * Delete account and all data
 *
 * WARNING: This is irreversible
 */
export async function deleteAccount(): Promise<void> {
  const current = get(currentUser);

  if (current?.provider === 'github') {
    await githubSignOut();
  }

  await deleteUser();

  currentUser.set(null);
  isAuthenticated.set(false);

  // Create new anonymous user
  await switchToAnonymous();
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return get(currentUser);
}

/**
 * Check if user is authenticated
 */
export function checkAuthenticated(): boolean {
  return get(isAuthenticated);
}

/**
 * Check if user is anonymous
 */
export function checkIsAnonymous(): boolean {
  return get(isAnonymous);
}

/**
 * Check if GitHub is connected
 */
export function checkHasGitHub(): boolean {
  return get(hasGitHubConnected);
}

// Subscribe to GitHub auth changes to sync with our auth state
if (typeof window !== 'undefined') {
  // Initialize auth when module loads
  initializeAuth();

  // Listen for GitHub user changes
  githubUser.subscribe(async (ghUser) => {
    const current = get(currentUser);

    // If GitHub user becomes available and current user is anonymous or GitHub
    if (ghUser && current && (current.provider === 'anonymous' || current.provider === 'github')) {
      // Only auto-upgrade if explicitly connecting GitHub
      // (this prevents auto-upgrade on page load)
      if (get(isGitHubAuthenticated) && current.provider === 'anonymous') {
        // Don't auto-upgrade here - wait for explicit handleGitHubConnection call
        return;
      }

      // Update GitHub user info if already connected
      if (current.provider === 'github') {
        const updated = githubUserToUser(ghUser, current);
        currentUser.set(updated);
        await saveUser(updated);
      }
    }
  });

  // Listen for GitHub auth state changes
  isGitHubAuthenticated.subscribe(async (isAuth) => {
    const current = get(currentUser);

    // If GitHub auth is lost and user was GitHub user
    if (!isAuth && current?.provider === 'github') {
      console.warn('GitHub authentication lost, switching to anonymous mode');
      await switchToAnonymous();
    }
  });
}
