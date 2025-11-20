# Whisker Publishing Tool

Publish and distribute your interactive fiction to multiple platforms including web, itch.io, GitHub Pages, and e-book formats.

## Features

- ✅ **Multiple Targets**: Web, itch.io, GitHub Pages, EPUB
- ✅ **One-Click Publishing**: Automated build and deployment
- ✅ **Format Conversion**: Export to HTML, JSON, EPUB, PDF
- ✅ **Optimization**: Minification and bundling
- ✅ **Analytics Integration**: Optional player tracking
- ✅ **Version Management**: Track published versions
- ✅ **Custom Themes**: Apply themes to published stories
- ✅ **Standalone Files**: Self-contained distributions
- ✅ **Batch Publishing**: Publish to multiple platforms at once

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Publish story (CLI)
npm run publish -- --target web --story story.json
```

## Usage

### Web Interface

1. Load your story (via URL parameter or file upload)
2. Select publishing target (Web, itch.io, GitHub Pages, EPUB)
3. Configure options (minify, analytics, standalone)
4. Click "Publish" to build and download

```
http://localhost:5173/?story=https://example.com/story.json
```

### Command Line

```bash
# Publish to web
npm run publish -- --target web --story story.json --output dist/

# Publish to itch.io
npm run publish -- --target itch --story story.json --api-key YOUR_KEY

# Publish to GitHub Pages
npm run publish -- --target github --story story.json --repo username/repo

# Export to EPUB
npm run publish -- --target epub --story story.json --output story.epub
```

## Publishing Targets

### Web Player

Standalone HTML file for web hosting:

```typescript
import { PublishingManager } from '@writewhisker/publishing';

const manager = new PublishingManager();
const result = await manager.publish(story, {
  target: 'web',
  minify: true,
  standalone: true,
  includeAnalytics: true,
});

// Download result.data as HTML file
```

**Output**: Single HTML file with embedded player, story, and assets

**Best for**: Personal websites, portfolios, file sharing

### itch.io

Upload directly to itch.io marketplace:

```typescript
const result = await manager.publish(story, {
  target: 'itch',
  apiKey: 'your-api-key',
  gameId: 'your-game-id',
  channel: 'html',
});
```

**Requirements**: itch.io account, API key, game created on itch.io

**Best for**: Indie game distribution, monetization, community

### GitHub Pages

Deploy to GitHub Pages:

```typescript
const result = await manager.publish(story, {
  target: 'github',
  repository: 'username/repo',
  branch: 'gh-pages',
  token: 'github-token',
});
```

**Requirements**: GitHub account, repository, personal access token

**Best for**: Free hosting, version control, open source projects

### EPUB

E-book format for e-readers:

```typescript
const result = await manager.publish(story, {
  target: 'epub',
  includeImages: true,
  includeFonts: false,
});
```

**Output**: EPUB file compatible with Kindle, Kobo, Apple Books

**Best for**: E-reader distribution, Amazon Kindle, book stores

## Publishing Options

### Minification

Reduce file size by removing whitespace and comments:

```typescript
{
  minify: true, // Enable minification
  removeComments: true, // Remove HTML comments
  collapseWhitespace: true, // Remove extra whitespace
}
```

**Savings**: 30-50% smaller file size

### Analytics

Include player tracking:

```typescript
{
  includeAnalytics: true,
  analyticsEndpoint: 'https://api.example.com/analytics',
  anonymize: true,
}
```

**Features**: Session tracking, passage views, choice analytics

### Standalone

Create self-contained files:

```typescript
{
  standalone: true, // Embed all dependencies
  inlineAssets: true, // Inline CSS/JS
  embedImages: true, // Base64 encode images
}
```

**Result**: Single file with no external dependencies

## Version Management

Track published versions:

```typescript
import { VersionManager } from '@writewhisker/publishing';

const versions = new VersionManager();

// Create new version
const version = await versions.create(story, {
  version: '1.0.0',
  changelog: 'Initial release',
  target: 'web',
});

// List versions
const all = versions.list(story.id);

// Get specific version
const v1 = versions.get(story.id, '1.0.0');

// Rollback to previous version
await versions.rollback(story.id, '0.9.0');
```

## Custom Themes

Apply themes to published stories:

```typescript
import { ThemeManager } from '@writewhisker/publishing';

const themes = new ThemeManager();

// Use built-in theme
await manager.publish(story, {
  target: 'web',
  theme: 'dark',
});

// Use custom theme
const customTheme = {
  colors: {
    background: '#1a1a1a',
    text: '#e0e0e0',
    primary: '#2196f3',
  },
  fonts: {
    body: 'Georgia, serif',
    heading: 'Arial, sans-serif',
  },
};

await manager.publish(story, {
  target: 'web',
  customTheme,
});
```

**Built-in themes**: light, dark, sepia, high-contrast

## Batch Publishing

Publish to multiple platforms at once:

```typescript
import { BatchPublisher } from '@writewhisker/publishing';

const batch = new BatchPublisher();

const results = await batch.publishAll(story, [
  { target: 'web', output: 'dist/web/' },
  { target: 'itch', apiKey: 'key', gameId: 'id' },
  { target: 'github', repository: 'user/repo', token: 'token' },
]);

results.forEach((result) => {
  console.log(`${result.target}: ${result.success ? 'Success' : 'Failed'}`);
});
```

## CI/CD Integration

Automate publishing with GitHub Actions:

```yaml
name: Publish Story

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run publish -- --target web --story story.json
      - uses: actions/upload-artifact@v3
        with:
          name: story
          path: dist/
```

## Custom Exporters

Create custom export formats:

```typescript
import { BaseExporter } from '@writewhisker/export';

class CustomExporter extends BaseExporter {
  async export(story: Story): Promise<string> {
    // Custom export logic
    return customFormat;
  }
}

const exporter = new CustomExporter();
const output = await exporter.export(story);
```

## Platform-Specific Features

### itch.io

- Automatic pricing updates
- Early access releases
- Beta builds
- Download keys management

### GitHub Pages

- Custom domain support
- HTTPS by default
- Automatic deployments
- Branch protection

### EPUB

- Table of contents
- Chapter navigation
- Metadata embedding
- Cover image support

## Optimization

### Performance

- Code splitting for large stories
- Lazy loading for images
- Service worker caching
- Preloading critical assets

### SEO

- Meta tags for social sharing
- Structured data markup
- Sitemap generation
- robots.txt configuration

### Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast modes

## Troubleshooting

### Publishing fails

Check API credentials and permissions:

```typescript
const manager = new PublishingManager({ debug: true });
// Detailed error logs
```

### Large file size

Enable compression and minification:

```typescript
{
  minify: true,
  compress: 'gzip',
  removeUnused: true,
}
```

### itch.io upload error

Verify API key and game ID:

```bash
curl -H "Authorization: Bearer YOUR_KEY" https://itch.io/api/1/YOUR_USER/games
```

### GitHub Pages 404

Check repository settings and branch:

```bash
git push origin gh-pages
# Verify branch exists and contains index.html
```

## Security

- API keys stored securely
- HTTPS-only deployments
- Content Security Policy
- XSS protection

## License

AGPL-3.0
