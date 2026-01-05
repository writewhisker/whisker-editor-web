# Import/Export Workflow

Examples of importing stories from other formats and exporting to multiple targets.

## Importing from Twine

```typescript
import { importTwine, detectTwineFormat } from '@writewhisker/import';
import fs from 'fs/promises';

async function importTwineStory(filePath: string) {
  // Read Twine HTML file
  const html = await fs.readFile(filePath, 'utf-8');

  // Detect format (Harlowe, SugarCube, Chapbook)
  const format = detectTwineFormat(html);
  console.log(`Detected format: ${format}`);

  // Import
  const story = importTwine(html);

  console.log(`Imported "${story.metadata.title}"`);
  console.log(`  Passages: ${story.passages.size}`);
  console.log(`  Start: ${story.metadata.startPassage}`);

  return story;
}

// Usage
const story = await importTwineStory('./my-twine-story.html');
```

## Importing from Ink

```typescript
import { importInk } from '@writewhisker/import';
import fs from 'fs/promises';

async function importInkStory(filePath: string) {
  // Read Ink file
  const inkSource = await fs.readFile(filePath, 'utf-8');

  // Import
  const story = importInk(inkSource);

  console.log(`Imported "${story.metadata.title}"`);
  console.log(`  Passages: ${story.passages.size}`);

  // Ink-specific features converted:
  // - Knots → Passages
  // - Stitches → Sub-passages
  // - Diverts → Links
  // - Choices → Whisker choices
  // - Variables → Whisker variables

  return story;
}

// Usage
const story = await importInkStory('./crime-scene.ink');
```

## Importing from ChoiceScript

```typescript
import { importChoiceScript } from '@writewhisker/import';
import fs from 'fs/promises';

async function importChoiceScriptStory(directory: string) {
  // Read startup.txt and other scene files
  const startup = await fs.readFile(`${directory}/startup.txt`, 'utf-8');

  // Import
  const story = importChoiceScript(startup);

  // ChoiceScript features converted:
  // - *label → Passages
  // - *goto → Links
  // - *choice → Whisker choices
  // - *set → Variable assignments
  // - *if/*else → Conditionals

  return story;
}
```

## Exporting to HTML

```typescript
import { exportToHtml } from '@writewhisker/export';
import fs from 'fs/promises';

async function exportHtml(story: Story) {
  const html = exportToHtml(story, {
    template: 'modern',        // or 'minimal', 'classic'
    includeStyles: true,
    selfContained: true,       // Inline all assets
    title: story.metadata.title,
    author: story.metadata.author,
  });

  await fs.writeFile('./output/story.html', html);
  console.log('Exported to story.html');
}
```

## Exporting to Ink

```typescript
import { InkExporter } from '@writewhisker/export';
import fs from 'fs/promises';

async function exportInk(story: Story) {
  const exporter = new InkExporter();

  const inkSource = exporter.export(story, {
    preserveVariables: true,
    convertConditionals: true,
    addComments: true,
  });

  await fs.writeFile('./output/story.ink', inkSource);
  console.log('Exported to story.ink');
}

// Example output:
// === start ===
// You stand at the edge of a dark forest.
// * [Enter the forest] -> forest
// * [Turn back] -> ending_retreat
```

## Exporting to Text

```typescript
import { TextExporter } from '@writewhisker/export';
import fs from 'fs/promises';

async function exportText(story: Story) {
  const exporter = new TextExporter();

  const text = exporter.export(story, {
    format: 'wls',            // WLS syntax
    includeMetadata: true,
    preserveFormatting: true,
  });

  await fs.writeFile('./output/story.ws', text);
  console.log('Exported to story.ws');
}

// Example output:
// :: Start
// You stand at the edge of a dark forest.
// * [Enter the forest] -> Forest
// * [Turn back] -> End
```

## Batch Conversion

```typescript
import { importTwine, detectTwineFormat } from '@writewhisker/import';
import { exportToHtml, InkExporter, TextExporter } from '@writewhisker/export';
import fs from 'fs/promises';
import path from 'path';

async function batchConvert(inputDir: string, outputDir: string) {
  // Find all Twine files
  const files = await fs.readdir(inputDir);
  const twineFiles = files.filter(f => f.endsWith('.html'));

  const inkExporter = new InkExporter();
  const textExporter = new TextExporter();

  for (const file of twineFiles) {
    console.log(`Converting ${file}...`);

    // Import
    const html = await fs.readFile(path.join(inputDir, file), 'utf-8');
    const story = importTwine(html);
    const baseName = path.basename(file, '.html');

    // Export to multiple formats
    await fs.writeFile(
      path.join(outputDir, `${baseName}.ws`),
      textExporter.export(story)
    );

    await fs.writeFile(
      path.join(outputDir, `${baseName}.ink`),
      inkExporter.export(story)
    );

    await fs.writeFile(
      path.join(outputDir, `${baseName}-web.html`),
      exportToHtml(story, { template: 'modern' })
    );

    console.log(`  → ${baseName}.ws, ${baseName}.ink, ${baseName}-web.html`);
  }

  console.log(`Converted ${twineFiles.length} files`);
}

// Usage
await batchConvert('./twine-stories', './converted');
```

## Format Comparison

| Feature | WLS | Twine | Ink | ChoiceScript |
|---------|-----|-------|-----|--------------|
| Passages | `:: Name` | `<tw-passagedata>` | `=== knot ===` | `*label` |
| Choices | `* [text]` | `[[text->link]]` | `* text` | `*choice` |
| Links | `-> Target` | `[[Target]]` | `-> knot` | `*goto` |
| Variables | `$name` | `$name` | `VAR name` | `*create` |
| Conditionals | `{condition}` | `(if:)` | `{ condition }` | `*if` |

## CLI Usage

```bash
# Import from Twine
whisker import ./story.html -o ./story.ws

# Import from Ink
whisker import ./story.ink -o ./story.ws

# Export to HTML
whisker export ./story.ws -f html -o ./story.html

# Export to Ink
whisker export ./story.ws -f ink -o ./story.ink

# Batch convert
whisker batch-convert ./input -o ./output -f ws,html,ink
```

## Migration with Version Upgrade

```typescript
import { importTwine } from '@writewhisker/import';
import { migrateStory } from '@writewhisker/cli-migrate';
import { exportToHtml } from '@writewhisker/export';

async function importAndUpgrade(twineFile: string) {
  // Import from Twine (creates v1.0.0 format)
  const html = await fs.readFile(twineFile, 'utf-8');
  const story = importTwine(html);

  // Upgrade to latest format
  const migrationResult = await migrateStory(story, '2.0.0');

  if (migrationResult.success) {
    console.log('Migration changes:', migrationResult.changes);

    // Export upgraded story
    const output = exportToHtml(story, { template: 'modern' });
    await fs.writeFile('./upgraded-story.html', output);
  }
}
```

## Complete Example

```typescript
import { importTwine } from '@writewhisker/import';
import { exportToHtml, InkExporter, TextExporter } from '@writewhisker/export';
import { StoryPlayer } from '@writewhisker/story-player';
import fs from 'fs/promises';

async function main() {
  // 1. Import from Twine
  console.log('Importing Twine story...');
  const twineHtml = await fs.readFile('./mystery.html', 'utf-8');
  const story = importTwine(twineHtml);
  console.log(`Imported: ${story.metadata.title} (${story.passages.size} passages)`);

  // 2. Preview in player
  console.log('\nPreviewing...');
  const player = new StoryPlayer(story);
  player.start();
  console.log(`Starting passage: ${player.getCurrentPassage().title}`);

  // 3. Export to multiple formats
  console.log('\nExporting...');

  // WLS format
  const textExporter = new TextExporter();
  await fs.writeFile('./output/mystery.ws', textExporter.export(story));
  console.log('  → mystery.ws');

  // Ink format
  const inkExporter = new InkExporter();
  await fs.writeFile('./output/mystery.ink', inkExporter.export(story));
  console.log('  → mystery.ink');

  // Web HTML
  const webHtml = exportToHtml(story, {
    template: 'modern',
    selfContained: true,
  });
  await fs.writeFile('./output/mystery.html', webHtml);
  console.log('  → mystery.html');

  console.log('\nDone!');
}

main().catch(console.error);
```

See the [TypeScript API documentation](../../api/typescript-api.md) for complete API details.
