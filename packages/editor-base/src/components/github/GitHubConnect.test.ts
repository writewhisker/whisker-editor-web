import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import GitHubConnect from './GitHubConnect.svelte';
import { writable } from 'svelte/store';

// Mock GitHub auth service
const mockIsAuthenticated = writable(false);
const mockGithubUser = writable(null);
const mockStartGitHubAuth = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../services/github/githubAuth', () => ({
  isAuthenticated: mockIsAuthenticated,
  githubUser: mockGithubUser,
  startGitHubAuth: mockStartGitHubAuth,
  signOut: mockSignOut,
}));

describe('GitHubConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.set(false);
    mockGithubUser.set(null);
  });

  describe('rendering - disconnected state', () => {
    it('should render connect button when not authenticated', () => {
      const { getByText } = render(GitHubConnect);

      expect(getByText('Connect to GitHub')).toBeTruthy();
    });

    it('should display GitHub icon in connect button', () => {
      const { container } = render(GitHubConnect);

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should have proper styling for connect button', () => {
      const { container } = render(GitHubConnect);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-gray-900');
      expect(button?.className).toContain('text-white');
    });
  });

  describe('rendering - connected state', () => {
    beforeEach(() => {
      mockIsAuthenticated.set(true);
      mockGithubUser.set({
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should render user info when authenticated', () => {
      const { getByText } = render(GitHubConnect);

      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('@testuser')).toBeTruthy();
    });

    it('should display user avatar when authenticated', () => {
      const { container } = render(GitHubConnect);

      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
      expect(img?.getAttribute('alt')).toBe('testuser');
    });

    it('should render disconnect button when authenticated', () => {
      const { getByText } = render(GitHubConnect);

      expect(getByText('Disconnect')).toBeTruthy();
    });

    it('should display login as fallback when name is not available', () => {
      mockGithubUser.set({
        login: 'testuser',
        id: 123,
        name: null,
        email: null,
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const { getByText } = render(GitHubConnect);

      expect(getByText('testuser')).toBeTruthy();
      expect(getByText('@testuser')).toBeTruthy();
    });

    it('should have proper styling for avatar', () => {
      const { container } = render(GitHubConnect);

      const img = container.querySelector('img');
      expect(img?.className).toContain('w-8');
      expect(img?.className).toContain('h-8');
      expect(img?.className).toContain('rounded-full');
    });
  });

  describe('user interactions', () => {
    it('should call startGitHubAuth when connect button clicked', async () => {
      const { getByText } = render(GitHubConnect);

      const connectButton = getByText('Connect to GitHub');
      await fireEvent.click(connectButton);

      expect(mockStartGitHubAuth).toHaveBeenCalledOnce();
    });

    it('should call signOut when disconnect button clicked', async () => {
      mockIsAuthenticated.set(true);
      mockGithubUser.set({
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: null,
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const { getByText } = render(GitHubConnect);

      const disconnectButton = getByText('Disconnect');
      await fireEvent.click(disconnectButton);

      expect(mockSignOut).toHaveBeenCalledOnce();
    });
  });

  describe('state changes', () => {
    it('should update UI when authentication state changes', async () => {
      const { getByText, queryByText, rerender } = render(GitHubConnect);

      // Initially not authenticated
      expect(getByText('Connect to GitHub')).toBeTruthy();

      // Simulate authentication
      mockIsAuthenticated.set(true);
      mockGithubUser.set({
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: null,
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      await rerender({});

      // Should show user info
      expect(queryByText('Connect to GitHub')).toBeNull();
      expect(getByText('Test User')).toBeTruthy();
    });

    it('should update UI when user info changes', async () => {
      mockIsAuthenticated.set(true);
      mockGithubUser.set({
        login: 'user1',
        id: 1,
        name: 'User One',
        email: null,
        avatarUrl: 'https://example.com/avatar1.jpg',
      });

      const { getByText, rerender } = render(GitHubConnect);

      expect(getByText('User One')).toBeTruthy();

      // Update user
      mockGithubUser.set({
        login: 'user2',
        id: 2,
        name: 'User Two',
        email: null,
        avatarUrl: 'https://example.com/avatar2.jpg',
      });

      await rerender({});

      expect(getByText('User Two')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle missing user data gracefully', () => {
      mockIsAuthenticated.set(true);
      mockGithubUser.set(null);

      const { queryByText } = render(GitHubConnect);

      // Should show connect button as fallback
      expect(queryByText('Connect to GitHub')).toBeTruthy();
    });

    it('should handle user with minimal data', () => {
      mockIsAuthenticated.set(true);
      mockGithubUser.set({
        login: 'minimaluser',
        id: 999,
        name: null,
        email: null,
        avatarUrl: 'https://example.com/default.jpg',
      });

      const { getByText } = render(GitHubConnect);

      expect(getByText('minimaluser')).toBeTruthy();
      expect(getByText('@minimaluser')).toBeTruthy();
    });
  });
});
