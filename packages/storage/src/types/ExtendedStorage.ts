/**
 * Extended storage types for preferences, sync queue, and GitHub tokens
 * These extend the core storage interface to support key-value storage
 */

/**
 * Preference scope determines where a preference is stored
 */
export type PreferenceScope = 'global' | 'user' | 'project';

/**
 * Preference entry with metadata
 */
export interface PreferenceEntry<T = any> {
  value: T;
  scope: PreferenceScope;
  updatedAt: string; // ISO 8601 date string
}

/**
 * Sync queue entry for pending GitHub operations
 */
export interface SyncQueueEntry {
  id: string;
  storyId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: string; // ISO 8601 date string
  data: any;
  retryCount: number;
  lastError?: string;
}

/**
 * GitHub authentication token
 */
export interface GitHubAuthToken {
  accessToken: string;
  tokenType: string;
  scope: string;
}

/**
 * GitHub user information
 */
export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

/**
 * GitHub token storage data (includes optional user)
 */
export interface GitHubTokenData {
  accessToken: string;
  tokenType: string;
  scope: string;
  user?: GitHubUser;
}
