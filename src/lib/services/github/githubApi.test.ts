/**
 * Tests for GitHub API Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listRepositories,
  createRepository,
  getFile,
  saveFile,
  getCommitHistory,
  getFileAtCommit,
} from './githubApi';
import { Octokit } from '@octokit/rest';

// Mock Octokit
vi.mock('@octokit/rest', () => {
  const mockOctokit = {
    repos: {
      listForAuthenticatedUser: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn(),
      listCommits: vi.fn(),
    },
  };

  return {
    Octokit: vi.fn(() => mockOctokit),
  };
});

// Mock githubAuth
vi.mock('./githubAuth', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
  githubToken: {
    subscribe: vi.fn((callback) => {
      callback({ accessToken: 'mock-token', tokenType: 'bearer', scope: 'repo user' });
      return () => {};
    }),
  },
}));

describe('GitHub API Service', () => {
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked Octokit instance
    mockOctokit = new Octokit();
  });

  describe('List Repositories', () => {
    it('should list repositories for authenticated user', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'repo1',
            full_name: 'user/repo1',
            description: 'Test repository 1',
            private: false,
            default_branch: 'main',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/user/repo1',
          },
          {
            id: 2,
            name: 'repo2',
            full_name: 'user/repo2',
            description: 'Test repository 2',
            private: true,
            default_branch: 'main',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/user/repo2',
          },
        ],
      });

      const repos = await listRepositories();

      expect(repos).toHaveLength(2);
      expect(repos[0]).toEqual({
        id: 1,
        name: 'repo1',
        fullName: 'user/repo1',
        description: 'Test repository 1',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      expect(repos[1]).toEqual({
        id: 2,
        name: 'repo2',
        fullName: 'user/repo2',
        description: 'Test repository 2',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle API errors', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(listRepositories()).rejects.toThrow();
    });

    it('should handle repositories without descriptions', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'repo1',
            full_name: 'user/repo1',
            description: null,
            private: false,
            html_url: 'https://github.com/user/repo1',
          },
        ],
      });

      const repos = await listRepositories();
      expect(repos[0].description).toBeUndefined();
    });
  });

  describe('Create Repository', () => {
    it('should create a new repository', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
        data: {
          id: 123,
          name: 'new-repo',
          full_name: 'user/new-repo',
          description: 'A new repository',
          private: true,
          default_branch: 'main',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/user/new-repo',
        },
      });

      const repo = await createRepository('new-repo', 'A new repository', true);

      expect(repo).toEqual({
        id: 123,
        name: 'new-repo',
        fullName: 'user/new-repo',
        description: 'A new repository',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'new-repo',
        description: 'A new repository',
        private: true,
        auto_init: true,
      });
    });

    it('should create public repository by default', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
        data: {
          id: 456,
          name: 'public-repo',
          full_name: 'user/public-repo',
          private: false,
          default_branch: 'main',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/user/public-repo',
        },
      });

      await createRepository('public-repo');

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'public-repo',
        description: undefined,
        private: false,
        auto_init: true,
      });
    });

    it('should handle repository creation errors', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 422,
        message: 'Repository already exists',
      });

      await expect(createRepository('existing-repo')).rejects.toThrow();
    });
  });

  describe('Get File', () => {
    it('should get file content', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'story.json',
          content: btoa('{"title": "Test Story"}'),
          sha: 'abc123',
          size: 100,
        },
      });

      const file = await getFile('user', 'repo', 'story.json');

      expect(file).toEqual({
        path: 'story.json',
        content: '{"title": "Test Story"}',
        sha: 'abc123',
        size: 100,
      });
    });

    it('should throw error if file not found', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      await expect(getFile('user', 'repo', 'nonexistent.json')).rejects.toThrow();
    });

    it('should handle empty file', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'empty.txt',
          content: '',
          sha: 'def456',
          size: 0,
        },
      });

      const file = await getFile('user', 'repo', 'empty.txt');
      expect(file.content).toBe('');
    });
  });

  describe('Save File', () => {
    it('should create new file', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          content: { sha: 'new-sha' },
          commit: { sha: 'commit-sha', html_url: 'https://github.com/commit' },
        },
      });

      const result = await saveFile(
        'user',
        'repo',
        'new-story.json',
        '{"title": "New Story"}',
        'Create new story'
      );

      expect(result.sha).toBe('commit-sha');
      expect(result.message).toBe('Create new story');
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'new-story.json',
        message: 'Create new story',
        content: btoa('{"title": "New Story"}'),
        sha: undefined,
      });
    });

    it('should update existing file with SHA', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          content: { sha: 'updated-sha' },
          commit: { sha: 'commit-sha', html_url: 'https://github.com/commit' },
        },
      });

      await saveFile(
        'user',
        'repo',
        'existing.json',
        '{"title": "Updated"}',
        'Update story',
        'old-sha'
      );

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'existing.json',
        message: 'Update story',
        content: btoa('{"title": "Updated"}'),
        sha: 'old-sha',
      });
    });

    it('should handle save errors', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 409,
        message: 'Conflict',
      });

      await expect(
        saveFile('user', 'repo', 'file.json', 'content', 'message')
      ).rejects.toThrow();
    });
  });

  describe('Get Commit History', () => {
    it('should get commit history for file', async () => {
      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [
          {
            sha: 'commit1',
            commit: {
              message: 'Update story',
              author: {
                name: 'User 1',
                email: 'user1@example.com',
                date: '2024-01-01T00:00:00Z',
              },
            },
          },
          {
            sha: 'commit2',
            commit: {
              message: 'Initial commit',
              author: {
                name: 'User 2',
                email: 'user2@example.com',
                date: '2024-01-01T00:00:00Z',
              },
            },
          },
        ],
      });

      const history = await getCommitHistory('user', 'repo', 'story.json');

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        sha: 'commit1',
        message: 'Update story',
        date: '2024-01-01T00:00:00Z',
        author: {
          name: 'User 1',
          email: 'user1@example.com',
        },
      });
    });

    it('should respect limit parameter', async () => {
      mockOctokit.repos.listCommits.mockResolvedValue({ data: [] });

      await getCommitHistory('user', 'repo', 'file.json', 10);

      expect(mockOctokit.repos.listCommits).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'file.json',
        per_page: 10,
      });
    });

    it('should handle missing author info', async () => {
      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [
          {
            sha: 'commit1',
            commit: {
              message: 'Commit without author',
              author: null,
            },
          },
        ],
      });

      const history = await getCommitHistory('user', 'repo', 'file.json');
      expect(history[0].author.name).toBe('Unknown');
      expect(history[0].author.email).toBe('');
    });
  });

  describe('Get File At Commit', () => {
    it('should get file content at specific commit', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'story.json',
          content: btoa('{"title": "Old Version"}'),
          sha: 'old-sha',
          size: 50,
        },
      });

      const file = await getFileAtCommit('user', 'repo', 'story.json', 'commit-sha');

      expect(file.content).toBe('{"title": "Old Version"}');
      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'story.json',
        ref: 'commit-sha',
      });
    });

    it('should handle file not found at commit', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        getFileAtCommit('user', 'repo', 'deleted.json', 'old-commit')
      ).rejects.toThrow();
    });
  });
});
