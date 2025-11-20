/**
 * Comprehensive tests for GitHub API Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listRepositories,
  createRepository,
  getFile,
  listFiles,
  saveFile,
  deleteFile,
  getDefaultBranch,
  hasWriteAccess,
  getCommitHistory,
  getFileAtCommit,
} from './githubApi';
import { GitHubApiError } from './types';
import { githubToken } from './githubAuth';

// Mock Octokit
const mockOctokit = {
  repos: {
    listForAuthenticatedUser: vi.fn(),
    createForAuthenticatedUser: vi.fn(),
    getContent: vi.fn(),
    createOrUpdateFileContents: vi.fn(),
    deleteFile: vi.fn(),
    get: vi.fn(),
    listCommits: vi.fn(),
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

// Mock navigator.onLine
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

describe('GitHubApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set authenticated token
    githubToken.set({
      accessToken: 'test-token',
      tokenType: 'bearer',
      scope: 'repo user',
    });
    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Status', () => {
    it('should throw error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      await expect(listRepositories()).rejects.toThrow(GitHubApiError);
      // Error gets wrapped in "Failed to list repositories"
    });
  });

  describe('Authentication', () => {
    it('should throw error when not authenticated', async () => {
      githubToken.set(null);

      await expect(listRepositories()).rejects.toThrow(GitHubApiError);
      // Error gets wrapped in "Failed to list repositories"
    });
  });

  describe('listRepositories', () => {
    it('should list repositories successfully', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'user/repo1',
          description: 'Test repo 1',
          private: false,
          default_branch: 'main',
          updated_at: '2025-01-01T00:00:00Z',
          archived: false,
        },
        {
          id: 2,
          name: 'repo2',
          full_name: 'user/repo2',
          description: null,
          private: true,
          default_branch: 'master',
          updated_at: '2025-01-02T00:00:00Z',
          archived: false,
        },
      ];

      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      const result = await listRepositories();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'repo1',
        fullName: 'user/repo1',
        description: 'Test repo 1',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2025-01-01T00:00:00Z',
      });
      expect(result[1]).toEqual({
        id: 2,
        name: 'repo2',
        fullName: 'user/repo2',
        description: undefined,
        private: true,
        defaultBranch: 'master',
        updatedAt: '2025-01-02T00:00:00Z',
      });
    });

    it('should filter out archived repositories', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'active-repo',
          full_name: 'user/active-repo',
          description: 'Active',
          private: false,
          default_branch: 'main',
          updated_at: '2025-01-01T00:00:00Z',
          archived: false,
        },
        {
          id: 2,
          name: 'archived-repo',
          full_name: 'user/archived-repo',
          description: 'Archived',
          private: false,
          default_branch: 'main',
          updated_at: '2025-01-01T00:00:00Z',
          archived: true,
        },
      ];

      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      const result = await listRepositories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('active-repo');
    });

    it('should handle API errors', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue({
        status: 500,
        response: { data: { message: 'Server error' } },
      });

      await expect(listRepositories()).rejects.toThrow(GitHubApiError);
    });

    it('should retry on transient errors', async () => {
      mockOctokit.repos.listForAuthenticatedUser
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ data: [] });

      vi.useFakeTimers();
      const promise = listRepositories();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([]);
      expect(mockOctokit.repos.listForAuthenticatedUser).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('createRepository', () => {
    it('should create repository successfully', async () => {
      const mockRepo = {
        id: 123,
        name: 'new-repo',
        full_name: 'user/new-repo',
        description: 'New repository',
        private: false,
        default_branch: 'main',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo,
      });

      const result = await createRepository('new-repo', 'New repository', false);

      expect(result).toEqual({
        id: 123,
        name: 'new-repo',
        fullName: 'user/new-repo',
        description: 'New repository',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'new-repo',
        description: 'New repository',
        private: false,
        auto_init: true,
      });
    });

    it('should handle repository name conflicts', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 422,
        response: {
          data: { message: 'Repository already exists' },
        },
      });

      await expect(createRepository('existing-repo')).rejects.toThrow(GitHubApiError);
      await expect(createRepository('existing-repo')).rejects.toThrow('already exists');
    });

    it('should handle invalid repository names', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 422,
        response: {
          data: { message: 'Invalid name' },
        },
      });

      await expect(createRepository('invalid name!')).rejects.toThrow(GitHubApiError);
      await expect(createRepository('invalid name!')).rejects.toThrow(
        'Invalid repository name'
      );
    });

    it('should handle repository limit errors', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 403,
        response: {
          data: { message: 'Repository limit reached' },
        },
      });

      await expect(createRepository('test-repo')).rejects.toThrow(GitHubApiError);
      await expect(createRepository('test-repo')).rejects.toThrow('repository limit');
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      const fileContent = 'Test file content';
      const encodedContent = btoa(fileContent);

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'test.txt',
          content: encodedContent,
          sha: 'abc123',
          size: fileContent.length,
        },
      });

      const result = await getFile('user', 'repo', 'test.txt');

      expect(result).toEqual({
        path: 'test.txt',
        content: fileContent,
        sha: 'abc123',
        size: fileContent.length,
      });
    });

    it('should handle file not found', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(getFile('user', 'repo', 'missing.txt')).rejects.toThrow(GitHubApiError);
      await expect(getFile('user', 'repo', 'missing.txt')).rejects.toThrow('not found');
    });

    it('should handle permission errors', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 403,
        response: {},
      });

      await expect(getFile('user', 'private-repo', 'file.txt')).rejects.toThrow(
        GitHubApiError
      );
      await expect(getFile('user', 'private-repo', 'file.txt')).rejects.toThrow(
        'do not have permission'
      );
    });

    it('should handle directory instead of file', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'dir',
          path: 'directory',
        },
      });

      await expect(getFile('user', 'repo', 'directory')).rejects.toThrow(GitHubApiError);
      await expect(getFile('user', 'repo', 'directory')).rejects.toThrow('not a file');
    });

    it('should handle array response (directory)', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: [{ type: 'file', path: 'file1.txt' }],
      });

      await expect(getFile('user', 'repo', 'directory')).rejects.toThrow(GitHubApiError);
    });

    it('should retry on transient errors', async () => {
      const fileContent = 'Test content';
      const encodedContent = btoa(fileContent);

      mockOctokit.repos.getContent
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce({
          data: {
            type: 'file',
            path: 'test.txt',
            content: encodedContent,
            sha: 'abc123',
            size: fileContent.length,
          },
        });

      vi.useFakeTimers();
      const promise = getFile('user', 'repo', 'test.txt');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.content).toBe(fileContent);
      expect(mockOctokit.repos.getContent).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: [
          { type: 'file', path: 'file1.txt', sha: 'sha1', size: 100 },
          { type: 'dir', path: 'subdir', sha: 'sha2', size: 0 },
          { type: 'file', path: 'file2.txt', sha: 'sha3', size: 200 },
        ],
      });

      const result = await listFiles('user', 'repo', 'directory');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'file1.txt',
        content: '',
        sha: 'sha1',
        size: 100,
      });
      expect(result[1]).toEqual({
        path: 'file2.txt',
        content: '',
        sha: 'sha3',
        size: 200,
      });
    });

    it('should return empty array for non-existent directory', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 404,
      });

      const result = await listFiles('user', 'repo', 'missing');
      expect(result).toEqual([]);
    });

    it('should handle non-directory path', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'file.txt',
        },
      });

      await expect(listFiles('user', 'repo', 'file.txt')).rejects.toThrow(GitHubApiError);
      // Error will be wrapped in "Failed to list files"
    });
  });

  describe('saveFile', () => {
    it('should create new file', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: {
            sha: 'commit-sha',
            message: 'Create file',
            author: { date: '2025-01-01T00:00:00Z' },
          },
        },
      });

      const result = await saveFile(
        'user',
        'repo',
        'new-file.txt',
        'File content',
        'Create file'
      );

      expect(result).toEqual({
        sha: 'commit-sha',
        message: 'Create file',
        date: '2025-01-01T00:00:00Z',
      });

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'new-file.txt',
        message: 'Create file',
        content: btoa('File content'),
        sha: undefined,
        branch: undefined,
      });
    });

    it('should update existing file', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: {
            sha: 'new-sha',
            message: 'Update file',
            author: { date: '2025-01-01T00:00:00Z' },
          },
        },
      });

      const result = await saveFile(
        'user',
        'repo',
        'file.txt',
        'Updated content',
        'Update file',
        'old-sha'
      );

      expect(result.sha).toBe('new-sha');
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'old-sha',
        })
      );
    });

    it('should handle archived repository', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: true },
      });

      await expect(
        saveFile('user', 'archived-repo', 'file.txt', 'content', 'message')
      ).rejects.toThrow(GitHubApiError);
      await expect(
        saveFile('user', 'archived-repo', 'file.txt', 'content', 'message')
      ).rejects.toThrow('archived');
    });

    it('should handle permission errors', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 403,
        response: { data: { message: 'Permission denied' } },
      });

      await expect(
        saveFile('user', 'repo', 'file.txt', 'content', 'message')
      ).rejects.toThrow('do not have permission');
    });

    it('should handle conflict errors', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 409,
        response: {},
      });

      await expect(
        saveFile('user', 'repo', 'file.txt', 'content', 'message', 'old-sha')
      ).rejects.toThrow('modified by someone else');
    });

    it('should handle repository not found', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(
        saveFile('user', 'missing-repo', 'file.txt', 'content', 'message')
      ).rejects.toThrow('not found');
    });

    it('should retry on transient errors', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { archived: false },
      });

      mockOctokit.repos.createOrUpdateFileContents
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce({
          data: {
            commit: {
              sha: 'sha',
              message: 'message',
              author: { date: '2025-01-01T00:00:00Z' },
            },
          },
        });

      vi.useFakeTimers();
      const promise = saveFile('user', 'repo', 'file.txt', 'content', 'message');
      await vi.runAllTimersAsync();
      await promise;

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockOctokit.repos.deleteFile.mockResolvedValue({
        data: {
          commit: {
            sha: 'delete-sha',
            message: 'Delete file',
            author: { date: '2025-01-01T00:00:00Z' },
          },
        },
      });

      const result = await deleteFile('user', 'repo', 'file.txt', 'Delete file', 'file-sha');

      expect(result).toEqual({
        sha: 'delete-sha',
        message: 'Delete file',
        date: '2025-01-01T00:00:00Z',
      });
    });

    it('should handle delete errors', async () => {
      mockOctokit.repos.deleteFile.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(
        deleteFile('user', 'repo', 'file.txt', 'Delete', 'sha')
      ).rejects.toThrow(GitHubApiError);
    });
  });

  describe('getDefaultBranch', () => {
    it('should get default branch', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { default_branch: 'main' },
      });

      const result = await getDefaultBranch('user', 'repo');
      expect(result).toBe('main');
    });

    it('should handle errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(getDefaultBranch('user', 'missing-repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('hasWriteAccess', () => {
    it('should return true for write access', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { permissions: { push: true } },
      });

      const result = await hasWriteAccess('user', 'repo');
      expect(result).toBe(true);
    });

    it('should return false for read-only access', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { permissions: { push: false } },
      });

      const result = await hasWriteAccess('user', 'repo');
      expect(result).toBe(false);
    });

    it('should return false on errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 404,
      });

      const result = await hasWriteAccess('user', 'missing-repo');
      expect(result).toBe(false);
    });
  });

  describe('getCommitHistory', () => {
    it('should get commit history', async () => {
      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [
          {
            sha: 'commit1',
            commit: {
              message: 'First commit',
              author: {
                name: 'User 1',
                email: 'user1@example.com',
                date: '2025-01-01T00:00:00Z',
              },
            },
          },
          {
            sha: 'commit2',
            commit: {
              message: 'Second commit',
              author: {
                name: 'User 2',
                email: 'user2@example.com',
                date: '2025-01-02T00:00:00Z',
              },
            },
          },
        ],
      });

      const result = await getCommitHistory('user', 'repo', 'file.txt');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sha: 'commit1',
        message: 'First commit',
        date: '2025-01-01T00:00:00Z',
        author: {
          name: 'User 1',
          email: 'user1@example.com',
        },
      });
    });

    it('should handle file not found', async () => {
      mockOctokit.repos.listCommits.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(getCommitHistory('user', 'repo', 'missing.txt')).rejects.toThrow(
        GitHubApiError
      );
      await expect(getCommitHistory('user', 'repo', 'missing.txt')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('getFileAtCommit', () => {
    it('should get file at specific commit', async () => {
      const content = 'Historical content';
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          path: 'file.txt',
          content: btoa(content),
          sha: 'file-sha',
          size: content.length,
        },
      });

      const result = await getFileAtCommit('user', 'repo', 'file.txt', 'commit-sha');

      expect(result).toEqual({
        path: 'file.txt',
        content,
        sha: 'file-sha',
        size: content.length,
      });

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'file.txt',
        ref: 'commit-sha',
      });
    });

    it('should handle errors', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not found',
      });

      await expect(
        getFileAtCommit('user', 'repo', 'file.txt', 'invalid-sha')
      ).rejects.toThrow(GitHubApiError);
    });
  });
});
