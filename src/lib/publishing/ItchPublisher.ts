/**
 * itch.io Publisher
 *
 * Publishes stories to itch.io platform using the itch.io API.
 *
 * API Documentation: https://itch.io/docs/api/overview
 */

import type { IPublisher, PublishOptions, PublishResult } from './types';
import type { Story } from '@whisker/core-ts';
import { StaticSiteExporter } from '../export/formats/StaticSiteExporter';

/**
 * itch.io API authentication
 */
export interface ItchAuthConfig {
  /** API key from itch.io user settings */
  apiKey: string;
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
  type: 'html';

  /** Classification */
  classification: 'game' | 'tool';

  /** Visibility */
  visibility: 'public' | 'private' | 'draft';
}

/**
 * itch.io Publisher implementation
 *
 * Uploads stories to itch.io as playable HTML games.
 */
export class ItchPublisher implements IPublisher {
  readonly platform = 'itch-io' as const;
  readonly name = 'itch.io';
  readonly description = 'Publish to itch.io gaming platform';
  readonly requiresAuth = true;

  private apiKey: string | null = null;
  private readonly apiBase = 'https://itch.io/api/1';

  /**
   * Set authentication credentials
   */
  authenticate(config: ItchAuthConfig): void {
    this.apiKey = config.apiKey;
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
  async getCurrentUser(): Promise<{ id: number; username: string } | null> {
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
   * Create or update a game on itch.io
   */
  private async createOrUpdateGame(
    metadata: ItchGameMetadata
  ): Promise<{ id: number; url: string } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Note: The actual itch.io API endpoint for creating games would be used here
      // For now, this is a placeholder that demonstrates the structure
      const response = await fetch(`${this.apiBase}/${this.apiKey}/game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create/update game:', error);
        return null;
      }

      const data = await response.json();
      return {
        id: data.game.id,
        url: data.game.url,
      };
    } catch (error) {
      console.error('Failed to create/update game:', error);
      return null;
    }
  }

  /**
   * Upload HTML file to itch.io game
   */
  private async uploadFile(
    gameId: number,
    filename: string,
    content: string
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Create form data with the HTML file
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/html' });
      formData.append('upload', blob, filename);

      // Note: The actual itch.io API endpoint for uploading files would be used here
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

      // Prepare game metadata
      const metadata: ItchGameMetadata = {
        title: story.metadata.title,
        short_text: options.description || story.metadata.description || undefined,
        type: 'html',
        classification: 'game',
        visibility: options.visibility || 'draft',
      };

      // Create or update game on itch.io
      const game = await this.createOrUpdateGame(metadata);
      if (!game) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to create game on itch.io',
        };
      }

      // Upload HTML file
      const filename = `${exportResult.filename || 'index.html'}`;
      const uploadSuccess = await this.uploadFile(
        game.id,
        filename,
        exportResult.content as string
      );

      if (!uploadSuccess) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to upload file to itch.io',
        };
      }

      return {
        success: true,
        platform: this.platform,
        url: game.url,
        metadata: {
          gameId: game.id,
          username: user.username,
          visibility: metadata.visibility,
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
}
