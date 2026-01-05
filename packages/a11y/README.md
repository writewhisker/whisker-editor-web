# @writewhisker/a11y

WCAG 2.1 accessibility support for Whisker stories.

## Features

- **ARIA Manager**: Generate appropriate ARIA attributes for passages, choices, dialogs
- **Contrast Checker**: WCAG AA/AAA contrast validation with suggestions
- **Focus Manager**: Focus trapping, saving/restoring, keyboard navigation
- **Keyboard Navigator**: Configurable handlers with choice navigation
- **Motion Preference**: Reduced motion detection with system/user overrides
- **Screen Reader Adapter**: Live region management with debounced announcements

## Installation

```bash
pnpm add @writewhisker/a11y
```

## Quick Start

```typescript
import { createA11ySystem } from '@writewhisker/a11y';

const {
  ariaManager,
  contrastChecker,
  focusManager,
  screenReaderAdapter,
} = createA11ySystem();

// Generate ARIA attributes
const attrs = ariaManager.getPassageAttributes(passage);

// Check contrast
const result = contrastChecker.validate('#333', '#fff');
console.log(`AA: ${result.passesAA}, AAA: ${result.passesAAA}`);

// Announce to screen readers
screenReaderAdapter.announce('Chapter 1', 'polite');
```

## WCAG Compliance

| Criterion | Level | Module |
|-----------|-------|--------|
| 1.4.3 Contrast | AA | ContrastChecker |
| 2.1.1 Keyboard | A | KeyboardNavigator |
| 2.4.3 Focus Order | A | FocusManager |
| 4.1.3 Status Messages | AA | ScreenReaderAdapter |

## Documentation

See the [full API reference](../../docs/api/typescript/a11y.md).

## License

MIT
