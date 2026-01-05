# @writewhisker/cli-migrate API Reference

Migration tools for upgrading Whisker stories between versions, including WLS syntax migration and batch operations.

## Installation

```bash
pnpm add @writewhisker/cli-migrate
```

## Quick Start

### CLI Usage

```bash
# Migrate a story to version 2.0.0
whisker migrate --input story.json --version 2.0.0

# Migrate with backup
whisker migrate -i story.json -v 2.0.0 --backup

# Migrate to different output file
whisker migrate -i old-story.json -o new-story.json -v 2.0.0

# Batch migrate all stories in directory
whisker batch-migrate ./stories --version 2.0.0
```

### Programmatic Usage

```typescript
import {
  migrateStory,
  detectVersion,
  validateMigratedStory,
} from '@writewhisker/cli-migrate';

// Load story
const story = JSON.parse(fs.readFileSync('story.json', 'utf-8'));

// Detect current version
const version = detectVersion(story);
console.log(`Current version: ${version}`);

// Migrate to target version
const result = await migrateStory(story, '2.0.0');

if (result.success) {
  console.log('Migration successful!');
  console.log('Changes:', result.changes);
} else {
  console.error('Migration failed:', result.errors);
}
```

---

## Story Version Migration

Migrate stories between format versions.

### Supported Versions

| Version | Description |
|---------|-------------|
| `1.0.0` | Original format |
| `2.0.0` | Added metadata and timestamps |
| `3.0.0` | Added passage IDs, normalized structure |

### Detecting Version

```typescript
import { detectVersion } from '@writewhisker/cli-migrate';

const story = JSON.parse(storyJson);
const version = detectVersion(story);

console.log(`Story version: ${version}`);
// "1.0.0", "2.0.0", or "3.0.0"
```

### Migrating Stories

```typescript
import { migrateStory, MigrationVersion } from '@writewhisker/cli-migrate';

// Upgrade
const result = await migrateStory(story, '3.0.0');

// Downgrade (also supported)
const result = await migrateStory(story, '1.0.0');
```

### Migration Result

```typescript
interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  errors?: string[];
}

const result = await migrateStory(story, '2.0.0');

if (result.success) {
  console.log(`Migrated from ${result.fromVersion} to ${result.toVersion}`);
  for (const change of result.changes) {
    console.log(`  - ${change}`);
  }
}
```

### Migration Info

```typescript
import { getMigrationInfo } from '@writewhisker/cli-migrate';

const info = getMigrationInfo('1.0.0', '3.0.0');
console.log(info.path);
// ['1.0.0', '2.0.0', '3.0.0']

console.log(info.description);
// "Migration through 1 intermediate version(s): 2.0.0"
```

### Validation

```typescript
import { validateMigratedStory } from '@writewhisker/cli-migrate';

const validation = validateMigratedStory(story);

if (!validation.valid) {
  console.error('Validation errors:');
  for (const error of validation.errors) {
    console.error(`  - ${error}`);
  }
}
```

### Custom Migrations

```typescript
import { registerMigration } from '@writewhisker/cli-migrate';

// Register custom migration
registerMigration('2.0.0', '2.1.0', (story) => {
  return {
    ...story,
    version: '2.1.0',
    metadata: {
      ...story.metadata,
      customField: 'value',
    },
  };
});
```

### Backups

```typescript
import { createBackup } from '@writewhisker/cli-migrate';

// Create backup before migration
const backupPath = await createBackup('./story.json');
console.log(`Backup created: ${backupPath}`);
// "./story.backup-2024-01-04T12-30-00-000Z.json"
```

---

## WLS Content Migration

Migrate WLS (Whisker Language Syntax) content from version 1.0 to 2.0.

### WLS 1.0 vs 2.0 Changes

| Feature | WLS 1.0 | WLS 2.0 |
|---------|---------|---------|
| Variable prefix | `$var` | `$var` (same) |
| Temp variables | `_temp` | `$$temp` |
| Conditionals | `{if}...{endif}` | `{condition}...{/}` |
| Loops | `{for}...{endfor}` | `{@list}...{/@}` |
| Declarations | Inline | `{!declare}` block |

### Migrating WLS Content

```typescript
import {
  migrateWLSContent,
  migratePassage,
  migrateStoryContent,
} from '@writewhisker/cli-migrate';

// Migrate single passage content
const migratedContent = migratePassage(passageContent, {
  convertTempVars: true,
  convertConditionals: true,
  generateDeclarations: true,
});

// Migrate full WLS content
const result = migrateWLSContent(wlsSource, {
  generateDeclarations: true,
  preserveComments: true,
});

console.log(result.content);     // Migrated content
console.log(result.changes);     // List of changes made
console.log(result.suggestions); // Migration suggestions
```

### Migration Options

```typescript
interface WLSMigrationOptions {
  // Convert _temp to $$temp
  convertTempVars?: boolean;

  // Convert {if}...{endif} to {condition}...{/}
  convertConditionals?: boolean;

  // Convert {for}...{endfor} to {@list}...{/@}
  convertLoops?: boolean;

  // Generate {!declare} block
  generateDeclarations?: boolean;

  // Preserve comments during migration
  preserveComments?: boolean;

  // Add migration notes as comments
  addMigrationNotes?: boolean;
}
```

### Migration Result

```typescript
interface WLSMigrationResult {
  content: string;
  changes: WLSMigrationChange[];
  suggestions: WLSMigrationSuggestion[];
  summary: WLSMigrationSummary;
}

interface WLSMigrationChange {
  type: 'tempVar' | 'conditional' | 'loop' | 'declaration';
  line: number;
  original: string;
  migrated: string;
}

interface WLSMigrationSuggestion {
  type: 'review' | 'manual';
  message: string;
  line?: number;
}

interface WLSMigrationSummary {
  totalChanges: number;
  tempVarsConverted: number;
  conditionalsConverted: number;
  loopsConverted: number;
  declarationsGenerated: boolean;
}
```

### Generating Declarations

```typescript
import { generateDeclarations } from '@writewhisker/cli-migrate';

// Extract variables and generate declaration block
const declarations = generateDeclarations(wlsContent);

console.log(declarations);
// {!declare
//   $playerName: string = ""
//   $health: number = 100
//   $inventory: list = []
// !}
```

### Migration Report

```typescript
import { formatMigrationReport } from '@writewhisker/cli-migrate';

const result = migrateWLSContent(source);
const report = formatMigrationReport(result);

console.log(report);
// ╔══════════════════════════════════════╗
// ║        WLS Migration Report          ║
// ╠══════════════════════════════════════╣
// ║ Total Changes: 15                    ║
// ║ Temp Variables: 5                    ║
// ║ Conditionals: 8                      ║
// ║ Loops: 2                             ║
// ║ Declarations: Generated              ║
// ╚══════════════════════════════════════╝
```

---

## Batch Operations

Process multiple stories at once.

### Batch Migration

```typescript
import { batchMigrate } from '@writewhisker/cli-migrate';

const result = await batchMigrate({
  inputDir: './stories',
  outputDir: './migrated',
  targetVersion: '2.0.0',
  createBackups: true,
  stopOnError: false,
  onProgress: (item, index, total) => {
    console.log(`Processing ${index + 1}/${total}: ${item.name}`);
  },
});

console.log(`Processed: ${result.summary.processed}`);
console.log(`Succeeded: ${result.summary.succeeded}`);
console.log(`Failed: ${result.summary.failed}`);
console.log(`Skipped: ${result.summary.skipped}`);
```

### Batch Validation

```typescript
import { batchValidate } from '@writewhisker/cli-migrate';

const result = await batchValidate({
  inputDir: './stories',
  recursive: true,
  filePattern: '*.json',
});

// Get stories with errors
const failed = result.items.filter(i => !i.success);

for (const item of failed) {
  console.log(`${item.name}: ${item.errors.join(', ')}`);
}
```

### Processing Batch

```typescript
import { processBatch, createBatchItems } from '@writewhisker/cli-migrate';

// Create batch items from directory
const items = await createBatchItems('./stories', {
  recursive: true,
  pattern: '*.ws',
});

// Process batch with custom processor
const result = await processBatch(items, {
  processor: async (item) => {
    const content = await fs.readFile(item.path, 'utf-8');
    const migrated = migrateWLSContent(content);
    return {
      success: true,
      output: migrated.content,
      changes: migrated.changes.length,
    };
  },
  concurrency: 4,
  onProgress: (item, index, total) => {
    console.log(`${index + 1}/${total}: ${item.name}`);
  },
});
```

### Batch Options

```typescript
interface BatchOptions {
  // Maximum concurrent operations
  concurrency?: number;

  // Stop on first error
  stopOnError?: boolean;

  // Progress callback
  onProgress?: ProgressCallback;

  // Filter items
  filter?: (item: BatchItem) => boolean;
}

interface BatchMigrateOptions extends BatchOptions {
  inputDir: string;
  outputDir?: string;
  targetVersion: MigrationVersion;
  createBackups?: boolean;
  validate?: boolean;
}

interface BatchValidateOptions extends BatchOptions {
  inputDir: string;
  recursive?: boolean;
  filePattern?: string;
}
```

### Batch Result

```typescript
interface BatchResult {
  items: BatchItemResult[];
  summary: BatchSummary;
  duration: number;
}

interface BatchItemResult {
  item: BatchItem;
  success: boolean;
  output?: string;
  errors?: string[];
  warnings?: string[];
  duration: number;
}

interface BatchSummary {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}
```

### Filtering Results

```typescript
import { filterResults } from '@writewhisker/cli-migrate';

// Get only failed items
const failed = filterResults(result.items, { success: false });

// Get items with warnings
const withWarnings = filterResults(result.items, { hasWarnings: true });

// Get items matching pattern
const chapters = filterResults(result.items, { namePattern: /chapter/ });
```

### Formatting Results

```typescript
import {
  formatBatchSummary,
  formatDetailedResults,
} from '@writewhisker/cli-migrate';

// Summary view
console.log(formatBatchSummary(result.summary));
// ╔════════════════════════════╗
// ║     Batch Processing       ║
// ╠════════════════════════════╣
// ║ Total:     50              ║
// ║ Succeeded: 48              ║
// ║ Failed:    2               ║
// ║ Duration:  1.5s            ║
// ╚════════════════════════════╝

// Detailed view
console.log(formatDetailedResults(result.items));
```

### Progress Bar

```typescript
import { createProgressBar } from '@writewhisker/cli-migrate';

const progressBar = createProgressBar(totalItems);

const result = await processBatch(items, {
  onProgress: (item, index, total) => {
    progressBar.update(index + 1, item.name);
  },
});

progressBar.complete();
```

---

## CLI Commands

### migrate

```bash
whisker migrate [options]

Options:
  -i, --input <file>    Input story file (required)
  -o, --output <file>   Output file (defaults to input)
  -v, --version <ver>   Target version (required)
  -b, --backup          Create backup before migration (default: true)
  --no-backup           Skip backup creation
  --validate            Validate after migration (default: true)
  --no-validate         Skip validation

Examples:
  whisker migrate -i story.json -v 2.0.0
  whisker migrate -i old.json -o new.json -v 3.0.0 --no-backup
```

### batch-migrate

```bash
whisker batch-migrate <directory> [options]

Options:
  -v, --version <ver>   Target version (required)
  -o, --output <dir>    Output directory
  -r, --recursive       Process subdirectories
  -p, --pattern <glob>  File pattern (default: *.json)
  --concurrency <n>     Parallel operations (default: 4)
  --stop-on-error       Stop on first error
  --no-backup           Skip backups

Examples:
  whisker batch-migrate ./stories -v 2.0.0
  whisker batch-migrate ./stories -v 2.0.0 -o ./migrated -r
```

### validate

```bash
whisker validate <file-or-directory> [options]

Options:
  -r, --recursive       Process subdirectories
  -p, --pattern <glob>  File pattern
  --strict              Strict validation mode

Examples:
  whisker validate story.json
  whisker validate ./stories -r
```

---

## Complete Example

```typescript
import {
  detectVersion,
  migrateStory,
  validateMigratedStory,
  createBackup,
  migrateWLSContent,
  batchMigrate,
  formatBatchSummary,
} from '@writewhisker/cli-migrate';
import fs from 'fs/promises';

async function migrateProject() {
  console.log('Starting project migration...\n');

  // 1. Batch migrate JSON story files
  console.log('Migrating story files...');
  const jsonResult = await batchMigrate({
    inputDir: './stories',
    outputDir: './migrated/stories',
    targetVersion: '2.0.0',
    createBackups: true,
    onProgress: (item, i, total) => {
      process.stdout.write(`\r  Processing ${i + 1}/${total}`);
    },
  });
  console.log('\n');
  console.log(formatBatchSummary(jsonResult.summary));

  // 2. Migrate WLS source files
  console.log('\nMigrating WLS source files...');
  const wlsFiles = await fs.readdir('./src');

  for (const file of wlsFiles) {
    if (!file.endsWith('.ws')) continue;

    const content = await fs.readFile(`./src/${file}`, 'utf-8');
    const result = migrateWLSContent(content, {
      convertTempVars: true,
      convertConditionals: true,
      generateDeclarations: true,
    });

    // Create backup
    await fs.copyFile(`./src/${file}`, `./backups/${file}.bak`);

    // Write migrated content
    await fs.writeFile(`./migrated/src/${file}`, result.content);

    console.log(`  ✓ ${file} (${result.summary.totalChanges} changes)`);
  }

  // 3. Validate all migrated files
  console.log('\nValidating migrated files...');
  const migratedFiles = await fs.readdir('./migrated/stories');
  let validCount = 0;

  for (const file of migratedFiles) {
    const content = await fs.readFile(`./migrated/stories/${file}`, 'utf-8');
    const story = JSON.parse(content);
    const validation = validateMigratedStory(story);

    if (validation.valid) {
      validCount++;
    } else {
      console.log(`  ✗ ${file}`);
      for (const error of validation.errors) {
        console.log(`    - ${error}`);
      }
    }
  }

  console.log(`\n✓ ${validCount}/${migratedFiles.length} files valid`);
  console.log('\nMigration complete!');
}

migrateProject().catch(console.error);
```

---

## TypeScript Types

```typescript
import type {
  MigrationVersion,
  MigrationResult,
  MigrationFunction,
  WLSMigrationOptions,
  WLSMigrationResult,
  WLSMigrationChange,
  WLSMigrationSuggestion,
  WLSMigrationSummary,
  BatchItem,
  BatchItemResult,
  BatchSummary,
  BatchResult,
  BatchOptions,
  BatchProcessor,
  BatchMigrateOptions,
  BatchValidateOptions,
  ProgressCallback,
} from '@writewhisker/cli-migrate';
```
