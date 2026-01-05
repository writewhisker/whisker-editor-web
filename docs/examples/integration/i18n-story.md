# Internationalized Story

A complete example of a Whisker story with full localization support.

## Setup

```typescript
import { createI18nSystem } from '@writewhisker/i18n';
import { StoryPlayer } from '@writewhisker/story-player';

// Create i18n system
const { i18n, stringTable } = createI18nSystem({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  autoDetect: true,
});

// Load translations
stringTable.addTranslations('en', {
  'story.title': 'The Mysterious Forest',
  'passage.intro': 'You stand at the edge of a dark forest.',
  'passage.forest': 'The trees tower above you, blocking out the sky.',
  'choice.enter': 'Enter the forest',
  'choice.leave': 'Turn back',
  'choice.explore': '{count, plural, one {Explore # path} other {Explore # paths}}',
  'item.found': 'You found a {item}!',
  'status.health': 'Health: {current}/{max}',
});

stringTable.addTranslations('es', {
  'story.title': 'El Bosque Misterioso',
  'passage.intro': 'Estás al borde de un bosque oscuro.',
  'passage.forest': 'Los árboles se elevan sobre ti, bloqueando el cielo.',
  'choice.enter': 'Entrar al bosque',
  'choice.leave': 'Dar la vuelta',
  'choice.explore': '{count, plural, one {Explorar # camino} other {Explorar # caminos}}',
  'item.found': '¡Encontraste un {item}!',
  'status.health': 'Salud: {current}/{max}',
});

stringTable.addTranslations('ar', {
  'story.title': 'الغابة الغامضة',
  'passage.intro': 'أنت تقف على حافة غابة مظلمة.',
  'passage.forest': 'الأشجار ترتفع فوقك، تحجب السماء.',
  'choice.enter': 'ادخل الغابة',
  'choice.leave': 'ارجع',
  'choice.explore': '{count, plural, zero {لا مسارات} one {استكشف مسار #} two {استكشف مسارين} few {استكشف # مسارات} many {استكشف # مسارًا} other {استكشف # مسار}}',
  'item.found': 'وجدت {item}!',
  'status.health': 'الصحة: {current}/{max}',
});
```

## Story Rendering

```typescript
function renderPassage(passageId: string) {
  const content = i18n.t(`passage.${passageId}`);

  // Apply text direction
  const dir = i18n.getDirection();
  document.documentElement.dir = dir;

  passageElement.innerHTML = content;
}

function renderChoices(choices: string[]) {
  choiceList.innerHTML = choices.map(choiceId => {
    const text = i18n.t(`choice.${choiceId}`);
    return `<button class="choice">${text}</button>`;
  }).join('');
}

// Pluralization example
function showPaths(count: number) {
  const text = i18n.t('choice.explore', { count });
  console.log(text);
  // English: "Explore 3 paths"
  // Spanish: "Explorar 3 caminos"
  // Arabic: "استكشف 3 مسارات"
}

// Variable interpolation
function showItemFound(item: string) {
  const text = i18n.t('item.found', { item });
  console.log(text);
  // English: "You found a sword!"
  // Spanish: "¡Encontraste un espada!"
}

// Multiple variables
function showHealth(current: number, max: number) {
  const text = i18n.t('status.health', { current, max });
  console.log(text);
  // English: "Health: 80/100"
  // Arabic: "الصحة: 80/100"
}
```

## Language Switcher

```typescript
function createLanguageSwitcher() {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'ar', name: 'العربية' },
  ];

  const container = document.createElement('div');
  container.className = 'language-switcher';

  languages.forEach(({ code, name }) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => {
      i18n.setLocale(code);
      refreshUI();
    };
    container.appendChild(button);
  });

  return container;
}

function refreshUI() {
  renderPassage(currentPassageId);
  renderChoices(currentChoices);
  updateTitle();

  // Update document direction for RTL languages
  document.documentElement.dir = i18n.getDirection();
  document.documentElement.lang = i18n.getLocale();
}
```

## RTL Support

```css
/* Automatic RTL layout using logical properties */
.passage {
  padding-inline-start: 1rem;
  margin-inline-end: 1rem;
  text-align: start;
}

.choice {
  margin-inline-start: 0.5rem;
}

/* RTL-specific adjustments */
[dir="rtl"] .icon-arrow {
  transform: scaleX(-1);
}
```

## WLS Source with Translations

```whisker
:: Start
{i18n: passage.intro}

+ [{i18n: choice.enter}] -> Forest
+ [{i18n: choice.leave}] -> End

:: Forest
{i18n: passage.forest}

{do $paths = 3}
+ [{i18n: choice.explore, count=$paths}] -> Explore
+ [{i18n: choice.leave}] -> Start

:: End
Thanks for playing!
```

## Complete Example

See the [full i18n API documentation](../../api/typescript/i18n.md) for more details.
