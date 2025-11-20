/**
 * Comprehensive tests for GitHub OAuth Authentication Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @writewhisker/storage using vi.hoisted to ensure proper initialization order
const { mockBackend, mockStorage } = vi.hoisted(() => {
  const mockBackend = {
    loadGitHubToken: vi.fn().mockResolvedValue(null),
    saveGitHubToken: vi.fn().mockResolvedValue(undefined),
    deleteGitHubToken: vi.fn().mockResolvedValue(undefined),
  };

  const mockStorage = {
    initialize: vi.fn().mockResolvedValue(undefined),
    getBackend: () => mockBackend,
  };

  return { mockBackend, mockStorage };
});

vi.mock('@writewhisker/storage', () => ({
  createIndexedDBStorage: () => mockStorage,
}));

import { get } from 'svelte/store';
import {
  initializeGitHubAuth,
  startGitHubAuth,
  handleGitHubCallback,
  getAccessToken,
  checkAuthenticated,
  signOut,
  validateToken,
  githubToken,
  githubUser,
  isAuthenticated,
} from './githubAuth';
import { GitHubApiError } from './types';

// Mock global objects
const mockFetch = vi.fn();
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
};
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

globalThis.fetch = mockFetch as any;
Object.defineProperty(globalThis, 'window', {
  value: { location: mockLocation },
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock crypto for random state generation
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
  writable: true,
});

describe('GitHubAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores
    githubToken.set(null);
    githubUser.set(null);
    isAuthenticated.set(false);
    // Clear mock storage
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    // Reset location
    mockLocation.href = '';
    // Reset mock backend
    mockBackend.loadGitHubToken.mockResolvedValue(null);
    mockBackend.saveGitHubToken.mockResolvedValue(undefined);
    mockBackend.deleteGitHubToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeGitHubAuth', () => {
    it('should initialize without error when no stored token', async () => {
      await expect(initializeGitHubAuth()).resolves.toBeUndefined();
      expect(get(isAuthenticated)).toBe(false);
      expect(get(githubToken)).toBeNull();
      expect(get(githubUser)).toBeNull();
    });

    it('should restore token from IndexedDB storage', async () => {
      const mockToken = {
        accessToken: 'test-token',
        tokenType: 'bearer',
        scope: 'repo user',
        user: {
          login: 'testuser',
          id: 123,
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://github.com/avatar.jpg',
        },
      };

      mockBackend.loadGitHubToken.mockResolvedValue(mockToken);

      await initializeGitHubAuth();

      expect(get(isAuthenticated)).toBe(true);
      expect(get(githubToken)).toEqual({
        accessToken: 'test-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });
      expect(get(githubUser)).toEqual(mockToken.user);
    });

    it('should migrate from localStorage to IndexedDB', async () => {
      const oldToken = {
        accessToken: 'old-token',
        tokenType: 'bearer',
        scope: 'repo user',
      };
      const oldUser = {
        login: 'olduser',
        id: 456,
        name: 'Old User',
        email: 'old@example.com',
        avatarUrl: 'https://github.com/old-avatar.jpg',
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'github_access_token') return JSON.stringify(oldToken);
        if (key === 'github_user') return JSON.stringify(oldUser);
        return null;
      });

      await initializeGitHubAuth();

      // Should save to new storage
      expect(mockBackend.saveGitHubToken).toHaveBeenCalledWith({
        accessToken: 'old-token',
        tokenType: 'bearer',
        scope: 'repo user',
        user: oldUser,
      });

      // Should remove from localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('github_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('github_user');
    });

    it('should handle initialization errors gracefully', async () => {
      mockStorage.initialize.mockRejectedValue(new Error('Storage error'));

      await expect(initializeGitHubAuth()).resolves.toBeUndefined();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('startGitHubAuth', () => {
    it('should redirect to GitHub OAuth with correct parameters', () => {
      // Mock environment variables
      vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id');
      vi.stubEnv('VITE_GITHUB_REDIRECT_URI', 'http://localhost:3000/callback');

      startGitHubAuth();

      expect(mockLocation.href).toContain('https://github.com/login/oauth/authorize');
      expect(mockLocation.href).toContain('client_id=test-client-id');
      expect(mockLocation.href).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(mockLocation.href).toContain('scope=repo+user');
      expect(mockLocation.href).toContain('state=');

      // Should store state in session storage
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'github_oauth_state',
        expect.any(String)
      );
    });

    it('should throw error when client ID not configured', () => {
      vi.stubEnv('VITE_GITHUB_CLIENT_ID', '');

      expect(() => startGitHubAuth()).toThrow(
        'GitHub Client ID not configured. Set VITE_GITHUB_CLIENT_ID environment variable.'
      );
    });

    it('should generate unique state for each auth request', () => {
      vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id');

      startGitHubAuth();
      const state1 = mockSessionStorage.setItem.mock.calls[0][1];

      mockSessionStorage.setItem.mockClear();
      mockLocation.href = '';

      startGitHubAuth();
      const state2 = mockSessionStorage.setItem.mock.calls[0][1];

      expect(state1).not.toBe(state2);
    });
  });

  describe('handleGitHubCallback', () => {
    it('should complete OAuth flow successfully', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(state);

      // Mock token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'bearer',
          scope: 'repo user',
        }),
      });

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'newuser',
          id: 789,
          name: 'New User',
          email: 'new@example.com',
          avatar_url: 'https://github.com/new-avatar.jpg',
        }),
      });

      await handleGitHubCallback(code, state);

      expect(get(isAuthenticated)).toBe(true);
      expect(get(githubToken)).toEqual({
        accessToken: 'new-access-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });
      expect(get(githubUser)).toEqual({
        login: 'newuser',
        id: 789,
        name: 'New User',
        email: 'new@example.com',
        avatarUrl: 'https://github.com/new-avatar.jpg',
      });

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_oauth_state');
    });

    it('should throw error on state mismatch (CSRF protection)', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue('different-state');

      await expect(handleGitHubCallback(code, state)).rejects.toThrow(GitHubApiError);
      await expect(handleGitHubCallback(code, state)).rejects.toThrow(
        'Invalid OAuth state - possible CSRF attack'
      );
    });

    it('should throw error when state is missing', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(null);

      await expect(handleGitHubCallback(code, state)).rejects.toThrow(GitHubApiError);
    });

    it('should handle token exchange failure', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(state);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(handleGitHubCallback(code, state)).rejects.toThrow(GitHubApiError);
    });

    it('should handle user info fetch failure', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(state);

      // Mock successful token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'bearer',
          scope: 'repo user',
        }),
      });

      // Mock failed user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(handleGitHubCallback(code, state)).rejects.toThrow(GitHubApiError);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when not authenticated', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('should return access token when authenticated', () => {
      githubToken.set({
        accessToken: 'test-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });

      expect(getAccessToken()).toBe('test-token');
    });
  });

  describe('checkAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(checkAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', () => {
      isAuthenticated.set(true);
      expect(checkAuthenticated()).toBe(true);
    });
  });

  describe('signOut', () => {
    it('should clear all authentication data', async () => {
      // Set up authenticated state
      githubToken.set({
        accessToken: 'test-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });
      githubUser.set({
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://github.com/avatar.jpg',
      });
      isAuthenticated.set(true);

      await signOut();

      // Should clear storage
      expect(mockBackend.deleteGitHubToken).toHaveBeenCalled();

      // Should clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('github_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('github_user');

      // Should clear stores
      expect(get(githubToken)).toBeNull();
      expect(get(githubUser)).toBeNull();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('should handle storage deletion errors gracefully', async () => {
      mockBackend.deleteGitHubToken.mockRejectedValue(new Error('Delete failed'));

      await expect(signOut()).resolves.toBeUndefined();

      // Should still clear localStorage and stores
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should return false when no token exists', async () => {
      const result = await validateToken();
      expect(result).toBe(false);
    });

    it('should return true when token is valid', async () => {
      githubToken.set({
        accessToken: 'valid-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
        }),
      });

      const result = await validateToken();
      expect(result).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('should clear auth and return false when token is invalid', async () => {
      githubToken.set({
        accessToken: 'invalid-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });
      isAuthenticated.set(true);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await validateToken();
      expect(result).toBe(false);

      // Should clear authentication
      expect(mockBackend.deleteGitHubToken).toHaveBeenCalled();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      githubToken.set({
        accessToken: 'test-token',
        tokenType: 'bearer',
        scope: 'repo user',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateToken();
      expect(result).toBe(false);
    });
  });

  describe('Token Storage', () => {
    it('should store token in both IndexedDB and localStorage', async () => {
      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(state);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          token_type: 'bearer',
          scope: 'repo user',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://github.com/avatar.jpg',
        }),
      });

      await handleGitHubCallback(code, state);

      // Should save to IndexedDB
      expect(mockBackend.saveGitHubToken).toHaveBeenCalledWith({
        accessToken: 'new-token',
        tokenType: 'bearer',
        scope: 'repo user',
        user: expect.objectContaining({
          login: 'testuser',
        }),
      });

      // Should save to localStorage as fallback
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'github_access_token',
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'github_user',
        expect.any(String)
      );
    });

    it('should fallback to localStorage when IndexedDB fails', async () => {
      mockBackend.saveGitHubToken.mockRejectedValue(new Error('Storage error'));

      const code = 'test-code';
      const state = 'test-state';

      mockSessionStorage.getItem.mockReturnValue(state);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          token_type: 'bearer',
          scope: 'repo user',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 123,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://github.com/avatar.jpg',
        }),
      });

      await handleGitHubCallback(code, state);

      // Should still save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'github_access_token',
        expect.any(String)
      );
    });
  });
});
