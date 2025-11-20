# Whisker Examples

This directory contains example applications demonstrating different ways to use Whisker packages.

## Available Examples

### 1. [Minimal Player](./minimal-player/)
A lightweight, standalone story player using only essential packages.

**Stack**: Vanilla HTML/JS + Vite
**Packages**: `@writewhisker/core-ts`, `@writewhisker/player-ui`
**Bundle**: ~150KB gzipped
**Use Case**: Embed stories on websites, distribute standalone players

### 2. [Full Editor](./full-editor/)
Complete story authoring environment with visual editor and all features.

**Stack**: Svelte 5 + Vite
**Packages**: `@writewhisker/editor-base` (all packages)
**Bundle**: ~800KB gzipped
**Use Case**: Professional authoring tool, desktop application

### 3. [Analytics Dashboard](./analytics-dashboard/)
Real-time analytics viewer for tracking player behavior.

**Stack**: React + Recharts + Vite
**Packages**: `@writewhisker/core-ts`, `@writewhisker/analytics`
**Bundle**: ~300KB gzipped
**Use Case**: Monitor story performance, A/B testing

### 4. [CLI Tools](./cli-tools/)
Command-line tools for publishing, validation, and automation.

**Stack**: Node.js + Commander
**Packages**: `@writewhisker/publishing`, `@writewhisker/validation`, `@writewhisker/export`
**Use Case**: CI/CD pipelines, batch operations, automation

### 5. [Embedded Player](./embedded-player/)
Embeddable web component for integrating stories anywhere.

**Stack**: Web Components + Lit
**Packages**: `@writewhisker/core-ts`, `@writewhisker/player-ui`
**Bundle**: ~120KB gzipped
**Use Case**: Embed in any website, CMS integration, no framework required

## Quick Start

Each example includes:
- Complete source code
- `package.json` with dependencies
- Build configuration
- Development server setup
- Deployment guide
- Live demo link

### Running an Example

```bash
# Navigate to example
cd examples/minimal-player

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Example Applications                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Minimal      │ Full Editor  │ Analytics    │ CLI Tools      │
│ Player       │              │ Dashboard    │                │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ core-ts      │ editor-base  │ core-ts      │ publishing     │
│ player-ui    │ (all)        │ analytics    │ validation     │
│              │              │              │ export         │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## Bundle Size Comparison

| Example | Size (gzipped) | Load Time (3G) | Packages |
|---------|----------------|----------------|----------|
| Embedded Player | 120KB | < 1s | 2 |
| Minimal Player | 150KB | < 1s | 2 |
| Analytics Dashboard | 300KB | < 1.5s | 2 |
| Full Editor | 800KB | < 3s | 10+ |
| CLI Tools | N/A (Node.js) | N/A | 3 |

## Use Case Guide

### When to Use Each Example

**Minimal Player**:
- Distributing finished stories
- Embedding on blogs/websites
- Mobile-optimized reading experience
- Offline-capable PWAs

**Full Editor**:
- Professional story authoring
- Visual story mapping
- Collaboration workflows
- Desktop applications (Electron)

**Analytics Dashboard**:
- Track player behavior
- Measure story performance
- A/B test story variants
- Monitor engagement metrics

**CLI Tools**:
- Automated publishing workflows
- CI/CD integration
- Batch story validation
- Multi-platform deployment

**Embedded Player**:
- CMS integration (WordPress, etc.)
- Framework-agnostic embedding
- Third-party websites
- Legacy application integration

## Technology Choices

### Minimal Player: Vanilla JS + Vite
- **Why**: Smallest bundle size, fastest load time
- **Tradeoff**: Less structure than frameworks
- **Best for**: Performance-critical applications

### Full Editor: Svelte 5
- **Why**: Reactive, compiler-based, excellent DX
- **Tradeoff**: Learning curve for Svelte-specific patterns
- **Best for**: Complex interactive UIs

### Analytics Dashboard: React
- **Why**: Large ecosystem, many charting libraries
- **Tradeoff**: Larger bundle size than alternatives
- **Best for**: Data visualization applications

### CLI Tools: Node.js
- **Why**: Direct file system access, npm ecosystem
- **Tradeoff**: Not browser-compatible
- **Best for**: Server-side automation

### Embedded Player: Web Components
- **Why**: Framework-agnostic, native browser support
- **Tradeoff**: More verbose than frameworks
- **Best for**: Maximum compatibility

## Development Workflow

### Local Development

```bash
# Install all examples' dependencies
pnpm install

# Run specific example
pnpm --filter minimal-player run dev

# Build specific example
pnpm --filter minimal-player run build

# Run all examples in parallel
pnpm run dev
```

### Testing

```bash
# Unit tests
pnpm --filter minimal-player test

# E2E tests
pnpm --filter minimal-player test:e2e

# Visual regression tests
pnpm --filter minimal-player test:visual
```

### Deployment

Each example includes deployment guides for:
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: Cloudflare, AWS CloudFront
- **Container**: Docker, Kubernetes
- **Serverless**: AWS Lambda, Cloudflare Workers

## Contributing

To add a new example:

1. Create directory in `examples/`
2. Add `package.json` with dependencies
3. Create source files
4. Add README.md with:
   - Purpose and use case
   - Installation instructions
   - Development guide
   - Deployment guide
   - Live demo link
5. Update this README with example information

## Live Demos

- **Minimal Player**: https://whisker-minimal-player.netlify.app
- **Full Editor**: https://whisker-editor.netlify.app
- **Analytics Dashboard**: https://whisker-analytics.netlify.app
- **Embedded Player**: https://whisker-embedded.netlify.app

## Support

For issues or questions:
- GitHub Issues: https://github.com/writewhisker/whisker-editor-web/issues
- Documentation: https://whisker.dev/docs
- Discord: https://discord.gg/whisker

## License

All examples are licensed under AGPL-3.0.
