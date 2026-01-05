# @writewhisker/i18n

Internationalization support for Whisker stories.

## Features

- **String Tables**: Hierarchical key lookup with variable interpolation
- **Pluralization**: CLDR-compliant plural rules for 100+ languages
- **BiDi Support**: RTL detection, text wrapping, and HTML helpers
- **Locale Management**: Detection, switching, and persistence
- **Format Adapters**: Date, time, and number formatting via Intl

## Installation

```bash
pnpm add @writewhisker/i18n
```

## Quick Start

```typescript
import { createI18nSystem } from '@writewhisker/i18n';

const { i18n, stringTable } = createI18nSystem({
  defaultLocale: 'en',
});

stringTable.addTranslations('en', {
  greeting: 'Hello, {name}!',
  items: '{count, plural, one {# item} other {# items}}',
});

console.log(i18n.t('greeting', { name: 'World' }));
// "Hello, World!"

console.log(i18n.t('items', { count: 5 }));
// "5 items"
```

## Documentation

See the [full API reference](../../docs/api/typescript/i18n.md).

## License

MIT
