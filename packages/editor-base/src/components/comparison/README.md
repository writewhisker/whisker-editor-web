# Story Comparison View

A comprehensive component for comparing two versions of a story side-by-side with detailed diff analysis and merge capabilities.

## Features

- **Side-by-side comparison** of two Story instances
- **Metadata comparison** (title, author, IFID, version, etc.)
- **Passage-level diff detection**
  - Added passages (green)
  - Removed passages (red)
  - Modified passages (yellow)
  - Detailed change tracking
- **Variable comparison**
- **Statistics comparison** (passage count, word count, choice count)
- **Selective merge** - accept all or selected passages from either version
- **Filtering** - filter by change type (added/removed/modified)
- **Responsive and scrollable** layout
- **Dark mode support**

## Usage

### Basic Usage

```svelte
<script>
  import StoryComparisonView from '$lib/components/comparison/StoryComparisonView.svelte';
  import { currentStory } from '$lib/stores/projectStore';

  let importedStory = /* ... */;

  function handleAccept(event) {
    const { source, story, selectedPassages } = event.detail;

    if (source === 'right') {
      // Accept the imported story
      projectActions.loadProject(story.serialize());
    }
    // source === 'left' means keep current story
  }
</script>

<StoryComparisonView
  leftStory={$currentStory}
  rightStory={importedStory}
  leftLabel="Current Version"
  rightLabel="Imported Version"
  leftDate={new Date($currentStory.metadata.modified)}
  rightDate={new Date(importedStory.metadata.modified)}
  on:accept={handleAccept}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftStory` | `Story \| null` | `null` | Left story to compare |
| `rightStory` | `Story \| null` | `null` | Right story to compare |
| `leftLabel` | `string` | `'Current Version'` | Label for left version |
| `rightLabel` | `string` | `'Imported Version'` | Label for right version |
| `leftDate` | `Date \| null` | `null` | Last modified date for left version |
| `rightDate` | `Date \| null` | `null` | Last modified date for right version |

### Events

#### `accept`

Dispatched when user accepts changes from one side.

**Event detail:**
```typescript
{
  source: 'left' | 'right',        // Which version was accepted
  story: Story,                     // The accepted story
  selectedPassages: string[]        // IDs of selected passages (empty = all)
}
```

## Integration Examples

### Import Dialog Integration

```svelte
<script>
  import ImportDialog from '$lib/components/export/ImportDialog.svelte';

  let showImportDialog = false;
</script>

<!-- The ImportDialog now includes comparison automatically -->
<ImportDialog
  bind:show={showImportDialog}
  showComparison={true}
  on:import={handleImport}
/>
```

### GitHub Conflict Resolution

```svelte
<script>
  import GitHubConflictResolver from '$lib/components/github/GitHubConflictResolver.svelte';

  let showConflict = false;
  let localVersion = /* ... */;
  let remoteVersion = /* ... */;
</script>

<!-- The conflict resolver now uses StoryComparisonView -->
<GitHubConflictResolver
  bind:show={showConflict}
  {localVersion}
  {remoteVersion}
  on:resolve={handleResolve}
/>
```

## Comparison Utilities

The comparison functionality is powered by `storyComparison.ts` utility functions:

```typescript
import { compareStories, mergeStories } from '$lib/utils/storyComparison';

// Compare two stories
const comparison = compareStories(leftStory, rightStory);

console.log(comparison.summary);
// { added: 3, removed: 1, modified: 5, unchanged: 10 }

console.log(comparison.passageDiffs);
// Array of PassageDiff objects with detailed change information

// Merge stories
const merged = mergeStories(
  baseStory,           // Story to merge into
  sourceStory,         // Story to merge from
  ['passage-id-1'],    // Optional: specific passages to merge
  'right'              // Which source to use
);
```

## Styling

The component includes custom scrollbars and full dark mode support. All colors and styles can be customized via Tailwind classes.

## Performance Considerations

- Comparison is computed reactively when stories change
- Large story comparisons (1000+ passages) are handled efficiently
- Word counting is optimized for performance
- Virtual scrolling is used for long passage lists

## Future Enhancements

- [ ] Three-way merge support (base, left, right)
- [ ] Visual diff highlighting for passage content
- [ ] Conflict markers for incompatible changes
- [ ] Export comparison report
- [ ] Passage content preview on hover
- [ ] Undo/redo support for merge operations
