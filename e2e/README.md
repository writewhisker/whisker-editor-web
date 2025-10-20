# E2E Tests with Playwright

This directory contains end-to-end tests for the Whisker Editor web interface using Playwright.

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed
```

## Test Coverage

### Tag Management (`tagging.spec.ts`)
- ✅ Adding tags to passages using TagInput
- ✅ Autocomplete suggestions for existing tags
- ✅ Colored tag display in passage list
- ✅ Removing tags via X button
- ⏸️ Tag Manager UI (skipped - needs UI integration)

### Visual Connection Editing (`connections.spec.ts`)
- ✅ Creating new passages
- ✅ Connection validation error display
- ✅ Dead-end passage indicators
- ✅ Choice count display
- ✅ Updating passage titles
- ✅ Graph view layout buttons

## Testing Strategy

The project uses a **hybrid testing approach**:

### 1. Unit Tests (Vitest) - 137 tests ✅
**Models** (40 tests):
- Story, Passage, Choice, Variable

**Stores** (50 tests):
- tagStore (34 tests) - Tag management logic
- filterStore (16 tests) - Filtering logic

**Utilities** (47 tests):
- connectionValidator (27 tests) - Connection validation
- graphLayout (20 tests) - Graph layouts

### 2. E2E Tests (Playwright) - UI Workflows ✅
- Tag input and autocomplete
- Tag display and removal
- Passage creation and editing
- Connection validation UI
- Graph view interactions

### 3. Component Tests - Not Currently Implemented ⏸️
**Reason**: Svelte 5 + @testing-library/svelte has compatibility challenges
**Workaround**: E2E tests provide UI coverage

## Notes

- **Svelte 5 Component Testing**: Current tooling (@testing-library/svelte) has limitations with Svelte 5's new runes API. Component-level testing is deferred in favor of E2E tests which provide better end-user workflow coverage.

- **Business Logic Coverage**: All critical business logic (tag management, connection validation, filtering) is thoroughly tested with unit tests.

- **UI Interaction Coverage**: E2E tests verify user workflows and UI integrations.

## Adding New Tests

1. Create a new `.spec.ts` file in this directory
2. Import Playwright test utilities
3. Write tests that simulate user interactions
4. Run with `npm run test:e2e` to verify

Example:
```typescript
import { test, expect } from '@playwright/test';

test('my feature workflow', async ({ page }) => {
  await page.goto('/');
  // Your test code here
});
```
