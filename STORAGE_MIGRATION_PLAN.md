# Storage Service Cleanup and Migration Plan

## Current State

**Size**: 248K (7,505 lines) in editor-base/src/services/storage/
**Storage Package**: 1,358 lines in packages/storage/

## Analysis Summary

The storage logic is currently split between two locations:
1. **packages/storage/** - Framework-agnostic storage layer (IndexedDB, LocalStorage backends)
2. **packages/editor-base/src/services/storage/** - Editor-specific adapters, preference service, sync queue

## Key Findings

### 1. Type Duplication
- `PreferenceEntry` defined in both locations with slight differences:
  - **storage**: `updatedAt: string`
  - **editor-base**: `updatedAt: Date`
- `PreferenceScope` type duplicated
- `SyncQueueEntry` type in storage package, but service implementation in editor-base

### 2. SyncQueueService Status
✅ **Already using storage package** - Good news! The `syncQueue.ts` in editor-base is already a thin wrapper around `@writewhisker/storage`.

Located at: `packages/editor-base/src/services/storage/syncQueue.ts` (155 lines)

### 3. PreferenceService
❌ **Tightly coupled to editor-base** - Depends on `IStorageAdapter` which is editor-specific.

Located at: `packages/editor-base/src/services/storage/PreferenceService.ts` (359 lines)

Key dependencies:
- Uses `IStorageAdapter` (project-centric interface)
- Uses `StorageServiceFactory` from editor-base
- Has backward compatibility with localStorage
- Provides both sync and async API

### 4. Adapters

Two separate adapter patterns exist:
- **IStorageBackend** (storage package) - Story-centric, framework-agnostic
- **IStorageAdapter** (editor-base) - Project-centric, editor-specific

## Migration Strategy

### Phase 1: Type Unification (Low Risk)

**Goal**: Use storage package types consistently

**Actions**:
1. Fix `PreferenceEntry.updatedAt` type mismatch
   - Option A: Change storage package to use `Date` instead of `string`
   - Option B: Add conversion layer in editor-base
   - **Recommendation**: Keep `string` in storage (JSON-serializable), convert in editor-base

2. Remove duplicate type definitions from editor-base
   - Use `PreferenceScope` from `@writewhisker/storage`
   - Use `PreferenceEntry` from `@writewhisker/storage` (with conversion)
   - Use `SyncQueueEntry` from `@writewhisker/storage`

**Files to modify**:
- `packages/editor-base/src/services/storage/types.ts` - Remove duplicates
- `packages/editor-base/src/services/storage/PreferenceService.ts` - Import from storage package

**Testing**:
- Verify preferences load/save correctly
- Check sync queue operations
- Test backward compatibility with existing data

### Phase 2: Enhanced Storage Package (Medium Risk)

**Goal**: Add SyncQueueService to storage package

**Current**: SyncQueue logic is split:
- Type definition in `packages/storage/`
- Service implementation in `packages/editor-base/`

**Actions**:
1. Move `SyncQueueService` class to `packages/storage/src/services/SyncQueueService.ts`
2. Remove error handling dependency (or make it optional)
3. Export from `packages/storage/src/index.ts`
4. Update editor-base to import from storage package

**Files to create**:
```
packages/storage/src/services/
└── SyncQueueService.ts  (move from editor-base)
```

**Files to modify**:
- `packages/storage/src/index.ts` - Export SyncQueueService
- `packages/editor-base/src/services/storage/syncQueue.ts` - Re-export from storage

**Testing**:
- Test sync queue enqueue/dequeue
- Test retry logic
- Verify error handling works (may need to make it optional/pluggable)

### Phase 3: PreferenceService Migration (High Risk)

**Goal**: Make PreferenceService framework-agnostic and move to storage package

**Challenges**:
- Currently depends on `IStorageAdapter` (editor-specific)
- Has localStorage fallback (browser-specific)
- Singleton pattern tied to editor initialization

**Options**:

#### Option A: Keep PreferenceService in editor-base
**Pros**: Lower risk, maintains current architecture
**Cons**: Storage package remains incomplete for preferences

#### Option B: Create generic preference layer in storage package
**Pros**: Reusable across applications
**Cons**: Complex refactoring, backward compatibility issues

**Recommendation**: **Option B** with the following approach:

1. Create `PreferenceManager` in storage package
   ```typescript
   // packages/storage/src/services/PreferenceManager.ts
   export class PreferenceManager {
     constructor(private backend: IStorageBackend) {}

     async get<T>(key: string, defaultValue: T, scope: PreferenceScope): Promise<T>
     async set<T>(key: string, value: T, scope: PreferenceScope): Promise<void>
     async delete(key: string, scope: PreferenceScope): Promise<void>
     async list(scope: PreferenceScope): Promise<string[]>
     async clear(scope: PreferenceScope): Promise<void>
   }
   ```

2. Keep `PreferenceService` in editor-base as a wrapper
   - Delegates to `PreferenceManager` from storage package
   - Provides sync API and localStorage fallback
   - Maintains backward compatibility

**Files to create**:
```
packages/storage/src/services/
└── PreferenceManager.ts  (new generic implementation)
```

**Files to modify**:
- `packages/storage/src/index.ts` - Export PreferenceManager
- `packages/editor-base/src/services/storage/PreferenceService.ts` - Use PreferenceManager

**Testing**:
- Test preference CRUD operations
- Test scope isolation (global vs user vs project)
- Test migration from old localStorage format
- Test sync/async API compatibility

### Phase 4: Cleanup and Documentation (Low Risk)

**Goal**: Remove legacy code and improve documentation

**Actions**:
1. Remove CloudStorageAdapter stub (50 lines of incomplete code)
   - OR complete the implementation
   - OR move to separate package when ready

2. Consolidate migration utilities
   - `LegacyDataMigration.ts` (storage package) - IndexedDB whisker-data migration
   - `migration.ts` (editor-base) - localStorage preferences migration
   - `modernStoryMigration.ts` (editor-base) - story format migration
   - Document the purpose and order of each

3. Remove background sync from storage concerns
   - Move `backgroundSync.ts` to UI layer or separate package
   - Too Svelte-specific for storage package
   - GitHub-specific logic should be in github package

4. Update documentation
   - Add migration guide
   - Document IStorageBackend vs IStorageAdapter
   - Provide usage examples

**Files to modify**:
- `packages/editor-base/src/services/storage/CloudStorageAdapter.ts` - Remove or complete
- `packages/storage/README.md` - Update with migration guide
- Add JSDoc comments to all public APIs

## Implementation Order

### Immediate (Can be done now)
1. ✅ Type unification (Phase 1)
2. ✅ SyncQueueService migration (Phase 2)
3. Update documentation

### Short-term (Next sprint)
4. PreferenceManager migration (Phase 3)
5. Remove CloudStorageAdapter stub (Phase 4)

### Medium-term (Future consideration)
6. Consolidate migration utilities
7. Extract background sync to separate package
8. Consider REST API, Firebase, Supabase adapters

## Files to Modify Summary

### High Priority
| File | Action | Complexity |
|------|--------|-----------|
| packages/storage/src/services/SyncQueueService.ts | Create (move from editor-base) | Low |
| packages/storage/src/index.ts | Export SyncQueueService | Low |
| packages/editor-base/src/services/storage/types.ts | Remove duplicate types | Low |
| packages/editor-base/src/services/storage/PreferenceService.ts | Import from storage | Medium |

### Medium Priority
| File | Action | Complexity |
|------|--------|-----------|
| packages/storage/src/services/PreferenceManager.ts | Create new generic implementation | High |
| packages/editor-base/src/services/storage/CloudStorageAdapter.ts | Remove stub | Low |
| packages/storage/README.md | Update documentation | Low |

### Lower Priority
| File | Action | Complexity |
|------|--------|-----------|
| packages/editor-base/src/services/storage/backgroundSync.ts | Extract to UI layer | Medium |
| packages/editor-base/src/services/storage/migration.ts | Consolidate or clarify | Medium |

## Testing Strategy

1. **Unit Tests**
   - Test PreferenceManager in isolation
   - Test SyncQueueService with mock backend
   - Test type conversions

2. **Integration Tests**
   - Test editor-base integration with new storage services
   - Test data migration from old formats
   - Test backward compatibility

3. **E2E Tests**
   - Test preference persistence across sessions
   - Test sync queue with real GitHub operations
   - Test offline/online scenarios

## Risks and Mitigation

### Risk 1: Breaking Changes for Users
**Mitigation**:
- Keep backward compatibility layer
- Test migration with real user data
- Provide rollback mechanism

### Risk 2: Performance Regression
**Mitigation**:
- Benchmark before/after
- Keep caching layer in PreferenceService
- Monitor storage operations in production

### Risk 3: Type Mismatches
**Mitigation**:
- Add conversion utilities
- Use TypeScript strict mode
- Add runtime validation where needed

## Success Criteria

- [ ] All storage types imported from single source
- [ ] SyncQueueService in storage package
- [ ] PreferenceManager in storage package
- [ ] No duplicate code between packages
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No performance regression

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feature/storage-migration`
3. Implement Phase 1 (type unification)
4. Implement Phase 2 (SyncQueueService migration)
5. Create PR for review
6. Plan Phase 3 implementation

---

**Last Updated**: 2025-11-17
**Status**: Planning Phase
**Estimated Effort**: 3-5 days for Phases 1-2, 5-8 days for Phase 3
