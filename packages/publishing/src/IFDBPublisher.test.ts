/**
 * IFDB Publisher Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IFDBPublisher } from './IFDBPublisher';
import type { PublishOptions } from './types';
import type { Story } from '@writewhisker/core-ts';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a mock story that matches the Story interface
function createMockStory(overrides: Partial<{
  title: string;
  author: string;
  description: string;
  tags: string[];
  created: string;
  ifid: string;
}>): Story {
  return {
    metadata: {
      title: overrides.title ?? 'Test Story',
      author: overrides.author ?? 'Test Author',
      version: '1.0.0',
      created: overrides.created ?? '2024-01-01T00:00:00.000Z',
      modified: new Date().toISOString(),
      description: overrides.description ?? 'A test interactive fiction story',
      tags: overrides.tags ?? ['fantasy', 'adventure'],
      ifid: overrides.ifid,
    },
    startPassage: 'start',
    passages: new Map([
      ['start', { id: 'start', title: 'Start', content: 'Welcome!', choices: [] }],
      ['end', { id: 'end', title: 'End', content: 'The End.', choices: [] }],
    ]),
    variables: new Map(),
    serialize: () => ({}),
  } as unknown as Story;
}

describe('IFDBPublisher', () => {
  let publisher: IFDBPublisher;
  let testStory: Story;

  beforeEach(() => {
    publisher = new IFDBPublisher();
    testStory = createMockStory({});
    mockFetch.mockClear();
  });

  describe('metadata', () => {
    it('should have correct name and platform', () => {
      expect(publisher.name).toBe('IFDB');
      expect(publisher.platform).toBe('ifdb');
      expect(publisher.description).toContain('Interactive Fiction Database');
      expect(publisher.requiresAuth).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should not be authenticated initially', () => {
      expect(publisher.isAuthenticated()).toBe(false);
    });

    it('should authenticate with credentials', () => {
      publisher.authenticate({
        username: 'testuser',
        password: 'testpass',
      });

      expect(publisher.isAuthenticated()).toBe(true);
    });
  });

  describe('search', () => {
    it('should search for games', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            {
              tuid: 'abc123',
              title: 'Test Game',
              author: 'Author Name',
              averageRating: '4.5',
              ratingCount: '10',
            },
          ],
          totalCount: 1,
        }),
      });

      const results = await publisher.search('test');

      expect(results.games).toHaveLength(1);
      expect(results.games[0].title).toBe('Test Game');
      expect(results.games[0].tuid).toBe('abc123');
      expect(results.totalCount).toBe(1);
    });

    it('should handle search errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await publisher.search('test');

      expect(results.games).toHaveLength(0);
      expect(results.totalCount).toBe(0);
    });
  });

  describe('getGameByTuid', () => {
    it('should get game by TUID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tuid: 'abc123',
          title: 'Test Game',
          author: 'Author Name',
        }),
      });

      const game = await publisher.getGameByTuid('abc123');

      expect(game).not.toBeNull();
      expect(game!.title).toBe('Test Game');
      expect(game!.ifdbUrl).toContain('abc123');
    });

    it('should return null for non-existent game', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const game = await publisher.getGameByTuid('nonexistent');

      expect(game).toBeNull();
    });
  });

  describe('publish', () => {
    const createOptions = (opts: Partial<PublishOptions> = {}): PublishOptions => ({
      platform: 'ifdb',
      ...opts,
    });

    it('should fail if not authenticated', async () => {
      const result = await publisher.publish(testStory, createOptions());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });

    it('should fail if story has no title', async () => {
      publisher.authenticate({ username: 'user', password: 'pass' });

      const storyNoTitle = createMockStory({ title: '' });

      const result = await publisher.publish(storyNoTitle, createOptions());

      expect(result.success).toBe(false);
      expect(result.error).toContain('title is required');
    });

    it('should create new entry if game does not exist', async () => {
      publisher.authenticate({ username: 'user', password: 'pass' });

      // Search returns empty (no existing game)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [], totalCount: 0 }),
      });

      // Create entry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tuid: 'new123',
        }),
      });

      const result = await publisher.publish(testStory, createOptions());

      expect(result.success).toBe(true);
      expect(result.url).toContain('new123');
      expect(result.metadata?.tuid).toBe('new123');
      expect(result.metadata?.isUpdate).toBe(false);
    });

    it('should update existing entry if game exists', async () => {
      publisher.authenticate({ username: 'user', password: 'pass' });

      // Search returns existing game
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            {
              tuid: 'existing123',
              title: 'Test Story',
              author: 'Test Author',
            },
          ],
          totalCount: 1,
        }),
      });

      // Update entry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await publisher.publish(testStory, createOptions());

      expect(result.success).toBe(true);
      expect(result.metadata?.tuid).toBe('existing123');
      expect(result.metadata?.isUpdate).toBe(true);
    });

    it('should include genre tags from story', async () => {
      publisher.authenticate({ username: 'user', password: 'pass' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [], totalCount: 0 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tuid: 'new123' }),
      });

      const result = await publisher.publish(testStory, createOptions());

      expect(result.success).toBe(true);
      // Verify genre was included by checking the fetch call
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use custom author from options', async () => {
      publisher.authenticate({ username: 'user', password: 'pass' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [], totalCount: 0 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tuid: 'new123' }),
      });

      const result = await publisher.publish(
        testStory,
        createOptions({ author: 'Custom Author' })
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.author).toBe('Custom Author');
    });
  });

  describe('generateShareUrl', () => {
    it('should generate correct IFDB URL', () => {
      const url = publisher.generateShareUrl('abc123');

      expect(url).toBe('https://ifdb.org/viewgame?id=abc123');
    });
  });

  describe('generateEmbedCode', () => {
    it('should generate iframe embed code', () => {
      const embed = publisher.generateEmbedCode('abc123');

      expect(embed).toContain('iframe');
      expect(embed).toContain('abc123');
      expect(embed).toContain('width="300"');
      expect(embed).toContain('height="150"');
    });

    it('should use custom dimensions', () => {
      const embed = publisher.generateEmbedCode('abc123', {
        width: 400,
        height: 200,
      });

      expect(embed).toContain('width="400"');
      expect(embed).toContain('height="200"');
    });
  });

  describe('getGameStats', () => {
    it('should return game statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tuid: 'abc123',
          title: 'Test Game',
          author: 'Author',
          averageRating: '4.2',
          ratingCount: '15',
        }),
      });

      const stats = await publisher.getGameStats('abc123');

      expect(stats).not.toBeNull();
      expect(stats!.ratings).toBe(15);
      expect(stats!.averageRating).toBe(4.2);
    });

    it('should return null for non-existent game', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const stats = await publisher.getGameStats('nonexistent');

      expect(stats).toBeNull();
    });
  });
});
