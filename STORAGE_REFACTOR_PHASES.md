# Storage Refactor - Phased Approach

This document outlines a phased approach to complete the storage refactor, replacing the old IndexedDBAdapter with the new @writewhisker/storage architecture.

## Current State (Completed in PR #112)

✅ **Phase 0: Story Storage Migration**
- Created @writewhisker/storage package with framework-agnostic architecture
- Implemented IndexedDBBackend and LocalStorageBackend for story storage
- Created SvelteStorageAdapter for Svelte integration
- Implemented ModernStoryMigration for migrating stories from old storage
- All stories now use new storage system
- Old IndexedDBAdapter still used for: GitHub tokens, preferences, sync queue

## Remaining Phases

### Phase 1: Extend Storage Interface (Small PR)

**Goal**: Add support for key-value storage without breaking existing functionality

**Changes**:
- Extend `IStorageBackend` interface with optional methods for:
  - Preferences (savePreference, loadPreference, deletePreference, listPreferences)
  - Sync Queue (addToSyncQueue, getSyncQueue, removeFromSyncQueue, clearSyncQueue)
  - GitHub Tokens (saveGitHubToken, loadGitHubToken, deleteGitHubToken)
- Make new methods optional to avoid breaking LocalStorageBackend
- Export new types: PreferenceScope, SyncQueueEntry, GitHubTokenData

**Size**: ~50 lines of interface changes
**Risk**: Low - No implementation changes, backwards compatible

---

### Phase 2: Implement IndexedDB Extensions (Medium PR)

**Goal**: Implement new storage methods in IndexedDBBackend

**Changes**:
- Update IndexedDBBackend to implement new optional methods
- Increment DB version from 1 to 2
- Add object stores: preferences, syncQueue, githubTokens
- Implement all preference, sync queue, and GitHub token methods
- Add proper type exports to package index

**Size**: ~200 lines in IndexedDBBackend
**Risk**: Medium - Database migration required, but isolated to new stores
**Testing**: Unit tests for each new method

---

### Phase 3: Create Legacy Data Migration (Medium PR)

**Goal**: Migrate data from old IndexedDBAdapter to new storage

**Changes**:
- Create `LegacyStorageMigration` class similar to ModernStoryMigration
- Migrate preferences from old `whisker-storage` DB to new `whisker-stories` DB
- Migrate sync queue entries
- Migrate GitHub tokens
- Add migration progress callbacks
- Integrate migration into initializeApp()

**Size**: ~300 lines for migration logic
**Risk**: Medium - Data migration is critical, needs thorough testing
**Testing**:
- Unit tests for migration logic
- E2E tests for data integrity
- Rollback capability in case of errors

---

### Phase 4: Update GitHub Auth Service (Small PR)

**Goal**: Replace old IndexedDBAdapter with new storage in githubAuth

**Changes**:
- Update `packages/editor-base/src/services/github/githubAuth.ts`
- Replace `IndexedDBAdapter` with `StorageService` from @writewhisker/storage
- Use `saveGitHubToken()` and `loadGitHubToken()` methods
- Update tests

**Size**: ~50 lines changed
**Risk**: Low - Isolated to one service
**Testing**: GitHub auth flow E2E tests

---

### Phase 5: Update Sync Queue Service (Small PR)

**Goal**: Replace old IndexedDBAdapter with new storage in syncQueue

**Changes**:
- Update `packages/editor-base/src/services/storage/syncQueue.ts`
- Replace `IndexedDBAdapter` with `StorageService` from @writewhisker/storage
- Use sync queue methods from new interface
- Update tests

**Size**: ~50 lines changed
**Risk**: Low - Isolated to one service
**Testing**: Sync queue E2E tests

---

### Phase 6: Update Preference Service (Small PR)

**Goal**: Create or update preference service to use new storage

**Changes**:
- Update any preference-related code to use new storage methods
- Ensure preference scopes (global vs story) work correctly
- Update tests

**Size**: ~50-100 lines
**Risk**: Low - Preferences are non-critical
**Testing**: Preference save/load tests

---

### Phase 7: Remove Old IndexedDBAdapter (Cleanup PR)

**Goal**: Remove old IndexedDBAdapter once all services migrated

**Changes**:
- Delete `packages/editor-base/src/services/storage/IndexedDBAdapter.ts`
- Delete `packages/editor-base/src/services/storage/IndexedDBAdapter.test.ts`
- Remove old imports
- Update App.svelte to remove legacy db initialization
- Cleanup old migration code (storyMigration.ts)

**Size**: ~500 lines deleted
**Risk**: Low - Only deletions, all functionality replaced
**Testing**: Full E2E test suite should pass

---

## Alternative: Combined Approach

If preferred, Phases 1-3 could be combined into a single larger PR (~550 lines):
- Extend interface
- Implement in IndexedDBBackend
- Add migration logic

Then Phases 4-7 as separate small PRs to reduce risk.

## Rollback Strategy

Each phase should be independently reversible:
- Phase 1: Pure interface extension, can be left unused
- Phase 2: New DB stores don't affect existing functionality
- Phase 3: Migration can be disabled via flag
- Phases 4-6: Can revert to old IndexedDBAdapter if issues
- Phase 7: Keep old code in branch until confident

## Testing Strategy

For each phase:
1. Unit tests for new functionality
2. Integration tests for data migration
3. E2E tests for user-facing features
4. Manual testing of critical paths (auth, sync, save)

## Estimated Timeline

- Phase 1: 1-2 hours
- Phase 2: 3-4 hours
- Phase 3: 4-6 hours (most complex)
- Phase 4: 1-2 hours
- Phase 5: 1-2 hours
- Phase 6: 2-3 hours
- Phase 7: 1-2 hours

**Total**: 15-22 hours for complete refactor

## Recommendation

Start with **Phase 1** as a small, low-risk PR to validate the interface design. Then proceed with Phase 2 to prove out the implementation before tackling the more complex migration in Phase 3.
