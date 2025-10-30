# Medium-Term Features Analysis

Analysis of what's needed to implement three medium-priority features identified in the gap analysis.

**Date**: 2025-10-29
**Status**: Planning Phase

---

## 1. Cloud Storage - Google Drive Integration

### Current State
- ✅ File operations use File System Access API (`fileOperations.ts`)
- ✅ Fallback to download/upload for unsupported browsers
- ✅ FileHandle abstraction for local file references
- ❌ No cloud storage integration
- ❌ No sync mechanism

### What's Needed

#### Architecture
```typescript
// New file: src/lib/cloud/types.ts
interface CloudProvider {
  name: string;
  auth(): Promise<boolean>;
  isAuthenticated(): boolean;
  signOut(): Promise<void>;

  list(folderId?: string): Promise<CloudFile[]>;
  load(fileId: string): Promise<ProjectData>;
  save(fileId: string, data: ProjectData): Promise<void>;
  create(filename: string, data: ProjectData, folderId?: string): Promise<string>;
  delete(fileId: string): Promise<void>;
}

interface CloudFile {
  id: string;
  name: string;
  modifiedTime: Date;
  size: number;
}
```

#### Components to Build
1. **`src/lib/cloud/GoogleDriveProvider.ts`** (~300 lines)
   - OAuth 2.0 authentication flow
   - Google Drive API v3 integration
   - File listing, reading, writing
   - Error handling and retry logic

2. **`src/lib/cloud/CloudStorageManager.ts`** (~200 lines)
   - Provider abstraction layer
   - Sync conflict detection
   - Auto-save timer management
   - Offline queue for failed saves

3. **`src/lib/components/cloud/CloudFileDialog.svelte`** (~400 lines)
   - Browse cloud files
   - Search/filter files
   - Authentication UI
   - File metadata display

4. **`src/lib/components/MenuBar.svelte`** (modify)
   - Add "Open from Google Drive..."
   - Add "Save to Google Drive..."
   - Add sync status indicator

#### Dependencies
```json
{
  "dependencies": {
    "gapi-script": "^1.2.0",  // Google API client
    "@types/gapi": "^0.0.47"   // TypeScript types
  }
}
```

#### Implementation Steps
1. Set up Google Cloud Console project
2. Configure OAuth consent screen
3. Implement GoogleDriveProvider with auth flow
4. Build CloudFileDialog UI
5. Integrate into App.svelte
6. Add sync status to MenuBar
7. Handle authentication state persistence
8. Add conflict resolution UI
9. Write tests (unit + integration)
10. Document setup in README

#### Estimated Effort
- **Development**: 2-3 weeks
- **Testing**: 1 week
- **Documentation**: 2 days
- **Total**: 3-4 weeks

#### Risks & Considerations
- OAuth flow complexity (redirect vs popup)
- Google API quota limits (10,000 requests/day free tier)
- Token refresh handling
- Offline mode behavior
- Privacy/security concerns (storing credentials)
- CORS issues with Google APIs

---

## 2. Better Mobile Editing - Touch-Optimized Graph View

### Current State
- ✅ GraphView uses @xyflow/svelte (supports basic touch)
- ✅ Responsive CSS with dark mode
- ❌ No touch gesture optimization
- ❌ Small touch targets for mobile
- ❌ No mobile-specific controls
- ❌ Pan/zoom not optimized for touch

### What's Needed

#### Current Issues
1. **Touch targets too small** (passage nodes, choice connections)
2. **No pinch-to-zoom** optimization
3. **No touch feedback** (visual indication on tap)
4. **Context menus** don't work well on touch
5. **Text editing** difficult on mobile keyboards
6. **Toolbar buttons** too small for fingers

#### Components to Modify

##### 1. **`src/lib/components/GraphView.svelte`**
Add mobile detection and touch handlers:
```typescript
// Detect mobile
const isMobile = writable(window.innerWidth < 768);
const isTouch = writable('ontouchstart' in window);

// Touch gesture handlers
function handlePinchZoom(event: TouchEvent) {
  if (event.touches.length === 2) {
    // Calculate pinch distance
    // Apply zoom transformation
  }
}

function handleTouchDrag(event: TouchEvent) {
  // Implement touch-based panning
  // Add momentum scrolling
}
```

##### 2. **`src/lib/components/graph/PassageNode.svelte`**
Increase touch target sizes:
```css
@media (max-width: 768px) {
  .passage-node {
    min-width: 180px;  /* Larger for touch */
    min-height: 120px;
    padding: 16px;
  }

  .passage-header {
    font-size: 16px;  /* More readable */
  }

  /* Add touch hit area */
  .touch-target {
    padding: 12px;  /* 44px minimum Apple recommendation */
  }
}
```

##### 3. **`src/lib/components/graph/PassageNode.svelte`** (context menu)
Replace right-click menu with long-press:
```typescript
let longPressTimer: number;

function handleTouchStart(e: TouchEvent) {
  longPressTimer = setTimeout(() => {
    // Show context menu after 500ms
    showContextMenu(e.touches[0].clientX, e.touches[0].clientY);
  }, 500);
}

function handleTouchEnd() {
  clearTimeout(longPressTimer);
}
```

##### 4. **`src/lib/components/MenuBar.svelte`**
Mobile-friendly navigation:
```svelte
{#if $isMobile}
  <!-- Hamburger menu -->
  <button class="hamburger" on:click={toggleMobileMenu}>
    ☰
  </button>

  <!-- Slide-out drawer -->
  <div class="mobile-menu" class:open={mobileMenuOpen}>
    <!-- Menu items with larger touch targets -->
  </div>
{:else}
  <!-- Desktop menu bar -->
{/if}
```

##### 5. **New: `src/lib/components/graph/MobileToolbar.svelte`**
Floating action button (FAB) toolbar:
```svelte
<div class="mobile-fab-container">
  <button class="fab primary" on:click={addPassage}>+</button>
  <button class="fab secondary" on:click={fitView}>⊙</button>
  <button class="fab secondary" on:click={zoomIn}>+</button>
  <button class="fab secondary" on:click={zoomOut}>−</button>
</div>

<style>
  .fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    font-size: 24px;
  }
</style>
```

#### Implementation Steps
1. Add mobile detection utilities
2. Implement pinch-to-zoom gesture
3. Add long-press for context menus
4. Increase touch target sizes (CSS)
5. Build MobileToolbar component
6. Add touch feedback animations
7. Implement mobile-optimized zoom controls
8. Add landscape/portrait detection
9. Test on iOS Safari and Android Chrome
10. Add haptic feedback (vibration API)

#### Estimated Effort
- **Development**: 1-2 weeks
- **Testing**: 1 week (need real devices)
- **Polish**: 3 days
- **Total**: 2-3 weeks

#### Risks & Considerations
- Browser compatibility (iOS Safari vs Android Chrome)
- Performance on low-end devices
- Conflict with library's built-in touch handling
- Viewport meta tag configuration
- Keyboard covering input fields
- Orientation change handling

---

## 3. EPUB Export Polish - Production Ready

### Current State
- ✅ EPUBExporter.ts fully implemented (~350 lines)
- ✅ Generates valid EPUB 3.0 files
- ✅ Includes navigation, metadata, CSS
- ✅ Uses JSZip for packaging
- ❌ No tests written
- ❌ No EPUB validation
- ❌ Limited markdown support
- ❌ No image embedding
- ❌ No advanced formatting

### What's Needed

#### Known Issues to Fix

##### 1. **Markdown Not Processed**
Current code just escapes XML, doesn't render markdown:
```typescript
// Current (line 309-315):
private formatContent(content: string): string {
  const paragraphs = content.split(/\n\n+/);
  return paragraphs
    .filter(p => p.trim())
    .map(p => `<p>${this.escapeXML(p.trim())}</p>`)
    .join('\n      ');
}

// Needed:
import { marked } from 'marked';

private formatContent(content: string): string {
  // Parse markdown to HTML
  const html = marked.parse(content);

  // Sanitize for EPUB XHTML
  return this.sanitizeForEPUB(html);
}
```

##### 2. **Images Not Embedded**
EPUB spec requires embedded images:
```typescript
private async embedImages(story: Story, zip: JSZip): Promise<void> {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = new Map<string, Blob>();

  // Extract all image references
  for (const passage of Object.values(story.passages)) {
    let match;
    while ((match = imagePattern.exec(passage.content)) !== null) {
      const url = match[2];
      if (!images.has(url)) {
        // Fetch and embed image
        const blob = await fetch(url).then(r => r.blob());
        images.set(url, blob);
      }
    }
  }

  // Add images to EPUB
  images.forEach((blob, url) => {
    const filename = `images/${url.split('/').pop()}`;
    zip.file(`EPUB/${filename}`, blob);
  });
}
```

##### 3. **Choice Conditions Not Displayed**
Conditional choices should show requirements:
```typescript
// Show conditions in EPUB
${choices.map((choice: any) => {
  let conditionText = '';
  if (choice.conditions && choice.conditions.length > 0) {
    conditionText = `<em class="condition">Requires: ${choice.conditions.join(', ')}</em>`;
  }
  return `<div class="choice">
    <a href="${targetFilename}">${this.escapeXML(choice.text)}</a>
    ${conditionText}
  </div>`;
}).join('\n')}
```

##### 4. **No Cover Image**
Professional EPUBs need cover images:
```typescript
// Generate cover page
private generateCoverXHTML(story: Story): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    .cover { padding: 10% 0; }
    h1 { font-size: 3em; margin-bottom: 0.5em; }
    .author { font-size: 1.5em; color: #666; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${this.escapeXML(story.metadata.title)}</h1>
    <p class="author">by ${this.escapeXML(story.metadata.author)}</p>
  </div>
</body>
</html>`;
}
```

##### 5. **No EPUB Validation**
Need to validate output:
```bash
# Install epubcheck
npm install -D epubcheck

# Validate in tests
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test('should produce valid EPUB', async () => {
  const result = await exporter.export(context);

  // Save to temp file
  const tempPath = '/tmp/test.epub';
  await fs.writeFile(tempPath, result.content);

  // Run epubcheck
  const { stdout } = await execAsync(`epubcheck ${tempPath}`);
  expect(stdout).toContain('No errors or warnings detected');
});
```

#### Files to Create/Modify

1. **`src/lib/export/formats/EPUBExporter.ts`** (modify)
   - Add markdown processing (marked.js)
   - Add image embedding
   - Add cover page generation
   - Fix choice condition display
   - Improve CSS styling

2. **`src/lib/export/formats/EPUBExporter.test.ts`** (create ~400 lines)
   - Test basic export
   - Test markdown rendering
   - Test image embedding
   - Test metadata
   - Test navigation structure
   - Validate EPUB structure
   - Test error handling

3. **`src/lib/export/formats/EPUBValidator.ts`** (create ~150 lines)
   - Basic EPUB structure validation
   - Required files check
   - Mimetype validation
   - OPF structure validation

#### Dependencies
```json
{
  "dependencies": {
    "marked": "^11.0.0",         // Markdown parser
    "dompurify": "^3.0.0",       // HTML sanitizer
    "isomorphic-dompurify": "^2.0.0"  // Node.js compat
  },
  "devDependencies": {
    "epubcheck": "^5.0.0"        // EPUB validation
  }
}
```

#### Implementation Steps
1. Add marked.js dependency
2. Implement markdown processing in formatContent()
3. Add image extraction and embedding
4. Create cover page generator
5. Improve CSS styling
6. Add choice condition display
7. Write comprehensive test suite
8. Add EPUB validation to tests
9. Test on multiple e-readers (Kindle, Kobo, Apple Books)
10. Document EPUB limitations in user guide

#### Estimated Effort
- **Development**: 1 week
- **Testing**: 1 week (need multiple e-readers)
- **Documentation**: 2 days
- **Total**: 2-3 weeks

#### E-Reader Testing Matrix
| Device | Platform | Priority | Status |
|--------|----------|----------|--------|
| Apple Books | iOS | High | ❌ |
| Kindle | Amazon | High | ❌ |
| Google Play Books | Android | Medium | ❌ |
| Kobo | eInk | Medium | ❌ |
| Calibre | Desktop | Low | ❌ |

---

## Implementation Priority

Based on complexity, impact, and dependencies:

### Phase 1: EPUB Export Polish (2-3 weeks)
**Why First:**
- Smallest scope
- No external dependencies
- High user value
- Can be fully tested

**Deliverables:**
- ✅ Markdown rendering
- ✅ Image embedding
- ✅ Cover pages
- ✅ Comprehensive tests
- ✅ Multi-reader validation

### Phase 2: Mobile Touch Optimization (2-3 weeks)
**Why Second:**
- Medium complexity
- Improves accessibility
- No external API dependencies
- Can iterate based on user feedback

**Deliverables:**
- ✅ Pinch-to-zoom gestures
- ✅ Larger touch targets
- ✅ Mobile toolbar
- ✅ Long-press context menus
- ✅ Tested on real devices

### Phase 3: Google Drive Integration (3-4 weeks)
**Why Last:**
- Highest complexity
- Requires external API setup
- Security/privacy considerations
- Needs ongoing maintenance

**Deliverables:**
- ✅ OAuth authentication
- ✅ File listing and browsing
- ✅ Save/load from Drive
- ✅ Sync conflict handling
- ✅ Documentation for setup

---

## Total Timeline Estimate

**Sequential (Safe)**: 7-10 weeks
**Parallel (Aggressive)**: 4-5 weeks (if multi-developer)

---

## Bundle Size Impact

Estimated additions:
- **marked.js**: ~50 KB
- **dompurify**: ~45 KB
- **gapi-script**: ~35 KB
- **Mobile optimizations**: ~10 KB (CSS/JS)

**Total**: +140 KB (~40 KB gzipped)
**New Bundle**: ~1,037 KB JS (from 897 KB)

Still well within acceptable range for a web app.

---

## Next Steps

1. Get user/stakeholder feedback on priority
2. Set up Google Cloud Console project (for Drive)
3. Acquire test devices (iOS + Android)
4. Create GitHub issues for each feature
5. Begin with EPUB polish (quickest win)
