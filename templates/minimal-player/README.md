# Whisker Minimal Player

A lightweight story player for Whisker interactive fiction. Perfect for embedding stories on websites or distributing standalone story players.

## Features

- ✅ **Minimal Dependencies**: Only core-ts + player-ui + scripting
- ✅ **Small Bundle Size**: < 200KB gzipped
- ✅ **Fast Load Times**: Optimized for quick startup
- ✅ **Story Rendering**: Full support for Whisker story format
- ✅ **Choice Navigation**: Interactive story progression
- ✅ **Lua Scripting**: Execute story scripts
- ✅ **Save/Load**: Built-in save state management
- ✅ **Responsive**: Works on desktop and mobile
- ✅ **Dark Mode**: Automatic theme switching

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

### Load Story from URL

```
http://localhost:5173/?story=https://example.com/my-story.json
```

### Embed in Website

```html
<iframe
  src="https://yoursite.com/player/?story=https://example.com/story.json"
  width="800"
  height="600"
  frameborder="0"
></iframe>
```

### Standalone Distribution

Build and distribute the `dist/` folder with your story:

```bash
npm run build
# Copy dist/ folder
# Add your story.json file
# Serve with any static file server
```

## Dependencies

- **@writewhisker/core-ts**: Story models and core logic
- **@writewhisker/player-ui**: Player UI components
- **@writewhisker/scripting**: Lua script execution
- **svelte**: UI framework

**Total bundle size**: ~180KB gzipped

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

### Player Options

Modify `src/App.svelte` to configure player options:

```svelte
<StoryPlayer
  {story}
  showTitle={true}
  enableSaves={true}
  enableHistory={true}
/>
```

## Deployment

### Static Hosting

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect GitHub repo
- **GitHub Pages**: Copy `dist/` to `gh-pages` branch
- **Cloudflare Pages**: Connect repo or upload

### CDN

For maximum performance, serve from a CDN:

```
https://cdn.example.com/player/
```

## Performance

- **First Load**: < 1s on 3G
- **Bundle Size**: ~180KB gzipped
- **Lighthouse Score**: 95+ performance
- **Time to Interactive**: < 2s

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## License

AGPL-3.0
