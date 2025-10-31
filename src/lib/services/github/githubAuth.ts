/**
 * GitHub OAuth Authentication Service
 *
 * Handles OAuth flow, token management, and user authentication
 */

import { writable, get } from 'svelte/store';
import type { GitHubAuthToken, GitHubUser } from './types';
import { GitHubApiError } from './types';
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter';

// Store for authentication state
export const githubToken = writable<GitHubAuthToken | null>(null);
export const githubUser = writable<GitHubUser | null>(null);
export const isAuthenticated = writable(false);

// GitHub OAuth Configuration
// These should be set via environment variables or config
// Read dynamically to allow testing
function getGitHubClientId(): string {
  return import.meta.env.VITE_GITHUB_CLIENT_ID || '';
}

function getGitHubRedirectUri(): string {
  return import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`;
}

const GITHUB_SCOPES = 'repo user';

const TOKEN_STORAGE_KEY = 'github_access_token';
const USER_STORAGE_KEY = 'github_user';

// IndexedDB adapter for persistent storage
const db = new IndexedDBAdapter({ dbName: 'whisker-storage', version: 1 });

/**
 * Initialize auth service - restore token from storage if available
 */
export async function initializeGitHubAuth(): Promise<void> {
  try {
    // Initialize IndexedDB
    await db.initialize();

    // Try to restore token from IndexedDB first
    const storedData = await db.loadGitHubToken();

    if (storedData) {
      const token: GitHubAuthToken = {
        accessToken: storedData.accessToken,
        tokenType: storedData.tokenType,
        scope: storedData.scope,
      };

      githubToken.set(token);
      isAuthenticated.set(true);

      if (storedData.user) {
        const user: GitHubUser = storedData.user;
        githubUser.set(user);
      }
    } else {
      // Fallback to localStorage for migration
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken) {
        const token: GitHubAuthToken = JSON.parse(storedToken);
        githubToken.set(token);
        isAuthenticated.set(true);

        let user: GitHubUser | null = null;
        if (storedUser) {
          user = JSON.parse(storedUser);
          githubUser.set(user);
        }

        // Migrate to IndexedDB
        await storeToken(token, user);

        // Clear localStorage after migration
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to restore GitHub authentication:', error);
    await clearAuth();
  }
}

/**
 * Start GitHub OAuth flow
 */
export function startGitHubAuth(): void {
  const clientId = getGitHubClientId();
  if (!clientId) {
    throw new Error('GitHub Client ID not configured. Set VITE_GITHUB_CLIENT_ID environment variable.');
  }

  // Generate random state for CSRF protection
  const state = generateRandomState();
  sessionStorage.setItem('github_oauth_state', state);

  // Build OAuth URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getGitHubRedirectUri());
  authUrl.searchParams.set('scope', GITHUB_SCOPES);
  authUrl.searchParams.set('state', state);

  // Redirect to GitHub
  window.location.href = authUrl.toString();
}

/**
 * Handle OAuth callback
 * This should be called from the callback page
 */
export async function handleGitHubCallback(code: string, state: string): Promise<void> {
  // Verify state to prevent CSRF
  const storedState = sessionStorage.getItem('github_oauth_state');
  if (!storedState || storedState !== state) {
    throw new GitHubApiError('Invalid OAuth state - possible CSRF attack', 400);
  }

  // Clear stored state
  sessionStorage.removeItem('github_oauth_state');

  try {
    // Exchange code for access token
    // Note: This typically requires a backend proxy to avoid exposing client secret
    // For now, we'll use the GitHub OAuth Device Flow or a proxy endpoint
    const token = await exchangeCodeForToken(code);

    // Fetch user info
    const user = await fetchUserInfo(token.accessToken);

    // Store token and user together
    await storeToken(token, user);

    // Update stores
    githubToken.set(token);
    githubUser.set(user);
    isAuthenticated.set(true);
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw new GitHubApiError('Failed to complete GitHub authentication', 500);
  }
}

/**
 * Exchange authorization code for access token
 * Note: This requires a backend proxy or serverless function
 */
async function exchangeCodeForToken(code: string): Promise<GitHubAuthToken> {
  // In production, this should call a backend endpoint that handles the token exchange
  // For development, you can use a serverless function or proxy

  const proxyUrl = import.meta.env.VITE_GITHUB_TOKEN_PROXY || '/api/github/token';

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new GitHubApiError('Failed to exchange code for token', response.status);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    scope: data.scope || GITHUB_SCOPES,
  };
}

/**
 * Fetch authenticated user info
 */
async function fetchUserInfo(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new GitHubApiError('Failed to fetch user info', response.status);
  }

  const data = await response.json();

  return {
    login: data.login,
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url,
  };
}

/**
 * Store token and user in IndexedDB
 */
async function storeToken(token: GitHubAuthToken, user: GitHubUser | null = null): Promise<void> {
  try {
    await db.saveGitHubToken({
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      scope: token.scope,
      user: user || undefined,
    });

    // Also store in localStorage as fallback
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to store token:', error);
    // Fall back to localStorage only
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  const token = get(githubToken);
  return token?.accessToken || null;
}

/**
 * Check if user is authenticated
 */
export function checkAuthenticated(): boolean {
  return get(isAuthenticated);
}

/**
 * Sign out and clear authentication
 */
export async function signOut(): Promise<void> {
  await clearAuth();
}

/**
 * Clear all authentication data
 */
async function clearAuth(): Promise<void> {
  try {
    // Clear from IndexedDB
    await db.deleteGitHubToken();
  } catch (error) {
    console.error('Failed to clear token from IndexedDB:', error);
  }

  // Clear from localStorage
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);

  // Clear stores
  githubToken.set(null);
  githubUser.set(null);
  isAuthenticated.set(false);
}

/**
 * Generate random state for OAuth CSRF protection
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate current token by making a test API call
 */
export async function validateToken(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      // Token is invalid, clear auth
      await clearAuth();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeGitHubAuth();
}
