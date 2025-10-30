/**
 * GitHub OAuth Authentication Service
 *
 * Handles OAuth flow, token management, and user authentication
 */

import { writable, get } from 'svelte/store';
import type { GitHubAuthToken, GitHubUser } from './types';
import { GitHubApiError } from './types';

// Store for authentication state
export const githubToken = writable<GitHubAuthToken | null>(null);
export const githubUser = writable<GitHubUser | null>(null);
export const isAuthenticated = writable(false);

// GitHub OAuth Configuration
// These should be set via environment variables or config
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`;
const GITHUB_SCOPES = 'repo user';

const TOKEN_STORAGE_KEY = 'github_access_token';
const USER_STORAGE_KEY = 'github_user';

/**
 * Initialize auth service - restore token from storage if available
 */
export function initializeGitHubAuth(): void {
  try {
    // Try to restore token from localStorage
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken) {
      const token: GitHubAuthToken = JSON.parse(storedToken);
      githubToken.set(token);
      isAuthenticated.set(true);

      if (storedUser) {
        const user: GitHubUser = JSON.parse(storedUser);
        githubUser.set(user);
      }
    }
  } catch (error) {
    console.error('Failed to restore GitHub authentication:', error);
    clearAuth();
  }
}

/**
 * Start GitHub OAuth flow
 */
export function startGitHubAuth(): void {
  if (!GITHUB_CLIENT_ID) {
    throw new Error('GitHub Client ID not configured. Set VITE_GITHUB_CLIENT_ID environment variable.');
  }

  // Generate random state for CSRF protection
  const state = generateRandomState();
  sessionStorage.setItem('github_oauth_state', state);

  // Build OAuth URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI);
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

    // Store token
    storeToken(token);

    // Fetch user info
    const user = await fetchUserInfo(token.accessToken);
    storeUser(user);

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
 * Store token in localStorage
 */
function storeToken(token: GitHubAuthToken): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

/**
 * Store user in localStorage
 */
function storeUser(user: GitHubUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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
export function signOut(): void {
  clearAuth();
}

/**
 * Clear all authentication data
 */
function clearAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
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
      clearAuth();
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
