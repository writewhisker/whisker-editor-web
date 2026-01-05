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

### @writewhisker/i18n

Internationalization support - translations, pluralization, RTL/BiDi, locale detection.

```typescript
import { createI18nSystem } from '@writewhisker/i18n';

const { i18n } = createI18nSystem({ defaultLocale: 'en' });
const greeting = i18n.t('greeting', { name: 'World' });
```

[Full i18n API Reference →](./i18n.md)

### @writewhisker/plugins

Plugin infrastructure - lifecycle management, hook system, and registry.

```typescript
import { initializePluginSystem, STORY } from '@writewhisker/plugins';

const registry = initializePluginSystem();
await registry.register(myPlugin);
registry.emit(STORY.START, storyData);
```

[Full Plugins API Reference →](./plugins.md)

### @writewhisker/analytics

Analytics infrastructure - event collection, consent management, privacy filtering.

```typescript
import { createAnalyticsSystem, ConsentLevel } from '@writewhisker/analytics';

const { collector, consentManager } = createAnalyticsSystem();
consentManager.setConsent(ConsentLevel.ANALYTICS);
collector.track('story.start', { storyId: 'adventure-1' });
```

[Full Analytics API Reference →](./analytics.md)

### @writewhisker/a11y

WCAG 2.1 accessibility - ARIA, contrast, focus, keyboard, motion, screen readers.

```typescript
import { createA11ySystem } from '@writewhisker/a11y';

const { ariaManager, contrastChecker, focusManager } = createA11ySystem();
const attrs = ariaManager.getPassageAttributes(passage);
```

[Full Accessibility API Reference →](./a11y.md)

### @writewhisker/cli-migrate

Migration tools - version upgrades, WLS syntax migration, batch operations.

```typescript
import { migrateStory, batchMigrate } from '@writewhisker/cli-migrate';

const result = await migrateStory(story, '2.0.0');
```

[Full CLI Migration API Reference →](./cli-migrate.md)

## Full API Reference

See the detailed documentation for each package:

- [i18n (Internationalization)](./i18n.md)
- [plugins (Plugin System)](./plugins.md)
- [analytics (Analytics)](./analytics.md)
- [a11y (Accessibility)](./a11y.md)
- [cli-migrate (Migration Tools)](./cli-migrate.md)
