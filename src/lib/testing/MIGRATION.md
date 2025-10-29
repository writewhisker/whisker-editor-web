# Test Scenario System Migration Guide

## Overview

The test scenario system has been enhanced with better class-based architecture while maintaining full backward compatibility with existing UI and stored data.

## What Changed

### Old System (`src/lib/player/testScenarioTypes.ts`)
- Plain TypeScript interfaces
- No methods or encapsulation
- Works with StoryPlayer
- Already integrated with UI

### New System (`src/lib/testing/`)
- Class-based architecture (`TestScenario`, `TestStep`)
- Rich methods: `clone()`, `serialize()`, `moveStep()`, etc.
- Helper functions: `TestStepHelpers` for easy test creation
- Works directly with Story model
- More test step types: `start`, `choice`, `check_passage`, `check_variable`, `check_text`
- Better TypeScript support

## Compatibility

An **adapter layer** (`testScenarioAdapter.ts`) provides seamless conversion:
- Old stored data is automatically migrated on load
- Saved back in old format for compatibility
- UI components continue to work unchanged

## How to Use

### Option 1: Use Enhanced Store (Recommended)

Replace store import in your components:

```typescript
// Old
import { testScenarioActions } from '$lib/stores/testScenarioStore';

// New (enhanced)
import { testScenarioActions } from '$lib/stores/testScenarioStore.enhanced';
```

**Benefits:**
- Uses new TestRunner (more reliable)
- Works directly with Story model
- Supports new test step types
- Backward compatible with existing data

### Option 2: Use New Classes Directly

For programmatic test creation:

```typescript
import { TestScenario, TestStepHelpers } from '$lib/testing/TestScenario';
import { TestRunner } from '$lib/testing/TestRunner';

// Create test
const scenario = new TestScenario({
  name: 'Test Left Path',
  storyId: story.metadata.id,
});

scenario.addStep(TestStepHelpers.start());
scenario.addStep(TestStepHelpers.chooseByIndex(0));
scenario.addStep(TestStepHelpers.expectPassage('p2', 'Left'));

// Run test
const runner = new TestRunner(story);
const result = await runner.runTest(scenario);
```

### Option 3: Keep Using Old System

No changes needed! Everything continues to work as before.

## Migration Path

### Phase 1: Enable Enhanced Store ✅ DONE
- [x] Create adapter layer
- [x] Create enhanced store
- [x] Maintain API compatibility

### Phase 2: Update UI (Optional)
- [ ] Update TestScenarioManager to use new step types
- [ ] Add UI for text content checking
- [ ] Add UI for advanced variable operators

### Phase 3: Full Migration (Future)
- [ ] Remove old TestScenarioRunner
- [ ] Update all components to use new classes directly
- [ ] Remove adapter layer

## New Features Available

### Rich Test Step Types

```typescript
// Start the story
TestStepHelpers.start()

// Choose by index or text
TestStepHelpers.chooseByIndex(0)
TestStepHelpers.chooseByText('Go left')

// Check current passage
TestStepHelpers.expectPassage('p2', 'Forest')

// Check variables with operators
TestStepHelpers.expectVariable('health', 100, 'equals')
TestStepHelpers.expectVariable('score', 50, 'greater_than')
TestStepHelpers.expectVariable('inventory', 'sword', 'contains')

// Check text content
TestStepHelpers.expectText('You are in the forest', 'contains')
TestStepHelpers.expectText('The.*dragon', 'regex')
```

### Better Test Management

```typescript
const scenario = new TestScenario({ name: 'My Test' });

// Add steps
scenario.addStep(step1);
scenario.addStep(step2);

// Remove step
scenario.removeStep(1);

// Move step
scenario.moveStep(0, 2);

// Clone scenario
const copy = scenario.clone();

// Serialize for storage
const data = scenario.serialize();
```

## Testing

Both systems are fully tested:
- Old system: Existing tests continue to pass
- New system: 26 new tests (Playthrough + TestRunner)
- Adapter: Converts between formats correctly

## Rollback

If issues arise, simply revert to old store:

```typescript
// Revert to
import { testScenarioActions } from '$lib/stores/testScenarioStore';
```

All data remains compatible.

## Support

For questions or issues, check:
- `testScenarioAdapter.ts` - Conversion logic
- `TestScenario.test.ts` - Example usage
- `TestRunner.test.ts` - Test execution examples
