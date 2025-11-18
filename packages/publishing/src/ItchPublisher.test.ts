/**
 * Tests for ItchPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ItchPublisher } from './ItchPublisher';
import type { Story } from '@writewhisker/core-ts';
import type { PublishOptions } from './types';
import { StaticSiteExporter } from '@writewhisker/editor-base';

// Mock StaticSiteExporter
vi.mock('../export/formats/StaticSiteExporter');

describe('ItchPublisher', () => {
  let publisher: ItchPublisher;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockStory: Story;

  beforeEach(() => {
    publisher = new ItchPublisher();

    // Setup mock story
    mockStory = {
      metadata: {
        ifid: 'test-story-1',
        title: 'Test Story',
        description: 'A test interactive story',
        author: 'Test Author',
        version: '1.0.0',
        tags: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        createdBy: 'test',
      },
      startPassage: '',
      passages: new Map(),
      variables: new Map(),
      settings: {},
      stylesheets: [],
      scripts: [],
      assets: new Map(),
      luaFunctions: new Map(),
    } as unknown as Story;

    // Mock StaticSiteExporter
    vi.mocked(StaticSiteExporter).mockImplementation(() => ({
      export: vi.fn().mockResolvedValue({
        success: true,
        content: '<html><body>Test Story</body></html>',
        filename: 'test-story.html',
      }),
    }) as any);

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Properties', () => {
    it('should have correct platform identifier', () => {
      expect(publisher.platform).toBe('itch-io');
    });

    it('should have correct display name', () => {
      expect(publisher.name).toBe('itch.io');
    });

    it('should have correct description', () => {
      expect(publisher.description).toBe('Publish to itch.io gaming platform');
    });

    it('should require authentication', () => {
      expect(publisher.requiresAuth).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should not be authenticated initially', () => {
      expect(publisher.isAuthenticated()).toBe(false);
    });

    it('should authenticate with valid API key', () => {
      publisher.authenticate({ apiKey: 'test-api-key-123' });
      expect(publisher.isAuthenticated()).toBe(true);
    });

    it('should handle empty API key', () => {
      publisher.authenticate({ apiKey: '' });
      expect(publisher.isAuthenticated()).toBe(false);
    });

    it('should fail to publish without authentication', async () => {
      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });

  describe('User Information', () => {
    beforeEach(() => {
      publisher.authenticate({ apiKey: 'test-api-key-123' });
    });

    it('should get current user info', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: 12345,
            username: 'testuser',
          },
        }),
      });

      const user = await publisher.getCurrentUser();

      expect(user).toEqual({
        id: 12345,
        username: 'testuser',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://itch.io/api/1/test-api-key-123/me',
        expect.any(Object)
      );
    });

    it('should return null for invalid API key', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const user = await publisher.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle network errors when getting user', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const user = await publisher.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should throw error if getting user without authentication', async () => {
      const unauthPublisher = new ItchPublisher();

      await expect(unauthPublisher.getCurrentUser()).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  describe('Publishing Flow', () => {
    beforeEach(() => {
      publisher.authenticate({ apiKey: 'test-api-key-123' });
    });

    it('should successfully publish a story', async () => {
      // Mock user info
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 12345, username: 'testuser' },
          }),
        })
        // Mock game creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            game: {
              id: 67890,
              url: 'https://testuser.itch.io/test-story',
            },
          }),
        })
        // Mock file upload
        .mockResolvedValueOnce({
          ok: true,
        });

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
        description: 'A test story',
        visibility: 'draft',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('itch-io');
      expect(result.url).toBe('https://testuser.itch.io/test-story');
      expect(result.metadata).toEqual({
        gameId: 67890,
        username: 'testuser',
        visibility: 'draft',
      });
    });

    it('should use default visibility if not specified', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 12345, username: 'testuser' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            game: { id: 67890, url: 'https://testuser.itch.io/test-story' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.metadata?.visibility).toBe('draft');
    });

    it('should handle failed authentication during publish', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticate with itch.io');
    });

    it('should handle export failure', async () => {
      // Mock successful auth
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 12345, username: 'testuser' },
        }),
      });

      // Mock export failure
      vi.mocked(StaticSiteExporter).mockImplementation(() => ({
        export: vi.fn().mockResolvedValue({
          success: false,
          error: 'Export failed',
        }),
      }) as any);

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });

    it('should handle game creation failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 12345, username: 'testuser' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        });

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create game');
    });

    it('should handle file upload failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 12345, username: 'testuser' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            game: { id: 67890, url: 'https://testuser.itch.io/test-story' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload file');
    });

    it('should handle unexpected errors during publish', async () => {
      mockFetch.mockRejectedValue(new Error('Unexpected network error'));

      const options: PublishOptions = {
        platform: 'itch-io',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Options Handling', () => {
    beforeEach(() => {
      publisher.authenticate({ apiKey: 'test-api-key-123' });

      // Mock all successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 12345, username: 'testuser' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            game: { id: 67890, url: 'https://testuser.itch.io/test-story' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });
    });

    it('should use story title as default filename', async () => {
      const options: PublishOptions = {
        platform: 'itch-io',
      };

      await publisher.publish(mockStory, options);

      // Check that exporter was called with story title
      const exporterInstance = vi.mocked(StaticSiteExporter).mock.results[0].value;
      expect(exporterInstance.export).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            filename: 'Test Story',
          }),
        })
      );
    });

    it('should pass custom description to game metadata', async () => {
      const options: PublishOptions = {
        platform: 'itch-io',
        description: 'Custom description for itch.io',
      };

      await publisher.publish(mockStory, options);

      // Check that game creation was called with description
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/game'),
        expect.objectContaining({
          body: expect.stringContaining('Custom description for itch.io'),
        })
      );
    });

    it('should use story description if no custom description provided', async () => {
      const options: PublishOptions = {
        platform: 'itch-io',
      };

      await publisher.publish(mockStory, options);

      // Check that game creation was called with story description
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/game'),
        expect.objectContaining({
          body: expect.stringContaining('A test interactive story'),
        })
      );
    });
  });
});
