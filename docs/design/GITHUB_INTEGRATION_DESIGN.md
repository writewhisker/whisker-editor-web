# GitHub Integration & Local-First Storage Architecture

## Overview

This document outlines the architecture for implementing GitHub integration and local-first storage with optional sync for the Whisker Editor.

## Goals

1. **GitHub Integration**: Enable users to save stories to GitHub repositories with full version control
2. **Local-First**: Offline-first editing with IndexedDB storage
3. **Background Sync**: Automatic sync to GitHub when online
4. **Conflict Resolution**: Handle conflicts between local and remote changes

## Architecture

### Phase 1: GitHub Integration

#### 1.1 Authentication
- **OAuth 2.0 Flow**: GitHub OAuth App
- **Scopes Required**: `repo` (for private repos), `public_repo` (for public repos)
- **Token Storage**: Encrypted in localStorage (temporary) + IndexedDB (persistent)
- **Token Refresh**: GitHub tokens don't expire, but we'll handle revocation

#### 1.2 GitHub API Service Layer

```typescript
// src/lib/services/github/
├── githubAuth.ts       // OAuth flow, token management
├── githubApi.ts        // Low-level API wrapper (uses Octokit)
├── githubRepo.ts       // Repository operations
├── githubFile.ts       // File CRUD operations
├── githubCommit.ts     // Commit operations
└── types.ts            // TypeScript interfaces
```

**Key Operations:**
- List user repositories
- Create/select repository
- Read/write story files (JSON format)
- Commit changes with messages
- View commit history
- Branch management (future)

#### 1.3 Data Format

Stories will be saved as JSON files in the repository:

```
repo-name/
├── story.json              # Main story file
├── assets/                 # Asset files
│   ├── images/
│   ├── audio/
│   └── video/
└── .whisker/              # Metadata
    └── config.json        # Editor configuration
```

**story.json structure:**
```json
{
  "metadata": {
    "title": "Story Title",
    "author": "Author Name",
    "version": "1.0.0",
    "whiskerVersion": "0.1.0"
  },
  "passages": [...],
  "variables": [...],
  "tags": [...],
  "startPassage": "..."
}
```

#### 1.4 UI Components

```typescript
// src/lib/components/github/
├── GitHubConnect.svelte       // OAuth connection button
├── GitHubRepoSelector.svelte  // Repository picker
├── GitHubStatus.svelte        // Sync status indicator
├── GitHubCommit.svelte        // Commit dialog
├── GitHubHistory.svelte       // Commit history viewer
└── GitHubConflict.svelte      // Conflict resolution UI
```

### Phase 2: Local-First Storage

#### 2.1 IndexedDB Schema

```typescript
// Database: whisker-editor
// Version: 1

// Object Store: stories
{
  id: string;              // Story ID (UUID)
  title: string;
  author: string;
  data: Story;             // Full story object
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  githubRepo?: {
    owner: string;
    name: string;
    path: string;
    sha: string;           // Last synced commit SHA
  };
}

// Object Store: syncQueue
{
  id: string;
  storyId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: Date;
  data: any;
  retryCount: number;
}

// Object Store: githubTokens
{
  id: 'current';
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: Date;
}
```

#### 2.2 Auto-Save Strategy

- **Debounced saves**: 2 seconds after last edit
- **Save on blur**: When user switches tabs
- **Save before sync**: Before attempting GitHub sync
- **Conflict detection**: Compare local timestamp with remote

#### 2.3 Storage Service

```typescript
// src/lib/services/storage/
├── indexedDB.ts           // Low-level IndexedDB wrapper
├── localStore.ts          // Local storage operations
├── syncQueue.ts           // Queue management
└── types.ts               // TypeScript interfaces
```

### Phase 3: Background Sync

#### 3.1 Sync Service

```typescript
// src/lib/services/sync/
├── syncService.ts         // Main sync orchestrator
├── syncStrategy.ts        // Sync conflict resolution
└── syncWorker.ts          // Background sync worker
```

**Sync Flow:**
1. User makes changes → Save to IndexedDB immediately
2. Add to sync queue
3. Background process attempts sync every 30 seconds (when online)
4. On success: Update syncStatus to 'synced', update SHA
5. On conflict: Set syncStatus to 'conflict', show UI

#### 3.2 Conflict Resolution

**Three-way merge strategy:**
- **Local version**: Current IndexedDB state
- **Remote version**: Latest GitHub commit
- **Base version**: Last synced commit (stored SHA)

**Resolution options:**
1. **Keep local**: Push local changes (force)
2. **Keep remote**: Discard local changes
3. **Manual merge**: Show diff and let user choose

#### 3.3 Online/Offline Detection

```typescript
// Monitor navigator.onLine
// Ping GitHub API every 60 seconds
// Update UI status indicator
// Pause/resume sync based on connectivity
```

### Phase 4: UI Integration

#### 4.1 MenuBar Integration

Add GitHub menu:
```
File
  ├── New
  ├── Open
  ├── Save
  ├── Save As...
  ├── ──────────
  ├── Connect to GitHub     ← New
  ├── Open from GitHub      ← New
  ├── Save to GitHub        ← New
  ├── Commit Changes...     ← New
  ├── View History...       ← New
  └── GitHub Settings...    ← New
```

#### 4.2 Status Bar

Add sync status indicator:
```
[●] Local | [↻ Syncing...] GitHub | [✓] Last sync: 2 min ago
```

#### 4.3 Mobile Integration

Add GitHub options to mobile menu (MobileToolbar):
```
☰ Menu
  ├── New Story
  ├── Open Story
  ├── Save
  ├── ──────────
  ├── GitHub              ← New submenu
  │   ├── Connect
  │   ├── Open from GitHub
  │   ├── Save to GitHub
  │   └── Commit Changes
  ├── ──────────
  ├── Export
  ├── Import
  └── Settings
```

## Implementation Plan

### Phase 1: Core GitHub Integration (Week 1-2)
1. ✅ Architecture design
2. Install dependencies (Octokit)
3. Implement OAuth flow
4. Create GitHub API service layer
5. Build repository picker UI
6. Implement basic save/load

### Phase 2: Local-First Storage (Week 2-3)
1. Design IndexedDB schema
2. Implement storage service
3. Add auto-save functionality
4. Integrate with existing file operations
5. Add status indicators

### Phase 3: Sync & Conflict Resolution (Week 3-4)
1. Implement sync queue
2. Build background sync service
3. Add conflict detection
4. Create conflict resolution UI
5. Handle edge cases

### Phase 4: Polish & Testing (Week 4)
1. Add loading states
2. Error handling & retry logic
3. Offline mode testing
4. Conflict resolution testing
5. Documentation

## Dependencies

```bash
npm install @octokit/rest @octokit/oauth-app
npm install idb  # IndexedDB wrapper
```

## Security Considerations

1. **Token Storage**: Encrypt tokens before storing in IndexedDB
2. **CORS**: GitHub API supports CORS, no proxy needed
3. **OAuth Redirect**: Use GitHub Pages or Vercel for OAuth callback
4. **Scope Limitation**: Request minimal scopes (repo or public_repo)
5. **Token Revocation**: Provide UI to disconnect/revoke access

## User Experience

### Happy Path
1. User clicks "Connect to GitHub"
2. OAuth flow completes
3. User selects/creates repository
4. User edits story (auto-saves locally)
5. Background sync pushes to GitHub every 30s
6. Status indicator shows "✓ Synced"

### Offline Mode
1. User edits story (offline)
2. Changes save to IndexedDB
3. Status shows "● Local only"
4. When online: Auto-sync resumes
5. Status updates to "✓ Synced"

### Conflict Resolution
1. User edits story
2. Background sync detects conflict
3. Status shows "⚠ Conflict"
4. User clicks to resolve
5. Diff UI shows changes
6. User chooses resolution
7. Sync completes

## Future Enhancements

- **Branch support**: Work on feature branches
- **Pull requests**: Create PRs from editor
- **Collaboration**: Real-time multi-user editing
- **GitHub Pages**: Auto-publish to GitHub Pages
- **Gists**: Quick save to GitHub Gists
- **Private repos**: Enterprise GitHub support

## Success Metrics

- OAuth flow completion rate > 90%
- Sync success rate > 95%
- Conflict rate < 5%
- Auto-save reliability > 99%
- Offline mode functionality: 100%
