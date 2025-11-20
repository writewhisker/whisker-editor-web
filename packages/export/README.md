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
- 🔧 **Lua Scripting** - Full Lua runtime in HTML exports (via Fengari)
- 💾 **Player Features** - Undo/redo, save/load, auto-save, debug mode
- 🖼️ **Asset Management** - Embed or bundle images, audio, video, fonts
- 📦 **v2.1 Format** - EditorData preservation for advanced workflows

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
    embedAssets: true,        // Embed images, audio, etc.
    enableLuaScripting: true,  // Enable Lua runtime (default: true)
  }
});

if (result.success) {
  console.log(\`Exported: \${result.filename} (\${result.size} bytes)\`);
  // result.content contains the standalone HTML file
} else {
  console.error(\`Export failed: \${result.error}\`);
}
\`\`\`

### Export with v2.1 Format (EditorData Preservation)

\`\`\`typescript
import { WhiskerCoreExporter } from '@writewhisker/export';

const exporter = new WhiskerCoreExporter();
const result = await exporter.export({
  story,
  testScenarios,  // Optional: include test scenarios
  options: {
    whiskerCoreVersion: '2.1',  // Use v2.1 format
    prettyPrint: true,
    stripExtensions: false,     // Keep EditorData
  }
});

// Result includes:
// - Story data (passages, variables, Lua functions)
// - EditorData (test scenarios, playthroughs, UI state)
\`\`\`

See [IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md) for complete format documentation.

## Advanced Features

### Lua Scripting Support

HTML exports now support full Lua scripting capabilities:

\`\`\`typescript
// Stories with Lua functions are automatically detected
const story = {
  luaFunctions: new Map([
    ['checkInventory', {
      id: 'checkInventory',
      name: 'checkInventory',
      code: 'function checkInventory(item) return inventory[item] ~= nil end',
      parameters: ['item'],
      returnType: 'boolean'
    }]
  ]),
  // ... other story data
};

// Export with Lua enabled (default)
const result = await htmlExporter.export({
  story,
  options: {
    enableLuaScripting: true,  // Includes Fengari runtime
  }
});
\`\`\`

**What's supported:**
- ✅ Lua function definitions
- ✅ Choice condition evaluation
- ✅ Passage lifecycle scripts (onEnter/onExit)
- ✅ Story-level scripts
- ✅ Variable access from Lua
- ✅ Lua error handling

### Player Features

HTML exports include a full-featured player:

**Undo/Redo:**
- Configurable history size (default: 50 steps)
- Can be enabled/disabled per story
- Preserves variable state

**Save/Load:**
- Multiple save slots (configurable, default: 3)
- Browser localStorage persistence
- Auto-save support
- Save slot management UI

**Debug Mode:**
- View current passage and variables
- Inspect history
- Log state to console
- Enable via story settings

\`\`\`typescript
// Configure player features in story settings
const story = {
  settings: {
    allowUndo: true,
    maxUndoSteps: 50,
    saveSlots: 3,
    autoSave: true,
    debugMode: false,
  },
  // ... other story data
};
\`\`\`

### Asset Management

Embed or bundle assets in exports:

\`\`\`typescript
// HTML Export - Embed as base64
const htmlResult = await htmlExporter.export({
  story,
  options: {
    embedAssets: true,           // Embed assets
    maxEmbedSize: 1024 * 1024,  // Max 1MB per asset
    assetMode: 'embed',          // 'embed' | 'external'
  }
});

// EPUB Export - Bundle assets
const epubResult = await epubExporter.export({
  story,
  options: {
    // Assets automatically bundled in EPUB
  }
});
\`\`\`

**Asset handling:**
- Images, audio, video, fonts supported
- Base64 embedding for HTML (configurable size limit)
- Bundled files for EPUB (no size limit)
- Warnings for large assets
- Fallback to external URLs if too large

See [IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md) for complete format documentation.

## Related Documentation

- **[IMPORT_EXPORT_MATRIX.md](../../IMPORT_EXPORT_MATRIX.md)** - Complete format capabilities
- **[@writewhisker/import](../import/README.md)** - Import stories from various formats  
- **[@writewhisker/core-ts](../core-ts/README.md)** - Core story engine

## License

AGPL-3.0
