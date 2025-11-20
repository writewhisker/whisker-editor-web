/**
 * itch.io Publisher
 *
 * Publishes stories to itch.io platform using both the itch.io API and butler CLI.
 *
 * API Documentation: https://itch.io/docs/api/overview
 * Butler Documentation: https://itch.io/docs/butler/
 */

import type { IPublisher, PublishOptions, PublishResult } from './types';
import type { Story } from '@writewhisker/core-ts';
import { StaticSiteExporter } from '@writewhisker/editor-base';
import { Butler, type ButlerOptions } from './butler';

/**
 * itch.io API authentication
 */
export interface ItchAuthConfig {
  /** API key from itch.io user settings */
  apiKey: string;

  /** Optional butler executable path */
  butlerPath?: string;
}

/**
 * itch.io game metadata
 */
export interface ItchGameMetadata {
  /** Game title */
  title: string;

  /** Short description (limited to 500 characters) */
  short_text?: string;

  /** Game type */
  type: 'html' | 'flash' | 'unity' | 'java' | 'downloadable';

  /** Classification */
  classification: 'game' | 'tool' | 'comic' | 'book' | 'physical_game' | 'soundtrack' | 'game_mod' | 'other';

  /** Kind (paid, free, etc.) */
  kind?: 'default' | 'pwyw';

  /** Cover image URL */
  cover_url?: string;

  /** Tags */
  tags?: string[];
}

/**
 * itch.io game information from API
 */
export interface ItchGame {
  /** Game ID */
  id: number;

  /** Game URL */
  url: string;

  /** Game title */
  title: string;

  /** Game created */
  created_at: string;

  /** Username */
  user?: {
    id: number;
    username: string;
    url: string;
  };
}

/**
 * Upload method
 */
export type UploadMethod = 'butler' | 'api';

/**
 * itch.io Publisher implementation
 *
 * Uploads stories to itch.io as playable HTML games using butler CLI or API.
 */
export class ItchPublisher implements IPublisher {
  readonly platform = 'itch-io' as const;
  readonly name = 'itch.io';
  readonly description = 'Publish to itch.io gaming platform';
  readonly requiresAuth = true;

  private apiKey: string | null = null;
  private butler: Butler | null = null;
  private readonly apiBase = 'https://itch.io/api/1';

  /**
   * Set authentication credentials
   */
  authenticate(config: ItchAuthConfig): void {
    this.apiKey = config.apiKey;
    this.butler = new Butler(config.butlerPath);
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{ id: number; username: string; url: string } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`${this.apiBase}/${this.apiKey}/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get user's games
   */
  async getUserGames(): Promise<ItchGame[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/${this.apiKey}/my-games`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.games || [];
    } catch (error) {
      console.error('Failed to get user games:', error);
      return [];
    }
  }

  /**
   * Find game by title
   */
  async findGameByTitle(title: string): Promise<ItchGame | null> {
    const games = await this.getUserGames();
    return games.find(g => g.title.toLowerCase() === title.toLowerCase()) || null;
  }

  /**
   * Create a new game on itch.io
   */
  async createGame(
    metadata: ItchGameMetadata
  ): Promise<{ id: number; url: string } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/${this.apiKey}/game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create game:', error);
        return null;
      }

      const data = await response.json();
      return {
        id: data.game.id,
        url: data.game.url,
      };
    } catch (error) {
      console.error('Failed to create game:', error);
      return null;
    }
  }

  /**
   * Update existing game metadata
   */
  async updateGame(
    gameId: number,
    metadata: Partial<ItchGameMetadata>
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/${this.apiKey}/game/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update game:', error);
      return false;
    }
  }

  /**
   * Upload HTML file using butler CLI
   */
  private async uploadWithButler(
    htmlContent: string,
    target: string,
    options: {
      channel?: string;
      version?: string;
    }
  ): Promise<{ success: boolean; buildId?: number; buildUrl?: string; error?: string }> {
    if (!this.butler) {
      return {
        success: false,
        error: 'Butler not initialized. Call authenticate() first.',
      };
    }

    // Check butler status
    const status = await this.butler.getStatus();

    if (!status.installed) {
      return {
        success: false,
        error: `Butler CLI not installed. Download from: ${Butler.getDownloadUrl()}`,
      };
    }

    // Login if needed
    if (!status.loggedIn && this.apiKey) {
      const loginResult = await this.butler.login(this.apiKey);
      if (!loginResult.success) {
        return {
          success: false,
          error: `Failed to login with butler: ${loginResult.error}`,
        };
      }
    }

    // Prepare build directory
    const build = await this.butler.prepareHtmlBuild(htmlContent, target);

    try {
      // Upload with butler
      const butlerOptions: ButlerOptions = {
        target,
        channel: options.channel || 'html',
        version: options.version,
        fixPermissions: true,
      };

      const uploadResult = await this.butler.push(build.path, butlerOptions);

      return uploadResult;
    } finally {
      // Cleanup build directory
      await build.cleanup();
    }
  }

  /**
   * Upload HTML file using itch.io API (multipart form upload)
   */
  private async uploadWithApi(
    gameId: number,
    filename: string,
    content: string,
    channel: string = 'html'
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Create form data with the HTML file
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/html' });
      formData.append('upload', blob, filename);
      formData.append('channel', channel);

      // Upload to itch.io
      const response = await fetch(
        `${this.apiBase}/${this.apiKey}/game/${gameId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return false;
    }
  }

  /**
   * Determine best upload method
   */
  async getPreferredUploadMethod(): Promise<UploadMethod> {
    if (this.butler) {
      const status = await this.butler.getStatus();
      if (status.installed) {
        return 'butler';
      }
    }
    return 'api';
  }

  /**
   * Publish story to itch.io
   */
  async publish(story: Story, options: PublishOptions): Promise<PublishResult> {
    // Check authentication
    if (!this.isAuthenticated()) {
      return {
        success: false,
        platform: this.platform,
        error: 'Not authenticated. Please provide an itch.io API key.',
      };
    }

    try {
      // Get current user to verify authentication
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to authenticate with itch.io. Please check your API key.',
        };
      }

      // Export story as HTML
      const exporter = new StaticSiteExporter();
      const exportResult = await exporter.export({
        story,
        options: {
          format: 'html-standalone',
          filename: options.filename || story.metadata.title,
          theme: options.defaultTheme,
        },
      });

      if (!exportResult.success) {
        return {
          success: false,
          platform: this.platform,
          error: exportResult.error || 'Failed to export story',
        };
      }

      // Determine target (user/game format)
      const target = options.itchProject || `${user.username}/${this.slugify(story.metadata.title)}`;

      // Validate target format
      if (!Butler.validateTarget(target)) {
        return {
          success: false,
          platform: this.platform,
          error: 'Invalid itch.io project name. Format should be: username/game-name',
        };
      }

      // Check if game exists or create new one
      const existingGame = await this.findGameByTitle(story.metadata.title);
      let gameId: number;
      let gameUrl: string;

      if (existingGame) {
        // Update existing game
        gameId = existingGame.id;
        gameUrl = existingGame.url;

        const metadata: Partial<ItchGameMetadata> = {
          title: story.metadata.title,
          short_text: options.description || story.metadata.description || undefined,
        };

        await this.updateGame(gameId, metadata);
      } else {
        // Create new game
        const metadata: ItchGameMetadata = {
          title: story.metadata.title,
          short_text: options.description || story.metadata.description || undefined,
          type: 'html',
          classification: 'game',
          tags: story.metadata.tags,
        };

        const game = await this.createGame(metadata);
        if (!game) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to create game on itch.io',
          };
        }

        gameId = game.id;
        gameUrl = game.url;
      }

      // Determine upload method
      const uploadMethod = await this.getPreferredUploadMethod();

      let uploadSuccess = false;
      let buildId: number | undefined;
      let buildUrl: string | undefined;

      if (uploadMethod === 'butler') {
        // Upload with butler CLI
        const result = await this.uploadWithButler(
          exportResult.content as string,
          target,
          {
            channel: 'html',
            version: options.filename || story.metadata.version || '1.0.0',
          }
        );

        uploadSuccess = result.success;
        buildId = result.buildId;
        buildUrl = result.buildUrl;

        if (!uploadSuccess) {
          return {
            success: false,
            platform: this.platform,
            error: result.error || 'Failed to upload with butler',
          };
        }
      } else {
        // Upload with API
        const filename = `${exportResult.filename || 'index.html'}`;
        uploadSuccess = await this.uploadWithApi(
          gameId,
          filename,
          exportResult.content as string,
          'html'
        );

        if (!uploadSuccess) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to upload file to itch.io',
          };
        }
      }

      return {
        success: true,
        platform: this.platform,
        url: gameUrl,
        metadata: {
          gameId,
          username: user.username,
          uploadMethod,
          buildId,
          buildUrl: buildUrl || gameUrl,
          target,
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
   * Convert title to URL-safe slug
   */
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
