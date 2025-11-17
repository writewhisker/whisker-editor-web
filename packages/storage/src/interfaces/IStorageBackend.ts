/**
 * Storage backend interface
 * All storage implementations must conform to this interface
 */

import type { StoryData } from '@writewhisker/core-ts';

/**
 * Metadata for a stored story
 */
export interface StorageMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  tags?: string[];
}

/**
 * Storage backend interface
 */
export interface IStorageBackend {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<void>;

  /**
   * Save a story to storage
   */
  saveStory(id: string, data: StoryData): Promise<void>;

  /**
   * Load a story from storage
   */
  loadStory(id: string): Promise<StoryData>;

  /**
   * Delete a story from storage
   */
  deleteStory(id: string): Promise<void>;

  /**
   * List all stories in storage
   */
  listStories(): Promise<StorageMetadata[]>;

  /**
   * Check if a story exists
   */
  hasStory(id: string): Promise<boolean>;

  /**
   * Get storage metadata for a story
   */
  getMetadata(id: string): Promise<StorageMetadata>;

  /**
   * Update metadata for a story
   */
  updateMetadata(id: string, metadata: Partial<StorageMetadata>): Promise<void>;

  /**
   * Export a story to a portable format (JSON)
   */
  exportStory(id: string): Promise<Blob>;

  /**
   * Import a story from a portable format
   */
  importStory(data: Blob | File): Promise<string>;

  /**
   * Get total storage usage
   */
  getStorageUsage(): Promise<number>;

  /**
   * Clear all storage (careful!)
   */
  clear(): Promise<void>;
}
