# Phase 2.1 Implementation Guide - Storage Foundation

## Quick Summary

Phase 2.1 adds localStorage persistence to the project store WITHOUT auto-save. Manual save only.

**Goal**: Projects persist across page refresh
**Constraint**: No breaking changes to existing component API
**Time Estimate**: 4-6 hours

## Step 1: Rename Storage Types (30 min)

This prevents conflicts between model `ProjectData` and storage `ProjectData`.

### Files to modify:

**1. `src/lib/services/storage/types.ts`**
```typescript
// Change line 38-50
export interface StoredProject {  // was: ProjectData
  id: string;
  name: string;
  story: SerializedStory;
  metadata: ProjectMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
  permissions?: ProjectPermissions;
}
```

**2. `src/lib/services/storage/LocalStorageAdapter.ts`**
- Find/replace: `ProjectData` → `StoredProject` (import and all usages)
- Update line 11: `import type { StoredProject, ...`

**3. `src/lib/services/storage/LocalStorageAdapter.test.ts`**
- Find/replace: `ProjectData` → `StoredProject`
- Update import

**4. `src/lib/services/storage/StorageServiceFactory.test.ts`**
- No changes needed (doesn't use ProjectData)

**5. `src/lib/services/storage/testHelpers.ts`**
- Line 125: `export function createMockProject(): StoredProject`
- Update return type

### Verify:
```bash
npm test -- src/lib/services/storage/
# Should show: 90/90 tests passing
```

## Step 2: Update Type Adapter (15 min)

**File**: `src/lib/services/storage/typeAdapter.ts`

Already created, but update imports:
```typescript
import type {
  StoredProject,  // was: ProjectData as StorageProjectData
  SerializedStory
} from './types';
```

Update function signatures:
```typescript
export function modelToStorage(modelData: ModelProjectData): StoredProject
export function storageToModel(storageData: StoredProject): ModelProjectData
```

## Step 3: Add Storage to projectStore (2-3 hours)

**File**: `src/lib/stores/projectStore.ts`

### 3a. Add imports (top of file):
```typescript
import { getDefaultStorageAdapter } from '../services/storage/StorageServiceFactory';
import type { IStorageAdapter } from '../services/storage/types';
import { modelToStorage, storageToModel } from '../services/storage/typeAdapter';
```

### 3b. Add storage state (after line 12):
```typescript
// Storage state
let storageAdapter: IStorageAdapter | null = null;
let currentProjectId: string | null = null;
let storageReady = false;

// Storage initialization
(async () => {
  try {
    storageAdapter = await getDefaultStorageAdapter();
    storageReady = true;
    console.log('Storage initialized successfully');

    // Try to load last project from localStorage preference
    const lastProjectId = localStorage.getItem('whisker-last-project-id');
    if (lastProjectId && storageAdapter) {
      try {
        const storedProject = await storageAdapter.loadProject(lastProjectId);
        if (storedProject) {
          const modelData = storageToModel(storedProject);
          projectActions.loadProject(modelData);
          currentProjectId = lastProjectId;
          console.log(`Loaded last project: ${storedProject.name}`);
        }
      } catch (err) {
        console.warn('Could not load last project:', err);
      }
    }
  } catch (err) {
    console.error('Storage initialization failed, running in-memory mode:', err);
    storageReady = false;
  }
})();
```

### 3c. Add storage helper methods (before projectActions):
```typescript
/**
 * Save current project to storage
 */
async function saveToStorage(): Promise<void> {
  if (!storageAdapter || !storageReady) {
    console.warn('Storage not available, skipping save');
    return;
  }

  const story = get(currentStory);
  if (!story) {
    console.warn('No story to save');
    return;
  }

  try {
    const modelData = story.serializeProject();
    const storedProject = modelToStorage(modelData);

    // If we have a current project ID, update version
    if (currentProjectId) {
      storedProject.id = currentProjectId;
      const existing = await storageAdapter.loadProject(currentProjectId);
      if (existing) {
        storedProject.version = existing.version;
      }
    }

    const result = await storageAdapter.saveProject(storedProject);
    if (result.success && result.projectId) {
      currentProjectId = result.projectId;
      // Remember last project
      localStorage.setItem('whisker-last-project-id', result.projectId);
      console.log('Project saved to storage:', result.projectId);
      unsavedChanges.set(false);
    }
  } catch (err) {
    console.error('Failed to save to storage:', err);
    // Don't throw - allow app to continue working
  }
}

/**
 * Load project from storage by ID
 */
async function loadFromStorage(projectId: string): Promise<void> {
  if (!storageAdapter || !storageReady) {
    throw new Error('Storage not available');
  }

  const storedProject = await storageAdapter.loadProject(projectId);
  if (!storedProject) {
    throw new Error(`Project ${projectId} not found`);
  }

  const modelData = storageToModel(storedProject);
  projectActions.loadProject(modelData);
  currentProjectId = projectId;
  localStorage.setItem('whisker-last-project-id', projectId);
}
```

### 3d. Update projectActions.saveProject (line 80):
```typescript
saveProject(): ProjectData | null {
  let data: ProjectData | null = null;
  currentStory.update(story => {
    if (story) {
      story.updateModified();
      data = story.serializeProject();
      unsavedChanges.set(false);
    }
    return story;
  });

  // Save to storage (async, non-blocking)
  if (data) {
    saveToStorage().catch(err => {
      console.error('Storage save failed:', err);
    });
  }

  return data;
},
```

### 3e. Update projectActions.newProject (line 41):
```typescript
newProject(title?: string) {
  const story = new Story({
    metadata: {
      title: title || 'Untitled Story',
      author: '',
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  });
  currentStory.set(story);
  currentFilePath.set(null);
  unsavedChanges.set(false);

  // Reset storage tracking for new project
  currentProjectId = null;

  // Initialize history with the new story state
  historyActions.setPresent(story.serialize());

  // Select the start passage
  const startPassage = Array.from(story.passages.values())[0];
  if (startPassage) {
    selectedPassageId.set(startPassage.id);
  }

  // Auto-save new project to storage
  saveToStorage().catch(err => {
    console.error('Failed to save new project:', err);
  });
},
```

### 3f. Add new actions to projectActions (end of object):
```typescript
// Storage operations
async saveToStorage() {
  await saveToStorage();
},

async loadFromStorage(projectId: string) {
  await loadFromStorage(projectId);
},

async listProjects() {
  if (!storageAdapter || !storageReady) {
    return [];
  }
  return await storageAdapter.listProjects();
},
```

## Step 4: Test Manually (30 min)

1. **Start dev server**: `npm run dev`
2. **Create new project**:
   - Open browser console
   - Create a story with a few passages
   - Check console for "Project saved to storage" message
3. **Refresh page**:
   - Story should reload automatically
   - All passages should be intact
4. **Check localStorage**:
   - Open DevTools → Application → Local Storage
   - Should see keys like `whisker-project-*`

## Step 5: Run E2E Tests (30 min)

```bash
npm run test:e2e
```

**Expected**: All existing tests should still pass

**If tests fail**: The store API hasn't changed, so failures likely indicate:
- Storage initialization timing issues
- Need to wait for storage to be ready
- Auto-load interfering with test setup

**Fix**: Add a way to disable auto-load in test mode:
```typescript
const isTestMode = import.meta.env.MODE === 'test';
if (!isTestMode && lastProjectId) {
  // auto-load logic
}
```

## Step 6: Create Save Status Store (15 min)

**New file**: `src/lib/stores/saveStatusStore.ts`

```typescript
import { writable } from 'svelte/store';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export const saveStatus = writable<SaveStatus>('saved');
export const lastSaved = writable<Date | null>(null);
export const saveError = writable<string | null>(null);
```

Update `saveToStorage()` to use these:
```typescript
import { saveStatus, lastSaved, saveError } from './saveStatusStore';

// At start of saveToStorage:
saveStatus.set('saving');

// On success:
saveStatus.set('saved');
lastSaved.set(new Date());
saveError.set(null);

// On error:
saveStatus.set('error');
saveError.set(err.message);
```

## Step 7: Optional - Add Save Indicator Component

**New file**: `src/lib/components/SaveIndicator.svelte` (if desired)

```svelte
<script lang="ts">
  import { saveStatus, lastSaved } from '../stores/saveStatusStore';

  $: statusText = {
    saved: 'All changes saved',
    saving: 'Saving...',
    unsaved: 'Unsaved changes',
    error: 'Save failed'
  }[$saveStatus];
</script>

<div class="save-indicator" class:error={$saveStatus === 'error'}>
  <span>{statusText}</span>
  {#if $lastSaved}
    <span class="timestamp">
      {$lastSaved.toLocaleTimeString()}
    </span>
  {/if}
</div>

<style>
  .save-indicator {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  .save-indicator.error {
    color: var(--error-color);
  }
</style>
```

## Commit Checklist

- [ ] All storage types renamed
- [ ] 90/90 storage tests passing
- [ ] Storage initialized in projectStore
- [ ] Projects persist across refresh
- [ ] E2E tests still passing
- [ ] Save status store created
- [ ] Console has no errors
- [ ] No breaking changes to component API

## Commit Message

```
feat: Phase 2.1 - Add localStorage persistence foundation

Integrated Phase 1 storage adapter with Svelte stores to enable project persistence:

**Type Renaming:**
- Renamed storage `ProjectData` → `StoredProject` to avoid conflicts
- Updated all storage adapters and tests
- Storage tests: 90/90 passing ✓

**Storage Integration:**
- Initialize storage adapter on app startup
- Auto-load last project on app startup
- Save projects to localStorage on save action
- Added type adapter to convert between model and storage formats

**New Features:**
- Projects persist across page refresh
- Last opened project auto-loads
- Manual save to localStorage
- Save status tracking (saved/saving/unsaved/error)

**Backward Compatibility:**
- No breaking changes to component API
- All existing exports unchanged
- E2E tests remain compatible
- Graceful degradation if storage unavailable

**Phase 2.1 Complete - Foundation laid for:**
- Phase 2.2: Auto-save with debouncing
- Phase 2.3: Multi-project management
- Phase 2.4: Cloud sync

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Troubleshooting

### Storage tests fail after renaming
- Check all imports are updated
- Search for remaining `ProjectData` references in storage files
- Run `npm test -- src/lib/services/storage/` to isolate

### E2E tests fail
- Check browser console for errors
- Verify auto-load isn't interfering with test setup
- Add test mode flag to disable auto-load

### Project doesn't persist
- Check DevTools → Console for save errors
- Check DevTools → Application → Local Storage
- Verify storage initialization succeeded

### Type errors
- Ensure `modelToStorage` and `storageToModel` are correctly typed
- Check that Story.serializeProject() returns correct ModelProjectData

## Next Steps (Phase 2.2)

After Phase 2.1 is complete and merged:
1. Add debounced auto-save (save 2s after last change)
2. Show save indicator in UI
3. Handle storage quota errors gracefully
4. Add conflict detection for multi-tab scenarios
