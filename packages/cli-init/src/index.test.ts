/**
 * Tests for CLI Init Command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProject, generateStoryFromTemplate, templates, initCommand } from './index.js';
import type { ProjectConfig, TemplateType } from './index.js';
import { vol } from 'memfs';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  };
});

vi.mock('child_process', () => {
  return {
    exec: vi.fn((cmd, opts, callback) => callback(null, { stdout: '', stderr: '' })),
  };
});

describe('templates', () => {
  it('should have all template types defined', () => {
    expect(templates).toHaveProperty('basic');
    expect(templates).toHaveProperty('interactive');
    expect(templates).toHaveProperty('branching');
    expect(templates).toHaveProperty('rpg');
    expect(templates).toHaveProperty('visual-novel');
  });

  it('should have valid template data', () => {
    for (const [key, template] of Object.entries(templates)) {
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('passages');
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(typeof template.passages).toBe('number');
      expect(template.passages).toBeGreaterThan(0);
    }
  });
});

describe('generateStoryFromTemplate', () => {
  it('should generate a basic story', () => {
    const config: ProjectConfig = {
      name: 'Test Story',
      template: 'basic',
      author: 'Test Author',
    };

    const story = generateStoryFromTemplate(config);

    expect(story).toHaveProperty('name', 'Test Story');
    expect(story).toHaveProperty('author', 'Test Author');
    expect(story).toHaveProperty('passages');
    expect(Array.isArray(story.passages)).toBe(true);
    expect(story.passages.length).toBe(templates.basic.passages);
  });

  it('should generate an interactive story', () => {
    const config: ProjectConfig = {
      name: 'Interactive Story',
      template: 'interactive',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.passages.length).toBe(templates.interactive.passages);
  });

  it('should generate a branching story', () => {
    const config: ProjectConfig = {
      name: 'Branching Story',
      template: 'branching',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.passages.length).toBe(templates.branching.passages);
  });

  it('should generate an RPG story', () => {
    const config: ProjectConfig = {
      name: 'RPG Story',
      template: 'rpg',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.passages.length).toBe(templates.rpg.passages);
    expect(story.variables).toBeDefined();
  });

  it('should generate a visual novel', () => {
    const config: ProjectConfig = {
      name: 'Visual Novel',
      template: 'visual-novel',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.passages.length).toBe(templates['visual-novel'].passages);
  });

  it('should include metadata', () => {
    const config: ProjectConfig = {
      name: 'Test Story',
      template: 'basic',
      author: 'Author',
      description: 'Description',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.metadata).toBeDefined();
    expect(story.metadata?.createdAt).toBeDefined();
  });

  it('should set start passage', () => {
    const config: ProjectConfig = {
      name: 'Test Story',
      template: 'basic',
    };

    const story = generateStoryFromTemplate(config);

    expect(story.startPassage).toBeDefined();
    expect(story.passages.some(p => p.title === story.startPassage)).toBe(true);
  });
});

describe('createProject', () => {
  let fs: any;

  beforeEach(async () => {
    fs = await import('fs/promises');
    vi.clearAllMocks();
  });

  it('should create project directory', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
    };

    await createProject(config, '/test/path');

    expect(fs.mkdir).toHaveBeenCalledWith('/test/path', { recursive: true });
  });

  it('should create story.json file', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
    };

    await createProject(config, '/test/path');

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('story.json'),
      expect.stringContaining('Test Project')
    );
  });

  it('should create package.json when TypeScript enabled', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
      typescript: true,
    };

    await createProject(config, '/test/path');

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('package.json'),
      expect.any(String)
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('tsconfig.json'),
      expect.any(String)
    );
  });

  it('should create README file', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
    };

    await createProject(config, '/test/path');

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('README.md'),
      expect.any(String)
    );
  });

  it('should initialize git when requested', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
      git: true,
    };

    await createProject(config, '/test/path');

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.gitignore'),
      expect.any(String)
    );
  });

  it('should not initialize git when not requested', async () => {
    const config: ProjectConfig = {
      name: 'Test Project',
      template: 'basic',
      git: false,
    };

    await createProject(config, '/test/path');

    const calls = (fs.writeFile as any).mock.calls;
    const gitignoreCalls = calls.filter((call: any[]) => call[0].includes('.gitignore'));
    expect(gitignoreCalls.length).toBe(0);
  });
});

describe('initCommand', () => {
  it('should have correct command structure', () => {
    expect(initCommand).toHaveProperty('name', 'init');
    expect(initCommand).toHaveProperty('description');
    expect(initCommand).toHaveProperty('options');
    expect(initCommand).toHaveProperty('execute');
    expect(Array.isArray(initCommand.options)).toBe(true);
  });

  it('should have required options', () => {
    const optionNames = initCommand.options?.map(opt => opt.name) || [];
    expect(optionNames).toContain('template');
    expect(optionNames).toContain('name');
  });

  it('should execute successfully with valid input', async () => {
    const fs = await import('fs/promises');
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommand.execute({
      cwd: '/test',
      args: ['my-project'],
      options: {
        template: 'basic',
        name: 'My Project',
      },
    });

    expect(fs.mkdir).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
});
