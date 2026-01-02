# TypeScript API

Auto-generated API documentation for the Whisker TypeScript packages.

::: tip
This documentation is generated from source code using TypeDoc.
Run `pnpm docs:api` to regenerate.
:::

## Packages

### @writewhisker/parser

Parse WLS source code into story objects.

```typescript
import { parse, tokenize } from '@writewhisker/parser';

const story = parse(':: Start\nHello world!');
```

### @writewhisker/story-models

Core data models for stories, passages, and choices.

```typescript
import { Story, Passage, Choice } from '@writewhisker/story-models';
```

### @writewhisker/story-validation

Validate stories and get detailed error reports.

```typescript
import { validate, StoryValidator } from '@writewhisker/story-validation';

const errors = validate(story);
errors.forEach(e => console.log(e.code, e.message));
```

### @writewhisker/story-player

Execute stories and manage player state.

```typescript
import { StoryPlayer } from '@writewhisker/story-player';

const player = new StoryPlayer(story);
player.start();
player.selectChoice(0);
```

### @writewhisker/import

Import stories from other formats.

```typescript
import { TwineImporter, InkImporter } from '@writewhisker/import';

const importer = new TwineImporter();
const story = await importer.import(twineHtml);
```

### @writewhisker/export

Export stories to various formats.

```typescript
import { HTMLExporter, EPUBExporter } from '@writewhisker/export';

const exporter = new HTMLExporter();
const html = await exporter.export(story);
```

### @writewhisker/publishing

Publish stories to hosting platforms.

```typescript
import { GitHubPublisher, ItchPublisher } from '@writewhisker/publishing';

const publisher = new GitHubPublisher();
await publisher.publish(story, options);
```

## Full API Reference

See the generated documentation in the subdirectories for complete API details.
