# @writewhisker/export

Export Whisker stories to multiple formats (HTML, Markdown, Twine, and more).

## Installation

```bash
npm install @writewhisker/export
```

## Features

- **HTML Standalone** - Self-contained HTML files with embedded player
- **HTML Template** - Customizable HTML with themes (default, dark, minimal, classic)
- **Markdown** - Documentation-friendly format for version control
- **Twine 2 JSON** - Export to Twine format for compatibility

## Quick Start

### Programmatic API

```typescript
import { StandaloneExporter, TemplateExporter, MarkdownExporter, TwineExporter } from '@writewhisker/export';
import { readFile, writeFile } from 'fs/promises';

// Load your story
const storyJson = await readFile('story.json', 'utf-8');
const story = JSON.parse(storyJson);

// Export as standalone HTML
const standaloneExporter = new StandaloneExporter();
const html = await standaloneExporter.export(story, {
  minify: true,
  includeMetadata: true
});
await writeFile('story.html', html);

// Export with custom theme
const templateExporter = new TemplateExporter();
const themed = await templateExporter.export(story, {
  theme: 'dark',
  customCSS: '.passage { font-family: Georgia; }'
});
await writeFile('story-dark.html', themed);

// Export as Markdown
const markdownExporter = new MarkdownExporter();
const markdown = await markdownExporter.export(story);
await writeFile('story.md', markdown);

// Export to Twine 2 format
const twineExporter = new TwineExporter();
const twine = await twineExporter.export(story, {
  storyFormat: 'sugarcube' // or 'harlowe', 'snowman', 'chapbook'
});
await writeFile('story-twine.json', twine);
```

### CLI Usage

```bash
# Install globally
npm install -g @writewhisker/export

# Export as standalone HTML
whisker-export export story.json -f html-standalone -o story.html

# Export with dark theme
whisker-export export story.json -f html-template -t dark -o story.html

# Export as Markdown
whisker-export export story.json -f markdown -o story.md

# Export to Twine 2 (SugarCube format)
whisker-export export story.json -f twine --twine-format sugarcube -o story.json

# Minify HTML output
whisker-export export story.json -f html-standalone --minify -o story.min.html

# Use custom CSS
whisker-export export story.json -f html-template --css custom.css -o story.html

# List available formats
whisker-export list-formats
```

## Export Formats

### HTML Standalone

Self-contained HTML file with embedded player. Perfect for distribution.

```typescript
const exporter = new StandaloneExporter();
const html = await exporter.export(story, {
  minify: false,           // Minify HTML/CSS/JS
  includeMetadata: true,   // Include story metadata
  customCSS: undefined     // Optional custom CSS
});
```

**Features:**
- Embedded JavaScript player
- All CSS inline
- No external dependencies
- Works offline
- Single file distribution

### HTML Template

Customizable HTML with theme support.

```typescript
const exporter = new TemplateExporter();
const html = await exporter.export(story, {
  theme: 'dark',           // default, dark, minimal, classic
  customCSS: '.passage { font-size: 18px; }',
  includeMetadata: true
});
```

**Available Themes:**
- `default` - Clean, modern theme
- `dark` - Dark mode with high contrast
- `minimal` - Minimalist, distraction-free
- `classic` - Book-style with serif fonts

### Markdown

Documentation format for version control and collaboration.

```typescript
const exporter = new MarkdownExporter();
const markdown = await exporter.export(story, {
  includeMetadata: true,
  includePassageIds: false,
  includeScripts: true,
  includeChoiceLogic: true
});
```

**Output Structure:**
- Table of contents
- Metadata section
- Variables table
- All passages with:
  - Title and content
  - Tags and scripts
  - Choices with conditions

**Use Cases:**
- Version control (Git-friendly)
- Documentation
- Collaboration and review
- Story structure analysis

### Twine 2 JSON

Export to Twine-compatible format.

```typescript
const exporter = new TwineExporter();
const json = await exporter.export(story, {
  storyFormat: 'sugarcube'  // harlowe, sugarcube, snowman, chapbook
});
```

**Story Formats:**
- `harlowe` - Twine 2 default (Harlowe 3.x)
- `sugarcube` - SugarCube 2.x
- `snowman` - Minimal JS format
- `chapbook` - Modern, declarative format

**Conversion Details:**
- Whisker passages → Twine passages
- Whisker choices → Twine links
- Variables preserved (format-specific syntax)
- Conditions → Format-appropriate syntax
- Generates valid IFID

## CLI Reference

### Export Command

```bash
whisker-export export <input> [options]
```

**Options:**
- `-f, --format <format>` - Export format (default: `html-standalone`)
  - `html-standalone` - Self-contained HTML
  - `html-template` - Themed HTML
  - `markdown` - Markdown documentation
  - `twine` - Twine 2 JSON
- `-o, --output <file>` - Output file path
- `-t, --theme <theme>` - Theme for template export (default: `default`)
  - `default`, `dark`, `minimal`, `classic`
- `--minify` - Minify output (HTML only)
- `--no-metadata` - Exclude metadata from export
- `--css <file>` - Custom CSS file (template export only)
- `--twine-format <format>` - Twine story format (default: `harlowe`)
  - `harlowe`, `sugarcube`, `snowman`, `chapbook`

### List Formats Command

```bash
whisker-export list-formats
```

Shows all available export formats, themes, and Twine formats.

## API Reference

### Exporter Interface

All exporters implement this interface:

```typescript
interface Exporter {
  export(story: StoryData, options?: ExportOptions): Promise<string>;
}

interface ExportOptions {
  minify?: boolean;
  includeMetadata?: boolean;
  customCSS?: string;
}
```

### StandaloneExporter

```typescript
class StandaloneExporter implements Exporter {
  export(story: StoryData, options?: ExportOptions): Promise<string>;
}
```

### TemplateExporter

```typescript
interface TemplateExportOptions extends ExportOptions {
  theme?: 'default' | 'dark' | 'minimal' | 'classic';
  template?: string;  // Custom Handlebars template
  helpers?: Record<string, HandlebarsHelperDelegate>;
  templateData?: Record<string, any>;
}

class TemplateExporter implements Exporter {
  export(story: StoryData, options?: TemplateExportOptions): Promise<string>;
}
```

### MarkdownExporter

```typescript
interface MarkdownExportOptions extends ExportOptions {
  includePassageIds?: boolean;
  includeScripts?: boolean;
  includeChoiceLogic?: boolean;
}

class MarkdownExporter implements Exporter {
  export(story: StoryData, options?: MarkdownExportOptions): Promise<string>;
}
```

### TwineExporter

```typescript
interface TwineExportOptions extends ExportOptions {
  storyFormat?: 'harlowe' | 'sugarcube' | 'snowman' | 'chapbook';
}

class TwineExporter implements Exporter {
  export(story: StoryData, options?: TwineExportOptions): Promise<string>;
}
```

## Examples

### Batch Export

Export a story to all formats:

```typescript
import { StandaloneExporter, TemplateExporter, MarkdownExporter, TwineExporter } from '@writewhisker/export';

async function exportAll(story: StoryData, baseName: string) {
  // HTML Standalone
  const standaloneExporter = new StandaloneExporter();
  await writeFile(
    `${baseName}.html`,
    await standaloneExporter.export(story, { minify: true })
  );

  // HTML with each theme
  const templateExporter = new TemplateExporter();
  for (const theme of ['default', 'dark', 'minimal', 'classic']) {
    await writeFile(
      `${baseName}-${theme}.html`,
      await templateExporter.export(story, { theme })
    );
  }

  // Markdown
  const markdownExporter = new MarkdownExporter();
  await writeFile(
    `${baseName}.md`,
    await markdownExporter.export(story)
  );

  // Twine formats
  const twineExporter = new TwineExporter();
  for (const format of ['harlowe', 'sugarcube', 'snowman', 'chapbook']) {
    await writeFile(
      `${baseName}-${format}.json`,
      await twineExporter.export(story, { storyFormat: format })
    );
  }
}
```

### Custom Theme

Create a custom theme:

```typescript
const customCSS = `
  body {
    font-family: 'Courier New', monospace;
    background: #000;
    color: #0f0;
  }
  .passage {
    border: 1px solid #0f0;
    padding: 20px;
  }
  .choice {
    color: #0ff;
    text-decoration: none;
  }
  .choice:hover {
    text-shadow: 0 0 10px #0ff;
  }
`;

const exporter = new TemplateExporter();
const html = await exporter.export(story, {
  theme: 'dark',
  customCSS
});
```

### Publishing Pipeline

Automated publishing workflow:

```bash
#!/bin/bash

# Export for web
whisker-export export story.json -f html-standalone -o dist/index.html --minify

# Export for documentation
whisker-export export story.json -f markdown -o docs/story.md

# Export for Twine users
whisker-export export story.json -f twine --twine-format sugarcube -o exports/story-twine.json

# Create themed versions
whisker-export export story.json -f html-template -t dark -o dist/dark.html
whisker-export export story.json -f html-template -t minimal -o dist/minimal.html
```

## License

AGPL-3.0
