# Whisker Application Templates

This directory contains application templates that demonstrate how to build different types of applications using the Whisker packages.

## Available Templates

### 1. Minimal Player

**Location**: `templates/minimal-player/`

**Purpose**: Lightweight story player for embedding stories on websites or distributing standalone players.

**Dependencies**:
- `@writewhisker/core-ts` - Story models and core logic
- `@writewhisker/player-ui` - Player UI components
- `@writewhisker/scripting` - Lua script execution

**Bundle Size**: ~180KB gzipped

**Use Cases**:
- Embed stories on websites
- Distribute standalone story players
- Lightweight web hosting
- Mobile-friendly story delivery

**Quick Start**:
```bash
cd templates/minimal-player
npm install
npm run dev
```

**Features**:
- Story rendering with choice navigation
- Lua scripting support
- Save/load functionality
- Responsive design
- Dark mode support

---

### 2. Story Creator

**Location**: `templates/story-creator/`

**Purpose**: Full-featured interactive fiction editor with visual story mapping and advanced editing capabilities.

**Dependencies**:
- `@writewhisker/editor-base` - Complete editor suite (includes all packages)

**Bundle Size**: ~500KB gzipped

**Use Cases**:
- Create and edit interactive fiction
- Visual story mapping
- Collaborative story writing
- Professional authoring tool

**Quick Start**:
```bash
cd templates/story-creator
npm install
npm run dev
```

**Features**:
- Visual story map with drag-and-drop
- Rich text passage editor
- Lua scripting with syntax highlighting
- Import/export (JSON, Twine, Ink)
- Version control integration
- Auto-save to localStorage
- Collaboration tools
- Publishing workflow

---

### 3. Analytics Dashboard

**Location**: `templates/analytics-dashboard/`

**Purpose**: Track player behavior, measure story performance, and gain insights into reader engagement.

**Dependencies**:
- `@writewhisker/core-ts` - Story models
- `@writewhisker/analytics` - Analytics tracking and aggregation

**Bundle Size**: ~250KB gzipped

**Use Cases**:
- Track player behavior
- Measure story performance
- Analyze passage engagement
- A/B testing story variants
- Optimize story flow

**Quick Start**:
```bash
cd templates/analytics-dashboard
npm install
npm run dev
```

**Features**:
- Session metrics (completion rate, playtime)
- Passage analytics (views, time spent, exit rate)
- Custom event tracking
- Visual reports and charts
- Data export (CSV, JSON)
- Real-time tracking
- Privacy-focused (GDPR compliant)

---

### 4. Publishing Tool

**Location**: `templates/publishing-tool/`

**Purpose**: Publish and distribute stories to multiple platforms including web, itch.io, GitHub Pages, and e-book formats.

**Dependencies**:
- `@writewhisker/core-ts` - Story models
- `@writewhisker/export` - Export functionality
- `@writewhisker/publishing` - Publishing management

**Bundle Size**: ~300KB gzipped

**Use Cases**:
- Multi-platform publishing
- Format conversion
- Automated deployment
- Version management
- Distribution optimization

**Quick Start**:
```bash
cd templates/publishing-tool
npm install
npm run dev
```

**Features**:
- Multiple publishing targets (Web, itch.io, GitHub Pages, EPUB)
- One-click publishing
- Format conversion (HTML, JSON, EPUB)
- Minification and optimization
- Analytics integration
- Custom themes
- Batch publishing
- CI/CD integration

---

## Architecture

The templates demonstrate the modular architecture of Whisker packages:

```
┌─────────────────────┐
│   editor-base       │  ← Story Creator (full editor)
│  (re-exports all)   │
└─────────────────────┘
         ↓
    ┌────┴────┬────────────┬──────────┐
    ↓         ↓            ↓          ↓
┌────────┐ ┌──────┐ ┌───────────┐ ┌──────────┐
│core-ts │ │player│ │analytics  │ │publishing│
└────────┘ └──────┘ └───────────┘ └──────────┘
    ↑         ↑            ↑            ↑
    │         │            │            │
Minimal    Player     Analytics    Publishing
Player     UI         Dashboard      Tool
```

### Package Modularity

Each template uses only the packages it needs:

1. **Minimal Player**: Core + Player + Scripting
   - Smallest bundle size
   - Fast load times
   - Essential features only

2. **Story Creator**: Editor-base (all packages)
   - Complete editing environment
   - All features available
   - Maximum functionality

3. **Analytics Dashboard**: Core + Analytics
   - Focused on data visualization
   - Tracking and aggregation
   - Minimal overhead

4. **Publishing Tool**: Core + Export + Publishing
   - Multi-format export
   - Platform integrations
   - Deployment automation

---

## Using Templates

### Create New Project

Copy a template to start a new project:

```bash
# Copy template
cp -r templates/minimal-player my-story-player
cd my-story-player

# Install dependencies
npm install

# Start development
npm run dev
```

### Customize Template

Each template is designed to be customized:

1. **Update package.json**: Change name, version, description
2. **Modify styles**: Edit `src/style.css`
3. **Customize UI**: Edit `src/App.svelte`
4. **Add features**: Import additional Whisker packages
5. **Configure build**: Edit `vite.config.ts`

### Mix and Match Packages

Templates can be extended with additional packages:

```bash
# Add analytics to minimal player
cd templates/minimal-player
npm install @writewhisker/analytics

# Add export functionality to story creator
cd templates/story-creator
npm install @writewhisker/export
```

Then import in your code:

```typescript
import { AnalyticsTracker } from '@writewhisker/analytics';
import { HTMLExporter } from '@writewhisker/export';
```

---

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
# Install dependencies for all templates
pnpm install

# Or install for specific template
cd templates/minimal-player
npm install
```

### Build

```bash
# Build specific template
cd templates/minimal-player
npm run build

# Output in dist/ folder
```

### Preview

```bash
# Preview production build
npm run preview
```

---

## Deployment

### Static Hosting

All templates can be deployed to static hosts:

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect GitHub repo
- **GitHub Pages**: Copy `dist/` to `gh-pages` branch
- **Cloudflare Pages**: Connect repo or upload

### Configuration

Each template includes a `vite.config.ts` for build configuration:

```typescript
export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
  },
});
```

---

## Browser Support

All templates support:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

---

## Performance

Bundle sizes (gzipped):

| Template | Size | Load Time (3G) |
|----------|------|----------------|
| Minimal Player | ~180KB | < 1s |
| Story Creator | ~500KB | < 2s |
| Analytics Dashboard | ~250KB | < 1s |
| Publishing Tool | ~300KB | < 1.5s |

---

## License

All templates are licensed under AGPL-3.0.

---

## Contributing

To add a new template:

1. Create directory in `templates/`
2. Add package.json with dependencies
3. Create src/ with main.ts and App.svelte
4. Add README.md with documentation
5. Update this file with template information

---

## Support

For issues or questions:

- GitHub Issues: https://github.com/writewhisker/whisker-editor-web/issues
- Documentation: See individual template READMEs
