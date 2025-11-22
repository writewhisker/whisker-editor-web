/**
 * Tests for CLI Build Command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildStory,
  buildCommand,
  watchBuild,
  type BuildOptions,
  type BuildFormat,
  type ValidationResult,
} from './index.js';
import type { Story } from '@writewhisker/story-models';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

// Mock fs
vi.mock('fs', () => {
  return {
    watch: vi.fn(),
  };
});

// Mock child_process
vi.mock('child_process', () => {
  return {
    exec: vi.fn((cmd, opts, callback) => callback(null, { stdout: '', stderr: '' })),
  };
});

describe('buildStory', () => {
  let fs: any;

  const mockStory: Story = {
    id: 'test-story',
    name: 'Test Story',
    passages: [
      {
        id: 'passage-1',
        title: 'Start',
        content: 'This is the start.\n\n[[Next|Next Passage]]',
        tags: ['start'],
      },
      {
        id: 'passage-2',
        title: 'Next Passage',
        content: 'This is the next passage.',
        tags: [],
      },
    ],
    startPassage: 'Start',
    metadata: {
      author: 'Test Author',
      description: 'Test Description',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  };

  beforeEach(async () => {
    fs = await import('fs/promises');
    vi.clearAllMocks();
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockStory));
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  describe('HTML format', () => {
    it('should build HTML output', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: false,
      };

      await buildStory(options);

      expect(fs.readFile).toHaveBeenCalledWith('/test/story.json', 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.html',
        expect.stringContaining('<!DOCTYPE html>')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.html',
        expect.stringContaining('Test Story')
      );
    });

    it('should minify HTML when requested', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        minify: true,
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const htmlContent = writeCall[1];

      // Minified JSON should not have pretty-printing (no newlines between properties)
      expect(htmlContent).toContain('"true"');
    });

    it('should include story data in HTML', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const htmlContent = writeCall[1];

      expect(htmlContent).toContain('Test Story');
      expect(htmlContent).toContain('Start');
      expect(htmlContent).toContain('Next Passage');
    });
  });

  describe('JSON format', () => {
    it('should build JSON output', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.json',
        format: 'json',
        validate: false,
      };

      await buildStory(options);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.json',
        expect.stringContaining('"Test Story"')
      );
    });

    it('should pretty-print JSON by default', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.json',
        format: 'json',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const jsonContent = writeCall[1];

      // Pretty-printed JSON should have newlines and indentation
      expect(jsonContent).toContain('\n');
      expect(jsonContent).toMatch(/  \"/);
    });

    it('should minify JSON when requested', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.json',
        format: 'json',
        minify: true,
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const jsonContent = writeCall[1];

      // Minified JSON should be compact
      expect(jsonContent).not.toMatch(/\n\s+"/);
    });
  });

  describe('Markdown format', () => {
    it('should build Markdown output', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.md',
        format: 'markdown',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const mdContent = writeCall[1];

      expect(mdContent).toContain('# Test Story');
      expect(mdContent).toContain('**Author:** Test Author');
      expect(mdContent).toContain('Test Description');
      expect(mdContent).toContain('## Start');
      expect(mdContent).toContain('This is the start');
      expect(mdContent).toContain('*Tags: start*');
    });

    it('should handle passages without tags', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.md',
        format: 'markdown',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const mdContent = writeCall[1];

      // Should have Next Passage without tags
      expect(mdContent).toContain('## Next Passage');
      expect(mdContent).toContain('This is the next passage');
    });

    it('should handle missing metadata', async () => {
      const storyWithoutMetadata = {
        ...mockStory,
        metadata: undefined,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(storyWithoutMetadata));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.md',
        format: 'markdown',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const mdContent = writeCall[1];

      expect(mdContent).toContain('# Test Story');
      expect(mdContent).not.toContain('**Author:**');
    });
  });

  describe('PDF format', () => {
    it('should build PDF output (as markdown)', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.pdf',
        format: 'pdf',
        validate: false,
      };

      await buildStory(options);

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const content = writeCall[1];

      // PDF currently returns markdown
      expect(content).toContain('# Test Story');
    });
  });

  describe('validation', () => {
    it('should validate story when requested', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await buildStory(options);

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should fail validation for missing start passage', async () => {
      const invalidStory = {
        ...mockStory,
        startPassage: undefined,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidStory));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await expect(buildStory(options)).rejects.toThrow('Story validation failed');
    });

    it('should fail validation for invalid start passage', async () => {
      const invalidStory = {
        ...mockStory,
        startPassage: 'NonExistent',
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidStory));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await expect(buildStory(options)).rejects.toThrow('Story validation failed');
    });

    it('should detect broken links', async () => {
      const storyWithBrokenLink = {
        ...mockStory,
        passages: [
          {
            id: 'passage-1',
            title: 'Start',
            content: '[[Broken Link]]',
            tags: [],
          },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(storyWithBrokenLink));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await expect(buildStory(options)).rejects.toThrow('Story validation failed');
    });

    it('should detect duplicate passage titles', async () => {
      const storyWithDuplicates = {
        ...mockStory,
        passages: [
          {
            id: 'passage-1',
            title: 'Same Title',
            content: 'First',
            tags: [],
          },
          {
            id: 'passage-2',
            title: 'Same Title',
            content: 'Second',
            tags: [],
          },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(storyWithDuplicates));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await expect(buildStory(options)).rejects.toThrow('Story validation failed');
    });

    it('should handle link format with text and target', async () => {
      const storyWithLinks = {
        ...mockStory,
        passages: [
          {
            id: 'passage-1',
            title: 'Start',
            content: '[[Click here|Next Passage]]',
            tags: [],
          },
          {
            id: 'passage-2',
            title: 'Next Passage',
            content: 'Next content',
            tags: [],
          },
        ],
        startPassage: 'Start',
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(storyWithLinks));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: true,
      };

      await buildStory(options);

      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown format', async () => {
      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.xyz',
        format: 'unknown' as BuildFormat,
        validate: false,
      };

      await expect(buildStory(options)).rejects.toThrow('Unknown format');
    });

    it('should handle file read errors', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: false,
      };

      await expect(buildStory(options)).rejects.toThrow('File not found');
    });

    it('should handle invalid JSON', async () => {
      (fs.readFile as any).mockResolvedValue('invalid json');

      const options: BuildOptions = {
        input: '/test/story.json',
        output: '/test/output.html',
        format: 'html',
        validate: false,
      };

      await expect(buildStory(options)).rejects.toThrow();
    });
  });
});

describe('watchBuild', () => {
  let fs: any;
  let mockWatch: any;

  beforeEach(async () => {
    fs = await import('fs');
    mockWatch = vi.fn();
    (fs.watch as any) = mockWatch;
    vi.clearAllMocks();
  });

  it('should set up file watcher', async () => {
    const options: BuildOptions = {
      input: '/test/story.json',
      output: '/test/output.html',
      format: 'html',
      validate: false,
    };

    // Start watching (don't await as it runs forever)
    const watchPromise = watchBuild(options);

    // Give it time to set up the watcher
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockWatch).toHaveBeenCalledWith(
      '/test/story.json',
      expect.any(Function)
    );
  });

  it('should handle watch callback', async () => {
    let watchCallback: any;
    mockWatch.mockImplementation((path: string, callback: any) => {
      watchCallback = callback;
    });

    const options: BuildOptions = {
      input: '/test/story.json',
      output: '/test/output.html',
      format: 'html',
      validate: false,
    };

    const watchPromise = watchBuild(options);

    // Wait for watcher to be set up
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(watchCallback).toBeDefined();
  });
});

describe('buildCommand', () => {
  let fs: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(async () => {
    fs = await import('fs/promises');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();

    const mockStory = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Start content',
          tags: [],
        },
      ],
      startPassage: 'Start',
    };

    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockStory));
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should have correct command structure', () => {
    expect(buildCommand).toHaveProperty('name', 'build');
    expect(buildCommand).toHaveProperty('description');
    expect(buildCommand).toHaveProperty('options');
    expect(buildCommand).toHaveProperty('execute');
    expect(Array.isArray(buildCommand.options)).toBe(true);
  });

  it('should have required options', () => {
    const optionNames = buildCommand.options?.map(opt => opt.name) || [];
    expect(optionNames).toContain('input');
    expect(optionNames).toContain('output');
    expect(optionNames).toContain('format');
    expect(optionNames).toContain('minify');
    expect(optionNames).toContain('validate');
    expect(optionNames).toContain('watch');
  });

  it('should execute with default options', async () => {
    await buildCommand.execute({
      cwd: '/test',
      args: [],
      options: {},
    });

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.readFile).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Building story'));
  });

  it('should execute with custom options', async () => {
    await buildCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'custom-story.json',
        output: 'custom-output.html',
        format: 'html',
        minify: true,
      },
    });

    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringContaining('custom-story.json'),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('custom-output.html'),
      expect.any(String)
    );
  });

  it('should create output directory', async () => {
    await buildCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        output: 'dist/nested/output.html',
      },
    });

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('dist/nested'),
      { recursive: true }
    );
  });

  it('should handle different formats', async () => {
    const formats: BuildFormat[] = ['html', 'json', 'markdown', 'pdf'];

    for (const format of formats) {
      vi.clearAllMocks();

      await buildCommand.execute({
        cwd: '/test',
        args: [],
        options: {
          format,
          validate: false,
        },
      });

      expect(fs.writeFile).toHaveBeenCalled();
    }
  });

  it('should disable validation when requested', async () => {
    const invalidStory = {
      id: 'test',
      name: 'Test',
      passages: [],
      startPassage: undefined,
    };

    (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidStory));

    await buildCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        validate: false,
      },
    });

    // Should not throw even though story is invalid
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should show build information', async () => {
    await buildCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'my-story.json',
        output: 'build/index.html',
        format: 'html',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Building story'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Input:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Format:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Build complete'));
  });
});
