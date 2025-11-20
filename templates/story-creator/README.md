# Whisker Story Creator

A full-featured interactive fiction editor powered by Whisker. Create, edit, and manage complex branching narratives with an intuitive visual interface.

## Features

- ✅ **Full Editor Suite**: Complete story editing environment
- ✅ **Visual Story Map**: Graph-based passage visualization
- ✅ **Passage Editor**: Rich text editing with preview
- ✅ **Lua Scripting**: Advanced logic and variables
- ✅ **Import/Export**: JSON, Twine, Ink formats
- ✅ **Version Control**: Git integration for collaboration
- ✅ **Analytics**: Track player behavior and choices
- ✅ **Publishing**: Export to web, ebook, or standalone
- ✅ **Auto-save**: Never lose your work
- ✅ **Dark Mode**: Comfortable editing experience

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Creating Stories

1. Start with the default "Untitled Story"
2. Edit story metadata (title, author, description)
3. Create passages using the visual editor
4. Link passages with `[[Link text->Target passage]]` syntax
5. Add Lua scripts for variables and logic
6. Preview your story in the built-in player

### Passage Editor

The passage editor supports:

- **Rich text formatting**: Bold, italic, headings
- **Links**: `[[Display->Target]]` or `[[Target]]`
- **Scripting**: Embed Lua code blocks
- **Tags**: Organize passages with tags
- **Position**: Visual layout on story map

### Story Map

The visual story map shows:

- All passages as nodes
- Connections between passages
- Start passage highlighted
- Dead ends and orphaned passages
- Drag-and-drop repositioning

### Scripting

Use Lua for dynamic content:

```lua
-- Variables
player.name = "Alice"
game.score = game.score + 10

-- Conditionals
if player.hasKey then
  print("You unlock the door")
else
  print("The door is locked")
end

-- Functions
function checkInventory()
  return #player.inventory
end
```

## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save story
- **Ctrl/Cmd + N**: New passage
- **Ctrl/Cmd + P**: Preview story
- **Ctrl/Cmd + E**: Export story
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo

## Auto-save

The editor automatically saves to browser localStorage every 30 seconds. Your work is preserved even if you accidentally close the tab.

To disable auto-save, modify `src/App.svelte`:

```typescript
// Comment out the auto-save effect
// $effect(() => {
//   const interval = setInterval(() => { ... }, 30000);
//   return () => clearInterval(interval);
// });
```

## Import/Export

### Import from Twine

```typescript
import { TwineImporter } from '@writewhisker/editor-base';

const importer = new TwineImporter();
const story = await importer.import(twineHTML);
```

### Export to JSON

```typescript
const data = story.serialize();
const json = JSON.stringify(data, null, 2);
// Save or download JSON
```

### Export to HTML

```typescript
import { HTMLExporter } from '@writewhisker/editor-base';

const exporter = new HTMLExporter();
const html = await exporter.export(story);
```

## Customization

### Theme

Edit `src/style.css` to customize colors:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --primary-color: #2196f3;
}
```

### Editor Options

Modify `src/App.svelte` to configure editor behavior:

```svelte
<StoryEditor
  {story}
  showStoryMap={true}
  enableAutoSave={true}
  autoSaveInterval={30000}
  enableVersionControl={true}
/>
```

## Cloud Storage

To enable cloud storage, configure a storage adapter:

```typescript
import { CloudStorageAdapter } from '@writewhisker/editor-base';

const storage = new CloudStorageAdapter({
  provider: 'github', // or 'google', 'dropbox'
  token: 'your-auth-token',
});

await storage.save(story);
```

## Collaboration

Enable real-time collaboration with multiple authors:

```typescript
import { CollaborationManager } from '@writewhisker/editor-base';

const collab = new CollaborationManager({
  storyId: story.id,
  userId: 'user-123',
  websocketUrl: 'wss://your-server.com',
});

await collab.connect();
```

## Publishing

Export your story for distribution:

### Web Player

```bash
npm run build
# Deploy dist/ folder to any static host
```

### Standalone HTML

```typescript
import { HTMLExporter } from '@writewhisker/editor-base';

const exporter = new HTMLExporter({ standalone: true });
const html = await exporter.export(story);
// Single HTML file with embedded player
```

### E-book (EPUB)

```typescript
import { EPUBExporter } from '@writewhisker/editor-base';

const exporter = new EPUBExporter();
const epub = await exporter.export(story);
```

## Deployment

### Static Hosting

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect GitHub repo
- **GitHub Pages**: Copy `dist/` to `gh-pages` branch
- **Cloudflare Pages**: Connect repo or upload

### Desktop App

Package as Electron app:

```bash
npm install electron electron-builder --save-dev
npm run build
electron-builder
```

## Performance

- **First Load**: < 2s on 3G
- **Bundle Size**: ~500KB gzipped
- **Large Stories**: 1000+ passages supported
- **Auto-save**: Minimal performance impact

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### Story won't load

Check browser console for errors. Clear localStorage if corrupted:

```javascript
localStorage.removeItem('whisker-story-draft');
```

### Auto-save not working

Verify localStorage is available and not full:

```javascript
console.log(navigator.storage.estimate());
```

### Export fails

Ensure story is valid:

```typescript
const validation = story.validate();
console.log(validation.errors);
```

## License

AGPL-3.0
