<script lang="ts">
  import { versionDiffStore, snapshots, currentDiff, hasSnapshots, type VersionSnapshot, type PassageDiff } from '../stores/versionDiffStore';
  import { currentStory } from '../stores/projectStore';

  let view: 'snapshots' | 'compare' | 'diff' = 'snapshots';

  // Create snapshot form
  let showCreateForm = false;
  let snapshotLabel = '';
  let snapshotDescription = '';
  let snapshotAuthor = '';

  // Edit snapshot
  let editingSnapshot: VersionSnapshot | null = null;
  let editLabel = '';
  let editDescription = '';

  // Compare form
  let selectedFrom: string = '';
  let selectedTo: string = '';

  // Diff view options
  let showUnchanged = false;
  let expandedPassages = new Set<string>();

  function createSnapshot() {
    if (!$currentStory || !snapshotLabel.trim()) return;

    versionDiffStore.createSnapshot(
      $currentStory,
      snapshotLabel,
      snapshotDescription,
      snapshotAuthor || undefined
    );

    snapshotLabel = '';
    snapshotDescription = '';
    snapshotAuthor = '';
    showCreateForm = false;
  }

  function startEditSnapshot(snapshot: VersionSnapshot) {
    editingSnapshot = snapshot;
    editLabel = snapshot.label;
    editDescription = snapshot.description;
  }

  function saveEditSnapshot() {
    if (!editingSnapshot || !editLabel.trim()) return;

    versionDiffStore.updateSnapshot(editingSnapshot.id, {
      label: editLabel,
      description: editDescription,
    });

    editingSnapshot = null;
  }

  function deleteSnapshot(id: string) {
    if (confirm('Delete this snapshot?')) {
      versionDiffStore.deleteSnapshot(id);
    }
  }

  function compareVersions() {
    if (!selectedFrom || !selectedTo) return;

    versionDiffStore.selectVersions(selectedFrom, selectedTo);
    view = 'diff';
  }

  function togglePassageExpansion(passageId: string) {
    if (expandedPassages.has(passageId)) {
      expandedPassages.delete(passageId);
    } else {
      expandedPassages.add(passageId);
    }
    expandedPassages = expandedPassages; // Trigger reactivity
  }

  function getChangeColor(type: string): string {
    switch (type) {
      case 'added': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'removed': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'modified': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }

  function downloadDiffReport() {
    if (!$currentDiff) return;

    const html = versionDiffStore.exportDiffReport($currentDiff);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-${$currentDiff.fromVersion.label}-to-${$currentDiff.toVersion.label}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Auto-select snapshots when navigating to compare view
  $: if (view === 'compare' && $snapshots.length >= 2 && !selectedFrom && !selectedTo) {
    const sorted = [...$snapshots].sort((a, b) => a.timestamp - b.timestamp);
    selectedFrom = sorted[sorted.length - 2].id;
    selectedTo = sorted[sorted.length - 1].id;
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800">
  <!-- Header -->
  <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-3">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Version Comparison</h2>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Compare story versions and track changes</p>
  </div>

  <!-- View Tabs -->
  <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
    <div class="flex gap-2 p-2">
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'snapshots' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={() => { view = 'snapshots'; showCreateForm = false; editingSnapshot = null; }}
      >
        Snapshots ({$snapshots.length})
      </button>
      <button
        class="px-3 py-1.5 text-xs rounded {view === 'compare' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
        on:click={() => { view = 'compare'; showCreateForm = false; editingSnapshot = null; }}
        disabled={$snapshots.length < 2}
      >
        Compare
      </button>
      {#if $currentDiff}
        <button
          class="px-3 py-1.5 text-xs rounded {view === 'diff' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
          on:click={() => { view = 'diff'; showCreateForm = false; editingSnapshot = null; }}
        >
          Diff View
        </button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-3 space-y-3">
    {#if view === 'snapshots'}
      <!-- Snapshots View -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-medium">Version Snapshots</h3>
          <button
            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={() => { showCreateForm = !showCreateForm; editingSnapshot = null; }}
            disabled={!$currentStory}
          >
            + Create Snapshot
          </button>
        </div>

        {#if showCreateForm}
          <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 space-y-2">
            <h4 class="text-sm font-medium">Create New Snapshot</h4>
            <div>
              <label class="block text-xs font-medium mb-1">Label *</label>
              <input
                type="text"
                bind:value={snapshotLabel}
                placeholder="v1.0.0 or Major Revision"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Description</label>
              <textarea
                bind:value={snapshotDescription}
                rows="2"
                placeholder="What changed in this version..."
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              ></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Author (optional)</label>
              <input
                type="text"
                bind:value={snapshotAuthor}
                placeholder="Your name"
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                on:click={createSnapshot}
              >
                Create
              </button>
              <button
                class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                on:click={() => { showCreateForm = false; snapshotLabel = ''; snapshotDescription = ''; snapshotAuthor = ''; }}
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}

        {#if $snapshots.length === 0}
          <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No snapshots yet. Create snapshots to track version history.
          </div>
        {:else}
          <div class="space-y-2">
            {#each [...$snapshots].sort((a, b) => b.timestamp - a.timestamp) as snapshot}
              <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                {#if editingSnapshot?.id === snapshot.id}
                  <div class="space-y-2">
                    <div>
                      <label class="block text-xs font-medium mb-1">Label</label>
                      <input
                        type="text"
                        bind:value={editLabel}
                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium mb-1">Description</label>
                      <textarea
                        bind:value={editDescription}
                        rows="2"
                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      ></textarea>
                    </div>
                    <div class="flex gap-2">
                      <button
                        class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        on:click={saveEditSnapshot}
                      >
                        Save
                      </button>
                      <button
                        class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        on:click={() => { editingSnapshot = null; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <div class="font-medium text-sm">{snapshot.label}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(snapshot.timestamp)}</div>
                      </div>
                      {#if snapshot.description}
                        <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">{snapshot.description}</div>
                      {/if}
                      <div class="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(snapshot.timestamp)}
                        {#if snapshot.author} • {snapshot.author}{/if}
                        • {snapshot.story.passages.length} passages
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                        on:click={() => startEditSnapshot(snapshot)}
                      >
                        Edit
                      </button>
                      <button
                        class="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                        on:click={() => deleteSnapshot(snapshot.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if view === 'compare'}
      <!-- Compare View -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium">Select Versions to Compare</h3>

        <div>
          <label class="block text-sm font-medium mb-2">From (older version)</label>
          <select
            bind:value={selectedFrom}
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="">Select version...</option>
            {#each [...$snapshots].sort((a, b) => a.timestamp - b.timestamp) as snapshot}
              <option value={snapshot.id}>{snapshot.label} ({formatRelativeTime(snapshot.timestamp)})</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">To (newer version)</label>
          <select
            bind:value={selectedTo}
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            <option value="">Select version...</option>
            {#each [...$snapshots].sort((a, b) => a.timestamp - b.timestamp) as snapshot}
              <option value={snapshot.id}>{snapshot.label} ({formatRelativeTime(snapshot.timestamp)})</option>
            {/each}
          </select>
        </div>

        <button
          class="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          on:click={compareVersions}
          disabled={!selectedFrom || !selectedTo || selectedFrom === selectedTo}
        >
          Compare Versions
        </button>
      </div>

    {:else if view === 'diff' && $currentDiff}
      <!-- Diff View -->
      <div class="space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-sm font-medium">Comparison Results</h3>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {$currentDiff.fromVersion.label} → {$currentDiff.toVersion.label}
            </div>
          </div>
          <button
            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            on:click={downloadDiffReport}
          >
            Export Report
          </button>
        </div>

        <!-- Stats Summary -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <div class="text-green-600 dark:text-green-400 font-medium">+{$currentDiff.stats.passagesAdded}</div>
            <div class="text-gray-600 dark:text-gray-400">Added</div>
          </div>
          <div class="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <div class="text-red-600 dark:text-red-400 font-medium">-{$currentDiff.stats.passagesRemoved}</div>
            <div class="text-gray-600 dark:text-gray-400">Removed</div>
          </div>
          <div class="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <div class="text-yellow-600 dark:text-yellow-400 font-medium">{$currentDiff.stats.passagesModified}</div>
            <div class="text-gray-600 dark:text-gray-400">Modified</div>
          </div>
          <div class="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <div class="text-gray-600 dark:text-gray-400 font-medium">{$currentDiff.stats.passagesUnchanged}</div>
            <div class="text-gray-600 dark:text-gray-400">Unchanged</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              bind:checked={showUnchanged}
              class="rounded"
            />
            Show unchanged passages
          </label>
        </div>

        <!-- Passage Diffs -->
        <div class="space-y-2">
          {#each $currentDiff.passageDiffs.filter(pd => showUnchanged || pd.changeType !== 'unchanged') as passageDiff}
            {@const passage = passageDiff.newPassage || passageDiff.oldPassage}
            {@const isExpanded = expandedPassages.has(passageDiff.passageId)}
            <div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
              <button
                class="w-full p-2 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between"
                on:click={() => togglePassageExpansion(passageDiff.passageId)}
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs">{isExpanded ? '▼' : '▶'}</span>
                  <span class="font-medium text-sm">{passage?.title || 'Untitled'}</span>
                  <span class="px-2 py-0.5 text-xs rounded {getChangeColor(passageDiff.changeType)}">
                    {passageDiff.changeType}
                  </span>
                </div>
                {#if passageDiff.changeType === 'modified'}
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    +{passageDiff.textChanges?.filter(c => c.type === 'added').length || 0}
                    -{passageDiff.textChanges?.filter(c => c.type === 'removed').length || 0}
                  </div>
                {/if}
              </button>

              {#if isExpanded}
                <div class="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  {#if passageDiff.metadataChanges && passageDiff.metadataChanges.length > 0}
                    <div class="mb-3 text-xs">
                      <div class="font-medium mb-1">Metadata Changes:</div>
                      {#each passageDiff.metadataChanges as change}
                        <div class="text-gray-600 dark:text-gray-400">
                          <strong>{change.field}:</strong>
                          <span class="text-red-600 dark:text-red-400">{JSON.stringify(change.oldValue)}</span>
                          →
                          <span class="text-green-600 dark:text-green-400">{JSON.stringify(change.newValue)}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if passageDiff.textChanges && passageDiff.textChanges.length > 0}
                    <div class="font-mono text-xs space-y-px">
                      {#each passageDiff.textChanges as change}
                        <div class="px-2 py-0.5 {change.type === 'added' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : change.type === 'removed' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' : 'text-gray-500 dark:text-gray-400'}">
                          {change.type === 'added' ? '+ ' : change.type === 'removed' ? '- ' : '  '}{change.value}
                        </div>
                      {/each}
                    </div>
                  {:else if passageDiff.changeType === 'added'}
                    <div class="text-xs text-green-600 dark:text-green-400 font-mono whitespace-pre-wrap">
                      {passageDiff.newPassage?.content}
                    </div>
                  {:else if passageDiff.changeType === 'removed'}
                    <div class="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                      {passageDiff.oldPassage?.content}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
