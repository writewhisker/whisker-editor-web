/**
 * GitHub Integration Types
 */

export interface GitHubAuthToken {
  accessToken: string;
  tokenType: string;
  scope: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface CommitOptions {
  message: string;
  content: string;
  sha?: string; // Required for updates
  branch?: string;
}

export interface CreateRepositoryOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';

export interface GitHubSyncMetadata {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  sha: string;
  lastSyncedAt: Date;
}

export interface GitHubError {
  message: string;
  status?: number;
  documentation_url?: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}
