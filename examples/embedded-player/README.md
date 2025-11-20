# Embedded Player Example

Framework-agnostic Web Component for embedding Whisker stories anywhere.

## Features

- ✅ Web Component (works with any framework or no framework)
- ✅ Small bundle size (~120KB gzipped)
- ✅ Load stories from URL
- ✅ Built-in demo story
- ✅ Themeable (light/dark)
- ✅ Zero dependencies for consumers

## Quick Start

```bash
npm install
npm run dev
```

## Usage

### Basic Embedding

```html
<script type="module" src="https://unpkg.com/@whisker-examples/embedded-player"></script>

<whisker-player
  story-url="https://example.com/story.json"
  theme="dark"
></whisker-player>
```

### Attributes

- `story-url`: URL to load story JSON from
- `theme`: "light" or "dark" (default: "dark")

### Use in React

```jsx
function App() {
  return <whisker-player story-url="https://example.com/story.json" theme="light" />;
}
```

### Use in Vue

```vue
<template>
  <whisker-player story-url="https://example.com/story.json" theme="light" />
</template>
```

### Use in Angular

```typescript
import '@whisker-examples/embedded-player';

// In template:
// <whisker-player story-url="https://example.com/story.json" theme="light"></whisker-player>
```

## Building

```bash
npm run build
```

Outputs a single JavaScript file that can be included anywhere.

## License

AGPL-3.0
