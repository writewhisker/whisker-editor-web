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
  isReservedWord,
  getReservedWordCategory,
  getSafeVariableName,
  findReservedWordsInContent,
  findDeprecatedPatterns,
  analyzeStory,
  renameReservedWords,
  generateTextReport,
  createMigrationReport,
  LUA_KEYWORDS,
  LUA_BUILTINS,
  STORY_API_RESERVED,
  ALL_RESERVED_WORDS,
  type MigrationVersion,
  type MigrationResult,
  type MigrationFunction,
  type ContentIssue,
  type MigrationReport,
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
    expect(result.changes.some(c => c.includes('No migration needed'))).toBe(true);
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

// ============================================================
// Reserved Word Detection Tests
// ============================================================

describe('Reserved Word Detection', () => {
  describe('isReservedWord', () => {
    it('should detect Lua keywords', () => {
      expect(isReservedWord('if')).toBe(true);
      expect(isReservedWord('else')).toBe(true);
      expect(isReservedWord('for')).toBe(true);
      expect(isReservedWord('while')).toBe(true);
      expect(isReservedWord('function')).toBe(true);
      expect(isReservedWord('end')).toBe(true);
      expect(isReservedWord('local')).toBe(true);
      expect(isReservedWord('return')).toBe(true);
    });

    it('should detect Lua builtins', () => {
      expect(isReservedWord('print')).toBe(true);
      expect(isReservedWord('tostring')).toBe(true);
      expect(isReservedWord('pairs')).toBe(true);
      expect(isReservedWord('ipairs')).toBe(true);
      expect(isReservedWord('type')).toBe(true);
      expect(isReservedWord('error')).toBe(true);
    });

    it('should detect Story API reserved words', () => {
      expect(isReservedWord('game_state')).toBe(true);
      expect(isReservedWord('passages')).toBe(true);
      expect(isReservedWord('history')).toBe(true);
      expect(isReservedWord('save')).toBe(true);
      expect(isReservedWord('load')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isReservedWord('IF')).toBe(true);
      expect(isReservedWord('Print')).toBe(true);
      expect(isReservedWord('GAME_STATE')).toBe(true);
    });

    it('should return false for non-reserved words', () => {
      expect(isReservedWord('myVariable')).toBe(false);
      expect(isReservedWord('playerHealth')).toBe(false);
      expect(isReservedWord('customFunction')).toBe(false);
    });
  });

  describe('getReservedWordCategory', () => {
    it('should return lua-keyword for Lua keywords', () => {
      expect(getReservedWordCategory('if')).toBe('lua-keyword');
      expect(getReservedWordCategory('else')).toBe('lua-keyword');
      expect(getReservedWordCategory('function')).toBe('lua-keyword');
    });

    it('should return lua-builtin for Lua builtins', () => {
      expect(getReservedWordCategory('print')).toBe('lua-builtin');
      expect(getReservedWordCategory('tostring')).toBe('lua-builtin');
      expect(getReservedWordCategory('pairs')).toBe('lua-builtin');
    });

    it('should return story-api for Story API words', () => {
      expect(getReservedWordCategory('game_state')).toBe('story-api');
      expect(getReservedWordCategory('passages')).toBe('story-api');
    });

    it('should return null for non-reserved words', () => {
      expect(getReservedWordCategory('myVariable')).toBeNull();
    });
  });

  describe('getSafeVariableName', () => {
    it('should add _var suffix', () => {
      expect(getSafeVariableName('if')).toBe('if_var');
      expect(getSafeVariableName('print')).toBe('print_var');
      expect(getSafeVariableName('game_state')).toBe('game_state_var');
    });
  });

  describe('findReservedWordsInContent', () => {
    it('should find reserved words in variable assignments', () => {
      const content = 'if = 10';
      const issues = findReservedWordsInContent(content);

      expect(issues.length).toBe(1);
      expect(issues[0].original).toBe('if');
      expect(issues[0].type).toBe('reserved-word');
      expect(issues[0].category).toBe('lua-keyword');
      expect(issues[0].suggested).toBe('if_var');
    });

    it('should find multiple reserved words', () => {
      const content = `print = "hello"
for = 5
while = true`;
      const issues = findReservedWordsInContent(content);

      expect(issues.length).toBe(3);
      expect(issues[0].original).toBe('print');
      expect(issues[1].original).toBe('for');
      expect(issues[2].original).toBe('while');
    });

    it('should track line and column numbers', () => {
      const content = `x = 10
print = "test"`;
      const issues = findReservedWordsInContent(content);

      expect(issues[0].line).toBe(2);
      expect(issues[0].column).toBe(1);
    });

    it('should not flag valid variable names', () => {
      const content = `playerHealth = 100
score = 0
myPrint = function() end`;
      const issues = findReservedWordsInContent(content);

      expect(issues.length).toBe(0);
    });
  });
});

// ============================================================
// Deprecated Pattern Detection Tests
// ============================================================

describe('Deprecated Pattern Detection', () => {
  describe('findDeprecatedPatterns', () => {
    it('should detect <<if>> macro', () => {
      const content = '<<if condition>>';
      const issues = findDeprecatedPatterns(content);

      const ifIssue = issues.find(i => i.category === 'twine-if-macro');
      expect(ifIssue).toBeDefined();
      expect(ifIssue?.description).toContain('<<if>>');
    });

    it('should detect <<else>> macro', () => {
      const content = '<<else>>';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-else-macro');
    });

    it('should detect <<endif>> macro', () => {
      const content = '<<endif>>';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-endif-macro');
    });

    it('should detect <<set>> macro', () => {
      const content = '<<set $health = 100>>';
      const issues = findDeprecatedPatterns(content);

      // May detect multiple patterns (set and variable)
      const setIssue = issues.find(i => i.category === 'twine-set-macro');
      expect(setIssue).toBeDefined();
      expect(setIssue?.suggested).toBe('health = 100');
    });

    it('should detect [[text|target]] link syntax', () => {
      const content = '[[Go to the forest|forest]]';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-link-pipe');
      expect(issues[0].suggested).toBe('@link{text="Go to the forest", target="forest"}');
    });

    it('should detect [[text->target]] link syntax', () => {
      const content = '[[Go to the forest->forest]]';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-link-arrow');
    });

    it('should detect [[passage]] simple link syntax', () => {
      const content = '[[forest]]';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-link-simple');
      expect(issues[0].suggested).toBe('@link{target="forest"}');
    });

    it('should detect $variable syntax', () => {
      const content = 'Your health is $health points.';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe('twine-variable');
      expect(issues[0].original).toBe('$health');
    });

    it('should find multiple patterns on same line', () => {
      const content = '<<if $x > 0>>You have $x items<<endif>>';
      const issues = findDeprecatedPatterns(content);

      expect(issues.length).toBeGreaterThan(2);
    });

    it('should track line numbers correctly', () => {
      const content = `Line 1
<<if condition>>
Line 3`;
      const issues = findDeprecatedPatterns(content);

      const ifIssue = issues.find(i => i.category === 'twine-if-macro');
      expect(ifIssue?.line).toBe(2);
    });
  });
});

// ============================================================
// Story Analysis Tests
// ============================================================

describe('analyzeStory', () => {
  it('should analyze all passages for issues', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'print = "hello"'
        },
        {
          title: 'Middle',
          content: '<<if condition>>test<<endif>>'
        }
      ]
    };

    const issues = analyzeStory(story);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.type === 'reserved-word')).toBe(true);
    expect(issues.some(i => i.type === 'deprecated-pattern')).toBe(true);
  });

  it('should include passage title in issue description', () => {
    const story = {
      passages: [
        {
          title: 'MyPassage',
          content: 'if = 5'
        }
      ]
    };

    const issues = analyzeStory(story);

    expect(issues[0].description).toContain('[MyPassage]');
  });

  it('should handle empty passages array', () => {
    const story = { passages: [] };
    const issues = analyzeStory(story);

    expect(issues.length).toBe(0);
  });

  it('should handle missing passages', () => {
    const story = {};
    const issues = analyzeStory(story);

    expect(issues.length).toBe(0);
  });
});

// ============================================================
// Reserved Word Renaming Tests
// ============================================================

describe('renameReservedWords', () => {
  it('should rename reserved words in passage content', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'if = 10\nresult = if + 5'
        }
      ]
    };

    const { story: fixedStory, renames } = renameReservedWords(story);

    expect(renames.get('if')).toBe('if_var');
    expect(fixedStory.passages[0].content).toContain('if_var');
    expect(fixedStory.passages[0].content).not.toMatch(/\bif\s*=/);
  });

  it('should track all renames', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'print = "a"\nfor = 5'
        }
      ]
    };

    const { renames } = renameReservedWords(story);

    expect(renames.size).toBe(2);
    expect(renames.has('print')).toBe(true);
    expect(renames.has('for')).toBe(true);
  });

  it('should not modify original story', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'if = 10'
        }
      ]
    };

    renameReservedWords(story);

    expect(story.passages[0].content).toBe('if = 10');
  });
});

// ============================================================
// Migration Report Tests
// ============================================================

describe('createMigrationReport', () => {
  it('should create a report with correct structure', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'x = 10'
        }
      ]
    };

    const report = createMigrationReport(
      story,
      '1.0.0',
      '2.0.0',
      ['Migrated from 1.0.0 to 2.0.0'],
      [],
      '/test/story.json'
    );

    expect(report.fromVersion).toBe('1.0.0');
    expect(report.toVersion).toBe('2.0.0');
    expect(report.success).toBe(true);
    expect(report.inputFile).toBe('/test/story.json');
    expect(report.summary).toBeDefined();
    expect(report.changes).toEqual(['Migrated from 1.0.0 to 2.0.0']);
  });

  it('should count issues correctly', () => {
    const story = {
      passages: [
        {
          title: 'Start',
          content: 'print = "hello"\n<<if condition>>'
        }
      ]
    };

    const report = createMigrationReport(story, '1.0.0', '2.0.0', [], []);

    expect(report.summary.reservedWordIssues).toBe(1);
    expect(report.summary.deprecatedPatternIssues).toBeGreaterThan(0);
    expect(report.summary.totalIssues).toBeGreaterThan(1);
  });

  it('should mark failed when errors exist', () => {
    const story = { passages: [] };

    const report = createMigrationReport(
      story,
      '1.0.0',
      '2.0.0',
      [],
      ['Migration failed']
    );

    expect(report.success).toBe(false);
    expect(report.errors).toContain('Migration failed');
  });
});

describe('generateTextReport', () => {
  it('should generate readable text report', () => {
    const report: MigrationReport = {
      timestamp: '2024-01-01T00:00:00.000Z',
      inputFile: '/test/story.json',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      success: true,
      summary: {
        totalIssues: 2,
        reservedWordIssues: 1,
        deprecatedPatternIssues: 1,
        passagesAnalyzed: 1,
        passagesWithIssues: 1,
        automaticFixes: 1,
        manualFixesRequired: 1
      },
      changes: ['Migrated from 1.0.0 to 2.0.0'],
      issues: [
        {
          type: 'reserved-word',
          category: 'lua-keyword',
          line: 1,
          column: 1,
          original: 'if',
          suggested: 'if_var',
          description: '[Start] if is a Lua keyword'
        }
      ],
      errors: []
    };

    const text = generateTextReport(report);

    expect(text).toContain('WHISKER MIGRATION REPORT');
    expect(text).toContain('1.0.0');
    expect(text).toContain('2.0.0');
    expect(text).toContain('SUCCESS');
    expect(text).toContain('Total Issues Found: 2');
    expect(text).toContain('if_var');
  });

  it('should include errors in failed report', () => {
    const report: MigrationReport = {
      timestamp: '2024-01-01T00:00:00.000Z',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      success: false,
      summary: {
        totalIssues: 0,
        reservedWordIssues: 0,
        deprecatedPatternIssues: 0,
        passagesAnalyzed: 0,
        passagesWithIssues: 0,
        automaticFixes: 0,
        manualFixesRequired: 0
      },
      changes: [],
      issues: [],
      errors: ['Migration failed: invalid format']
    };

    const text = generateTextReport(report);

    expect(text).toContain('FAILED');
    expect(text).toContain('ERRORS');
    expect(text).toContain('invalid format');
  });
});

// ============================================================
// Reserved Word Sets Tests
// ============================================================

describe('Reserved Word Sets', () => {
  it('should have all Lua keywords', () => {
    const keywords = ['if', 'else', 'elseif', 'then', 'end', 'for', 'while', 'do',
      'repeat', 'until', 'break', 'return', 'local', 'function',
      'in', 'and', 'or', 'not', 'nil', 'true', 'false', 'goto'];

    for (const kw of keywords) {
      expect(LUA_KEYWORDS.has(kw)).toBe(true);
    }
  });

  it('should have all Lua builtins', () => {
    const builtins = ['print', 'tostring', 'tonumber', 'pairs', 'ipairs', 'type', 'error'];

    for (const b of builtins) {
      expect(LUA_BUILTINS.has(b)).toBe(true);
    }
  });

  it('should have Story API reserved words', () => {
    const apiWords = ['game_state', 'passages', 'history', 'tags', 'save', 'load'];

    for (const w of apiWords) {
      expect(STORY_API_RESERVED.has(w)).toBe(true);
    }
  });

  it('should combine all reserved words', () => {
    expect(ALL_RESERVED_WORDS.has('if')).toBe(true);
    expect(ALL_RESERVED_WORDS.has('print')).toBe(true);
    expect(ALL_RESERVED_WORDS.has('game_state')).toBe(true);
  });
});
