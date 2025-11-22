/**
 * Tests for CLI Migrate Command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  migrateStory,
  migrateCommand,
  registerMigration,
  detectVersion,
  createBackup,
  validateMigratedStory,
  getMigrationInfo,
  type MigrationVersion,
  type MigrationResult,
  type MigrationFunction,
} from './index.js';
import type { Story } from '@writewhisker/story-models';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
  };
});

describe('detectVersion', () => {
  it('should detect version from story.version field', () => {
    const story = {
      version: '2.0.0',
      name: 'Test',
      passages: [],
    };

    expect(detectVersion(story)).toBe('2.0.0');
  });

  it('should detect version 2.0.0 from metadata', () => {
    const story = {
      name: 'Test',
      passages: [],
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    expect(detectVersion(story)).toBe('2.0.0');
  });

  it('should detect version 1.0.0 from passages array', () => {
    const story = {
      name: 'Test',
      passages: [],
    };

    expect(detectVersion(story)).toBe('1.0.0');
  });

  it('should default to version 1.0.0', () => {
    const story = {};

    expect(detectVersion(story)).toBe('1.0.0');
  });
});

describe('registerMigration', () => {
  it('should register a migration function', () => {
    const migrationFn: MigrationFunction = (story) => ({ ...story, migrated: true });

    expect(() => {
      registerMigration('1.0.0', '2.0.0', migrationFn);
    }).not.toThrow();
  });

  it('should allow multiple migrations to be registered', () => {
    const migration1: MigrationFunction = (story) => story;
    const migration2: MigrationFunction = (story) => story;

    expect(() => {
      registerMigration('2.0.0', '3.0.0', migration1);
      registerMigration('3.0.0', '4.0.0', migration2);
    }).not.toThrow();
  });
});

describe('migrateStory', () => {
  const baseStory = {
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

  it('should return success when already at target version', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('2.0.0');
    expect(result.toVersion).toBe('2.0.0');
    expect(result.changes).toContain('No migration needed');
  });

  it('should migrate from 1.0.0 to 2.0.0', async () => {
    const story = {
      ...baseStory,
      version: '1.0.0',
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('1.0.0');
    expect(result.toVersion).toBe('2.0.0');
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it('should migrate from 2.0.0 to 3.0.0', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '3.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('2.0.0');
    expect(result.toVersion).toBe('3.0.0');
  });

  it('should migrate from 1.0.0 to 3.0.0 through 2.0.0', async () => {
    const story = {
      ...baseStory,
      version: '1.0.0',
    };

    const result = await migrateStory(story, '3.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('1.0.0');
    expect(result.toVersion).toBe('3.0.0');
    expect(result.changes.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle downgrade from 2.0.0 to 1.0.0', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '1.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('2.0.0');
    expect(result.toVersion).toBe('1.0.0');
  });

  it('should handle downgrade from 3.0.0 to 2.0.0', async () => {
    const story = {
      ...baseStory,
      version: '3.0.0',
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe('3.0.0');
    expect(result.toVersion).toBe('2.0.0');
  });

  it('should add metadata in 1.0.0 to 2.0.0 migration', async () => {
    const story = {
      ...baseStory,
      version: '1.0.0',
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.success).toBe(true);
  });

  it('should add passage IDs in 2.0.0 to 3.0.0 migration', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
      passages: [
        {
          title: 'Start',
          content: 'Content',
          tags: [],
        },
      ],
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '3.0.0');

    expect(result.success).toBe(true);
  });

  it('should preserve existing passage IDs', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
      passages: [
        {
          id: 'existing-id',
          title: 'Start',
          content: 'Content',
          tags: [],
        },
      ],
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '3.0.0');

    expect(result.success).toBe(true);
  });

  it('should remove metadata in downgrade to 1.0.0', async () => {
    const story = {
      ...baseStory,
      version: '2.0.0',
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await migrateStory(story, '1.0.0');

    expect(result.success).toBe(true);
  });

  it('should fail for invalid migration path', async () => {
    const story = {
      ...baseStory,
      version: '9.9.9',
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('No migration path found');
  });

  it('should track migration changes', async () => {
    const story = {
      ...baseStory,
      version: '1.0.0',
    };

    const result = await migrateStory(story, '2.0.0');

    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.changes[0]).toContain('1.0.0');
    expect(result.changes[0]).toContain('2.0.0');
  });
});

describe('validateMigratedStory', () => {
  it('should validate a valid story', () => {
    const story: Story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Content',
          tags: [],
        },
      ],
      startPassage: 'Start',
    };

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should fail validation for missing ID', () => {
    const story = {
      name: 'Test Story',
      passages: [],
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Story is missing an ID');
  });

  it('should fail validation for missing name', () => {
    const story = {
      id: 'test-story',
      passages: [],
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Story is missing a name');
  });

  it('should fail validation for missing passages array', () => {
    const story = {
      id: 'test-story',
      name: 'Test Story',
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Story passages must be an array');
  });

  it('should fail validation for passage missing ID', () => {
    const story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          title: 'Start',
          content: 'Content',
          tags: [],
        },
      ],
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing an ID'))).toBe(true);
  });

  it('should fail validation for passage missing title', () => {
    const story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          content: 'Content',
          tags: [],
        },
      ],
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing a title'))).toBe(true);
  });

  it('should fail validation for passage missing content', () => {
    const story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          tags: [],
        },
      ],
      startPassage: 'Start',
    } as any;

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing content'))).toBe(true);
  });

  it('should fail validation for duplicate passage IDs', () => {
    const story: Story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'same-id',
          title: 'First',
          content: 'Content 1',
          tags: [],
        },
        {
          id: 'same-id',
          title: 'Second',
          content: 'Content 2',
          tags: [],
        },
      ],
      startPassage: 'First',
    };

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate passage IDs'))).toBe(true);
  });

  it('should fail validation for duplicate passage titles', () => {
    const story: Story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          title: 'Same Title',
          content: 'Content 1',
          tags: [],
        },
        {
          id: 'passage-2',
          title: 'Same Title',
          content: 'Content 2',
          tags: [],
        },
      ],
      startPassage: 'Same Title',
    };

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate passage titles'))).toBe(true);
  });

  it('should allow passage content to be empty string', () => {
    const story: Story = {
      id: 'test-story',
      name: 'Test Story',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: '',
          tags: [],
        },
      ],
      startPassage: 'Start',
    };

    const result = validateMigratedStory(story);

    expect(result.valid).toBe(true);
  });
});

describe('createBackup', () => {
  let fs: any;

  beforeEach(async () => {
    fs = await import('fs/promises');
    vi.clearAllMocks();
    (fs.copyFile as any).mockResolvedValue(undefined);
  });

  it('should create a backup file', async () => {
    const filePath = '/test/story.json';

    const backupPath = await createBackup(filePath);

    expect(fs.copyFile).toHaveBeenCalledWith(filePath, backupPath);
    expect(backupPath).toContain('story.backup-');
    expect(backupPath).toContain('.json');
  });

  it('should include timestamp in backup filename', async () => {
    const filePath = '/test/story.json';

    const backupPath = await createBackup(filePath);

    expect(backupPath).toMatch(/story\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
  });

  it('should preserve file extension', async () => {
    const filePath = '/test/my-story.whisker';

    const backupPath = await createBackup(filePath);

    expect(backupPath).toContain('.whisker');
  });

  it('should place backup in same directory', async () => {
    const filePath = '/path/to/story.json';

    const backupPath = await createBackup(filePath);

    expect(backupPath).toContain('/path/to/');
  });
});

describe('getMigrationInfo', () => {
  it('should return path and description for direct migration', () => {
    const info = getMigrationInfo('1.0.0', '2.0.0');

    expect(info.path).toEqual(['1.0.0', '2.0.0']);
    expect(info.description).toContain('Direct migration');
    expect(info.description).toContain('1.0.0');
    expect(info.description).toContain('2.0.0');
  });

  it('should return path and description for multi-step migration', () => {
    const info = getMigrationInfo('1.0.0', '3.0.0');

    expect(info.path).toEqual(['1.0.0', '2.0.0', '3.0.0']);
    expect(info.description).toContain('intermediate');
    expect(info.description).toContain('2.0.0');
  });

  it('should handle invalid migration path', () => {
    const info = getMigrationInfo('9.0.0', '2.0.0');

    expect(info.path).toEqual([]);
    expect(info.description).toContain('No migration path available');
  });

  it('should handle downgrade path', () => {
    const info = getMigrationInfo('3.0.0', '1.0.0');

    expect(info.path).toEqual(['3.0.0', '2.0.0', '1.0.0']);
    expect(info.description).toContain('intermediate');
  });

  it('should handle same version', () => {
    const info = getMigrationInfo('2.0.0', '2.0.0');

    expect(info.path).toEqual(['2.0.0']);
    expect(info.description).toBeDefined();
  });
});

describe('migrateCommand', () => {
  let fs: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  const validStory = {
    id: 'test-story',
    name: 'Test Story',
    version: '1.0.0',
    passages: [
      {
        id: 'passage-1',
        title: 'Start',
        content: 'Content',
        tags: [],
      },
    ],
    startPassage: 'Start',
  };

  beforeEach(async () => {
    fs = await import('fs/promises');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.clearAllMocks();

    (fs.readFile as any).mockResolvedValue(JSON.stringify(validStory));
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.copyFile as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should have correct command structure', () => {
    expect(migrateCommand).toHaveProperty('name', 'migrate');
    expect(migrateCommand).toHaveProperty('description');
    expect(migrateCommand).toHaveProperty('options');
    expect(migrateCommand).toHaveProperty('execute');
    expect(Array.isArray(migrateCommand.options)).toBe(true);
  });

  it('should have required options', () => {
    const optionNames = migrateCommand.options?.map(opt => opt.name) || [];
    expect(optionNames).toContain('input');
    expect(optionNames).toContain('output');
    expect(optionNames).toContain('version');
    expect(optionNames).toContain('backup');
    expect(optionNames).toContain('validate');
  });

  it('should execute migration successfully', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(fs.readFile).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Migrating'));
  });

  it('should create backup by default', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(fs.copyFile).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Backup created'));
  });

  it('should skip backup when requested', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
        backup: false,
      },
    });

    expect(fs.copyFile).not.toHaveBeenCalled();
  });

  it('should not create backup when output is different from input', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        output: 'story-v2.json',
        version: '2.0.0',
      },
    });

    expect(fs.copyFile).not.toHaveBeenCalled();
  });

  it('should write to custom output file', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        output: 'migrated.json',
        version: '2.0.0',
      },
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('migrated.json'),
      expect.any(String)
    );
  });

  it('should overwrite input file when no output specified', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('story.json'),
      expect.any(String)
    );
  });

  it('should validate migrated story by default', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Validation passed'));
  });

  it('should skip validation when requested', async () => {
    const invalidStory = {
      name: 'Test',
      passages: [],
    };

    (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidStory));

    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
        validate: false,
      },
    });

    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should fail on validation errors', async () => {
    const invalidStory = {
      version: '1.0.0',
      name: 'Test',
      passages: [
        {
          title: 'Start',
          content: 'Content',
          tags: [],
        },
      ],
    };

    (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidStory));

    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should show migration steps', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Migration steps'));
  });

  it('should show current and target versions', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Current version'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Target version'));
  });

  it('should show migration path description', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '3.0.0',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('intermediate')
    );
  });

  it('should handle migration errors', async () => {
    (fs.readFile as any).mockRejectedValue(new Error('File not found'));

    await expect(
      migrateCommand.execute({
        cwd: '/test',
        args: [],
        options: {
          input: 'story.json',
          version: '2.0.0',
        },
      })
    ).rejects.toThrow('File not found');
  });

  it('should pretty-print JSON output', async () => {
    await migrateCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        input: 'story.json',
        version: '2.0.0',
      },
    });

    const writeCall = (fs.writeFile as any).mock.calls[0];
    const jsonContent = writeCall[1];

    expect(jsonContent).toContain('\n');
    expect(jsonContent).toMatch(/  \"/);
  });
});
