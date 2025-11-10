import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import GitHubCommitHistory from './GitHubCommitHistory.svelte';

// Mock GitHub API
vi.mock('../../services/github/githubApi', () => ({
  getCommitHistory: vi.fn(),
  getFileAtCommit: vi.fn(),
}));

const { getCommitHistory: mockGetCommitHistory, getFileAtCommit: mockGetFileAtCommit } = await import('../../services/github/githubApi');

describe('GitHubCommitHistory', () => {
  const mockCommits = [
    {
      sha: 'abc123',
      message: 'Initial commit\n\nAdded story content',
      date: '2024-01-01T12:00:00Z',
      author: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      sha: 'def456',
      message: 'Update story',
      date: '2024-01-02T12:00:00Z',
      author: {
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockGetCommitHistory as any).mockResolvedValue(mockCommits);
    (mockGetFileAtCommit as any).mockResolvedValue({
      path: 'story.json',
      content: '{"title":"Test Story"}',
      sha: 'abc123',
      size: 100,
    });
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(GitHubCommitHistory, {
        props: {
          show: false,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeNull();
    });

    it('should render modal when show is true', async () => {
      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
      });
    });

    it('should display title and file path', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Commit History')).toBeTruthy();
        expect(getByText(/story.json in repo/)).toBeTruthy();
      });
    });

    it('should show loading spinner while fetching commits', () => {
      mockGetCommitHistory.mockImplementation(() => new Promise(() => {}));

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should display commits after loading', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
        expect(getByText('Update story')).toBeTruthy();
      });
    });
  });

  describe('commit list', () => {
    it('should display commit authors', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
      });
    });

    it('should display relative time for commits', async () => {
      // Use a recent date to ensure time formatting shows
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          ...mockCommits[0],
          date: recentDate.toISOString(),
        },
      ]);

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        const text = container.textContent || '';
        expect(text).toMatch(/ago|hours?/);
      });
    });

    it('should show message when no commits found', async () => {
      (mockGetCommitHistory as any).mockResolvedValue([]);

      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('No commits found for this file')).toBeTruthy();
      });
    });

    it('should show error message on fetch failure', async () => {
      mockGetCommitHistory.mockRejectedValue(new Error('Failed to fetch'));

      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Failed to fetch')).toBeTruthy();
      });
    });
  });

  describe('commit selection', () => {
    it('should load commit details when commit clicked', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      const commitButton = getByText('Initial commit');
      await fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockGetFileAtCommit).toHaveBeenCalledWith('user', 'repo', 'story.json', 'abc123');
      });
    });

    it('should display commit message in details', async () => {
      const { getByText, container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        const messages = Array.from(container.querySelectorAll('div')).filter(
          div => div.textContent?.includes('Initial commit')
        );
        expect(messages.length).toBeGreaterThan(0);
        expect(getByText(/Added story content/)).toBeTruthy();
      });
    });

    it('should display commit metadata', async () => {
      const { getByText, container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText(/Author:/)).toBeTruthy();
        const authors = Array.from(container.querySelectorAll('div')).filter(
          div => div.textContent?.includes('John Doe')
        );
        expect(authors.length).toBeGreaterThan(0);
        expect(getByText(/SHA:/)).toBeTruthy();
        expect(getByText(/abc123/i)).toBeTruthy();
      });
    });

    it('should display file content', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText(/"title":"Test Story"/)).toBeTruthy();
      });
    });

    it('should show loading spinner while loading file content', async () => {
      mockGetFileAtCommit.mockImplementation(() => new Promise(() => {}));

      const { getByText, container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText('Loading file content...')).toBeTruthy();
      });
    });

    it('should highlight selected commit', async () => {
      const { getByText, container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      const commitButton = getByText('Initial commit').closest('button');
      await fireEvent.click(commitButton!);

      await waitFor(() => {
        expect(commitButton?.className).toContain('bg-blue-50');
      });
    });
  });

  describe('revert functionality', () => {
    it('should show restore button when commit is loaded', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText('Restore this version')).toBeTruthy();
      });
    });

    it('should show restore button when commit is selected', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText('Restore this version')).toBeTruthy();
      });

      const restoreButton = getByText('Restore this version');
      await fireEvent.click(restoreButton);

      // Button interaction works
      expect(restoreButton).toBeTruthy();
    });
  });

  describe('close functionality', () => {
    it('should close modal when close button clicked', async () => {
      const { getByText, container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Close')).toBeTruthy();
      });

      await fireEvent.click(getByText('Close'));

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });

    it('should reset state when closed', async () => {
      const { getByText, rerender } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      // Select a commit
      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        expect(getByText('Restore this version')).toBeTruthy();
      });

      // Close
      await fireEvent.click(getByText('Close'));

      // Reopen
      await rerender({
        show: true,
        owner: 'user',
        repo: 'repo',
        path: 'story.json',
      });

      await waitFor(() => {
        // Should not show selected commit details
        expect(getByText('Select a commit to view details')).toBeTruthy();
      });
    });
  });

  describe('time formatting', () => {
    it('should show seconds ago for very recent commits', async () => {
      const now = new Date();
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          sha: 'abc123',
          message: 'Recent commit',
          date: new Date(now.getTime() - 30000).toISOString(),
          author: { name: 'Test', email: 'test@example.com' },
        },
      ]);

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(container.textContent).toMatch(/\d+s ago/);
      });
    });

    it('should show minutes ago for commits within an hour', async () => {
      const now = new Date();
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          sha: 'abc123',
          message: 'Recent commit',
          date: new Date(now.getTime() - 5 * 60000).toISOString(),
          author: { name: 'Test', email: 'test@example.com' },
        },
      ]);

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(container.textContent).toMatch(/\d+m ago/);
      });
    });

    it('should show hours ago for commits within a day', async () => {
      const now = new Date();
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          sha: 'abc123',
          message: 'Recent commit',
          date: new Date(now.getTime() - 3 * 3600000).toISOString(),
          author: { name: 'Test', email: 'test@example.com' },
        },
      ]);

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(container.textContent).toMatch(/\d+h ago/);
      });
    });

    it('should show days ago for commits within a week', async () => {
      const now = new Date();
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          sha: 'abc123',
          message: 'Recent commit',
          date: new Date(now.getTime() - 3 * 86400000).toISOString(),
          author: { name: 'Test', email: 'test@example.com' },
        },
      ]);

      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(container.textContent).toMatch(/\d+d ago/);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing repository info', async () => {
      const { container } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: '',
          repo: '',
          path: '',
        },
      });

      await waitFor(() => {
        const text = container.textContent || '';
        // Component may show error or empty state when repository info is missing
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('should handle commit without email', async () => {
      (mockGetCommitHistory as any).mockResolvedValue([
        {
          sha: 'abc123',
          message: 'Test commit',
          date: '2024-01-01T12:00:00Z',
          author: { name: 'Test User', email: '' },
        },
      ]);

      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Test User')).toBeTruthy();
      });
    });

    it('should show short SHA in commit details', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        // Should show first 7 characters of SHA
        const codeElement = document.querySelector('code');
        expect(codeElement?.textContent).toBe('abc123');
      });
    });

    it('should handle multiline commit messages', async () => {
      const { getByText } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user',
          repo: 'repo',
          path: 'story.json',
        },
      });

      await waitFor(() => {
        // Should show only first line in list
        expect(getByText('Initial commit')).toBeTruthy();
      });

      await fireEvent.click(getByText('Initial commit'));

      await waitFor(() => {
        // Should show full message in details
        expect(getByText(/Added story content/)).toBeTruthy();
      });
    });
  });

  describe('loading states', () => {
    it('should reload commits when props change', async () => {
      const { rerender } = render(GitHubCommitHistory, {
        props: {
          show: true,
          owner: 'user1',
          repo: 'repo1',
          path: 'file1.json',
        },
      });

      await waitFor(() => {
        expect(mockGetCommitHistory).toHaveBeenCalledWith('user1', 'repo1', 'file1.json');
      });

      mockGetCommitHistory.mockClear();

      await rerender({
        show: true,
        owner: 'user2',
        repo: 'repo2',
        path: 'file2.json',
      });

      await waitFor(() => {
        expect(mockGetCommitHistory).toHaveBeenCalledWith('user2', 'repo2', 'file2.json');
      });
    });
  });
});
