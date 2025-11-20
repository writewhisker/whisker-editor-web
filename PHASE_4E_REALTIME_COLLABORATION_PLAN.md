# Phase 4E: Real-time Collaboration - Implementation Plan

**Status**: 📋 PLANNED
**Priority**: HIGH
**Estimated Duration**: 4-6 weeks
**Dependencies**: Phase 4D (Conflict Resolution UI) ✅

## Executive Summary

Phase 4E will add real-time collaboration capabilities to Whisker Editor, enabling multiple users to edit stories simultaneously with live updates, cursor sharing, and conflict-free synchronization. This is a significant feature requiring both client and server infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Options](#architecture-options)
3. [Recommended Approach](#recommended-approach)
4. [Phase Breakdown](#phase-breakdown)
5. [Technical Specifications](#technical-specifications)
6. [Implementation Timeline](#implementation-timeline)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Risks and Mitigations](#risks-and-mitigations)
10. [Success Criteria](#success-criteria)

## Overview

### Current State (Post Phase 4D)

✅ **What We Have**:
- Conflict detection and resolution UI
- Visual diff viewer
- Manual merge workflows
- GitHub integration for async collaboration
- Change tracking and comments

❌ **What We're Missing**:
- Real-time updates when collaborators edit
- Live cursor positions
- Presence indicators (who's online)
- Automatic conflict resolution
- Operational transformation or CRDTs

### Goals

1. **Real-time Updates**: See changes as collaborators make them
2. **Cursor Sharing**: See where others are editing
3. **Presence**: Know who's currently working on the story
4. **Conflict-free**: No manual conflict resolution for concurrent edits
5. **Offline Support**: Continue working offline, sync when back online
6. **Scalability**: Support 2-10 simultaneous collaborators per story

### Non-Goals (Future Phases)

- Voice/video chat
- In-editor chat (may add as bonus)
- Mobile real-time editing (desktop/web first)
- Version history/time travel (use Git)

## Architecture Options

### Option 1: Yjs + WebSocket (RECOMMENDED)

**Pros**:
- ✅ Battle-tested CRDT library
- ✅ Excellent Svelte integration (@syncedstore/core)
- ✅ Built-in awareness (cursors, presence)
- ✅ Offline-first with automatic sync
- ✅ No server-side conflict resolution needed
- ✅ WebRTC peer-to-peer option available
- ✅ Active community and good documentation

**Cons**:
- ⚠️ Larger bundle size (~50KB)
- ⚠️ Learning curve for CRDT concepts
- ⚠️ Memory overhead for large documents

**Use Cases**: Google Docs-style collaboration

### Option 2: Automerge + WebSocket

**Pros**:
- ✅ Pure CRDT with immutable data
- ✅ Built-in time travel / version history
- ✅ JSON-like API (easy to use)
- ✅ Strong consistency guarantees

**Cons**:
- ⚠️ Larger bundle size (~100KB)
- ⚠️ Higher memory usage
- ⚠️ Slower than Yjs for large documents
- ⚠️ Less mature Svelte integration

**Use Cases**: Applications needing version history

### Option 3: Operational Transformation (ShareDB)

**Pros**:
- ✅ Proven technology (Google Docs originally used OT)
- ✅ Simpler mental model than CRDTs
- ✅ Good for text editing

**Cons**:
- ⚠️ Requires server-side transformation logic
- ⚠️ Complex to implement correctly
- ⚠️ Not offline-first
- ⚠️ Server is single point of failure
- ⚠️ ShareDB is less maintained

**Use Cases**: Centralized collaboration with server control

### Option 4: Firebase Realtime Database

**Pros**:
- ✅ Fully managed (no server to maintain)
- ✅ Built-in presence
- ✅ Good offline support
- ✅ Quick to implement

**Cons**:
- ⚠️ Vendor lock-in
- ⚠️ Ongoing costs
- ⚠️ No built-in conflict resolution
- ⚠️ Need to implement CRDTs manually
- ⚠️ Data structure limitations

**Use Cases**: Rapid prototyping, managed infrastructure

### Option 5: Liveblocks

**Pros**:
- ✅ Purpose-built for collaboration
- ✅ Excellent DX with React/Svelte hooks
- ✅ Built-in presence, cursors, comments
- ✅ Managed infrastructure
- ✅ Good documentation and examples

**Cons**:
- ⚠️ Paid service (costs scale with users)
- ⚠️ Vendor lock-in
- ⚠️ Less control over infrastructure
- ⚠️ May not fit self-hosted requirements

**Use Cases**: Commercial products, rapid development

## Recommended Approach

### Primary: Yjs + WebSocket Server

**Architecture**:
```
┌─────────────────┐
│  Whisker Client │
│   (Svelte)      │
│                 │
│  ┌───────────┐  │
│  │ Yjs Doc   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ WebSocket │  │
│  │ Provider  │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
    WebSocket
         │
┌────────▼────────┐
│  Sync Server    │
│  (Node.js)      │
│                 │
│  ┌───────────┐  │
│  │ Y-WebSocket│  │
│  │ Server     │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Persist    │  │
│  │ (Optional) │  │
│  └───────────┘  │
└─────────────────┘
```

**Technology Stack**:
- **Client**: Yjs + y-websocket provider
- **Server**: Node.js + y-websocket + y-leveldb (persistence)
- **Transport**: WebSocket (wss://)
- **Fallback**: y-webrtc for peer-to-peer when server unavailable
- **Storage**: LevelDB for server-side persistence
- **Awareness**: Built-in Yjs awareness for cursors/presence

**Why This Approach**:
1. **Proven at Scale**: Used by many production applications
2. **Offline-First**: Works offline, syncs automatically
3. **No Server Logic**: Server is just a message router
4. **Flexible**: Can add peer-to-peer, persistence, etc.
5. **Active Development**: Regular updates and community support
6. **Good Documentation**: Plenty of examples and guides

## Phase Breakdown

### Phase 4E-1: Infrastructure Setup (Week 1)

**Goal**: Set up server and basic connectivity

**Tasks**:
1. Create WebSocket server package
   - `packages/collab-server/` - New package
   - Express + ws + y-websocket
   - Health check endpoints
   - Docker container
   - Environment configuration

2. Add Yjs dependencies to client
   - `yjs` - CRDT library
   - `y-websocket` - WebSocket provider
   - `y-protocols` - Awareness protocol
   - `@syncedstore/core` - Optional Svelte integration

3. Server deployment setup
   - Docker Compose for local dev
   - Kubernetes manifests (optional)
   - Railway/Render deployment config
   - Monitoring and logging

4. Basic connection flow
   - Client connects to server
   - Server broadcasts updates
   - Connection status UI
   - Reconnection logic

**Deliverables**:
- ✅ WebSocket server running
- ✅ Client can connect/disconnect
- ✅ Connection status indicator
- ✅ Basic logging and monitoring

**Testing**:
- Unit tests for server
- Connection/disconnection tests
- Reconnection after network failure
- Multiple client connections

### Phase 4E-2: Yjs Document Synchronization (Week 2)

**Goal**: Sync Story changes via Yjs

**Tasks**:
1. Create Yjs document structure
   ```typescript
   const ydoc = new Y.Doc()
   const yMetadata = ydoc.getMap('metadata')
   const yPassages = ydoc.getArray('passages')
   const yVariables = ydoc.getMap('variables')
   ```

2. Build Story ↔ Yjs converters
   - `storyToYjs(story): Y.Doc`
   - `yjsToStory(ydoc): Story`
   - Handle all Story properties
   - Preserve IDs and references

3. Sync layer
   - Watch Yjs changes → Update Svelte stores
   - Watch Svelte changes → Update Yjs doc
   - Debouncing and throttling
   - Transaction batching

4. Conflict-free editing
   - Multiple users editing same passage
   - Metadata updates
   - Array operations (add/remove passages)
   - Map operations (variables)

**Deliverables**:
- ✅ Story syncs via Yjs
- ✅ Changes appear in real-time
- ✅ No conflicts on concurrent edits
- ✅ Undo/redo support

**Testing**:
- Two clients editing same passage
- Concurrent passage additions
- Network interruption during edit
- Large story sync performance

### Phase 4E-3: Cursor Sharing & Awareness (Week 3)

**Goal**: Show where collaborators are editing

**Tasks**:
1. Awareness protocol integration
   ```typescript
   const awareness = provider.awareness
   awareness.setLocalStateField('user', {
     name: 'Alice',
     color: '#FF0000',
     cursor: { passageId: 'abc123', position: 42 }
   })
   ```

2. Cursor position tracking
   - Track cursor in passage editor
   - Track selected passage in graph view
   - Track active panel/section
   - Update awareness state

3. Visual cursor indicators
   - Cursor overlay in text editor
   - Avatar on passage nodes
   - Active passage highlight
   - Smooth cursor movement

4. User presence UI
   - Collaborator list panel
   - Online/offline indicators
   - User colors
   - Last active timestamp

**Deliverables**:
- ✅ See collaborator cursors in text
- ✅ See who's editing which passage
- ✅ Collaborator list with presence
- ✅ User avatars and colors

**Testing**:
- Multiple cursors in same passage
- Cursor positions during text edits
- Presence updates on join/leave
- Color assignment uniqueness

### Phase 4E-4: UI/UX Polish (Week 4)

**Goal**: Make collaboration feel natural

**Tasks**:
1. Connection status UI
   - Connected/Disconnected banner
   - "Saving..." / "Saved" indicator
   - Connection quality indicator
   - Offline mode notice

2. Collaboration panel
   - Who's currently online
   - Who's editing what
   - Invite collaborators
   - Share session link

3. User settings
   - Display name
   - Avatar/color preference
   - Notification preferences
   - Collaboration mode toggle

4. Notifications
   - "User joined" toast
   - "User started editing Passage X"
   - "Connection lost" warning
   - "Syncing changes" indicator

5. Performance optimizations
   - Debounce cursor updates
   - Throttle awareness broadcasts
   - Virtualize large presence lists
   - Lazy load collaboration features

**Deliverables**:
- ✅ Polished collaboration UI
- ✅ Clear connection feedback
- ✅ Intuitive presence indicators
- ✅ Smooth, performant experience

**Testing**:
- Usability testing with real users
- Performance under load
- UI responsiveness
- Accessibility compliance

### Phase 4E-5: Persistence & Recovery (Week 5)

**Goal**: Don't lose work, ever

**Tasks**:
1. Server-side persistence
   - LevelDB integration (y-leveldb)
   - Save Yjs updates to disk
   - Load document on client connect
   - Periodic snapshots

2. Client-side caching
   - IndexedDB persistence
   - Cache Yjs document locally
   - Load from cache on startup
   - Sync with server when online

3. Conflict resolution
   - Detect diverged documents
   - Use Phase 4D conflict UI
   - Allow manual resolution
   - Merge strategies

4. Backup and export
   - Export collaboration session
   - Download Yjs document
   - Restore from backup
   - Migration tools

**Deliverables**:
- ✅ Server persists documents
- ✅ Client caches locally
- ✅ No data loss on disconnect
- ✅ Recovery from crashes

**Testing**:
- Server restart during session
- Client offline → online transition
- Concurrent edits while offline
- Data integrity after recovery

### Phase 4E-6: Testing & Documentation (Week 6)

**Goal**: Production-ready real-time collaboration

**Tasks**:
1. Comprehensive testing
   - End-to-end collaboration tests
   - Load testing (10 concurrent users)
   - Network condition testing (slow, flaky)
   - Long-running session stability

2. Documentation
   - Architecture documentation
   - Server deployment guide
   - Client integration guide
   - Troubleshooting guide
   - API reference

3. Migration guide
   - Upgrade from Phase 4D
   - Enable real-time collaboration
   - Configure server
   - User education

4. Performance benchmarking
   - Sync latency measurements
   - Memory usage profiling
   - Server capacity testing
   - Client-side performance

**Deliverables**:
- ✅ Full test coverage
- ✅ Complete documentation
- ✅ Migration guide
- ✅ Performance benchmarks

**Testing**:
- Automated E2E test suite
- Manual QA scenarios
- Beta user testing
- Performance regression tests

## Technical Specifications

### Server Package Structure

```
packages/collab-server/
├── src/
│   ├── server.ts           # Main server setup
│   ├── websocket.ts        # WebSocket handling
│   ├── persistence.ts      # LevelDB integration
│   ├── auth.ts             # Authentication
│   ├── rooms.ts            # Room/session management
│   └── monitoring.ts       # Metrics and logging
├── tests/
│   ├── server.test.ts
│   ├── sync.test.ts
│   └── persistence.test.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

### Client Integration

```typescript
// packages/editor-base/src/services/collaboration/

// YjsProvider.ts - Yjs setup and connection
export class YjsProvider {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider;
  private awareness: Awareness;

  connect(storyId: string): void;
  disconnect(): void;
  getDocument(): Y.Doc;
  getAwareness(): Awareness;
}

// StorySync.ts - Story ↔ Yjs conversion
export class StorySync {
  static toYjs(story: Story): Y.Doc;
  static fromYjs(ydoc: Y.Doc): Story;
  static observeChanges(ydoc: Y.Doc, callback: (story: Story) => void);
}

// CollaborationManager.ts - High-level API
export class CollaborationManager {
  enable(storyId: string): Promise<void>;
  disable(): void;
  isEnabled(): boolean;
  getCollaborators(): Collaborator[];
  setCursorPosition(passageId: string, position: number): void;
}
```

### Svelte Store Integration

```typescript
// packages/editor-base/src/stores/collaborationStore.ts

export const collaborationEnabled = writable<boolean>(false);
export const connected = writable<boolean>(false);
export const collaborators = writable<Collaborator[]>([]);
export const cursors = writable<Map<string, CursorPosition>>(new Map());
export const syncStatus = writable<'idle' | 'syncing' | 'error'>('idle');

export const collaborationActions = {
  enable: async (storyId: string) => { /* ... */ },
  disable: () => { /* ... */ },
  updateCursor: (position: CursorPosition) => { /* ... */ },
};
```

### Configuration

```typescript
// Environment variables
interface CollabConfig {
  // Server
  COLLAB_SERVER_URL: string;        // wss://collab.whisker.io
  COLLAB_SERVER_PORT: number;       // 4444
  COLLAB_PERSIST: boolean;          // true
  COLLAB_PERSIST_PATH: string;      // ./data/yjs

  // Client
  COLLAB_ENABLED: boolean;          // false (opt-in)
  COLLAB_AUTO_CONNECT: boolean;     // true
  COLLAB_RECONNECT_TIMEOUT: number; // 5000ms
  COLLAB_MAX_RETRIES: number;       // 10
}
```

### Data Models

```typescript
// Collaborator
interface Collaborator {
  id: string;
  name: string;
  email?: string;
  color: string;
  avatar?: string;
  online: boolean;
  lastSeen: number;
  cursor?: CursorPosition;
}

// Cursor Position
interface CursorPosition {
  passageId: string;
  position: number;      // Character offset in passage
  selection?: {
    start: number;
    end: number;
  };
}

// Connection Status
type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';
```

## Implementation Timeline

### Week 1: Infrastructure
- Day 1-2: Server setup
- Day 3-4: WebSocket integration
- Day 5: Deployment and testing

### Week 2: Synchronization
- Day 1-2: Yjs document structure
- Day 3-4: Story ↔ Yjs converters
- Day 5: Sync testing

### Week 3: Awareness
- Day 1-2: Cursor tracking
- Day 3-4: Visual indicators
- Day 5: Presence UI

### Week 4: Polish
- Day 1-2: Connection UI
- Day 3: Collaboration panel
- Day 4: Notifications
- Day 5: Performance optimization

### Week 5: Persistence
- Day 1-2: Server persistence
- Day 3-4: Client caching
- Day 5: Recovery testing

### Week 6: Launch Preparation
- Day 1-2: Testing
- Day 3-4: Documentation
- Day 5: Beta release

**Total**: 30 working days (6 weeks)

## Testing Strategy

### Unit Tests
- Server WebSocket handling
- Yjs document operations
- Story conversion functions
- Awareness state management

### Integration Tests
- Client-server synchronization
- Multiple client scenarios
- Persistence and recovery
- Authentication flow

### End-to-End Tests
```typescript
describe('Real-time Collaboration', () => {
  it('syncs edits between two clients', async () => {
    const client1 = await createTestClient();
    const client2 = await createTestClient();

    await client1.editPassage('intro', 'Hello World');
    await waitFor(() => {
      expect(client2.getPassage('intro').content).toBe('Hello World');
    });
  });

  it('shows cursor positions', async () => {
    const client1 = await createTestClient();
    const client2 = await createTestClient();

    await client1.setCursor('intro', 10);
    await waitFor(() => {
      const cursors = client2.getCursors();
      expect(cursors.get(client1.id).position).toBe(10);
    });
  });
});
```

### Load Tests
- 10 concurrent users editing
- 1000 edits per minute
- Server memory usage
- Network bandwidth consumption

### Network Condition Tests
- Slow connection (3G)
- Flaky connection (random drops)
- Complete disconnection
- Reconnection behavior

## Deployment Strategy

### Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  collab-server:
    build: ./packages/collab-server
    ports:
      - "4444:4444"
    environment:
      - NODE_ENV=development
    volumes:
      - ./data:/app/data
```

### Staging
- Railway.app deployment
- Environment variables via Railway
- PostgreSQL for persistence (optional)
- Monitoring with Railway metrics

### Production
```yaml
# k8s/collab-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: collab-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: collab-server
  template:
    metadata:
      labels:
        app: collab-server
    spec:
      containers:
      - name: collab-server
        image: whisker/collab-server:latest
        ports:
        - containerPort: 4444
        env:
        - name: PERSIST_PATH
          value: /data
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: collab-data
---
apiVersion: v1
kind: Service
metadata:
  name: collab-server
spec:
  selector:
    app: collab-server
  ports:
  - port: 4444
    targetPort: 4444
  type: LoadBalancer
```

### Self-Hosted
- Docker image in GitHub registry
- Docker Compose file for quick start
- Reverse proxy setup (nginx)
- SSL certificate guide

## Risks and Mitigations

### Risk 1: Server Scalability

**Risk**: Server becomes bottleneck with many users
**Impact**: HIGH
**Likelihood**: MEDIUM

**Mitigation**:
1. Horizontal scaling with Redis pub/sub
2. WebRTC peer-to-peer fallback
3. Room-based sharding
4. Rate limiting

### Risk 2: Data Loss

**Risk**: Yjs document corruption or loss
**Impact**: CRITICAL
**Likelihood**: LOW

**Mitigation**:
1. Regular snapshots to disk
2. Client-side caching
3. Backup to Git on interval
4. Manual export option

### Risk 3: Merge Conflicts

**Risk**: Diverged documents after long offline period
**Impact**: MEDIUM
**Likelihood**: MEDIUM

**Mitigation**:
1. Use Phase 4D conflict resolution UI
2. Clear offline mode indicators
3. Warn before offline edits
4. Automatic conflict detection

### Risk 4: Performance Degradation

**Risk**: Large stories slow down sync
**Impact**: MEDIUM
**Likelihood**: MEDIUM

**Mitigation**:
1. Lazy loading of passages
2. Incremental sync
3. Compression
4. Performance monitoring

### Risk 5: Security Vulnerabilities

**Risk**: Unauthorized access to collaboration sessions
**Impact**: HIGH
**Likelihood**: MEDIUM

**Mitigation**:
1. JWT authentication
2. Room access control
3. Rate limiting
4. Input sanitization

### Risk 6: Network Issues

**Risk**: Unreliable connections cause bad UX
**Impact**: MEDIUM
**Likelihood**: HIGH

**Mitigation**:
1. Aggressive reconnection logic
2. Offline mode with clear indicators
3. Queue operations when offline
4. Optimistic UI updates

## Success Criteria

### Functional Requirements
- ✅ Two users can edit the same story simultaneously
- ✅ Changes appear in real-time (< 200ms latency)
- ✅ Cursors are visible to other users
- ✅ Presence indicators show who's online
- ✅ Works offline and syncs when reconnected
- ✅ No data loss on disconnect
- ✅ No manual conflict resolution for concurrent edits

### Performance Requirements
- ✅ Sync latency < 200ms (p95)
- ✅ Supports 10 concurrent users per story
- ✅ Memory usage < 100MB per client
- ✅ Server handles 100 concurrent connections
- ✅ Bundle size increase < 100KB

### User Experience
- ✅ Clear connection status
- ✅ Smooth cursor movements
- ✅ No jarring UI updates
- ✅ Offline mode is obvious
- ✅ Easy to enable/disable collaboration

### Reliability
- ✅ 99.9% uptime for server
- ✅ Automatic recovery from crashes
- ✅ Data persisted every 30 seconds
- ✅ No corruption after network failures

## Cost Estimate

### Development Time
- **6 weeks** @ 1 FTE = ~240 hours
- At $100/hour = **$24,000**

### Infrastructure (Monthly)
- **Server hosting**: $20-50 (Railway/Render)
- **Bandwidth**: $10-30 (depends on usage)
- **Storage**: $5-10 (LevelDB data)
- **Monitoring**: $0 (free tier)
- **Total**: **$35-90/month**

### Self-Hosted Option
- $0 monthly costs
- Server requirements: 2GB RAM, 1 CPU, 10GB disk
- Can run on existing infrastructure

## Documentation Deliverables

1. **Architecture Document** (this file)
2. **Server Deployment Guide**
   - Docker setup
   - Kubernetes manifests
   - Railway/Render deployment
   - Self-hosted guide

3. **Client Integration Guide**
   - Enable collaboration
   - Configure providers
   - Customize UI
   - Troubleshooting

4. **API Reference**
   - YjsProvider API
   - CollaborationManager API
   - Svelte store API
   - Server endpoints

5. **User Guide**
   - How to collaborate
   - Invite collaborators
   - Understand presence
   - Troubleshoot issues

## Future Enhancements

### Phase 4F: Advanced Collaboration (Future)
- **Comments on Selections**: Comment on specific text
- **Threaded Discussions**: Reply to comments
- **Mentions**: @mention collaborators
- **Activity Feed**: See what others are doing
- **Permissions**: Read-only, editor, owner roles

### Phase 4G: Team Features (Future)
- **Teams/Organizations**: Group management
- **Project Templates**: Shared starting points
- **Style Guides**: Team writing standards
- **Review Workflows**: Approval processes

### Phase 4H: Integration (Future)
- **Slack Notifications**: Updates in Slack
- **Discord Integration**: Collaboration via Discord
- **GitHub Actions**: Auto-deploy on changes
- **Zapier**: Connect to other tools

## Conclusion

Phase 4E will transform Whisker Editor from a solo writing tool into a powerful collaborative platform. By leveraging Yjs and WebSockets, we can deliver Google Docs-style real-time collaboration with minimal server complexity.

The phased approach allows for incremental delivery and testing, reducing risk while building toward a complete real-time collaboration solution.

**Recommended Next Steps**:
1. **Approval**: Review and approve this plan
2. **Prototype**: Build Week 1 infrastructure as proof-of-concept
3. **Decision**: Validate technology choices with prototype
4. **Execute**: Begin full Phase 4E implementation

**Total Investment**: ~6 weeks development + $35-90/month infrastructure

**Expected ROI**: Significant competitive advantage, enables team-based workflows, major feature differentiation

---

**Status**: 📋 AWAITING APPROVAL
**Last Updated**: November 19, 2025
**Version**: 1.0
