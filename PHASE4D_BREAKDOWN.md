# Phase 4D: Publishing & Hosting - Implementation Plan

**Goal:** One-click publishing to the web with platform integrations

**Status:** 🚧 In Progress
**Estimated Time:** 16-22 hours
**Current Progress:** Stage 1.1 complete, 1.2-3.5 pending

---

## Overview

Enable authors to easily publish and share their stories through:
1. Static site generation with embedded player
2. Direct platform integrations (itch.io, GitHub Pages)
3. Sharing tools (links, embeds, QR codes)

---

## Stage 1: Static Site Generator (6-8 hours)

### Goal
Generate standalone HTML files with embedded whisker player that can be hosted anywhere.

### Tasks

#### 1.1 Create StaticSiteExporter (2-3 hours)
**File:** `src/lib/export/formats/StaticSiteExporter.ts`

Features:
- Generate single HTML file with embedded player
- Inline all assets (CSS, JS, story data)
- Configurable player options
- Responsive design
- Mobile-friendly
- Offline-capable (service worker optional)

#### 1.2 Create Player Template (2-3 hours)
**File:** `src/lib/export/templates/player-template.html`

Features:
- Clean, minimal design
- Dark/light theme toggle
- Save/load game state
- History navigation
- Settings panel
- Social media meta tags
- SEO-friendly structure

#### 1.3 Asset Bundler (1-2 hours)
**File:** `src/lib/export/utils/assetBundler.ts`

Features:
- Convert images to base64
- Minify CSS/JS
- Bundle story data
- Generate source maps (optional)

#### 1.4 Tests (1 hour)
- 10+ tests for StaticSiteExporter
- Test HTML generation
- Test asset embedding
- Test player functionality

**Deliverables:**
- StaticSiteExporter class
- Player HTML template
- Asset bundling utilities
- 10+ tests

---

## Stage 2: Platform Integrations (6-8 hours)

### Goal
Direct publishing to popular IF platforms.

### Tasks

#### 2.1 itch.io Integration (3-4 hours)
**Files:**
- `src/lib/publishing/ItchIoPublisher.ts`
- `src/lib/publishing/types.ts`

Features:
- OAuth authentication
- Direct file upload via itch.io API
- Project creation/update
- Version management
- Metadata sync (title, description, cover image)
- Visibility settings (draft/published)

API Endpoints:
- `POST /api/1/{user}/games` - Create game
- `PATCH /api/1/game/{game_id}` - Update game
- `POST /api/1/upload/{game_id}` - Upload build

#### 2.2 GitHub Pages Integration (2-3 hours)
**File:** `src/lib/publishing/GitHubPublisher.ts`

Features:
- GitHub OAuth
- Repository creation/selection
- Push to gh-pages branch
- Custom domain configuration
- HTTPS enforcement
- Build status tracking

API Endpoints:
- `POST /user/repos` - Create repository
- `PUT /repos/{owner}/{repo}/contents/{path}` - Upload files
- `POST /repos/{owner}/{repo}/pages` - Enable Pages

#### 2.3 Publishing Store (1 hour)
**File:** `src/lib/stores/publishingStore.ts`

Features:
- Track publishing accounts
- Store credentials (encrypted)
- Publishing history
- Platform status
- Error handling

#### 2.4 Tests (1 hour)
- 15+ tests for publishers
- Mock API responses
- Test OAuth flows
- Test error handling

**Deliverables:**
- itch.io publisher
- GitHub Pages publisher
- Publishing store
- 15+ tests

---

## Stage 3: Sharing UI (4-6 hours)

### Goal
User-friendly publishing and sharing interface.

### Tasks

#### 3.1 PublishDialog Component (2-3 hours)
**File:** `src/lib/components/publishing/PublishDialog.svelte`

Features:
- Platform selection (Static HTML, itch.io, GitHub Pages)
- Publishing options form
  - Title, description
  - Cover image
  - Tags/categories
  - Visibility settings
- Progress indicator
- Success/error messages
- Published URL display

#### 3.2 Platform Connection UI (1-2 hours)
**File:** `src/lib/components/publishing/PlatformConnections.svelte`

Features:
- Connect/disconnect platforms
- Account status display
- OAuth flow initiation
- Token refresh handling
- Account settings

#### 3.3 Sharing Tools (1-2 hours)
**File:** `src/lib/components/publishing/SharingTools.svelte`

Features:
- Copy public URL
- Generate embed code
- QR code generation
- Social media share buttons
- Email share
- Download for offline distribution

#### 3.4 Publishing History (30 min)
**File:** `src/lib/components/publishing/PublishingHistory.svelte`

Features:
- List of published versions
- Platform badges
- Publication dates
- Version numbers
- Quick republish
- Unpublish option

#### 3.5 Tests (1 hour)
- 10+ UI component tests
- Test form validation
- Test OAuth flows
- Test share functionality

**Deliverables:**
- PublishDialog component
- PlatformConnections component
- SharingTools component
- PublishingHistory component
- 10+ tests

---

## Implementation Order

1. **Stage 1: Static Site Generator** (Foundation)
   - Build StaticSiteExporter
   - Create player template
   - Test standalone HTML export

2. **Stage 2: Platform Integrations** (Build on export)
   - itch.io publisher
   - GitHub Pages publisher
   - Publishing store

3. **Stage 3: Sharing UI** (User interface)
   - PublishDialog
   - Platform connections
   - Sharing tools

---

## Success Criteria

### Functional Requirements
- [ ] Export story as standalone HTML file
- [ ] HTML file works offline
- [ ] HTML file is mobile-responsive
- [ ] Publish directly to itch.io
- [ ] Publish directly to GitHub Pages
- [ ] Generate shareable links
- [ ] Generate embed codes
- [ ] Generate QR codes
- [ ] Track publishing history

### Quality Requirements
- [ ] All tests passing (target: 2472+ tests)
- [ ] Zero breaking changes
- [ ] Comprehensive error handling
- [ ] Secure credential storage
- [ ] Clean user experience

### Documentation Requirements
- [ ] Publishing guide (PUBLISHING.md)
- [ ] Platform setup instructions
- [ ] API documentation
- [ ] Example workflows

---

## Technical Considerations

### Security
- OAuth tokens encrypted in storage
- No tokens in exported HTML
- CORS handling for API calls
- CSP headers in exported HTML

### Performance
- Minified output
- Lazy loading for large stories
- Progressive enhancement
- Asset optimization

### Compatibility
- Works in all modern browsers
- Mobile-responsive
- Offline-capable
- Accessible (WCAG 2.1 AA)

---

## File Structure

```
src/lib/
├── export/
│   ├── formats/
│   │   └── StaticSiteExporter.ts          (new)
│   ├── templates/
│   │   └── player-template.html           (new)
│   └── utils/
│       └── assetBundler.ts                 (new)
├── publishing/
│   ├── ItchIoPublisher.ts                  (new)
│   ├── GitHubPublisher.ts                  (new)
│   ├── types.ts                            (new)
│   └── __tests__/                          (new)
├── stores/
│   └── publishingStore.ts                  (new)
└── components/
    └── publishing/
        ├── PublishDialog.svelte            (new)
        ├── PlatformConnections.svelte      (new)
        ├── SharingTools.svelte             (new)
        └── PublishingHistory.svelte        (new)
```

---

## Estimated Timeline

| Stage | Description | Estimate | Status |
|-------|-------------|----------|--------|
| 1.1 | StaticSiteExporter | 2-3h | ✅ Complete |
| 1.2 | Player Template | 2-3h | ⬜ Pending |
| 1.3 | Asset Bundler | 1-2h | ⬜ Pending |
| 1.4 | Stage 1 Tests | 1h | ⬜ Pending |
| 2.1 | itch.io Integration | 3-4h | ⬜ Pending |
| 2.2 | GitHub Pages | 2-3h | ⬜ Pending |
| 2.3 | Publishing Store | 1h | ⬜ Pending |
| 2.4 | Stage 2 Tests | 1h | ⬜ Pending |
| 3.1 | PublishDialog | 2-3h | ⬜ Pending |
| 3.2 | Platform Connections | 1-2h | ⬜ Pending |
| 3.3 | Sharing Tools | 1-2h | ⬜ Pending |
| 3.4 | Publishing History | 30min | ⬜ Pending |
| 3.5 | Stage 3 Tests | 1h | ⬜ Pending |
| **Total** | **All Stages** | **16-22h** | **~15% Complete** |

---

## Implementation Log

### ✅ Stage 1.1: StaticSiteExporter (Complete)
**Files Created:**
- `src/lib/export/formats/StaticSiteExporter.ts` (395 lines)
- `src/lib/export/formats/StaticSiteExporter.test.ts` (331 lines)

**Files Modified:**
- `src/lib/export/types.ts` - Added 'html-standalone' to ExportFormat
- `src/lib/stores/exportStore.ts` - Registered StaticSiteExporter

**Features Implemented:**
- Complete HTML generation with embedded player
- Template-based approach with {{VAR}} placeholders
- Inline CSS styles for player
- Inline JavaScript WhiskerPlayer class
- Story data serialization as JavaScript constant
- HTML entity escaping for security
- Filename sanitization
- Responsive design (mobile-friendly)
- Complete player functionality (navigation, variables, choices)

**Tests:** 13 new tests, all passing (2450 total)

**Commit:** Ready to commit

---

## Next Steps

**Immediate:** Commit Stage 1.1
- Verify all tests passing
- Create git commit
- Continue with Stage 1.2 or other stages

---

## Notes

- Platform integrations require API keys (will use environment variables)
- OAuth flows need proper redirect URI configuration
- Consider rate limiting for API calls
- May need backend proxy for sensitive operations
