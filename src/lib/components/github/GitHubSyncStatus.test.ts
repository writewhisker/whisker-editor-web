import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import GitHubSyncStatus from './GitHubSyncStatus.svelte';
import { writable } from 'svelte/store';

// Mock GitHub auth service
const mockIsAuthenticated = writable(false);
const mockGithubUser = writable(null);

vi.mock('../../services/github/githubAuth', () => ({
  isAuthenticated: mockIsAuthenticated,
  githubUser: mockGithubUser,
}));

describe('GitHubSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.set(false);
    mockGithubUser.set(null);
  });

  describe('rendering - not authenticated', () => {
    it('should show not connected status when not authenticated', () => {
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: null,
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText(/Not connected/)).toBeTruthy();
    });

    it('should display gray circle icon when not authenticated', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: null,
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('○');
    });

    it('should have gray color when not authenticated', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: null,
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      const statusSpan = container.querySelector('span');
      expect(statusSpan?.className).toContain('text-gray-400');
    });
  });

  describe('rendering - authenticated states', () => {
    beforeEach(() => {
      mockIsAuthenticated.set(true);
    });

    it('should show "No repository" when authenticated but no repo selected', () => {
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: null,
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('No repository')).toBeTruthy();
    });

    it('should show repository name in idle state', () => {
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('my-story')).toBeTruthy();
    });

    it('should show syncing status with spinning icon', () => {
      const { getByText, container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'syncing',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('Syncing...')).toBeTruthy();
      expect(container.textContent).toContain('↻');

      const iconSpan = container.querySelector('span');
      expect(iconSpan?.className).toContain('animate-spin');
      expect(iconSpan?.className).toContain('text-blue-500');
    });

    it('should show synced status with checkmark', () => {
      const { getByText, container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('Synced')).toBeTruthy();
      expect(container.textContent).toContain('✓');

      const iconSpan = container.querySelector('span');
      expect(iconSpan?.className).toContain('text-green-500');
    });

    it('should show error status with X icon', () => {
      const { getByText, container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'error',
          lastSyncTime: null,
          errorMessage: 'Connection failed',
        },
      });

      expect(getByText('Connection failed')).toBeTruthy();
      expect(container.textContent).toContain('✕');

      const iconSpan = container.querySelector('span');
      expect(iconSpan?.className).toContain('text-red-500');
    });

    it('should show default error message when no error message provided', () => {
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'error',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('Sync error')).toBeTruthy();
    });
  });

  describe('time formatting', () => {
    beforeEach(() => {
      mockIsAuthenticated.set(true);
    });

    it('should show "just now" for very recent syncs', () => {
      const now = new Date();
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: now,
          errorMessage: null,
        },
      });

      expect(getByText('Synced just now')).toBeTruthy();
    });

    it('should show minutes ago for syncs within an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: fiveMinutesAgo,
          errorMessage: null,
        },
      });

      expect(getByText(/Synced 5m ago/)).toBeTruthy();
    });

    it('should show hours ago for syncs within a day', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: twoHoursAgo,
          errorMessage: null,
        },
      });

      expect(getByText(/Synced 2h ago/)).toBeTruthy();
    });

    it('should show days ago for older syncs', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: threeDaysAgo,
          errorMessage: null,
        },
      });

      expect(getByText(/Synced 3d ago/)).toBeTruthy();
    });
  });

  describe('status icons', () => {
    beforeEach(() => {
      mockIsAuthenticated.set(true);
    });

    it('should use bullet icon for idle state', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('●');
    });

    it('should use arrow icon for syncing state', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'syncing',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('↻');
    });

    it('should use checkmark for synced state', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('✓');
    });

    it('should use X for error state', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'error',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('✕');
    });
  });

  describe('tooltip', () => {
    beforeEach(() => {
      mockIsAuthenticated.set(true);
    });

    it('should have title attribute with repository name', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      const span = container.querySelector('span[title]');
      expect(span?.getAttribute('title')).toBe('my-story');
    });

    it('should have "No repository" title when no repo', () => {
      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: null,
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      const span = container.querySelector('span[title]');
      expect(span?.getAttribute('title')).toBe('No repository');
    });
  });

  describe('edge cases', () => {
    it('should handle null lastSyncTime gracefully', () => {
      mockIsAuthenticated.set(true);

      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'synced',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('Synced')).toBeTruthy();
    });

    it('should handle empty repository name', () => {
      mockIsAuthenticated.set(true);

      const { getByText } = render(GitHubSyncStatus, {
        props: {
          repositoryName: '',
          syncStatus: 'idle',
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(getByText('No repository')).toBeTruthy();
    });

    it('should handle invalid sync status gracefully', () => {
      mockIsAuthenticated.set(true);

      const { container } = render(GitHubSyncStatus, {
        props: {
          repositoryName: 'my-story',
          syncStatus: 'invalid' as any,
          lastSyncTime: null,
          errorMessage: null,
        },
      });

      expect(container.textContent).toContain('my-story');
    });
  });
});
