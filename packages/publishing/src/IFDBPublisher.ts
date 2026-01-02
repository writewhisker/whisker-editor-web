/**
 * IFDB Publisher
 *
 * Publishes story metadata to the Interactive Fiction Database (IFDB).
 *
 * IFDB (https://ifdb.org) is a community-maintained catalog of interactive fiction.
 * Unlike game hosting platforms, IFDB stores metadata and links to games hosted elsewhere.
 *
 * This publisher:
 * - Creates/updates IFDB catalog entries
 * - Supports TUID (unique identifier) tracking
 * - Links to externally hosted game files
 * - Supports metadata: title, author, description, genre, platform, etc.
 */

import type { IPublisher, PublishOptions, PublishResult } from './types';
import type { Story } from '@writewhisker/core-ts';

/**
 * IFDB authentication configuration
 */
export interface IFDBAuthConfig {
  /** IFDB username */
  username: string;

  /** IFDB password or API token */
  password: string;
}

/**
 * IFDB game metadata
 */
export interface IFDBGameMetadata {
  /** Game title */
  title: string;

  /** Author name(s) */
  author: string;

  /** Publication year */
  year?: number;

  /** Development platform */
  platform?: 'Twine' | 'Inform' | 'TADS' | 'ChoiceScript' | 'Whisker' | 'Other';

  /** Genre tags */
  genre?: string[];

  /** Language code (e.g., 'en', 'es', 'fr') */
  language?: string;

  /** Description (can include IFDB markup) */
  description?: string;

  /** URL where the game can be played */
  playUrl?: string;

  /** URL to download the game */
  downloadUrl?: string;

  /** IFID - Interactive Fiction Identifier (UUID format) */
  ifid?: string;

  /** Estimated play time */
  playTime?: string;

  /** Content warnings */
  contentWarnings?: string[];

  /** Cover image URL */
  coverUrl?: string;

  /** Whether the game is complete */
  isComplete?: boolean;

  /** Forgiveness rating (cruel, nasty, tough, polite, merciful) */
  forgiveness?: 'cruel' | 'nasty' | 'tough' | 'polite' | 'merciful';
}

/**
 * IFDB game entry information
 */
export interface IFDBGame {
  /** TUID - IFDB's unique identifier */
  tuid: string;

  /** Game title */
  title: string;

  /** Author */
  author: string;

  /** URL on IFDB */
  ifdbUrl: string;

  /** Average rating (1-5 scale) */
  averageRating?: number;

  /** Number of ratings */
  ratingCount?: number;
}

/**
 * IFDB search result
 */
export interface IFDBSearchResult {
  games: IFDBGame[];
  totalCount: number;
}

/**
 * IFDB Publisher implementation
 *
 * Creates catalog entries on the Interactive Fiction Database.
 */
export class IFDBPublisher implements IPublisher {
  readonly platform = 'ifdb' as const;
  readonly name = 'IFDB';
  readonly description = 'Publish to the Interactive Fiction Database';
  readonly requiresAuth = true;

  private username: string | null = null;
  private password: string | null = null;
  private readonly apiBase = 'https://ifdb.org/api';

  /**
   * Set authentication credentials
   */
  authenticate(config: IFDBAuthConfig): void {
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.username !== null && this.password !== null;
  }

  /**
   * Search IFDB for games
   */
  async search(query: string): Promise<IFDBSearchResult> {
    try {
      // IFDB provides XML-based search API
      const response = await fetch(
        `${this.apiBase}/search?search=${encodeURIComponent(query)}&output=json`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return { games: [], totalCount: 0 };
      }

      const data = await response.json();

      // Parse search results
      const games: IFDBGame[] = (data.games || []).map((g: any) => ({
        tuid: g.tuid,
        title: g.title,
        author: g.author,
        ifdbUrl: `https://ifdb.org/viewgame?id=${g.tuid}`,
        averageRating: g.averageRating ? parseFloat(g.averageRating) : undefined,
        ratingCount: g.ratingCount ? parseInt(g.ratingCount, 10) : undefined,
      }));

      return {
        games,
        totalCount: data.totalCount || games.length,
      };
    } catch (error) {
      console.error('IFDB search failed:', error);
      return { games: [], totalCount: 0 };
    }
  }

  /**
   * Get game by TUID
   */
  async getGameByTuid(tuid: string): Promise<IFDBGame | null> {
    try {
      const response = await fetch(`${this.apiBase}/viewgame?id=${tuid}&output=json`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        tuid: data.tuid,
        title: data.title,
        author: data.author,
        ifdbUrl: `https://ifdb.org/viewgame?id=${data.tuid}`,
        averageRating: data.averageRating ? parseFloat(data.averageRating) : undefined,
        ratingCount: data.ratingCount ? parseInt(data.ratingCount, 10) : undefined,
      };
    } catch (error) {
      console.error('Failed to get game:', error);
      return null;
    }
  }

  /**
   * Find game by title and author
   */
  async findGameByTitleAndAuthor(title: string, author: string): Promise<IFDBGame | null> {
    const results = await this.search(`title:${title} author:${author}`);
    return results.games.find(
      (g) =>
        g.title.toLowerCase() === title.toLowerCase() &&
        g.author.toLowerCase() === author.toLowerCase()
    ) || null;
  }

  /**
   * Generate IFID (Interactive Fiction Identifier) from story
   *
   * IFID is a UUID-based identifier. If the story has an IFID, use it;
   * otherwise generate one from story metadata.
   */
  private generateIfid(story: Story): string {
    // Use existing IFID if present
    if (story.metadata.ifid) {
      return story.metadata.ifid;
    }

    // Generate deterministic UUID from title + author + created
    const input = `${story.metadata.title}|${story.metadata.author}|${story.metadata.created}`;
    return this.hashToUuid(input);
  }

  /**
   * Convert a string to a UUID-format hash
   */
  private hashToUuid(str: string): string {
    // Simple deterministic hash for UUID generation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Create UUID-like format using the hash
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = [
      hex.substring(0, 8),
      hex.substring(0, 4),
      '4' + hex.substring(1, 4),
      '8' + hex.substring(1, 4),
      hex.substring(0, 12).padEnd(12, '0'),
    ].join('-');

    return uuid.toUpperCase();
  }

  /**
   * Create new IFDB entry
   */
  async createEntry(metadata: IFDBGameMetadata): Promise<{ tuid: string; url: string } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      // IFDB uses form-based submission
      const formData = new FormData();
      formData.append('title', metadata.title);
      formData.append('author', metadata.author);
      if (metadata.year) formData.append('year', metadata.year.toString());
      if (metadata.platform) formData.append('system', metadata.platform);
      if (metadata.description) formData.append('desc', metadata.description);
      if (metadata.playUrl) formData.append('playurl', metadata.playUrl);
      if (metadata.downloadUrl) formData.append('downloadurl', metadata.downloadUrl);
      if (metadata.ifid) formData.append('ifid', metadata.ifid);
      if (metadata.language) formData.append('language', metadata.language);
      if (metadata.genre) formData.append('genre', metadata.genre.join(','));
      if (metadata.forgiveness) formData.append('forgiveness', metadata.forgiveness);

      const response = await fetch(`${this.apiBase}/addgame`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create IFDB entry:', error);
        return null;
      }

      const data = await response.json();

      return {
        tuid: data.tuid,
        url: `https://ifdb.org/viewgame?id=${data.tuid}`,
      };
    } catch (error) {
      console.error('Failed to create IFDB entry:', error);
      return null;
    }
  }

  /**
   * Update existing IFDB entry
   */
  async updateEntry(tuid: string, metadata: Partial<IFDBGameMetadata>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const formData = new FormData();
      formData.append('tuid', tuid);

      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.author) formData.append('author', metadata.author);
      if (metadata.year) formData.append('year', metadata.year.toString());
      if (metadata.platform) formData.append('system', metadata.platform);
      if (metadata.description) formData.append('desc', metadata.description);
      if (metadata.playUrl) formData.append('playurl', metadata.playUrl);
      if (metadata.downloadUrl) formData.append('downloadurl', metadata.downloadUrl);
      if (metadata.genre) formData.append('genre', metadata.genre.join(','));

      const response = await fetch(`${this.apiBase}/editgame`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
        },
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update IFDB entry:', error);
      return false;
    }
  }

  /**
   * Publish story to IFDB
   */
  async publish(story: Story, options: PublishOptions): Promise<PublishResult> {
    // Check authentication
    if (!this.isAuthenticated()) {
      return {
        success: false,
        platform: this.platform,
        error: 'Not authenticated. Please provide IFDB credentials.',
      };
    }

    try {
      // Validate required fields
      const title = story.metadata.title;
      const author = options.author || story.metadata.author || 'Unknown';

      if (!title) {
        return {
          success: false,
          platform: this.platform,
          error: 'Story title is required for IFDB publication.',
        };
      }

      // Generate IFID
      const ifid = this.generateIfid(story);

      // Build metadata
      const metadata: IFDBGameMetadata = {
        title,
        author,
        year: new Date().getFullYear(),
        platform: 'Whisker',
        description: options.description || story.metadata.description,
        ifid,
        language: 'en',
        isComplete: true,
      };

      // Add genre tags if available
      if (story.metadata.tags && story.metadata.tags.length > 0) {
        metadata.genre = story.metadata.tags;
      }

      // Check if entry already exists
      const existingGame = await this.findGameByTitleAndAuthor(title, author);
      let tuid: string;
      let ifdbUrl: string;

      if (existingGame) {
        // Update existing entry
        tuid = existingGame.tuid;
        ifdbUrl = existingGame.ifdbUrl;

        const updated = await this.updateEntry(tuid, metadata);
        if (!updated) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to update existing IFDB entry.',
          };
        }
      } else {
        // Create new entry
        const result = await this.createEntry(metadata);
        if (!result) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to create IFDB entry.',
          };
        }

        tuid = result.tuid;
        ifdbUrl = result.url;
      }

      return {
        success: true,
        platform: this.platform,
        url: ifdbUrl,
        metadata: {
          tuid,
          ifid,
          title,
          author,
          isUpdate: !!existingGame,
        },
      };
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a shareable IFDB link for a game
   */
  generateShareUrl(tuid: string): string {
    return `https://ifdb.org/viewgame?id=${tuid}`;
  }

  /**
   * Generate an embeddable IFDB widget
   */
  generateEmbedCode(tuid: string, options?: { width?: number; height?: number }): string {
    const width = options?.width || 300;
    const height = options?.height || 150;

    return `<iframe src="https://ifdb.org/embedgame?id=${tuid}" width="${width}" height="${height}" frameborder="0"></iframe>`;
  }

  /**
   * Get play statistics for a game
   */
  async getGameStats(tuid: string): Promise<{
    views: number;
    ratings: number;
    averageRating: number;
  } | null> {
    const game = await this.getGameByTuid(tuid);

    if (!game) {
      return null;
    }

    return {
      views: 0, // IFDB doesn't expose view counts via API
      ratings: game.ratingCount || 0,
      averageRating: game.averageRating || 0,
    };
  }
}
