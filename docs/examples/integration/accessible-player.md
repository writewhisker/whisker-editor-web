# Accessible Story Player

A complete example of a fully accessible Whisker story player.

## Setup

```typescript
import { createA11ySystem, getAllA11yCss } from '@writewhisker/a11y';

// Create accessibility system
const {
  ariaManager,
  contrastChecker,
  focusManager,
  keyboardNavigator,
  motionPreference,
  screenReaderAdapter,
} = createA11ySystem();

// Inject accessibility CSS
const style = document.createElement('style');
style.textContent = getAllA11yCss();
document.head.appendChild(style);

// Create live regions for screen reader announcements
screenReaderAdapter.createLiveRegion('story', { priority: 'polite' });
screenReaderAdapter.createLiveRegion('alerts', { priority: 'assertive' });
```

## Accessible Passage Rendering

```typescript
function renderPassage(passage: { id: string; title: string; content: string }) {
  const passageEl = document.getElementById('passage')!;

  // Apply ARIA attributes
  const attrs = ariaManager.getPassageAttributes(passage);
  Object.entries(attrs).forEach(([key, value]) => {
    passageEl.setAttribute(key, value);
  });

  // Render content
  passageEl.innerHTML = `
    <h2 id="passage-title">${passage.title}</h2>
    <div id="passage-content">${passage.content}</div>
  `;

  // Announce to screen readers
  screenReaderAdapter.announcePassage({
    title: passage.title,
    content: passage.content.slice(0, 200), // Truncate for announcement
    choiceCount: currentChoices.length,
  });

  // Animate with motion preference
  const duration = motionPreference.getAnimationDuration(300);
  if (duration > 0) {
    passageEl.style.opacity = '0';
    passageEl.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      passageEl.style.opacity = '1';
    });
  }

  // Focus the passage for screen readers
  focusManager.focusElement(passageEl);
}
```

## Accessible Choices

```typescript
function renderChoices(choices: { id: string; text: string }[]) {
  const listEl = document.getElementById('choices')!;

  // Apply list ARIA attributes
  const listAttrs = ariaManager.getChoiceListAttributes(choices);
  Object.entries(listAttrs).forEach(([key, value]) => {
    listEl.setAttribute(key, value);
  });

  // Render choices with proper ARIA
  listEl.innerHTML = choices.map((choice, index) => {
    const attrs = ariaManager.getChoiceAttributes(choice, {
      index,
      total: choices.length,
      selected: false,
    });
    const attrsStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    return `
      <button
        class="choice"
        data-choice-id="${choice.id}"
        ${attrsStr}
      >
        ${choice.text}
      </button>
    `;
  }).join('');

  // Set up keyboard navigation
  keyboardNavigator.attachToElement(listEl, {
    onSelect: (index) => {
      selectChoice(choices[index]);
    },
    onCancel: () => {
      focusManager.focusElement(document.getElementById('passage')!);
    },
  });

  // Focus first choice
  focusManager.focusFirst(listEl);
}

function selectChoice(choice: { id: string; text: string }) {
  // Announce selection
  screenReaderAdapter.announce(`Selected: ${choice.text}`, 'polite');

  // Process choice
  processChoice(choice.id);
}
```

## Keyboard Navigation

```typescript
// Register global keyboard shortcuts
keyboardNavigator.registerHandler('KeyH', {
  handler: () => showHelp(),
  description: 'Show keyboard shortcuts',
  preventDefault: true,
});

keyboardNavigator.registerHandler('KeyS', {
  handler: () => saveGame(),
  description: 'Quick save',
  modifiers: { ctrl: true },
  preventDefault: true,
});

keyboardNavigator.registerHandler('KeyL', {
  handler: () => loadGame(),
  description: 'Quick load',
  modifiers: { ctrl: true },
  preventDefault: true,
});

keyboardNavigator.registerHandler('Escape', {
  handler: () => closeDialog(),
  description: 'Close dialog',
  preventDefault: true,
});

// Create help dialog
function showHelp() {
  const shortcuts = keyboardNavigator.getShortcutList();
  const content = shortcuts
    .map(s => `${s.key}: ${s.description}`)
    .join('\n');

  showDialog('Keyboard Shortcuts', content);
}
```

## Accessible Dialogs

```typescript
function showDialog(title: string, content: string) {
  const dialogEl = document.getElementById('dialog')!;

  // Apply ARIA attributes
  const attrs = ariaManager.getDialogAttributes({
    title,
    isModal: true,
  });
  Object.entries(attrs).forEach(([key, value]) => {
    dialogEl.setAttribute(key, value);
  });

  // Render dialog
  dialogEl.innerHTML = `
    <h2 id="dialog-title">${title}</h2>
    <div id="dialog-content">${content}</div>
    <button id="dialog-close">Close</button>
  `;

  // Show dialog
  dialogEl.hidden = false;

  // Trap focus inside dialog
  focusManager.saveFocus();
  focusManager.trapFocus(dialogEl);

  // Announce dialog
  screenReaderAdapter.announce(`${title} dialog opened`, 'assertive');

  // Close button handler
  document.getElementById('dialog-close')!.onclick = closeDialog;
}

function closeDialog() {
  const dialogEl = document.getElementById('dialog')!;
  dialogEl.hidden = true;

  // Release focus trap
  focusManager.releaseTrap();
  focusManager.restoreFocus();

  // Announce
  screenReaderAdapter.announce('Dialog closed', 'polite');
}
```

## Color Contrast Validation

```typescript
// Validate theme colors on load
function validateThemeColors() {
  const foreground = getComputedStyle(document.body)
    .getPropertyValue('--text-color');
  const background = getComputedStyle(document.body)
    .getPropertyValue('--bg-color');

  const result = contrastChecker.validate(foreground, background);

  if (!result.passesAA) {
    console.warn('Theme colors do not meet WCAG AA contrast requirements');
    console.warn(`Ratio: ${result.ratio.toFixed(2)}:1 (needs 4.5:1)`);

    // Suggest better colors
    const suggestions = contrastChecker.suggestFix(foreground, background);
    console.log('Suggested foreground:', suggestions.adjustForeground);
  }
}

// Provide high contrast mode
function enableHighContrast() {
  document.body.classList.add('high-contrast');

  // Announce change
  screenReaderAdapter.announce('High contrast mode enabled', 'polite');
}
```

## Motion Preferences

```typescript
// Check motion preferences
if (motionPreference.prefersReducedMotion()) {
  // Disable all animations
  document.body.classList.add('reduce-motion');
}

// Listen for preference changes
motionPreference.onChange((prefersReduced) => {
  if (prefersReduced) {
    document.body.classList.add('reduce-motion');
    screenReaderAdapter.announce('Animations disabled', 'polite');
  } else {
    document.body.classList.remove('reduce-motion');
    screenReaderAdapter.announce('Animations enabled', 'polite');
  }
});
```

## CSS for Accessibility

```css
/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: #000;
  color: #fff;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}

/* Focus visible */
:focus-visible {
  outline: 3px solid #4A90D9;
  outline-offset: 2px;
}

/* Reduced motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* High contrast */
.high-contrast {
  --text-color: #000;
  --bg-color: #fff;
  --link-color: #0000EE;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Complete HTML Structure

```html
<body>
  <a href="#main" class="skip-link">Skip to content</a>

  <header role="banner">
    <h1>Story Title</h1>
    <button id="settings-btn" aria-label="Settings">⚙️</button>
  </header>

  <main id="main" role="main" aria-live="polite">
    <article id="passage" tabindex="-1" aria-labelledby="passage-title">
      <!-- Passage content rendered here -->
    </article>

    <nav id="choices" role="listbox" aria-label="Available choices">
      <!-- Choices rendered here -->
    </nav>
  </main>

  <div id="dialog" role="dialog" aria-modal="true" hidden>
    <!-- Dialog content rendered here -->
  </div>

  <!-- Live regions for screen readers -->
  <div id="sr-announcements" aria-live="polite" class="sr-only"></div>
  <div id="sr-alerts" aria-live="assertive" class="sr-only"></div>
</body>
```

## Complete Example

See the [full accessibility API documentation](../../api/typescript/a11y.md) for more details.
