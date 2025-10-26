# Phase 2: Svelte Stores Integration - Design Document

## Overview

Integrate the Phase 1 storage adapter layer with the existing Svelte stores to add persistence, auto-save, and cloud-ready architecture while preserving all existing functionality and E2E tests.

## Current State Analysis

### Existing `projectStore.ts`
- **In-memory only**: Data lost on page refresh
- **Features**:
  - Story/passage/variable management
  - Undo/redo with history
  - Selection state
  - Unsaved changes tracking
- **API**: Used by 20+ components
- **Tests**: 50+ E2E tests depend on this API

### Phase 1 Storage Layer
- **LocalStorage adapter**: 608 lines, 100% tested
- **Factory pattern**: Supports multiple backends
- **Features**:
  - Project CRUD
  - Auto-save
  - Versioning/conflicts
  - Preferences

## Type Mismatch Challenge

**Two `ProjectData` types exist:**

1. `src/lib/models/types.ts` (Editor format):
```typescript
interface ProjectData extends StoryData {
  version: string; // Editor format version
}

interface StoryData {
  metadata: StoryMetadata;
  startPassage: string;
  passages: Record<string, PassageData>;
  variables: Record<string, VariableData>;
}
```

2. `src/lib/services/storage/types.ts` (Storage format):
```typescript
interface ProjectData {
  id: string;
  name: string;
  story: SerializedStory;
  metadata: ProjectMetadata;
  version: number; // Storage version
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Strategy

### Option A: Rename Types (RECOMMENDED)
- Rename storage `ProjectData` → `StoredProject`
- Keep model `ProjectData` as-is
- Minimal changes to existing code
- Clear separation of concerns

### Option B: Type Adapter Layer
- Create `typeAdapter.ts` to convert between formats
- More complex but more flexible
- Allows independent evolution

**Decision**: Use Option A for simplicity

## Phase 2 Tasks

### Task 1: Rename Storage Types
**File**: `src/lib/services/storage/types.ts`
- `ProjectData` → `StoredProject`
- Update all storage adapter code
- Update all tests
- Re-run storage tests (should remain 90/90)

### Task 2: Add Persistence to projectStore
**File**: `src/lib/stores/projectStore.ts`

Add:
```typescript
import { getDefaultStorageAdapter } from '../services/storage/StorageServiceFactory';
import type { StoredProject } from '../services/storage/types';

// Initialize storage
let storage: IStorageAdapter | null = null;
let currentProjectId: string | null = null;

// Initialize on module load
(async () => {
  try {
    storage = await getDefaultStorageAdapter();
    // Try to load last opened project
    await loadLastProject();
  } catch (err) {
    console.error('Storage initialization failed:', err);
  }
})();
```

### Task 3: Add Auto-Save
Add debounced auto-save:
```typescript
let autoSaveTimeout: number | null = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

function scheduleAutoSave() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    await autoSaveProject();
  }, AUTO_SAVE_DELAY);
}

// Call scheduleAutoSave() after each story modification
```

### Task 4: Add Save Status Indicator
**New file**: `src/lib/stores/saveStatusStore.ts`
```typescript
export const saveStatus = writable<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
export const lastSaved = writable<Date | null>(null);
```

### Task 5: Modify projectActions
Update each action to:
1. Call `scheduleAutoSave()` after changes
2. Update `saveStatus` appropriately
3. Handle storage errors gracefully

### Task 6: Add Storage-Backed Methods
```typescript
async loadLastProject(): Promise<void>
async autoSaveProject(): Promise<void>
async saveProjectToStorage(): Promise<void>
async loadProjectFromStorage(id: string): Promise<void>
async listStoredProjects(): Promise<ProjectMetadata[]>
```

### Task 7: Preserve Existing API
All existing exports remain unchanged:
- `currentStory`
- `currentFilePath`
- `unsavedChanges`
- `selectedPassageId`
- `passageList`
- `variableList`
- `selectedPassage`
- `projectActions.*`

## Testing Strategy

### Unit Tests
1. Storage adapter tests (already 90/90 ✓)
2. New: projectStore persistence tests
3. New: Auto-save debouncing tests
4. New: Type adapter tests (if using Option B)

### E2E Tests
**Goal**: 100% of existing E2E tests must pass

Current E2E test status needs verification:
- Story creation
- Passage CRUD
- Connections
- Tagging
- Undo/redo
- Graph view

### Migration Testing
1. Create project in old format
2. Verify loads in new format
3. Verify saves in new format
4. Verify no data loss

## Edge Cases to Handle

1. **Storage unavailable**: Graceful degradation to in-memory only
2. **Quota exceeded**: Clear old auto-saves, warn user
3. **Version conflicts**: Show merge dialog (future)
4. **Corrupted data**: Fall back to auto-save or show error
5. **Multiple tabs**: Detect changes via storage events
6. **Network errors**: Queue saves for retry

## Rollout Plan

### Phase 2.1: Foundation (This PR)
- Rename storage types
- Add storage initialization
- Add project load/save
- **No auto-save yet**
- Manual save only

### Phase 2.2: Auto-Save (Next PR)
- Add debounced auto-save
- Add save status indicator
- Add conflict detection

### Phase 2.3: Multi-Project (Future)
- Project list UI
- Project switching
- Project deletion
- Import/export

### Phase 2.4: Cloud Sync (Future)
- Firebase adapter
- Real-time collaboration
- Offline sync

## Files to Modify

1. `src/lib/services/storage/types.ts` - Rename types
2. `src/lib/services/storage/LocalStorageAdapter.ts` - Update type references
3. `src/lib/services/storage/LocalStorageAdapter.test.ts` - Update type references
4. `src/lib/services/storage/StorageServiceFactory.ts` - Update type references
5. `src/lib/services/storage/StorageServiceFactory.test.ts` - Update type references
6. `src/lib/stores/projectStore.ts` - Add storage backend
7. `src/lib/stores/saveStatusStore.ts` - New file for save status
8. (Optional) `src/lib/components/SaveIndicator.svelte` - New component

## Success Criteria

- [ ] All 90 storage adapter tests pass
- [ ] All E2E tests pass
- [ ] Projects persist across page refresh
- [ ] No breaking changes to component API
- [ ] Auto-save works with 2s debounce
- [ ] Save status visible to user
- [ ] Graceful error handling
- [ ] No console errors in normal usage

## Timeline Estimate

- **Phase 2.1**: 4-6 hours
- **Phase 2.2**: 2-3 hours
- **Phase 2.3**: 4-6 hours
- **Phase 2.4**: 8-12 hours

**Total Phase 2**: ~18-27 hours

## Notes

- Keep commits small and focused
- Test after each change
- Document any breaking changes
- Update E2E tests if needed
- Preserve undo/redo functionality
- Maintain backward compatibility
