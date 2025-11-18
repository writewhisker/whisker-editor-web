/**
 * GitHub API Service
 *
 * Provides functions for interacting with GitHub repositories:
 * - List repositories
 * - Create repositories
 * - Read files
 * - Write/update files
 * - Commit changes
 */

import { Octokit } from '@octokit/rest';
import { githubToken } from './githubAuth';
import type { GitHubRepository, GitHubFile, GitHubCommit } from './types';
import { GitHubApiError } from './types';
import { get } from 'svelte/store';
import { withRetry, isOnline } from './utils';

let octokit: Octokit | null = null;

/**
 * Initialize Octokit with current access token
 */
function getOctokit(): Octokit {
  // Check online status first
  if (!isOnline()) {
    throw new GitHubApiError('No internet connection', 0);
  }

  const token = get(githubToken);

  if (!token) {
    throw new GitHubApiError('Not authenticated with GitHub', 401);
  }

  // Create new instance if token changed
  if (!octokit) {
    octokit = new Octokit({
      auth: token.accessToken,
    });
  }

  return octokit;
}

/**
 * List all repositories for the authenticated user
 */
export async function listRepositories(): Promise<GitHubRepository[]> {
  return withRetry(async () => {
    try {
      const client = getOctokit();

      const response = await client.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      });

      // Filter out archived repositories
      return response.data
        .filter(repo => !repo.archived)
        .map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || undefined,
          private: repo.private,
          defaultBranch: repo.default_branch,
          updatedAt: repo.updated_at || new Date().toISOString(),
        }));
    } catch (error: any) {
      console.error('Failed to list repositories:', error);
      throw new GitHubApiError(
        'Failed to list repositories',
        error.status,
        error.response
      );
    }
  }, {
    maxRetries: 2,
    initialDelay: 1000,
  });
}

/**
 * Create a new repository
 */
export async function createRepository(
  name: string,
  description?: string,
  isPrivate: boolean = false
): Promise<GitHubRepository> {
  try {
    const client = getOctokit();

    const response = await client.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README
    });

    return {
      id: response.data.id,
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description || undefined,
      private: response.data.private,
      defaultBranch: response.data.default_branch,
      updatedAt: response.data.updated_at,
    };
  } catch (error: any) {
    console.error('Failed to create repository:', error);

    if (error.status === 422) {
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('already exists')) {
        throw new GitHubApiError(
          `A repository named "${name}" already exists. Please choose a different name.`,
          error.status,
          error.response
        );
      }
      throw new GitHubApiError(
        `Invalid repository name "${name}". Repository names can only contain letters, numbers, hyphens, and underscores.`,
        error.status,
        error.response
      );
    }

    if (error.status === 403) {
      throw new GitHubApiError(
        'You have reached your repository limit or do not have permission to create repositories.',
        error.status,
        error.response
      );
    }

    throw new GitHubApiError(
      `Failed to create repository: ${error.message || 'Unknown error'}`,
      error.status,
      error.response
    );
  }
}

/**
 * Get file contents from a repository
 */
export async function getFile(
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<GitHubFile> {
  return withRetry(async () => {
    try {
      const client = getOctokit();

      const response = await client.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      // Check if it's a file (not a directory)
      if (Array.isArray(response.data) || response.data.type !== 'file') {
        throw new GitHubApiError('Path is not a file', 400);
      }

      const content = response.data.content
        ? atob(response.data.content)
        : '';

      return {
        path: response.data.path,
        content,
        sha: response.data.sha,
        size: response.data.size,
      };
    } catch (error: any) {
      console.error('Failed to get file:', error);

      if (error instanceof GitHubApiError) {
        throw error;
      }

      if (error.status === 404) {
        throw new GitHubApiError(
          `File "${path}" not found in this repository. Make sure the file exists.`,
          404,
          error.response
        );
      }

      if (error.status === 403) {
        throw new GitHubApiError(
          'You do not have permission to read this repository.',
          error.status,
          error.response
        );
      }

      throw new GitHubApiError(
        `Failed to load file: ${error.message || 'Unknown error'}`,
        error.status,
        error.response
      );
    }
  }, {
    maxRetries: 2,
    initialDelay: 1000,
  });
}

/**
 * List files in a directory
 */
export async function listFiles(
  owner: string,
  repo: string,
  path: string = '',
  branch?: string
): Promise<GitHubFile[]> {
  try {
    const client = getOctokit();

    const response = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!Array.isArray(response.data)) {
      throw new GitHubApiError('Path is not a directory', 400);
    }

    return response.data
      .filter(item => item.type === 'file')
      .map(item => ({
        path: item.path,
        content: '',
        sha: item.sha,
        size: item.size || 0,
      }));
  } catch (error: any) {
    console.error('Failed to list files:', error);

    if (error.status === 404) {
      // Directory doesn't exist - return empty array
      return [];
    }

    throw new GitHubApiError(
      'Failed to list files',
      error.status,
      error.response
    );
  }
}

/**
 * Create or update a file in a repository
 */
export async function saveFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string
): Promise<GitHubCommit> {
  return withRetry(async () => {
    try {
      const client = getOctokit();

      // Check if repository is archived
      try {
        const repoInfo = await client.repos.get({ owner, repo });
        if (repoInfo.data.archived) {
          throw new GitHubApiError(
            'This repository is archived and cannot be modified. Please unarchive it on GitHub or choose a different repository.',
            403
          );
        }
      } catch (err: any) {
        // If we can't check repo status, continue anyway (might be a permissions issue)
        if (err instanceof GitHubApiError) {
          throw err;
        }
      }

      // Convert content to base64
      const contentBase64 = btoa(unescape(encodeURIComponent(content)));

      const response = await client.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: contentBase64,
        sha, // Required for updates, omit for new files
        branch,
      });

      return {
        sha: response.data.commit.sha || '',
        message: response.data.commit.message || message,
        date: response.data.commit.author?.date || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Failed to save file:', error);

      // Check for specific error conditions
      if (error instanceof GitHubApiError) {
        throw error;
      }

      if (error.status === 403) {
        const errorMessage = error.response?.data?.message || '';
        if (errorMessage.includes('archived')) {
          throw new GitHubApiError(
            'This repository is archived and cannot be modified. Please unarchive it on GitHub or choose a different repository.',
            error.status,
            error.response
          );
        }
        throw new GitHubApiError(
          'You do not have permission to write to this repository. Make sure you have write access.',
          error.status,
          error.response
        );
      }

      if (error.status === 404) {
        throw new GitHubApiError(
          'Repository not found. It may have been deleted or you may not have access to it.',
          error.status,
          error.response
        );
      }

      if (error.status === 409) {
        throw new GitHubApiError(
          'File was modified by someone else. Please reload the story and try again.',
          error.status,
          error.response
        );
      }

      if (error.status === 422) {
        throw new GitHubApiError(
          'Invalid file content or path. Make sure the filename is valid.',
          error.status,
          error.response
        );
      }

      throw new GitHubApiError(
        `Failed to save file: ${error.message || 'Unknown error'}`,
        error.status,
        error.response
      );
    }
  }, {
    maxRetries: 2,
    initialDelay: 1000,
  });
}

/**
 * Delete a file from a repository
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string,
  branch?: string
): Promise<GitHubCommit> {
  try {
    const client = getOctokit();

    const response = await client.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
      branch,
    });

    return {
      sha: response.data.commit.sha || '',
      message: response.data.commit.message || message,
      date: response.data.commit.author?.date || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Failed to delete file:', error);

    throw new GitHubApiError(
      'Failed to delete file',
      error.status,
      error.response
    );
  }
}

/**
 * Get the default branch for a repository
 */
export async function getDefaultBranch(
  owner: string,
  repo: string
): Promise<string> {
  try {
    const client = getOctokit();

    const response = await client.repos.get({
      owner,
      repo,
    });

    return response.data.default_branch;
  } catch (error: any) {
    console.error('Failed to get default branch:', error);

    throw new GitHubApiError(
      'Failed to get repository info',
      error.status,
      error.response
    );
  }
}

/**
 * Check if user has write access to a repository
 */
export async function hasWriteAccess(
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    const client = getOctokit();

    const response = await client.repos.get({
      owner,
      repo,
    });

    return response.data.permissions?.push || false;
  } catch (error: any) {
    console.error('Failed to check write access:', error);
    return false;
  }
}

/**
 * Get commit history for a file
 */
export async function getCommitHistory(
  owner: string,
  repo: string,
  path: string,
  limit: number = 20
): Promise<Array<GitHubCommit & { author: { name: string; email: string } }>> {
  try {
    const client = getOctokit();

    const response = await client.repos.listCommits({
      owner,
      repo,
      path,
      per_page: limit,
    });

    return response.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date || new Date().toISOString(),
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
      },
    }));
  } catch (error: any) {
    console.error('Failed to get commit history:', error);

    if (error instanceof GitHubApiError) {
      throw error;
    }

    if (error.status === 404) {
      throw new GitHubApiError(
        `File "${path}" not found or has no commit history.`,
        404,
        error.response
      );
    }

    throw new GitHubApiError(
      `Failed to load commit history: ${error.message || 'Unknown error'}`,
      error.status,
      error.response
    );
  }
}

/**
 * Get a specific file version from a commit
 */
export async function getFileAtCommit(
  owner: string,
  repo: string,
  path: string,
  sha: string
): Promise<GitHubFile> {
  try {
    const client = getOctokit();

    const response = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: sha,
    });

    if (Array.isArray(response.data) || response.data.type !== 'file') {
      throw new GitHubApiError('Path is not a file', 400);
    }

    const content = response.data.content
      ? atob(response.data.content)
      : '';

    return {
      path: response.data.path,
      content,
      sha: response.data.sha,
      size: response.data.size,
    };
  } catch (error: any) {
    console.error('Failed to get file at commit:', error);

    if (error instanceof GitHubApiError) {
      throw error;
    }

    throw new GitHubApiError(
      `Failed to load file version: ${error.message || 'Unknown error'}`,
      error.status,
      error.response
    );
  }
}
