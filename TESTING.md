# Testing Guide

Comprehensive guide to testing in whisker-editor-web.

## Quick Start

```bash
# Run all unit tests in watch mode
npm test

# Run unit tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Generate coverage report
npm run test:coverage
```

---

## Testing Strategy

whisker-editor-web uses a **hybrid testing approach**:

1. **Unit Tests (Vitest)** - Test business logic, models, stores, and utilities
2. **E2E Tests (Playwright)** - Test user workflows and UI interactions
3. **No Component Tests** - Due to Svelte 5 compatibility issues (see [Rationale](#why-no-component-tests))

### Coverage Distribution

**Current Status:** 137 tests passing (100%)

| Category | Tests | Framework | Coverage |
|----------|-------|-----------|----------|
| Models | 40 | Vitest | Story, Passage, Choice, Variable, History |
| Connection Validation | 27 | Vitest | Orphan detection, validation logic |
| Graph Layouts | 20 | Vitest | Hierarchical, circular, grid algorithms |
| Tag Management | 34 | Vitest | Tag store, CRUD operations, colors |
| Search & Filtering | 16 | Vitest | Filter store, search logic |
| **Total Unit Tests** | **137** | **Vitest** | **80%+ coverage** |
| E2E Workflows | 10 | Playwright | Critical user paths |

---

## Unit Testing (Vitest)

### Running Unit Tests

```bash
# Watch mode (recommended for development)
npm test

# Run once
npm run test:run

# With UI (visual test runner)
npm run test:ui

# With coverage
npm run test:coverage
```

### Writing Unit Tests

#### Models

Test data structures and their methods:

```typescript
// src/lib/models/Story.test.ts
import { describe, it, expect } from 'vitest';
import { Story } from './Story';
import { Passage } from './Passage';

describe('Story', () => {
  it('should create story with default values', () => {
    const story = new Story({ title: 'Test Story' });
    expect(story.title).toBe('Test Story');
    expect(story.passages).toEqual([]);
  });

  it('should add passage', () => {
    const story = new Story({ title: 'Test' });
    const passage = new Passage({ title: 'Start' });

    story.addPassage(passage);

    expect(story.passages).toHaveLength(1);
    expect(story.passages[0]).toBe(passage);
  });

  it('should delete passage by ID', () => {
    const story = new Story({ title: 'Test' });
    const passage = new Passage({ title: 'Start' });
    story.addPassage(passage);

    story.deletePassage(passage.id);

    expect(story.passages).toHaveLength(0);
  });
});
```

#### Stores

Test state management logic:

```typescript
// src/lib/stores/filterStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { filterStore, filteredPassages } from './filterStore';
import { currentStory } from './projectStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('filterStore', () => {
  beforeEach(() => {
    // Set up test story
    const story = new Story({ title: 'Test' });
    story.addPassage(new Passage({ title: 'Combat', tags: ['combat'] }));
    story.addPassage(new Passage({ title: 'Dialogue', tags: ['dialogue'] }));
    currentStory.set(story);
  });

  it('should filter by tag', () => {
    filterStore.setTagFilter(['combat']);

    const passages = get(filteredPassages);

    expect(passages).toHaveLength(1);
    expect(passages[0].title).toBe('Combat');
  });

  it('should combine search and tag filters', () => {
    filterStore.setSearchQuery('dia');
    filterStore.setTagFilter(['dialogue']);

    const passages = get(filteredPassages);

    expect(passages).toHaveLength(1);
    expect(passages[0].title).toBe('Dialogue');
  });
});
```

#### Utilities

Test helper functions and algorithms:

```typescript
// src/lib/utils/connectionValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateConnections } from './connectionValidator';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';
import { Choice } from '../models/Choice';

describe('connectionValidator', () => {
  it('should detect orphaned connections', () => {
    const story = new Story({ title: 'Test' });
    const p1 = new Passage({ title: 'P1' });
    p1.choices.push(new Choice({
      text: 'Go to nowhere',
      target: 'non-existent-id'
    }));
    story.addPassage(p1);

    const result = validateConnections(story);

    expect(result.orphanedConnections).toHaveLength(1);
    expect(result.orphanedConnections[0].sourceId).toBe(p1.id);
  });

  it('should detect dead-end passages', () => {
    const story = new Story({ title: 'Test' });
    const deadEnd = new Passage({ title: 'Dead End' });
    story.addPassage(deadEnd);

    const result = validateConnections(story);

    expect(result.deadEndPassages).toHaveLength(1);
    expect(result.deadEndPassages[0]).toBe(deadEnd.id);
  });
});
```

### Test Organization

```
src/lib/
├── models/
│   ├── Story.ts
│   ├── Story.test.ts          # Co-located with source
│   ├── Passage.ts
│   └── Passage.test.ts
├── stores/
│   ├── tagStore.ts
│   ├── tagStore.test.ts
│   ├── filterStore.ts
│   └── filterStore.test.ts
└── utils/
    ├── connectionValidator.ts
    ├── connectionValidator.test.ts
    ├── graphLayout.ts
    └── graphLayout.test.ts
```

**Naming Convention:** `[filename].test.ts`

### Test Patterns

#### Setup and Teardown

```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Reset state before each test
    currentStory.set(null);
  });

  afterEach(() => {
    // Cleanup after each test
  });
});
```

#### Testing Async Code

```typescript
it('should save story', async () => {
  const story = new Story({ title: 'Test' });

  await saveStory(story);

  expect(localStorage.getItem('story')).toBeTruthy();
});
```

#### Mocking

```typescript
import { vi } from 'vitest';

it('should call save function', () => {
  const saveMock = vi.fn();

  handleSave(saveMock);

  expect(saveMock).toHaveBeenCalledOnce();
});
```

---

## E2E Testing (Playwright)

### Running E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive, visual)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test tagging.spec.ts
```

### E2E Test Structure

Tests are located in `e2e/` directory:

```
e2e/
├── tagging.spec.ts         # Tag management workflows
├── connections.spec.ts     # Connection editing workflows
└── README.md               # E2E-specific documentation
```

### Writing E2E Tests

#### Basic Test

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('should create new passage', async ({ page }) => {
  // Navigate to app
  await page.goto('/');

  // Wait for app to load
  await page.waitForSelector('text=Passages');

  // Click add passage button
  await page.click('button:has-text("+ Add")');

  // Verify passage was created
  await expect(page.locator('text=Untitled Passage')).toBeVisible();
});
```

#### User Workflow Test

```typescript
test('should add tag to passage', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('text=Passages');

  // Select passage
  await page.click('text=Start');

  // Wait for properties panel
  await page.waitForSelector('text=Tags');

  // Add tag
  const tagInput = page.locator('input[placeholder="Add tag..."]');
  await tagInput.fill('combat');
  await tagInput.press('Enter');

  // Verify tag appears
  await expect(page.locator('text=combat').first()).toBeVisible();
});
```

#### Testing Interactions

```typescript
test('should filter passages by tag', async ({ page }) => {
  await page.goto('/');

  // Add tags to passages first
  // ... (setup code)

  // Open filter dropdown
  await page.click('button:has-text("Filter")');

  // Select tag filter
  await page.click('text=combat');

  // Verify filtered results
  const passageCount = await page.locator('.passage-item').count();
  expect(passageCount).toBe(2);
});
```

### E2E Test Patterns

#### Page Object Pattern

```typescript
// e2e/page-objects/EditorPage.ts
export class EditorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForSelector('text=Passages');
  }

  async addPassage(title: string) {
    await this.page.click('button:has-text("+ Add")');
    await this.page.fill('input[placeholder="Title"]', title);
  }

  async selectPassage(title: string) {
    await this.page.click(`text=${title}`);
  }
}

// Usage in test
test('example', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.goto();
  await editor.addPassage('My Passage');
});
```

### Why No Component Tests?

**Decision:** Skip component-level tests in favor of E2E tests

**Rationale:**
1. **Svelte 5 Compatibility** - `@testing-library/svelte` has issues with Svelte 5's new runes API
2. **Better Coverage** - E2E tests cover real user workflows, not isolated components
3. **Faster Development** - E2E tests are faster to write than debugging component test issues
4. **Business Logic Covered** - Unit tests already cover all business logic

**Trade-offs:**
- ✅ Tests real user experiences
- ✅ Catches integration issues
- ✅ No tooling compatibility problems
- ⚠️ Slower to run than component tests
- ⚠️ Less granular feedback

See [e2e/README.md](e2e/README.md) for more details on this decision.

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Workflow:** `.github/workflows/ci.yml`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run check
      - run: npm run test:run

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### Coverage Reporting

Coverage reports are uploaded to Codecov:

```bash
npm run test:coverage
```

**Coverage Goals:**
- Models: 90%+
- Stores: 85%+
- Utilities: 80%+
- Overall: 80%+

---

## Debugging Tests

### Unit Tests

```bash
# Run specific test file
npm test Story.test.ts

# Run tests matching pattern
npm test -- --grep "should add passage"

# Debug in VS Code
# Add breakpoint, then:
# 1. Open test file
# 2. Click "Debug" above test
```

### E2E Tests

```bash
# Run with browser visible
npm run test:e2e:headed

# Run in debug mode (step through)
npx playwright test --debug

# Open trace viewer
npx playwright show-trace trace.zip
```

**Playwright Inspector:**
- Set breakpoints in test code
- Step through test execution
- Inspect page state
- Take screenshots

---

## Best Practices

### General

1. **Test Behavior, Not Implementation**
   ```typescript
   // ❌ Bad - tests implementation
   expect(passage.choices.length).toBe(1);

   // ✅ Good - tests behavior
   expect(passage.hasChoice('Go North')).toBe(true);
   ```

2. **Keep Tests Independent**
   ```typescript
   // ❌ Bad - tests depend on each other
   test('test 1', () => {
     globalState.value = 5;
   });
   test('test 2', () => {
     expect(globalState.value).toBe(5); // Fragile!
   });

   // ✅ Good - each test sets up its own state
   test('test 1', () => {
     const state = { value: 5 };
     expect(state.value).toBe(5);
   });
   ```

3. **Use Descriptive Test Names**
   ```typescript
   // ❌ Bad
   it('works', () => { /* ... */ });

   // ✅ Good
   it('should add passage to story and assign unique ID', () => { /* ... */ });
   ```

### Unit Tests

1. **Test One Thing Per Test**
2. **Use `beforeEach` for Common Setup**
3. **Avoid Testing Framework Code** (e.g., don't test Svelte reactivity)

### E2E Tests

1. **Test User Workflows, Not UI Implementation**
2. **Use Data Attributes for Selectors** (more stable than classes)
3. **Wait for Elements** (use `waitForSelector`, not `setTimeout`)
4. **Keep Tests Fast** (minimize setup, use shortcuts where possible)

---

## Troubleshooting

### Common Issues

**Tests Fail Locally But Pass in CI:**
- Check Node version (use same as CI)
- Clear `node_modules` and reinstall
- Check for race conditions

**E2E Tests Time Out:**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify selectors are correct

**Coverage Not Generated:**
- Ensure `vitest.config.ts` has coverage configuration
- Run `npm run test:coverage` not `npm test`

### Getting Help

- **Issues:** [GitHub Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)

---

## Related Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture
- **[e2e/README.md](e2e/README.md)** - E2E testing details
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow

---

## Test Metrics

**Current Status (as of 2025-01-19):**

| Metric | Value |
|--------|-------|
| Total Tests | 137 |
| Pass Rate | 100% |
| Unit Tests | 137 |
| E2E Tests | 10 workflows |
| Coverage (Overall) | ~80% |
| Coverage (Models) | ~95% |
| Coverage (Stores) | ~85% |
| Coverage (Utils) | ~90% |

**Test Breakdown:**
- ✅ 40 model tests (Story, Passage, Choice, Variable, History)
- ✅ 27 connection validation tests
- ✅ 20 graph layout tests
- ✅ 34 tag management tests
- ✅ 16 filter and search tests
- ✅ E2E workflows (tag management, connection editing)
