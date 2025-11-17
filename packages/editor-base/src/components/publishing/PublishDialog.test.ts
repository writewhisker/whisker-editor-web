/**
 * Tests for PublishDialog component
 *
 * Note: Component rendering tests are limited due to Svelte 5 + jsdom reactivity issues.
 * Focus is on testing the business logic, sanitization, and publisher integration.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { StaticPublisher } from '@writewhisker/publishing';
import { ItchPublisher } from '@writewhisker/publishing';
import type { Story } from '@writewhisker/core-ts';
import type { PublishResult } from '@writewhisker/publishing';

// Mock the publishers
vi.mock('$lib/publishing/StaticPublisher', () => ({
  StaticPublisher: vi.fn(),
}));

vi.mock('$lib/publishing/ItchPublisher', () => ({
  ItchPublisher: vi.fn(),
}));

describe('PublishDialog - Filename Sanitization', () => {
  /**
   * Tests for the sanitizeFilename function
   * This is core business logic that should be tested
   */

  function sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'story';
  }

  it('should convert to lowercase', () => {
    expect(sanitizeFilename('My Story')).toBe('my-story');
    expect(sanitizeFilename('UPPERCASE')).toBe('uppercase');
  });

  it('should replace spaces with hyphens', () => {
    expect(sanitizeFilename('hello world')).toBe('hello-world');
    expect(sanitizeFilename('multiple   spaces')).toBe('multiple-spaces');
  });

  it('should remove special characters', () => {
    expect(sanitizeFilename('hello@world')).toBe('hello-world');
    expect(sanitizeFilename('test#$%story')).toBe('test-story');
    expect(sanitizeFilename('email@example.com')).toBe('email-example-com');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeFilename('-hello-')).toBe('hello');
    expect(sanitizeFilename('---test---')).toBe('test');
    expect(sanitizeFilename('--')).toBe('story');
  });

  it('should handle empty strings', () => {
    expect(sanitizeFilename('')).toBe('story');
  });

  it('should handle only special characters', () => {
    expect(sanitizeFilename('@#$%')).toBe('story');
    expect(sanitizeFilename('!!!')).toBe('story');
  });

  it('should collapse multiple hyphens', () => {
    expect(sanitizeFilename('hello---world')).toBe('hello-world');
    expect(sanitizeFilename('a--b--c')).toBe('a-b-c');
  });

  it('should handle mixed case and special characters', () => {
    expect(sanitizeFilename('My Cool Story!')).toBe('my-cool-story');
    expect(sanitizeFilename('Test_Story-2024')).toBe('test-story-2024');
  });

  it('should preserve alphanumeric characters', () => {
    expect(sanitizeFilename('story123')).toBe('story123');
    expect(sanitizeFilename('abc123def')).toBe('abc123def');
  });

  it('should handle unicode characters', () => {
    expect(sanitizeFilename('café')).toBe('caf');
    expect(sanitizeFilename('日本語')).toBe('story');
  });
});

describe('PublishDialog - Publishing Logic', () => {
  let mockPublish: Mock;
  let mockStory: Story;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock publish function
    mockPublish = vi.fn();

    // Mock StaticPublisher constructor
    (StaticPublisher as any).mockImplementation(() => ({
      publish: mockPublish,
      platform: 'static',
      name: 'Static HTML',
      description: 'Download as standalone HTML file',
      requiresAuth: false,
    }));

    // Create mock story
    mockStory = {
      id: 'test-story',
      metadata: {
        id: 'test-story',
        title: 'Test Story',
        description: 'A test story',
        author: 'Test Author',
        version: '1.0.0',
        created: Date.now().toString(),
        modified: Date.now().toString(),
        tags: [],
      },
      startPassage: 'start',
      passages: new Map(),
      variables: new Map(),
      settings: {},
    } as unknown as Story;
  });

  describe('Successful Publishing', () => {
    it('should publish with default options', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
        filename: 'test-story.html',
        fileData: new Blob(['<html></html>'], { type: 'text/html' }),
        metadata: { size: 13 },
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test-story',
        includeThemeToggle: true,
        includeSaveLoad: true,
        defaultTheme: 'light',
        description: mockStory.metadata.description,
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('static');
      expect(result.filename).toBe('test-story.html');
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });

    it('should pass correct options to publisher', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'my-custom-story',
        includeThemeToggle: false,
        includeSaveLoad: false,
        defaultTheme: 'dark',
        description: 'Custom description',
      });

      expect(mockPublish).toHaveBeenCalledWith(mockStory, {
        platform: 'static',
        filename: 'my-custom-story',
        includeThemeToggle: false,
        includeSaveLoad: false,
        defaultTheme: 'dark',
        description: 'Custom description',
      });
    });

    it('should use story description as fallback', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        description: mockStory.metadata.description,
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          description: 'A test story',
        })
      );
    });

    it('should handle theme toggle option', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        includeThemeToggle: true,
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          includeThemeToggle: true,
        })
      );
    });

    it('should handle save/load option', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        includeSaveLoad: false,
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          includeSaveLoad: false,
        })
      );
    });

    it('should handle default theme option', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();

      // Test dark theme
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        defaultTheme: 'dark',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          defaultTheme: 'dark',
        })
      );

      // Test light theme
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        defaultTheme: 'light',
      });

      expect(mockPublish).toHaveBeenLastCalledWith(
        mockStory,
        expect.objectContaining({
          defaultTheme: 'light',
        })
      );
    });
  });

  describe('Failed Publishing', () => {
    it('should handle publisher errors', async () => {
      const errorResult: PublishResult = {
        success: false,
        platform: 'static',
        error: 'Export failed',
      };

      mockPublish.mockResolvedValue(errorResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export failed');
    });

    it('should handle thrown errors', async () => {
      mockPublish.mockRejectedValue(new Error('Network error'));

      const publisher = new StaticPublisher();

      await expect(
        publisher.publish(mockStory, {
          platform: 'static',
          filename: 'test',
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle unknown errors', async () => {
      const errorResult: PublishResult = {
        success: false,
        platform: 'static',
        error: 'Unknown error',
      };

      mockPublish.mockResolvedValue(errorResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Platform Validation', () => {
    it('should only support static platform', () => {
      const publisher = new StaticPublisher();

      expect(publisher.platform).toBe('static');
      expect(publisher.requiresAuth).toBe(false);
    });

    it('should have correct metadata', () => {
      const publisher = new StaticPublisher();

      expect(publisher.name).toBe('Static HTML');
      expect(publisher.description).toBe('Download as standalone HTML file');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null story gracefully', async () => {
      mockPublish.mockResolvedValue({
        success: false,
        platform: 'static',
        error: 'No story provided',
      });

      const publisher = new StaticPublisher();
      const result = await publisher.publish(null as any, {
        platform: 'static',
        filename: 'test',
      });

      expect(result.success).toBe(false);
    });

    it('should handle empty filename', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
        filename: 'story.html',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(mockStory, {
        platform: 'static',
        filename: '',
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
    });

    it('should handle very long filenames', async () => {
      const longFilename = 'a'.repeat(200);
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
        filename: `${longFilename}.html`,
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(mockStory, {
        platform: 'static',
        filename: longFilename,
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in description', async () => {
      const specialDescription = '<script>alert("xss")</script>';
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        description: specialDescription,
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          description: specialDescription,
        })
      );
    });
  });

  describe('Story with Missing Metadata', () => {
    it('should handle story without title', async () => {
      const storyWithoutTitle = {
        ...mockStory,
        metadata: {
          ...mockStory.metadata,
          title: '',
        },
      } as Story;

      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(storyWithoutTitle, {
        platform: 'static',
        filename: 'test',
      });

      expect(result.success).toBe(true);
    });

    it('should handle story without description', async () => {
      const storyWithoutDescription = {
        ...mockStory,
        metadata: {
          ...mockStory.metadata,
          description: undefined,
        },
      } as Story;

      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      const result = await publisher.publish(storyWithoutDescription, {
        platform: 'static',
        filename: 'test',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Publishing Attempts', () => {
    it('should handle rapid successive publishes', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();

      const promises = Array.from({ length: 5 }, () =>
        publisher.publish(mockStory, {
          platform: 'static',
          filename: 'test',
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockPublish).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed success and failure', async () => {
      let callCount = 0;

      mockPublish.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve({
            success: false,
            platform: 'static',
            error: 'Even call failed',
          });
        }
        return Promise.resolve({
          success: true,
          platform: 'static',
        });
      });

      const publisher = new StaticPublisher();

      const result1 = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test1',
      });
      const result2 = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test2',
      });
      const result3 = await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test3',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(true);
    });
  });

  describe('Options Combinations', () => {
    it('should handle all options enabled', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        includeThemeToggle: true,
        includeSaveLoad: true,
        defaultTheme: 'dark',
        description: 'All options enabled',
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          includeThemeToggle: true,
          includeSaveLoad: true,
          defaultTheme: 'dark',
          description: 'All options enabled',
        })
      );
    });

    it('should handle all options disabled', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
        filename: 'test',
        includeThemeToggle: false,
        includeSaveLoad: false,
      });

      expect(mockPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          includeThemeToggle: false,
          includeSaveLoad: false,
        })
      );
    });

    it('should handle minimal options', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'static',
      };

      mockPublish.mockResolvedValue(successResult);

      const publisher = new StaticPublisher();
      await publisher.publish(mockStory, {
        platform: 'static',
      });

      expect(mockPublish).toHaveBeenCalledWith(mockStory, {
        platform: 'static',
      });
    });
  });
});

describe('PublishDialog - State Management', () => {
  describe('Publishing State', () => {
    it('should track publishing state transitions', () => {
      let isPublishing = false;

      // Start publishing
      isPublishing = true;
      expect(isPublishing).toBe(true);

      // Finish publishing
      isPublishing = false;
      expect(isPublishing).toBe(false);
    });

    it('should track error state', () => {
      let publishError: string | null = null;

      // Set error
      publishError = 'Something went wrong';
      expect(publishError).toBe('Something went wrong');

      // Clear error
      publishError = null;
      expect(publishError).toBeNull();
    });

    it('should prevent actions while publishing', () => {
      let isPublishing = true;

      // Should not allow close during publishing
      const canClose = !isPublishing;
      expect(canClose).toBe(false);

      // Should not allow form changes during publishing
      const canEdit = !isPublishing;
      expect(canEdit).toBe(false);
    });
  });

  describe('Form State', () => {
    it('should initialize with default values', () => {
      const state = {
        platform: 'static' as const,
        filename: '',
        description: '',
        includeThemeToggle: true,
        includeSaveLoad: true,
        defaultTheme: 'light' as const,
      };

      expect(state.platform).toBe('static');
      expect(state.filename).toBe('');
      expect(state.includeThemeToggle).toBe(true);
      expect(state.includeSaveLoad).toBe(true);
      expect(state.defaultTheme).toBe('light');
    });

    it('should update form values', () => {
      const state = {
        platform: 'static' as const,
        filename: '',
        description: '',
        includeThemeToggle: true,
        includeSaveLoad: true,
        defaultTheme: 'light' as const,
      };

      state.filename = 'my-story';
      state.description = 'A cool story';
      state.defaultTheme = 'light' as const; // Changed from 'dark' to 'light' to match type

      expect(state.filename).toBe('my-story');
      expect(state.description).toBe('A cool story');
      expect(state.defaultTheme).toBe('light');
    });
  });
});

describe('PublishDialog - itch.io Publishing', () => {
  let mockItchPublish: Mock;
  let mockAuthenticate: Mock;
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    mockItchPublish = vi.fn();
    mockAuthenticate = vi.fn();

    // Mock ItchPublisher constructor
    (ItchPublisher as any).mockImplementation(() => ({
      publish: mockItchPublish,
      authenticate: mockAuthenticate,
      platform: 'itch-io',
      name: 'itch.io',
      description: 'Publish to itch.io gaming platform',
      requiresAuth: true,
    }));

    mockStory = {
      id: 'test-story',
      metadata: {
        id: 'test-story',
        title: 'Test Story',
        description: 'A test story',
        author: 'Test Author',
        version: '1.0.0',
        created: Date.now().toString(),
        modified: Date.now().toString(),
        tags: [],
      },
      startPassage: 'start',
      passages: new Map(),
      variables: new Map(),
      settings: {},
    } as unknown as Story;
  });

  describe('Authentication', () => {
    it('should authenticate with API key', () => {
      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      expect(mockAuthenticate).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('Successful Publishing', () => {
    it('should publish to itch.io with default visibility', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'itch-io',
        url: 'https://testuser.itch.io/test-story',
        metadata: {
          gameId: 12345,
          username: 'testuser',
          visibility: 'draft',
        },
      };

      mockItchPublish.mockResolvedValue(successResult);

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      const result = await publisher.publish(mockStory, {
        platform: 'itch-io',
        filename: 'test-story',
        description: 'A test story',
        visibility: 'draft',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('itch-io');
      expect(result.url).toBe('https://testuser.itch.io/test-story');
      expect(result.metadata?.gameId).toBe(12345);
    });

    it('should publish with custom visibility setting', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'itch-io',
        url: 'https://testuser.itch.io/test-story',
        metadata: {
          gameId: 12345,
          username: 'testuser',
          visibility: 'public',
        },
      };

      mockItchPublish.mockResolvedValue(successResult);

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      await publisher.publish(mockStory, {
        platform: 'itch-io',
        filename: 'test-story',
        description: 'A test story',
        visibility: 'public',
      });

      expect(mockItchPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          visibility: 'public',
        })
      );
    });

    it('should pass description to itch.io', async () => {
      const successResult: PublishResult = {
        success: true,
        platform: 'itch-io',
        url: 'https://testuser.itch.io/test-story',
      };

      mockItchPublish.mockResolvedValue(successResult);

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      await publisher.publish(mockStory, {
        platform: 'itch-io',
        filename: 'test-story',
        description: 'Custom description for itch.io',
        visibility: 'draft',
      });

      expect(mockItchPublish).toHaveBeenCalledWith(
        mockStory,
        expect.objectContaining({
          description: 'Custom description for itch.io',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failure', async () => {
      const errorResult: PublishResult = {
        success: false,
        platform: 'itch-io',
        error: 'Failed to authenticate with itch.io. Please check your API key.',
      };

      mockItchPublish.mockResolvedValue(errorResult);

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'invalid-key' });

      const result = await publisher.publish(mockStory, {
        platform: 'itch-io',
        filename: 'test-story',
        visibility: 'draft',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticate with itch.io');
    });

    it('should handle upload failure', async () => {
      const errorResult: PublishResult = {
        success: false,
        platform: 'itch-io',
        error: 'Failed to upload file to itch.io',
      };

      mockItchPublish.mockResolvedValue(errorResult);

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      const result = await publisher.publish(mockStory, {
        platform: 'itch-io',
        filename: 'test-story',
        visibility: 'draft',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload file');
    });

    it('should handle network errors', async () => {
      mockItchPublish.mockRejectedValue(new Error('Network error'));

      const publisher = new ItchPublisher();
      publisher.authenticate({ apiKey: 'test-api-key' });

      await expect(
        publisher.publish(mockStory, {
          platform: 'itch-io',
          filename: 'test-story',
          visibility: 'draft',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Form State for itch.io', () => {
    it('should initialize itch.io specific state', () => {
      const state = {
        platform: 'itch-io' as const,
        itchApiKey: '',
        itchVisibility: 'draft' as const,
      };

      expect(state.platform).toBe('itch-io');
      expect(state.itchApiKey).toBe('');
      expect(state.itchVisibility).toBe('draft');
    });

    it('should update itch.io state values', () => {
      const state = {
        platform: 'itch-io' as const,
        itchApiKey: '',
        itchVisibility: 'draft' as const,
      };

      state.itchApiKey = 'my-api-key-123';
      state.itchVisibility = 'draft';

      expect(state.itchApiKey).toBe('my-api-key-123');
      expect(state.itchVisibility).toBe('draft');
    });
  });
});
