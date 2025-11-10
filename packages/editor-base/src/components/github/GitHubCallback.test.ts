import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import GitHubCallback from './GitHubCallback.svelte';

// Mock GitHub auth service
const mockHandleGitHubCallback = vi.fn();

vi.mock('../../services/github/githubAuth', () => ({
  handleGitHubCallback: mockHandleGitHubCallback,
}));

describe('GitHubCallback', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render modal dialog', () => {
      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      expect(getByText('GitHub Authentication')).toBeTruthy();
    });

    it('should show loading spinner initially', () => {
      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should show processing message initially', () => {
      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      expect(getByText('Processing authentication...')).toBeTruthy();
    });
  });

  describe('successful authentication', () => {
    it('should call handleGitHubCallback on mount', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(mockHandleGitHubCallback).toHaveBeenCalledWith('test-code', 'test-state');
      });
    });

    it('should show success message on successful auth', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Success! Authenticated with GitHub.')).toBeTruthy();
      });
    });

    it('should show success icon on successful auth', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText(/✓ Success/)).toBeTruthy();
      });
    });

    it('should call onComplete after delay on success', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(mockHandleGitHubCallback).toHaveBeenCalled();
      });

      // Fast-forward time by 1500ms
      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledOnce();
      });
    });

    it('should have success styling', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        const successDiv = container.querySelector('.bg-green-50');
        expect(successDiv).toBeTruthy();
      });
    });
  });

  describe('authentication failure', () => {
    it('should show error message on auth failure', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Authentication failed'));

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Authentication failed')).toBeTruthy();
      });
    });

    it('should show error status on auth failure', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Authentication failed')).toBeTruthy();
      });
    });

    it('should show close button on error', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Error'));

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Close')).toBeTruthy();
      });
    });

    it('should call onComplete when close button clicked', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Error'));

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Close')).toBeTruthy();
      });

      const closeButton = getByText('Close');
      await closeButton.click();

      expect(mockOnComplete).toHaveBeenCalledOnce();
    });

    it('should have error styling', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Error'));

      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        const errorDiv = container.querySelector('.bg-red-50');
        expect(errorDiv).toBeTruthy();
      });
    });

    it('should show default error message when error has no message', async () => {
      mockHandleGitHubCallback.mockRejectedValue({});

      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Failed to authenticate with GitHub')).toBeTruthy();
      });
    });
  });

  describe('missing parameters', () => {
    it('should show error when code is missing', async () => {
      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: '',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(getByText('Missing code or state parameter')).toBeTruthy();
      });
    });

    it('should show error when state is missing', async () => {
      const { getByText } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: '',
        },
      });

      await waitFor(() => {
        expect(getByText('Missing code or state parameter')).toBeTruthy();
      });
    });

    it('should not call handleGitHubCallback when parameters missing', async () => {
      render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: '',
          state: '',
        },
      });

      await waitFor(() => {
        expect(mockHandleGitHubCallback).not.toHaveBeenCalled();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading spinner while processing', () => {
      mockHandleGitHubCallback.mockImplementation(() => new Promise(() => {}));

      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should hide loading spinner on success', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);

      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeNull();
      });
    });

    it('should hide loading spinner on error', async () => {
      mockHandleGitHubCallback.mockRejectedValue(new Error('Error'));

      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeNull();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle onComplete callback errors gracefully', async () => {
      mockHandleGitHubCallback.mockResolvedValue(undefined);
      const failingCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      render(GitHubCallback, {
        props: {
          onComplete: failingCallback,
          code: 'test-code',
          state: 'test-state',
        },
      });

      await waitFor(() => {
        expect(mockHandleGitHubCallback).toHaveBeenCalled();
      });

      vi.advanceTimersByTime(1500);

      // Should not crash
      expect(failingCallback).toHaveBeenCalled();
    });

    it('should display modal backdrop', () => {
      const { container } = render(GitHubCallback, {
        props: {
          onComplete: mockOnComplete,
          code: 'test-code',
          state: 'test-state',
        },
      });

      const backdrop = container.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeTruthy();
    });
  });
});
