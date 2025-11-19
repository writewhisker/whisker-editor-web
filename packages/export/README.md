# @writewhisker/export

Export system for Whisker - Convert stories to multiple formats for distribution and publishing.

## Features

- 📄 **JSON Export** - Lossless Whisker native format for backups and sharing
- 🌐 **HTML Export** - Standalone web player with 10 built-in themes
- 📝 **Markdown Export** - Human-readable documentation format
- 🎭 **Twine 2 Export** - Harlowe 3.x compatible format
- 📚 **EPUB Export** - E-book format for readers and apps (EPUB 3.0)
- 🗂️ **Static Site Export** - Multi-page HTML site with navigation
- 🎨 **Theme System** - 10 built-in themes + custom CSS/JS support
- ✅ **Validation Support** - Include validation reports in exports
- 🎯 **Type-Safe** - Full TypeScript support

## Installation

\`\`\`bash
pnpm add @writewhisker/export
\`\`\`

## Quick Start

### Export to HTML

\`\`\`typescript
import { HTMLExporter } from '@writewhisker/export';

const exporter = new HTMLExporter();
const result = await exporter.export({
  story,
  options: {
    theme: 'dark',
    minifyHTML: true,
    customCSS: '/* your styles */',
  }
});

if (result.success) {
  console.log(\`Exported: \${result.filename} (\${result.size} bytes)\`);
  // result.content contains the HTML
} else {
  console.error(\`Export failed: \${result.error}\`);
}
\`\`\`

See [IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md) for complete format documentation.

## Related Documentation

- **[IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md)** - Complete format capabilities
- **[@writewhisker/import](../import/README.md)** - Import stories from various formats  
- **[@writewhisker/core-ts](../core-ts/README.md)** - Core story engine

## License

AGPL-3.0
