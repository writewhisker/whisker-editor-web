# Phase 1: Backend Compliance Implementation Plan

**Status:** In Progress
**Branch:** `feature/whisker-core-sync-phase-1`
**Estimated Effort:** 30 hours
**Priority:** URGENT - Prevents data corruption

---

## Executive Summary

Phase 1 addresses critical data integrity issues that cause Choice ID instability during serialization/deserialization cycles. This leads to broken choice references and potential data corruption in multi-device scenarios or when syncing with a backend.

**Critical Issue:** Choice IDs are regenerated as `choice-${targetPassageId}-${choiceIndex}` during storage conversion, losing the original nanoid-based IDs. This breaks choice lookups in the UI and would corrupt sync operations.

---

## Tasks Overview

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1 | Fix Choice ID stability in typeAdapter | CRITICAL | 4 hrs | In Progress |
| 2 | Add story-level tags support | HIGH | 3 hrs | Pending |
| 3 | Add createdBy field to Story | HIGH | 2 hrs | Pending |
| 4 | Update storage types | MEDIUM | 2 hrs | Pending |
| 5 | Add data migration utility | HIGH | 6 hrs | Pending |
| 6 | Update all affected tests | MEDIUM | 8 hrs | Pending |
| 7 | Integration testing | MEDIUM | 3 hrs | Pending |
| 8 | Documentation | LOW | 2 hrs | Pending |

**Total:** 30 hours

---

## Task 1: Fix Choice ID Stability (CRITICAL)

### Problem
**File:** `src/lib/services/storage/typeAdapter.ts` line 89

Current implementation:
```typescript
choices: passage.connections.map(conn => ({
  id: `choice-${conn.targetPassageId}-${conn.choiceIndex}`,  // ❌ BREAKS!
  text: conn.choiceText,
  target: conn.targetPassageId,
  condition: undefined,
  action: undefined
}))
```

**Impact:**
- Original nanoid-based IDs lost during save
- Choice IDs change on every load
- UI choice lookups fail
- Sync operations would corrupt data

### Solution

**Step 1:** Update storage format to include choice IDs

**File:** `src/lib/services/storage/types.ts`

Change connection interface (lines 23-27):
```typescript
// BEFORE
interface Connection {
  targetPassageId: string;
  choiceText: string;
  choiceIndex: number;
}

// AFTER
interface Connection {
  choiceId: string;           // ✅ ADD: Original choice ID
  targetPassageId: string;
  choiceText: string;
  choiceIndex: number;        // Keep for backward compat
  condition?: string;         // ✅ ADD: Choice condition
  action?: string;            // ✅ ADD: Choice action
}
```

**Step 2:** Update modelToStorage conversion

**File:** `src/lib/services/storage/typeAdapter.ts` lines 40-44

```typescript
// BEFORE
connections: passage.choices.map((choice, index) => ({
  targetPassageId: choice.target,
  choiceText: choice.text,
  choiceIndex: index
}))

// AFTER
connections: passage.choices.map((choice, index) => ({
  choiceId: choice.id,              // ✅ Preserve original ID
  targetPassageId: choice.target,
  choiceText: choice.text,
  choiceIndex: index,
  condition: choice.condition,      // ✅ Preserve condition
  action: choice.action             // ✅ Preserve action
}))
```

**Step 3:** Update storageToModel conversion

**File:** `src/lib/services/storage/typeAdapter.ts` lines 88-95

```typescript
// BEFORE
choices: passage.connections.map(conn => ({
  id: `choice-${conn.targetPassageId}-${conn.choiceIndex}`,
  text: conn.choiceText,
  target: conn.targetPassageId,
  condition: undefined,
  action: undefined
}))

// AFTER
choices: passage.connections.map((conn, index) => ({
  id: conn.choiceId || `legacy-choice-${conn.targetPassageId}-${index}`,  // ✅ Use original or fallback
  text: conn.choiceText,
  target: conn.targetPassageId,
  condition: conn.condition,        // ✅ Restore condition
  action: conn.action               // ✅ Restore action
}))
```

**Step 4:** Add backward compatibility

For existing projects without choiceId:
```typescript
// In storageToModel(), detect legacy format
if (!conn.choiceId) {
  console.warn(`Migrating legacy choice format for passage ${passage.id}`);
  // Generate stable ID from content
  conn.choiceId = `migrated-${passage.id}-${conn.choiceIndex}-${hashString(conn.choiceText)}`;
}
```

### Testing

**File:** Create `src/lib/services/storage/typeAdapter.test.ts`

```typescript
describe('typeAdapter', () => {
  it('should preserve choice IDs through round-trip', () => {
    const originalChoice = new Choice({
      id: 'test-choice-123',
      text: 'Test choice',
      target: 'target-passage'
    });

    const passage = new Passage({
      id: 'test-passage',
      title: 'Test',
      content: 'Content',
      choices: [originalChoice]
    });

    // Serialize to storage format
    const stored = modelToStorage(project);

    // Deserialize back
    const restored = storageToModel(stored);

    // Choice ID must match original
    expect(restored.passages['test-passage'].choices[0].id).toBe('test-choice-123');
  });
});
```

---

## Task 2: Add Story-Level Tags

### Problem
Backend expects `SerializedStory.tags: string[]` but frontend doesn't support story-level tags (only passage-level).

### Solution

**Step 1:** Add tags to StoryMetadata

**File:** `src/lib/models/types.ts` line 36-43

```typescript
export interface StoryMetadata {
  title: string;
  author: string;
  version: string;
  created: string;
  modified: string;
  description?: string;
  tags?: string[];          // ✅ ADD
}
```

**Step 2:** Update Story model

**File:** `src/lib/models/Story.ts`

Constructor (lines 15-22):
```typescript
this.metadata = {
  title: data?.metadata?.title || 'Untitled Story',
  author: data?.metadata?.author || '',
  version: data?.metadata?.version || '1.0.0',
  created: data?.metadata?.created || now,
  modified: data?.metadata?.modified || now,
  description: data?.metadata?.description,
  tags: data?.metadata?.tags || []  // ✅ ADD
};
```

**Step 3:** Update typeAdapter

**File:** `src/lib/services/storage/typeAdapter.ts` line 47

```typescript
tags: storyData.metadata.tags || []  // Use story tags, not empty array
```

**Step 4:** Add UI for story tags

Create new component: `src/lib/components/StoryTagManager.svelte`

```svelte
<script lang="ts">
  import { currentStory } from '$lib/stores/projectStore';

  function addTag(tag: string) {
    if ($currentStory) {
      if (!$currentStory.metadata.tags) {
        $currentStory.metadata.tags = [];
      }
      if (!$currentStory.metadata.tags.includes(tag)) {
        $currentStory.metadata.tags.push(tag);
        $currentStory.updateModified();
      }
    }
  }

  function removeTag(tag: string) {
    if ($currentStory?.metadata.tags) {
      $currentStory.metadata.tags = $currentStory.metadata.tags.filter(t => t !== tag);
      $currentStory.updateModified();
    }
  }
</script>

<div class="story-tags">
  <h3>Story Tags</h3>
  {#if $currentStory?.metadata.tags}
    {#each $currentStory.metadata.tags as tag}
      <span class="tag">
        {tag}
        <button on:click={() => removeTag(tag)}>×</button>
      </span>
    {/each}
  {/if}
  <input type="text" placeholder="Add tag..." on:keydown={(e) => {
    if (e.key === 'Enter') {
      addTag(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  }} />
</div>
```

---

## Task 3: Add createdBy Field

### Problem
Backend expects `ownerId` and `createdBy` for multi-user support. Frontend has no concept of users yet.

### Solution

**Step 1:** Add createdBy to StoryMetadata

**File:** `src/lib/models/types.ts`

```typescript
export interface StoryMetadata {
  title: string;
  author: string;      // Human-readable author name
  version: string;
  created: string;
  modified: string;
  description?: string;
  tags?: string[];
  createdBy?: string;  // ✅ ADD: User ID who created (for future auth)
}
```

**Step 2:** Update Story constructor

**File:** `src/lib/models/Story.ts`

```typescript
this.metadata = {
  // ... existing fields ...
  createdBy: data?.metadata?.createdBy || 'local'  // Default to 'local' for offline
};
```

**Step 3:** Update typeAdapter

**File:** `src/lib/services/storage/typeAdapter.ts`

```typescript
const storageProject: StoredProject = {
  id: serializedStory.id,
  name: storyData.metadata.title,
  story: serializedStory,
  metadata: {
    // ... existing fields ...
    ownerId: storyData.metadata.createdBy  // Map createdBy to ownerId
  },
  // ... rest of fields ...
  ownerId: storyData.metadata.createdBy   // ✅ ADD at project level
};
```

---

## Task 4: Update Storage Types

### Changes Needed

**File:** `src/lib/services/storage/types.ts`

1. Update Connection interface (lines 23-27) - DONE in Task 1
2. Add ownerId to ProjectMetadata if missing
3. Ensure all Date fields are properly typed

---

## Task 5: Add Data Migration Utility

### Problem
Existing projects in localStorage need migration to new format with:
- Choice IDs in connections
- Story tags array
- createdBy field

### Solution

**File:** `src/lib/services/storage/migration.ts`

Add new method:
```typescript
/**
 * Migrate project data to new format
 */
async migrateProjectData(projectId: string): Promise<MigrationResult> {
  const stored = localStorage.getItem(`whisker-project-${projectId}`);
  if (!stored) {
    return { success: false, itemsMigrated: 0, errors: ['Project not found'] };
  }

  try {
    const project: StoredProject = JSON.parse(stored);
    let migrated = 0;

    // Migrate choice IDs
    for (const passage of project.story.passages) {
      for (let i = 0; i < passage.connections.length; i++) {
        const conn = passage.connections[i];
        if (!conn.choiceId) {
          // Generate stable ID from existing data
          conn.choiceId = `migrated-${passage.id}-${i}-${this.hashString(conn.choiceText)}`;
          migrated++;
        }
      }
    }

    // Add story tags if missing
    if (!project.story.tags) {
      project.story.tags = [];
      migrated++;
    }

    // Add story metadata tags if missing
    if (!project.story.metadata.tags) {
      project.story.metadata.tags = [];
      migrated++;
    }

    // Add createdBy if missing
    if (!project.metadata.ownerId) {
      project.metadata.ownerId = 'local';
      project.ownerId = 'local';
      migrated++;
    }

    // Save updated project
    localStorage.setItem(`whisker-project-${projectId}`, JSON.stringify(project));

    return { success: true, itemsMigrated: migrated, errors: [] };
  } catch (e) {
    return { success: false, itemsMigrated: 0, errors: [String(e)] };
  }
}

/**
 * Simple string hash for stable ID generation
 */
private hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Migrate all projects in localStorage
 */
async migrateAllProjects(): Promise<MigrationResult> {
  const errors: string[] = [];
  let totalMigrated = 0;

  // Find all project keys
  const projectKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('whisker-project-')) {
      const projectId = key.replace('whisker-project-', '');
      projectKeys.push(projectId);
    }
  }

  // Migrate each project
  for (const projectId of projectKeys) {
    const result = await this.migrateProjectData(projectId);
    totalMigrated += result.itemsMigrated;
    errors.push(...result.errors);
  }

  return {
    success: errors.length === 0,
    itemsMigrated: totalMigrated,
    errors
  };
}
```

**Usage in projectStore:**

```typescript
// On app initialization
onMount(async () => {
  const migration = await getMigrationUtil();

  // Check if migration needed
  const needsMigration = await migration.needsMigration();
  if (needsMigration) {
    console.log('Migrating project data...');
    const result = await migration.migrateAllProjects();
    console.log(`Migrated ${result.itemsMigrated} items`);
    if (result.errors.length > 0) {
      console.error('Migration errors:', result.errors);
    }
  }
});
```

---

## Task 6: Update Tests

### Files to Update

1. **Choice.test.ts**
   - Add test for ID preservation in serialize/deserialize
   - Verify nanoid generation still works

2. **Passage.test.ts**
   - Test choice addition preserves IDs
   - Test serialization includes choice IDs

3. **Story.test.ts**
   - Test story tags serialization
   - Test createdBy field handling

4. **typeAdapter.test.ts** (NEW)
   - Test round-trip ID preservation
   - Test legacy format migration
   - Test condition/action preservation

5. **LocalStorageAdapter.test.ts**
   - Update save/load tests for new format
   - Test migration scenario

6. **migration.test.ts**
   - Add project migration tests
   - Test hash generation consistency

### Example Test Updates

**File:** `src/lib/models/Choice.test.ts`

```typescript
it('should preserve custom ID through serialization', () => {
  const choice = new Choice({
    id: 'custom-id-123',
    text: 'Test',
    target: 'target'
  });

  const serialized = choice.serialize();
  const deserialized = Choice.deserialize(serialized);

  expect(deserialized.id).toBe('custom-id-123');
});
```

---

## Task 7: Integration Testing

### Manual Test Checklist

- [ ] Create new story with choices
- [ ] Save and reload - verify choice IDs stable
- [ ] Add story tags, verify persistence
- [ ] Export to JSON, verify choice IDs present
- [ ] Import old project, verify migration works
- [ ] Edit choice text, verify ID unchanged
- [ ] Reorder choices, verify IDs unchanged
- [ ] Delete and recreate choice, verify new ID

### E2E Tests

Add to `tests/data-persistence.spec.ts`:

```typescript
test('choice IDs should remain stable across saves', async ({ page }) => {
  // Create story with choice
  await page.click('[data-test="add-passage"]');
  await page.click('[data-test="add-choice"]');

  // Get choice ID
  const choiceId1 = await page.getAttribute('[data-test="choice-0"]', 'data-choice-id');

  // Save and reload
  await page.click('[data-test="save-project"]');
  await page.reload();

  // Verify same ID
  const choiceId2 = await page.getAttribute('[data-test="choice-0"]', 'data-choice-id');
  expect(choiceId2).toBe(choiceId1);
});
```

---

## Task 8: Documentation

### Update Files

1. **BACKEND_COMPLIANCE_ANALYSIS.md**
   - Mark Choice ID issue as RESOLVED
   - Update compliance score

2. **README.md**
   - Document new storage format version
   - Note migration requirements

3. **CHANGELOG.md**
   - Add Phase 1 changes entry

---

## Implementation Order

### Day 1 (8 hours)
1. Task 1: Fix Choice ID stability (4 hrs)
2. Task 4: Update storage types (2 hrs)
3. Task 1: Test choice ID fixes (2 hrs)

### Day 2 (8 hours)
1. Task 2: Add story-level tags (3 hrs)
2. Task 3: Add createdBy field (2 hrs)
3. Task 5: Data migration utility (3 hrs)

### Day 3 (8 hours)
1. Task 6: Update all tests (6 hrs)
2. Task 7: Integration testing (2 hrs)

### Day 4 (6 hours)
1. Task 7: E2E testing (3 hrs)
2. Task 8: Documentation (2 hrs)
3. Final review and PR (1 hr)

---

## Rollback Plan

If issues arise:

1. **Immediate:** Revert to `main` branch
2. **Data:** Restore from localStorage backup
3. **Migration:** Add version check, skip migration if errors
4. **Fallback:** Keep choiceIndex as backup ID source

---

## Success Criteria

- [ ] All existing tests pass
- [ ] New typeAdapter tests pass
- [ ] Choice IDs stable through save/load cycles
- [ ] Story tags persist correctly
- [ ] createdBy field handled properly
- [ ] Migration runs without errors
- [ ] No data loss for existing projects
- [ ] Backend compliance score improves from 65 to 75

---

## Next Steps After Phase 1

Phase 2 will address:
- REST API adapter implementation
- Authentication layer
- Permission enforcement
- Error handling

Estimated effort: 100 hours
