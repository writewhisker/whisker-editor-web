/**
 * Storage event types and payloads
 */

import type { StoryData } from '@writewhisker/core-ts';
import type { StorageMetadata } from '../interfaces/IStorageBackend.js';

/**
 * Storage event names
 */
export enum StorageEventType {
  STORY_SAVED = 'story:saved',
  STORY_LOADED = 'story:loaded',
  STORY_DELETED = 'story:deleted',
  STORY_CREATED = 'story:created',
  STORY_UPDATED = 'story:updated',
  METADATA_UPDATED = 'metadata:updated',
  STORAGE_CLEARED = 'storage:cleared',
  ERROR = 'storage:error',
}

/**
 * Base storage event
 */
export interface BaseStorageEvent {
  type: StorageEventType;
  timestamp: number;
}

/**
 * Story saved event
 */
export interface StorySavedEvent extends BaseStorageEvent {
  type: StorageEventType.STORY_SAVED;
  storyId: string;
  title: string;
}

/**
 * Story loaded event
 */
export interface StoryLoadedEvent extends BaseStorageEvent {
  type: StorageEventType.STORY_LOADED;
  storyId: string;
  story: StoryData;
}

/**
 * Story deleted event
 */
export interface StoryDeletedEvent extends BaseStorageEvent {
  type: StorageEventType.STORY_DELETED;
  storyId: string;
}

/**
 * Story created event
 */
export interface StoryCreatedEvent extends BaseStorageEvent {
  type: StorageEventType.STORY_CREATED;
  storyId: string;
  title: string;
}

/**
 * Story updated event
 */
export interface StoryUpdatedEvent extends BaseStorageEvent {
  type: StorageEventType.STORY_UPDATED;
  storyId: string;
  title: string;
}

/**
 * Metadata updated event
 */
export interface MetadataUpdatedEvent extends BaseStorageEvent {
  type: StorageEventType.METADATA_UPDATED;
  storyId: string;
  metadata: StorageMetadata;
}

/**
 * Storage cleared event
 */
export interface StorageClearedEvent extends BaseStorageEvent {
  type: StorageEventType.STORAGE_CLEARED;
}

/**
 * Storage error event
 */
export interface StorageErrorEvent extends BaseStorageEvent {
  type: StorageEventType.ERROR;
  error: Error;
  operation: string;
  storyId?: string;
}

/**
 * Union type for all storage events
 */
export type StorageEvent =
  | StorySavedEvent
  | StoryLoadedEvent
  | StoryDeletedEvent
  | StoryCreatedEvent
  | StoryUpdatedEvent
  | MetadataUpdatedEvent
  | StorageClearedEvent
  | StorageErrorEvent;
