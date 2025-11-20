# Collaboration Features

This document describes the collaboration features in Whisker Editor, including conflict resolution, change tracking, and merge workflows.

## Table of Contents

- [Overview](#overview)
- [Change Tracking](#change-tracking)
- [Comments and Annotations](#comments-and-annotations)
- [Conflict Resolution](#conflict-resolution)
- [Merge Workflows](#merge-workflows)
- [API Reference](#api-reference)
- [Examples](#examples)

## Overview

Whisker Editor provides comprehensive collaboration features for team-based interactive fiction development:

- **Change Tracking**: Track all modifications to stories, passages, and metadata
- **Comments**: Add threaded comments to passages for review and discussion
- **Conflict Detection**: Automatically detect conflicts when merging changes
- **Visual Diff**: Side-by-side or unified diff view for comparing changes
- **Conflict Resolution**: Interactive UI for resolving merge conflicts
- **Merge Tool**: Automated and manual merge workflows

## Change Tracking

All changes to your story are automatically tracked when change tracking is enabled.

### Enabling Change Tracking

```typescript
import { changeTrackingActions } from '@writewhisker/editor-base';

// Enable tracking
changeTrackingActions.setTracking(true);
```

### Tracking Changes

Changes are automatically logged as you edit:

```typescript
import { changeTrackingActions } from '@writewhisker/editor-base';

// Add a change entry
changeTrackingActions.addChange({
  user: 'JohnDoe',
  changeType: 'update',
  entityType: 'passage',
  entityId: 'passage-123',
  entityName: 'Opening Scene',
  description: 'Updated passage content',
  oldValue: 'Old content...',
  newValue: 'New content...',
});
```

### Viewing Change History

```svelte
<script>
  import { ChangeHistory } from '@writewhisker/editor-base';
</script>

<ChangeHistory />
```

### Change Types

- `create`: Entity was created
- `update`: Entity was modified
- `delete`: Entity was deleted

### Entity Types

- `story`: Story-level changes
- `passage`: Passage changes
- `choice`: Choice changes
- `variable`: Variable changes
- `metadata`: Metadata changes

## Comments and Annotations

Add comments to passages for collaboration and review.

### Adding Comments

```svelte
<script>
  import { CommentPanel } from '@writewhisker/editor-base';

  let passageId = 'passage-123';
</script>

<CommentPanel {passageId} />
```

### Comment Features

- **Threaded Replies**: Comments support nested replies
- **User Attribution**: Track who made each comment
- **Timestamps**: Automatic timestamp for each comment
- **Resolution**: Mark comments as resolved when addressed
- **Filtering**: Filter by user, resolved status, etc.

### Comment Model

```typescript
import { Comment } from '@writewhisker/core-ts';

const comment = new Comment({
  passageId: 'passage-123',
  user: 'Reviewer',
  content: 'This passage needs more detail about the character.',
  parentId: undefined, // For threaded replies
});

// Add a reply
const reply = new Comment({
  passageId: 'passage-123',
  user: 'Author',
  content: 'Good point, I\'ll add more background.',
  parentId: comment.id,
});

comment.addReply(reply);

// Mark as resolved
comment.resolve();
```

## Conflict Resolution

When multiple people edit the same story, conflicts may occur. Whisker provides tools to detect and resolve these conflicts.

### Conflict Types

- **Content Conflicts**: Different edits to the same passage content
- **Metadata Conflicts**: Changes to story or passage metadata (title, description, etc.)
- **Structure Conflicts**: Changes to passage positions or connections
- **Deletion Conflicts**: One version deletes while another modifies

### Detecting Conflicts

```typescript
import { ConflictDetector, type MergeContext } from '@writewhisker/editor-base';

const context: MergeContext = {
  local: localStory,
  remote: remoteStory,
  localUser: 'You',
  remoteUser: 'Collaborator',
};

// Detect all conflicts
const conflicts = ConflictDetector.detectConflicts(context, {
  compareContent: true,
  compareMetadata: true,
  compareStructure: true,
});

console.log(`Found ${conflicts.length} conflicts`);
```

### Auto-Merge

Whisker can automatically merge non-conflicting changes:

```typescript
const result = ConflictDetector.autoMerge(context);

if (result.success) {
  console.log('Auto-merge successful!');
  const mergedStory = result.mergedStory;
} else {
  console.log('Manual resolution required');
  console.log(`Conflicts: ${result.conflicts.length}`);
}
```

### Visual Diff Viewer

Compare changes side-by-side or in unified view:

```svelte
<script>
  import { DiffViewer } from '@writewhisker/editor-base';

  let localContent = "Original passage content...";
  let remoteContent = "Modified passage content...";
</script>

<DiffViewer
  {localContent}
  {remoteContent}
  localLabel="Your Version"
  remoteLabel="Collaborator's Version"
  showLineNumbers={true}
/>
```

### Conflict Resolution Dialog

Interactive dialog for resolving conflicts:

```svelte
<script>
  import { ConflictResolutionDialog } from '@writewhisker/editor-base';

  let conflicts = [...]; // Array of conflicts
  let showDialog = true;

  function handleResolve(event) {
    const resolved = event.detail.conflicts;
    // Apply resolved conflicts
    console.log('Conflicts resolved!');
  }

  function handleCancel() {
    showDialog = false;
  }
</script>

<ConflictResolutionDialog
  {conflicts}
  open={showDialog}
  on:resolve={handleResolve}
  on:cancel={handleCancel}
/>
```

## Merge Workflows

### Simple Merge

For straightforward merges with auto-resolution:

```svelte
<script>
  import { MergeTool } from '@writewhisker/editor-base';

  const context = {
    local: currentStory,
    remote: incomingStory,
    localUser: 'You',
    remoteUser: 'Collaborator',
  };

  function handleMerge(event) {
    const result = event.detail.result;

    if (result.success) {
      // Apply merged story
      currentStory = result.mergedStory;
      console.log('Merge complete!');
    }
  }
</script>

<MergeTool {context} open={true} on:merge={handleMerge} />
```

### Full Conflict Resolution Workflow

Complete workflow with conflict resolution:

```typescript
import { ConflictDetector, type MergeContext, type Conflict } from '@writewhisker/editor-base';

async function mergeStories(local: Story, remote: Story) {
  const context: MergeContext = {
    local,
    remote,
    localUser: getCurrentUser(),
    remoteUser: getRemoteUser(),
  };

  // Step 1: Detect conflicts
  const conflicts = ConflictDetector.detectConflicts(context);

  if (conflicts.length === 0) {
    // No conflicts - merge automatically
    const result = ConflictDetector.autoMerge(context);
    return result.mergedStory;
  }

  // Step 2: Show conflict resolution UI
  const resolved = await showConflictDialog(conflicts);

  // Step 3: Apply resolutions
  const mergedStory = applyResolutions(local, resolved);

  return mergedStory;
}
```

### GitHub Integration

When using GitHub sync, conflicts are automatically detected:

```typescript
import { GitHubSync } from '@writewhisker/github';
import { ConflictDetector } from '@writewhisker/editor-base';

const sync = new GitHubSync(config);

// Pull changes
const pullResult = await sync.pull();

if (pullResult.hasConflicts) {
  const context = {
    local: currentStory,
    remote: pullResult.remoteStory,
    localUser: currentUser,
    remoteUser: pullResult.lastCommitAuthor,
  };

  // Show conflict resolution UI
  const conflicts = ConflictDetector.detectConflicts(context);
  // ... resolve conflicts
}
```

## API Reference

### ConflictDetector

```typescript
class ConflictDetector {
  // Detect conflicts between two story versions
  static detectConflicts(
    context: MergeContext,
    options?: ConflictDetectionOptions
  ): Conflict[];

  // Generate visual diff chunks
  static generateDiff(
    localContent: string,
    remoteContent: string
  ): DiffChunk[];

  // Attempt automatic merge
  static autoMerge(context: MergeContext): MergeResult;
}
```

### Types

```typescript
// Conflict types
type ConflictType = 'content' | 'metadata' | 'structure' | 'deletion';
type ConflictResolution = 'local' | 'remote' | 'manual' | 'merge';

// Conflict interface
interface Conflict {
  id: string;
  type: ConflictType;
  path: string;
  description: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  localUser?: string;
  remoteUser?: string;
  resolution?: ConflictResolution;
  resolvedValue?: any;
  autoMergeable: boolean;
}

// Merge context
interface MergeContext {
  base?: Story; // Common ancestor (for 3-way merge)
  local: Story;
  remote: Story;
  localUser?: string;
  remoteUser?: string;
}

// Merge result
interface MergeResult {
  success: boolean;
  conflicts: Conflict[];
  mergedStory?: Story;
  error?: string;
}

// Diff chunk
interface DiffChunk {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  localLines?: string[];
  remoteLines?: string[];
  startLine: number;
  endLine: number;
}
```

### Components

#### DiffViewer

```svelte
<DiffViewer
  localContent={string}
  remoteContent={string}
  localLabel={string}      // Optional, default: "Local"
  remoteLabel={string}     // Optional, default: "Remote"
  showLineNumbers={boolean} // Optional, default: true
  contextLines={number}    // Optional, default: 3
/>
```

#### ConflictResolutionDialog

```svelte
<ConflictResolutionDialog
  conflicts={Conflict[]}
  open={boolean}           // Optional, default: true
  on:resolve={(event) => {
    const resolved = event.detail.conflicts;
  }}
  on:cancel={() => {}}
/>
```

#### MergeTool

```svelte
<MergeTool
  context={MergeContext}
  open={boolean}           // Optional, default: false
  on:merge={(event) => {
    const result = event.detail.result;
  }}
  on:cancel={() => {}}
/>
```

## Examples

### Example 1: Basic Conflict Detection

```typescript
import { ConflictDetector } from '@writewhisker/editor-base';
import { Story } from '@writewhisker/core-ts';

const localStory = new Story({
  metadata: { title: 'My Story v1' },
  passages: [/* ... */],
});

const remoteStory = new Story({
  metadata: { title: 'My Story v2' },
  passages: [/* ... */],
});

const conflicts = ConflictDetector.detectConflicts({
  local: localStory,
  remote: remoteStory,
});

for (const conflict of conflicts) {
  console.log(`Conflict in ${conflict.path}: ${conflict.description}`);
}
```

### Example 2: Manual Conflict Resolution

```typescript
const conflicts = ConflictDetector.detectConflicts(context);

// Resolve each conflict
for (const conflict of conflicts) {
  if (conflict.type === 'content') {
    // Choose local version
    conflict.resolution = 'local';
    conflict.resolvedValue = conflict.localValue;
  } else if (conflict.type === 'metadata') {
    // Choose remote version
    conflict.resolution = 'remote';
    conflict.resolvedValue = conflict.remoteValue;
  }
}

// Apply resolutions
const mergedStory = applyResolutions(localStory, conflicts);
```

### Example 3: Complete Svelte Component

```svelte
<script lang="ts">
  import {
    MergeTool,
    ConflictResolutionDialog,
    type MergeContext,
    type MergeResult
  } from '@writewhisker/editor-base';
  import { currentStory } from '../stores/storyStore';

  let showMergeTool = false;
  let mergeContext: MergeContext | null = null;

  async function handlePullFromRemote() {
    const remoteStory = await fetchRemoteStory();

    mergeContext = {
      local: $currentStory,
      remote: remoteStory,
      localUser: 'You',
      remoteUser: 'Collaborator',
    };

    showMergeTool = true;
  }

  function handleMerge(event: CustomEvent<{ result: MergeResult }>) {
    const result = event.detail.result;

    if (result.success && result.mergedStory) {
      currentStory.set(result.mergedStory);
      showMergeTool = false;
      alert('Merge successful!');
    }
  }

  function handleCancel() {
    showMergeTool = false;
  }
</script>

<button on:click={handlePullFromRemote}>
  Pull from Remote
</button>

{#if showMergeTool && mergeContext}
  <MergeTool
    context={mergeContext}
    open={showMergeTool}
    on:merge={handleMerge}
    on:cancel={handleCancel}
  />
{/if}
```

## Best Practices

1. **Enable Change Tracking**: Always enable change tracking in collaborative projects
2. **Regular Syncs**: Sync frequently to minimize conflicts
3. **Clear Commit Messages**: Use descriptive messages when saving changes
4. **Review Before Merge**: Always review conflicts carefully before resolving
5. **Test After Merge**: Test your story after merging to ensure everything works
6. **Backup Before Merge**: Create backups before performing complex merges
7. **Communicate**: Use comments to communicate with collaborators about changes

## Future Features

These features are planned for future releases:

### Real-time Collaboration (Future)

- **WebSocket Integration**: Real-time updates when collaborators make changes
- **Cursor Sharing**: See where other collaborators are editing
- **Live Presence**: See who's currently editing the story
- **Operational Transformation**: Handle concurrent edits in real-time

### CRDT Integration (Future)

- **Conflict-free Replicated Data Types**: Automatic conflict resolution
- **Yjs/Automerge**: Integration with proven CRDT libraries
- **Offline-first**: Work offline and sync seamlessly when back online

## Troubleshooting

### Conflicts Not Detected

- Ensure both stories are properly loaded
- Check that change tracking is enabled
- Verify story metadata is complete

### Auto-merge Fails

- Review the conflicts array to see what couldn't be merged
- Use the ConflictResolutionDialog for manual resolution
- Check for structural issues in the story

### Performance Issues

- For large stories, consider limiting comparison scope
- Use `ignoreWhitespace: true` for content-heavy comparisons
- Process conflicts in batches for better performance

## Support

For questions or issues with collaboration features:

- GitHub Issues: https://github.com/writewhisker/whisker-editor-web/issues
- Documentation: https://whisker.readthedocs.io/
- Community: https://discord.gg/whisker
