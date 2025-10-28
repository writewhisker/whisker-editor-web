/**
 * Publishing System Types
 *
 * Type definitions for story publishing and sharing functionality.
 */

import type { Story } from '../models/Story';

/**
 * Publishing platforms
 */
export type PublishPlatform = 'static' | 'github-pages' | 'itch-io' | 'link';

/**
 * Publishing status
 */
export type PublishStatus = 'idle' | 'publishing' | 'success' | 'error';

/**
 * Publishing options
 */
export interface PublishOptions {
  /** Target platform */
  platform: PublishPlatform;

  /** Custom filename (without extension) */
  filename?: string;

  /** Include theme toggle */
  includeThemeToggle?: boolean;

  /** Include save/load functionality */
  includeSaveLoad?: boolean;

  /** Default theme (light or dark) */
  defaultTheme?: 'light' | 'dark';

  /** Custom CSS */
  customCSS?: string;

  /** Custom description for metadata */
  description?: string;

  /** Custom author override */
  author?: string;

  /** GitHub repository name (for GitHub Pages) */
  githubRepo?: string;

  /** GitHub branch (for GitHub Pages) */
  githubBranch?: string;

  /** itch.io project name */
  itchProject?: string;

  /** Visibility (for itch.io) */
  visibility?: 'public' | 'private' | 'draft';
}

/**
 * Publishing result
 */
export interface PublishResult {
  /** Whether publishing succeeded */
  success: boolean;

  /** Platform published to */
  platform: PublishPlatform;

  /** Public URL if available */
  url?: string;

  /** Error message if failed */
  error?: string;

  /** Exported file data (for static export) */
  fileData?: Blob | string;

  /** Filename */
  filename?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Publishing history entry
 */
export interface PublishHistoryEntry {
  /** Unique ID */
  id: string;

  /** Timestamp */
  timestamp: number;

  /** Platform */
  platform: PublishPlatform;

  /** Story title */
  storyTitle: string;

  /** URL if available */
  url?: string;

  /** Success status */
  success: boolean;

  /** Error if failed */
  error?: string;
}

/**
 * Sharing options
 */
export interface SharingOptions {
  /** Type of share */
  type: 'link' | 'embed' | 'qr' | 'email' | 'social';

  /** URL to share */
  url: string;

  /** Title for share */
  title?: string;

  /** Description for share */
  description?: string;

  /** Embed width (for embed code) */
  embedWidth?: number;

  /** Embed height (for embed code) */
  embedHeight?: number;
}

/**
 * Publisher interface
 */
export interface IPublisher {
  /** Platform name */
  readonly platform: PublishPlatform;

  /** Display name */
  readonly name: string;

  /** Description */
  readonly description: string;

  /** Whether authentication is required */
  readonly requiresAuth: boolean;

  /** Publish story */
  publish(story: Story, options: PublishOptions): Promise<PublishResult>;
}
