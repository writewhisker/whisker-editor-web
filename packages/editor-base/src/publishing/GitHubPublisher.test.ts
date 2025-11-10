/**
 * Tests for GitHubPublisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubPublisher } from './GitHubPublisher';
import type { Story } from '@whisker/core-ts';
import type { PublishOptions } from './types';
import { StaticSiteExporter } from '../export/formats/StaticSiteExporter';

// Mock StaticSiteExporter
vi.mock('../export/formats/StaticSiteExporter');

describe('GitHubPublisher', () => {
  let publisher: GitHubPublisher;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockStory: Story;

  beforeEach(() => {
    publisher = new GitHubPublisher();

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
        filename: 'index.html',
      }),
    }) as any);

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;

    // Mock btoa for base64 encoding
    global.btoa = vi.fn((str) => Buffer.from(str, 'binary').toString('base64'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Properties', () => {
    it('should have correct platform identifier', () => {
      expect(publisher.platform).toBe('github-pages');
    });

    it('should have correct display name', () => {
      expect(publisher.name).toBe('GitHub Pages');
    });

    it('should have correct description', () => {
      expect(publisher.description).toBe('Deploy to GitHub Pages');
    });

    it('should require authentication', () => {
      expect(publisher.requiresAuth).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should not be authenticated initially', () => {
      expect(publisher.isAuthenticated()).toBe(false);
    });

    it('should authenticate with valid token', () => {
      publisher.authenticate({ token: 'ghp_test123' });
      expect(publisher.isAuthenticated()).toBe(true);
    });

    it('should handle empty token', () => {
      publisher.authenticate({ token: '' });
      expect(publisher.isAuthenticated()).toBe(false);
    });

    it('should fail to publish without authentication', async () => {
      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });

  describe('User Information', () => {
    beforeEach(() => {
      publisher.authenticate({ token: 'ghp_test123' });
    });

    it('should get current user info', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          login: 'testuser',
          id: 12345,
        }),
      });

      const user = await publisher.getCurrentUser();

      expect(user).toEqual({
        login: 'testuser',
        id: 12345,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_test123',
          }),
        })
      );
    });

    it('should return null for invalid token', async () => {
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
      const unauthPublisher = new GitHubPublisher();

      await expect(unauthPublisher.getCurrentUser()).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  describe('Publishing Flow', () => {
    beforeEach(() => {
      publisher.authenticate({ token: 'ghp_test123' });
    });

    function mockSuccessfulPublish(repoName: string = 'test-story') {
      mockFetch
        // Get user
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser', id: 12345 }),
        })
        // Check repo exists
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Create repo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            owner: { login: 'testuser' },
            name: repoName,
          }),
        })
        // Get main ref
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        // Check gh-pages branch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Create gh-pages branch
        .mockResolvedValueOnce({
          ok: true,
        })
        // Check if index.html exists
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Upload index.html
        .mockResolvedValueOnce({
          ok: true,
        })
        // Enable Pages
        .mockResolvedValueOnce({
          ok: true,
        });
    }

    it('should successfully publish a new story', async () => {
      mockSuccessfulPublish();

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
        description: 'A test story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('github-pages');
      expect(result.url).toBe('https://testuser.github.io/test-story/');
      expect(result.metadata).toEqual({
        owner: 'testuser',
        repo: 'test-story',
        branch: 'gh-pages',
        username: 'testuser',
      });
    });

    it('should use custom repository name', async () => {
      mockSuccessfulPublish('my-custom-repo');

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
        githubRepo: 'my-custom-repo',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://testuser.github.io/my-custom-repo/');
    });

    it('should use custom branch name', async () => {
      mockSuccessfulPublish();

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
        githubBranch: 'docs',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.metadata?.branch).toBe('docs');
    });

    it('should handle authentication failure during publish', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticate with GitHub');
    });

    it('should handle export failure', async () => {
      // Mock successful user fetch
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ login: 'testuser', id: 12345 }),
      });

      // Mock export failure
      vi.mocked(StaticSiteExporter).mockImplementation(() => ({
        export: vi.fn().mockResolvedValue({
          success: false,
          error: 'Export failed',
        }),
      }) as any);

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });

    it('should handle repository creation failure', async () => {
      mockFetch
        // Get user
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser', id: 12345 }),
        })
        // Check repo exists
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Create repo fails
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ message: 'Repository creation failed' }),
        });

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create GitHub repository');
    });

    it('should handle file upload failure', async () => {
      mockFetch
        // Get user
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser', id: 12345 }),
        })
        // Check repo exists
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Create repo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            owner: { login: 'testuser' },
            name: 'test-story',
          }),
        })
        // Get main ref
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        // Check gh-pages branch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Create gh-pages branch
        .mockResolvedValueOnce({
          ok: true,
        })
        // Check if index.html exists
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        // Upload fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload file');
    });
  });

  describe('Repository Name Sanitization', () => {
    it('should sanitize repository names', () => {
      const sanitize = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100);
      };

      expect(sanitize('My Story')).toBe('my-story');
      expect(sanitize('Test@Story#2024')).toBe('test-story-2024');
      expect(sanitize('Hello World!!!')).toBe('hello-world');
      expect(sanitize('---test---')).toBe('test');
    });

    it('should handle empty repository names', () => {
      const sanitize = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100) || 'story';
      };

      expect(sanitize('')).toBe('story');
      expect(sanitize('!!!')).toBe('story');
    });

    it('should limit repository name length', () => {
      const longName = 'a'.repeat(150);
      const sanitize = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100);
      };

      const result = sanitize(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Existing Repository', () => {
    beforeEach(() => {
      publisher.authenticate({ token: 'ghp_test123' });

      // Mock flow for existing repository
      mockFetch
        // Get user
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser', id: 12345 }),
        })
        // Check repo exists (true)
        .mockResolvedValueOnce({
          ok: true,
        })
        // Get main ref
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        // Check gh-pages branch (exists)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'def456' } }),
        })
        // Check if index.html exists (for update)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'old-file-sha' }),
        })
        // Upload index.html (update)
        .mockResolvedValueOnce({
          ok: true,
        })
        // Enable Pages
        .mockResolvedValueOnce({
          ok: true,
        });
    });

    it('should update existing repository', async () => {
      const options: PublishOptions = {
        platform: 'github-pages',
        filename: 'test-story',
      };

      const result = await publisher.publish(mockStory, options);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://testuser.github.io/test-story/');
    });
  });
});
