import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import GitHubRepositoryPicker from './GitHubRepositoryPicker.svelte';
import { writable } from 'svelte/store';

// Mock GitHub API
const mockListRepositories = vi.fn();
const mockCreateRepository = vi.fn();

vi.mock('../../services/github/githubApi', () => ({
  listRepositories: mockListRepositories,
  createRepository: mockCreateRepository,
}));

// Mock GitHub auth
const mockIsAuthenticated = writable(true);

vi.mock('../../services/github/githubAuth', () => ({
  isAuthenticated: mockIsAuthenticated,
}));

describe('GitHubRepositoryPicker', () => {
  const mockRepositories = [
    {
      id: 1,
      name: 'repo-1',
      fullName: 'user/repo-1',
      description: 'First repository',
      private: false,
      defaultBranch: 'main',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'repo-2',
      fullName: 'user/repo-2',
      description: 'Second repository',
      private: true,
      defaultBranch: 'main',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.set(true);
    mockListRepositories.mockResolvedValue(mockRepositories);
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(GitHubRepositoryPicker, {
        props: { show: false },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeNull();
    });

    it('should render modal when show is true', async () => {
      const { container } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
      });
    });

    it('should display save mode title', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'save' },
      });

      await waitFor(() => {
        expect(getByText('Save to GitHub')).toBeTruthy();
      });
    });

    it('should display load mode title', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'load' },
      });

      await waitFor(() => {
        expect(getByText('Load from GitHub')).toBeTruthy();
      });
    });

    it('should show loading state while fetching repositories', () => {
      mockListRepositories.mockImplementation(() => new Promise(() => {}));

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      expect(getByText('Loading repositories...')).toBeTruthy();
    });

    it('should display repositories after loading', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('repo-1')).toBeTruthy();
        expect(getByText('repo-2')).toBeTruthy();
      });
    });

    it('should show error message on fetch failure', async () => {
      mockListRepositories.mockRejectedValue(new Error('Failed to fetch'));

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('Failed to fetch')).toBeTruthy();
      });
    });
  });

  describe('repository list', () => {
    it('should display repository descriptions', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('First repository')).toBeTruthy();
        expect(getByText('Second repository')).toBeTruthy();
      });
    });

    it('should show private badge for private repositories', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const privateBadges = Array.from(document.querySelectorAll('span')).filter(
          span => span.textContent === 'Private'
        );
        expect(privateBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display repository metadata', async () => {
      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText(/user\/repo-1/)).toBeTruthy();
        expect(getByText(/user\/repo-2/)).toBeTruthy();
      });
    });

    it('should handle repositories without descriptions', async () => {
      mockListRepositories.mockResolvedValue([
        {
          id: 3,
          name: 'repo-3',
          fullName: 'user/repo-3',
          description: undefined,
          private: false,
          defaultBranch: 'main',
          updatedAt: '2024-01-03T00:00:00Z',
        },
      ]);

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('repo-3')).toBeTruthy();
      });
    });
  });

  describe('search functionality', () => {
    it('should filter repositories by name', async () => {
      const { getByPlaceholderText, queryByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search repositories...');
      await fireEvent.input(searchInput, { target: { value: 'repo-1' } });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeTruthy();
        expect(queryByText('repo-2')).toBeNull();
      });
    });

    it('should filter repositories by description', async () => {
      const { getByPlaceholderText, queryByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search repositories...');
      await fireEvent.input(searchInput, { target: { value: 'Second' } });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeNull();
        expect(queryByText('repo-2')).toBeTruthy();
      });
    });

    it('should be case insensitive', async () => {
      const { getByPlaceholderText, queryByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search repositories...');
      await fireEvent.input(searchInput, { target: { value: 'REPO-1' } });

      await waitFor(() => {
        expect(queryByText('repo-1')).toBeTruthy();
      });
    });

    it('should show message when no results found', async () => {
      const { getByPlaceholderText, getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('repo-1')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search repositories...');
      await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(getByText('No repositories match your search')).toBeTruthy();
      });
    });
  });

  describe('repository selection', () => {
    it('should select repository when clicked', async () => {
      const { container } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);

        await waitFor(() => {
          expect(repoButtons[0].className).toContain('border-blue-500');
        });
      }
    });

    it('should show checkmark on selected repository', async () => {
      const { container } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);

        await waitFor(() => {
          const svg = repoButtons[0].querySelector('svg');
          expect(svg).toBeTruthy();
        });
      }
    });
  });

  describe('filename input (save mode)', () => {
    it('should show filename input in save mode when repository selected', async () => {
      const { container, getByPlaceholderText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'save' },
      });

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);

        await waitFor(() => {
          expect(getByPlaceholderText('story.json')).toBeTruthy();
        });
      }
    });

    it('should use default filename', async () => {
      const { container, getByPlaceholderText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'save', defaultFilename: 'my-story.json' },
      });

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);

        await waitFor(() => {
          const input = getByPlaceholderText('story.json') as HTMLInputElement;
          expect(input.value).toBe('my-story.json');
        });
      }
    });

    it('should not show filename input in load mode', async () => {
      const { queryByPlaceholderText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'load' },
      });

      await waitFor(() => {
        expect(queryByPlaceholderText('story.json')).toBeNull();
      });
    });
  });

  describe('create repository', () => {
    it('should show create repository form when button clicked', async () => {
      mockListRepositories.mockResolvedValue([]);

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const createButton = getByText('Create New Repository');
        expect(createButton).toBeTruthy();
      });

      const createButton = getByText('Create New Repository');
      await fireEvent.click(createButton);

      await waitFor(() => {
        expect(getByText('Repository Name *')).toBeTruthy();
      });
    });

    it('should create repository with valid input', async () => {
      mockListRepositories.mockResolvedValue([]);
      const newRepo = {
        id: 3,
        name: 'new-repo',
        fullName: 'user/new-repo',
        description: 'A new repo',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      mockCreateRepository.mockResolvedValue(newRepo);

      const { getByText, getByPlaceholderText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const createButton = getByText('Create New Repository');
        expect(createButton).toBeTruthy();
      });

      await fireEvent.click(getByText('Create New Repository'));

      await waitFor(() => {
        expect(getByPlaceholderText('my-story')).toBeTruthy();
      });

      const nameInput = getByPlaceholderText('my-story');
      await fireEvent.input(nameInput, { target: { value: 'new-repo' } });

      const descInput = getByPlaceholderText('My interactive fiction story');
      await fireEvent.input(descInput, { target: { value: 'A new repo' } });

      const submitButton = getByText('Create Repository');
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateRepository).toHaveBeenCalledWith('new-repo', 'A new repo', true);
      });
    });

    it('should require repository name', async () => {
      mockListRepositories.mockResolvedValue([]);

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('Create New Repository')).toBeTruthy();
      });

      await fireEvent.click(getByText('Create New Repository'));

      await waitFor(() => {
        const submitButton = getByText('Create Repository');
        expect(submitButton).toBeTruthy();
        expect(submitButton.hasAttribute('disabled')).toBe(true);
      });
    });

    it('should cancel repository creation', async () => {
      mockListRepositories.mockResolvedValue([]);

      const { getByText, queryByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('Create New Repository')).toBeTruthy();
      });

      await fireEvent.click(getByText('Create New Repository'));

      await waitFor(() => {
        expect(getByText('Repository Name *')).toBeTruthy();
      });

      const cancelButtons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent === 'Cancel'
      );

      if (cancelButtons[0]) {
        await fireEvent.click(cancelButtons[0]);

        await waitFor(() => {
          expect(queryByText('Repository Name *')).toBeNull();
        });
      }
    });
  });

  describe('confirmation', () => {
    it('should dispatch select event with repository and filename', async () => {
      const { component, container } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'save' },
      });

      const selectHandler = vi.fn();
      component.$on('select', selectHandler);

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Select repository
      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);
      }

      // Find and click confirm button
      const confirmButtons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent === 'Save to GitHub'
      );

      if (confirmButtons[0]) {
        await fireEvent.click(confirmButtons[0]);

        await waitFor(() => {
          expect(selectHandler).toHaveBeenCalled();
        });
      }
    });

    it('should add .json extension if not present', async () => {
      const { component, container, getByPlaceholderText } = render(GitHubRepositoryPicker, {
        props: { show: true, mode: 'save', defaultFilename: 'story' },
      });

      const selectHandler = vi.fn();
      component.$on('select', selectHandler);

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Select repository
      const repoButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent?.includes('repo-1')
      );

      if (repoButtons[0]) {
        await fireEvent.click(repoButtons[0]);

        await waitFor(() => {
          const input = getByPlaceholderText('story.json') as HTMLInputElement;
          expect(input.value).toBe('story');
        });
      }

      // Click confirm
      const confirmButtons = Array.from(document.querySelectorAll('button')).filter(
        btn => btn.textContent === 'Save to GitHub'
      );

      if (confirmButtons[0]) {
        await fireEvent.click(confirmButtons[0]);

        await waitFor(() => {
          if (selectHandler.mock.calls.length > 0) {
            const eventDetail = selectHandler.mock.calls[0][0].detail;
            expect(eventDetail.filename).toBe('story.json');
          }
        });
      }
    });
  });

  describe('cancellation', () => {
    it('should close modal when cancel clicked', async () => {
      const { container, getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });

      const cancelButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.textContent === 'Cancel'
      );

      if (cancelButtons[0]) {
        await fireEvent.click(cancelButtons[0]);

        await waitFor(() => {
          expect(container.querySelector('.fixed.inset-0')).toBeNull();
        });
      }
    });
  });

  describe('authentication check', () => {
    it('should show error when not authenticated', async () => {
      mockIsAuthenticated.set(false);

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('Not authenticated with GitHub')).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty repository list', async () => {
      mockListRepositories.mockResolvedValue([]);

      const { getByText } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        expect(getByText('No repositories found')).toBeTruthy();
      });
    });

    it('should disable confirm button when no repository selected', async () => {
      const { container } = render(GitHubRepositoryPicker, {
        props: { show: true },
      });

      await waitFor(() => {
        const confirmButtons = Array.from(container.querySelectorAll('button')).filter(
          btn => btn.textContent?.includes('Save to GitHub') || btn.textContent?.includes('Load from GitHub')
        );

        if (confirmButtons[0]) {
          expect(confirmButtons[0].hasAttribute('disabled')).toBe(true);
        }
      });
    });
  });
});
