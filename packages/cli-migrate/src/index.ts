/**
 * CLI Migrate Command
 *
 * Migration tools for upgrading Whisker stories between versions.
 */

import type { Command, CommandContext } from './types.js';
import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Migration version
 */
export type MigrationVersion = '1.0.0' | '2.0.0' | '3.0.0';

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors?: string[];
}

/**
 * Migration function
 */
export type MigrationFunction = (story: any) => any;

/**
 * Migration registry
 */
const migrations: Map<string, MigrationFunction> = new Map();

/**
 * Register a migration
 */
export function registerMigration(fromVersion: string, toVersion: string, fn: MigrationFunction): void {
  const key = `${fromVersion}->${toVersion}`;
  migrations.set(key, fn);
}

/**
 * Migrate a story
 */
export async function migrateStory(
  story: any,
  targetVersion: MigrationVersion
): Promise<MigrationResult> {
  const currentVersion = story.version || '1.0.0';
  const changes: string[] = [];
  const errors: string[] = [];

  if (currentVersion === targetVersion) {
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      changes: ['No migration needed - already at target version'],
    };
  }

  let migratedStory = { ...story };

  // Determine migration path
  const path = getMigrationPath(currentVersion, targetVersion);

  if (path.length === 0) {
    return {
      success: false,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      changes: [],
      errors: ['No migration path found'],
    };
  }

  // Execute migrations in order
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const key = `${from}->${to}`;
    const migrationFn = migrations.get(key);

    if (!migrationFn) {
      errors.push(`Missing migration: ${key}`);
      continue;
    }

    try {
      migratedStory = migrationFn(migratedStory);
      changes.push(`Migrated from ${from} to ${to}`);
    } catch (error) {
      errors.push(`Migration ${key} failed: ${error}`);
    }
  }

  return {
    success: errors.length === 0,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    changes,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Get migration path between versions
 */
function getMigrationPath(from: string, to: string): string[] {
  // Simple linear path for now
  const versions = ['1.0.0', '2.0.0', '3.0.0'];
  const fromIndex = versions.indexOf(from);
  const toIndex = versions.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return [];
  }

  if (fromIndex < toIndex) {
    return versions.slice(fromIndex, toIndex + 1);
  } else {
    return versions.slice(toIndex, fromIndex + 1).reverse();
  }
}

/**
 * Detect story version
 */
export function detectVersion(story: any): string {
  if (story.version) {
    return story.version;
  }

  // Detect based on structure
  if (story.metadata?.createdAt) {
    return '2.0.0';
  }

  if (story.passages && Array.isArray(story.passages)) {
    return '1.0.0';
  }

  return '1.0.0';
}

/**
 * Create a backup of a story
 */
export async function createBackup(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

  await fs.copyFile(filePath, backupPath);

  return backupPath;
}

// Register built-in migrations

/**
 * Migration 1.0.0 -> 2.0.0
 * Adds metadata and timestamps
 */
registerMigration('1.0.0', '2.0.0', (story: any) => {
  const now = new Date().toISOString();

  return {
    ...story,
    version: '2.0.0',
    metadata: {
      ...story.metadata,
      createdAt: story.metadata?.createdAt || now,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '1.0.0',
    },
  };
});

/**
 * Migration 2.0.0 -> 3.0.0
 * Adds passage IDs and normalizes structure
 */
registerMigration('2.0.0', '3.0.0', (story: any) => {
  const now = new Date().toISOString();

  // Generate IDs for passages that don't have them
  const passages = story.passages.map((passage: any, index: number) => {
    if (!passage.id) {
      return {
        ...passage,
        id: `passage-${Date.now()}-${index}`,
      };
    }
    return passage;
  });

  return {
    ...story,
    version: '3.0.0',
    passages,
    metadata: {
      ...story.metadata,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '2.0.0',
    },
  };
});

/**
 * Migration 3.0.0 -> 2.0.0 (downgrade)
 */
registerMigration('3.0.0', '2.0.0', (story: any) => {
  const now = new Date().toISOString();

  return {
    ...story,
    version: '2.0.0',
    metadata: {
      ...story.metadata,
      updatedAt: now,
      migratedAt: now,
      migratedFrom: '3.0.0',
    },
  };
});

/**
 * Migration 2.0.0 -> 1.0.0 (downgrade)
 */
registerMigration('2.0.0', '1.0.0', (story: any) => {
  const { metadata, ...rest } = story;

  return {
    ...rest,
    version: '1.0.0',
  };
});

/**
 * Validate migrated story
 */
export function validateMigratedStory(story: Story): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!story.metadata?.title) {
    errors.push('Story is missing a title in metadata');
  }

  if (!story.passages || !(story.passages instanceof Map)) {
    errors.push('Story passages must be a Map');
  }

  if (story.passages instanceof Map) {
    const passages = Array.from(story.passages.values());

    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      if (!passage.id) {
        errors.push(`Passage ${i} is missing an ID`);
      }

      if (!passage.title) {
        errors.push(`Passage ${i} is missing a title`);
      }

      if (passage.content === undefined) {
        errors.push(`Passage ${i} is missing content`);
      }
    }

    // Check for duplicate titles
    const titles = passages.map(p => p.title);
    const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index);
    if (duplicateTitles.length > 0) {
      errors.push(`Duplicate passage titles: ${Array.from(new Set(duplicateTitles)).join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get migration info
 */
export function getMigrationInfo(fromVersion: string, toVersion: string): {
  path: string[];
  description: string;
} {
  const path = getMigrationPath(fromVersion, toVersion);

  let description = '';

  if (path.length === 0) {
    description = 'No migration path available';
  } else if (path.length === 2) {
    description = `Direct migration from ${fromVersion} to ${toVersion}`;
  } else {
    description = `Migration through ${path.length - 2} intermediate version(s): ${path.slice(1, -1).join(' -> ')}`;
  }

  return { path, description };
}

/**
 * Migrate command
 */
export const migrateCommand: Command = {
  name: 'migrate',
  description: 'Migrate a Whisker story to a different version',
  options: [
    {
      name: 'input',
      alias: 'i',
      description: 'Input story file',
      type: 'string',
      required: true,
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output file (defaults to overwriting input)',
      type: 'string',
    },
    {
      name: 'version',
      alias: 'v',
      description: 'Target version (1.0.0, 2.0.0, 3.0.0)',
      type: 'string',
      required: true,
    },
    {
      name: 'backup',
      alias: 'b',
      description: 'Create backup before migration',
      type: 'boolean',
      default: true,
    },
    {
      name: 'validate',
      description: 'Validate migrated story',
      type: 'boolean',
      default: true,
    },
  ],
  execute: async (context: CommandContext) => {
    const { options, cwd } = context;
    const path = await import('path');
    const fs = await import('fs/promises');

    const inputPath = path.resolve(cwd, options.input);
    const outputPath = options.output ? path.resolve(cwd, options.output) : inputPath;
    const targetVersion = options.version as MigrationVersion;

    console.log('Migrating story...');
    console.log(`  Input: ${inputPath}`);
    console.log(`  Target version: ${targetVersion}`);
    console.log('');

    // Read story
    const storyContent = await fs.readFile(inputPath, 'utf-8');
    const story = JSON.parse(storyContent);

    // Detect current version
    const currentVersion = detectVersion(story);
    console.log(`  Current version: ${currentVersion}`);

    // Get migration info
    const info = getMigrationInfo(currentVersion, targetVersion);
    console.log(`  ${info.description}`);
    console.log('');

    // Create backup if requested
    if (options.backup !== false && outputPath === inputPath) {
      const backupPath = await createBackup(inputPath);
      console.log(`✓ Backup created: ${backupPath}`);
      console.log('');
    }

    // Perform migration
    const result = await migrateStory(story, targetVersion);

    if (!result.success) {
      console.error('✗ Migration failed:');
      if (result.errors) {
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }
      process.exit(1);
    }

    console.log('Migration steps:');
    for (const change of result.changes) {
      console.log(`  ✓ ${change}`);
    }
    console.log('');

    // Validate if requested
    if (options.validate !== false) {
      const validation = validateMigratedStory(story);
      if (!validation.valid) {
        console.error('✗ Validation failed:');
        for (const error of validation.errors) {
          console.error(`  - ${error}`);
        }
        process.exit(1);
      }
      console.log('✓ Validation passed');
      console.log('');
    }

    // Write output
    await fs.writeFile(outputPath, JSON.stringify(story, null, 2));
    console.log(`✓ Migration complete: ${outputPath}`);
  },
};

// WLS Content Migration (WLS 1.0 to 2.0)
export {
  migrateWLSContent,
  migratePassage,
  migrateStoryContent,
  generateDeclarations,
  formatMigrationReport,
  type WLSMigrationOptions,
  type WLSMigrationResult,
  type WLSMigrationChange,
  type WLSMigrationSuggestion,
  type WLSMigrationSummary,
} from './wlsMigration.js';

// Batch Operations
export {
  processBatch,
  createBatchItems,
  filterResults,
  formatBatchSummary,
  formatDetailedResults,
  createProgressBar,
  batchMigrate,
  batchValidate,
  type BatchItem,
  type BatchItemResult,
  type BatchSummary,
  type BatchResult,
  type ProgressCallback,
  type BatchOptions,
  type BatchProcessor,
  type BatchMigrateOptions,
  type BatchValidateOptions,
} from './batchOperations.js';
