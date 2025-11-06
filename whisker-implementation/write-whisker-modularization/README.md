# WriteWhisker Modularization Project

## Overview

This directory contains the planning and implementation guides for modularizing the whisker-editor-web repository into publishable npm packages.

## Project Goals

1. **Transform monolithic app** into modular workspace
2. **Publish reusable packages** to npm (`@whisker/*`)
3. **Enable external projects** (like OnboardFlow) to consume the platform
4. **Maintain AGPL-3.0** licensing throughout this repo
5. **Preserve all functionality** and test coverage

## Planning Documents

### 1. Analysis & Strategy

#### `phase1_analysis.md` (36KB)
**Comprehensive codebase analysis** including:
- Complete file structure breakdown (481 files analyzed)
- Dependency graphs (models, stores, components)
- Test distribution mapping (221 test files, 5,442 tests)
- Extraction feasibility assessments
- Blocker identification and solutions
- Revised 12-week timeline (38 PRs)

**Key Findings**:
- ✅ Clean model layer (no circular dependencies)
- ✅ Excellent test coverage (99.9% passing)
- ⚠️ projectStore mega-dependency (99 components - BLOCKER)
- ⚠️ IF systems need implementation (inventory, stats, combat)
- ⚠️ Plugin system needs to be built

### 2. Implementation Guides

#### `PHASE0_IMPLEMENTATION_GUIDE.md`
**Foundation work** (4 weeks, 16 PRs):
- Week 1: projectStore refactoring (complete code provided)
- Week 2: Plugin system (PluginManager + types)
- Week 3: IF systems implementations (Inventory, Stats, Combat)
- Week 4: Workspace setup (pnpm, turbo, changesets)
- **Effort**: 40-50 developer-days

#### `PHASE1_IMPLEMENTATION_GUIDE.md`
**Core Runtime extraction** (2 weeks, 6 PRs):
- Extract models to @whisker/core-ts
- Move validation system
- Move player runtime
- Add StoryEngine, StateManager, Evaluator
- Add WhiskerExporter (whisker-core format)
- **Effort**: 12-18 developer-days

#### `PHASE2_IMPLEMENTATION_GUIDE.md`
**Editor Base extraction** (2 weeks, 5 PRs):
- Move stores (35 stores)
- Move components (116 components in 2 batches)
- Move services (storage, GitHub, telemetry)
- Move export/import systems
- **Effort**: 14-20 developer-days

#### `PHASE3_IMPLEMENTATION_GUIDE.md`
**IF Extensions extraction** (1 week, 3 PRs):
- Package 7 IF systems as plugins (inventory, stats, combat, save/load, achievements, characters, difficulty)
- Integration testing
- Documentation
- **Effort**: 6-10 developer-days

#### `PHASE4_AND_5_IMPLEMENTATION_GUIDE.md`
**Shared UI & WriteWhisker App** (3 weeks, 8 PRs):
- Extract shared UI components
- Create design system (Tailwind config, theme)
- Setup npm publishing
- Move app to apps/writewhisker
- Configure with all plugins
- Full integration tests
- **Effort**: 14-22 developer-days

### 3. Operations & Deployment

#### `CICD_AND_PUBLISHING_GUIDE.md`
**Automation and publishing** including:
- GitHub Actions workflows (test, publish, deploy)
- Changesets configuration
- Semantic versioning strategy
- npm publishing procedures
- Vercel/Netlify/GitHub Pages deployment
- Monitoring and troubleshooting

#### `ONBOARDFLOW_ARCHITECTURE.md`
**Separate SaaS product architecture** including:
- OnboardFlow repository structure (separate private repo)
- Package dependencies (@whisker/* from npm)
- Custom plugins (analytics, embed, team, integrations, branding)
- Backend architecture (Supabase, Stripe)
- Deployment strategy
- Key differences from WriteWhisker

## Timeline

### Phase 0: Foundation (4 weeks) - IN PROGRESS
**Status**: Implementation guide complete, ready to execute

### Phase 1: Extract Core Runtime (2 weeks)
**Status**: Not started
- Move models to @whisker/core-ts
- Move validation
- Add StoryEngine, WhiskerExporter

### Phase 2: Extract Editor Base (2 weeks)
**Status**: Not started
- Move stores and components
- Move services and utilities

### Phase 3: Extract IF Extensions (1 week)
**Status**: Not started
- Package IF features as plugins

### Phase 4: Extract Shared UI (1 week)
**Status**: Not started
- Extract shared components
- Extract theme system
- Publish to npm

### Phase 5: WriteWhisker App & Polish (2 weeks)
**Status**: Not started
- Create apps/writewhisker
- Full integration testing
- Documentation
- Final publish

**Total: 12-16 weeks**

## Package Structure (Target)

```
whisker-editor-web/
├── packages/
│   ├── core-ts/              # @whisker/core-ts
│   │   └── models, validation, player, utils
│   ├── editor-base/          # @whisker/editor-base
│   │   └── stores, components, services
│   ├── if-extensions/        # @whisker/if-extensions
│   │   └── inventory, stats, combat, save/load
│   └── shared-ui/            # @whisker/shared-ui
│       └── components, theme, tailwind
├── apps/
│   └── writewhisker/         # WriteWhisker IF Editor
└── whisker-implementation/   # This directory
    └── write-whisker-modularization/
        ├── phase1_analysis.md
        ├── PHASE0_IMPLEMENTATION_GUIDE.md
        └── README.md (this file)
```

## Current Status

### ✅ Planning Complete
- ✅ Phase 1 analysis (comprehensive codebase audit)
- ✅ Phase 0 implementation guide (foundation work - 16 PRs)
- ✅ Phase 1 implementation guide (core runtime - 6 PRs)
- ✅ Phase 2 implementation guide (editor base - 5 PRs)
- ✅ Phase 3 implementation guide (IF extensions - 3 PRs)
- ✅ Phases 4-5 implementation guide (shared UI & app - 8 PRs)
- ✅ CI/CD and publishing guide (automation setup)
- ✅ OnboardFlow architecture (separate product planning)
- ✅ Dependency mapping and risk assessment
- ✅ Timeline estimation (12-16 weeks, 38 PRs)

### 📦 Deliverables Summary
- **8 comprehensive guides** totaling ~50,000+ words
- **38 PRs planned** with detailed implementation steps
- **Complete code** for Phase 0 Week 1 (new stores)
- **Architecture diagrams** and data flow documentation
- **CI/CD workflows** ready to implement
- **OnboardFlow blueprint** ready to build (separate repo)

### ⏳ Ready for Execution
All planning is complete. Ready to begin implementation when approved.

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **Files** | 481 | Split across 4+ packages |
| **Lines of Code** | ~170,000 | ~115,000 (after extraction) |
| **Test Files** | 221 | 223 (add 2 for IF systems) |
| **Tests** | 5,442 | 5,542+ (add 100 for IF systems) |
| **Test Pass Rate** | 99.9% | 100% |
| **Packages** | 1 | 5 (@whisker/*) |
| **projectStore Dependencies** | 99 components | 0 (refactored to focused stores) |

## Critical Blockers

### 1. projectStore Mega-Dependency
**Impact**: Blocks all package extraction
**Status**: Implementation guide complete (Week 1)
**Effort**: 15-20 days, 99 components to migrate

### 2. IF Systems Not Implemented
**Impact**: Can't create @whisker/if-extensions
**Status**: Implementation guide ready (Week 3)
**Effort**: 20-25 days, need full implementations

### 3. Plugin System Doesn't Exist
**Impact**: Can't make features pluggable
**Status**: Design complete (Week 2)
**Effort**: 10-15 days

## Success Criteria

- ✅ All 5,442 tests pass
- ✅ WriteWhisker app works identically
- ✅ Zero circular dependencies
- ✅ Packages published to npm
- ✅ Plugin system validated
- ✅ OnboardFlow can install packages
- ⚠️ Build time < 1 minute (need to measure)

## Next Steps

### For Immediate Execution

1. **Review implementation guide** - `PHASE0_IMPLEMENTATION_GUIDE.md`
2. **Start PR #1** - Create new focused stores
3. **Run full test suite** after each PR
4. **Manual testing** after each major change

### For Planning

1. Create detailed guides for Phases 1-5
2. Set up CI/CD for package publishing
3. Design OnboardFlow architecture
4. Plan npm package versioning strategy

## Resources

- **Original Prompt**: `~/final_modularization_prompt.md`
- **Analysis Report**: `phase1_analysis.md`
- **Implementation Guide**: `PHASE0_IMPLEMENTATION_GUIDE.md`
- **Repository**: https://github.com/writewhisker/whisker-editor-web

## License

All code in whisker-editor-web repository remains **AGPL-3.0**.

OnboardFlow (separate repository) can use proprietary license when consuming published @whisker/* packages.

---

**Last Updated**: 2025-11-06
**Status**: Phase 0 implementation guide complete, ready to begin execution
**Est. Completion**: 12-16 weeks from start
