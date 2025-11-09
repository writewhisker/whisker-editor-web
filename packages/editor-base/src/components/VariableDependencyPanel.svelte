<script lang="ts">
  import {
    dependencyStore,
    dependencyGraph,
    selectedVariable,
    variableNodes,
    circularDependencies,
    unusedVariables,
    orphanVariables,
    type VariableNode,
  } from '../stores/variableDependencyStore';
  import { currentStory } from '../stores/storyStateStore';

  let analyzing = $state(false);
  let viewMode: 'list' | 'issues' | 'details' = $state('list');
  let selectedNode: VariableNode | null = $state(null);

  // Analyze dependencies
  function analyze() {
    if (!$currentStory) return;
    analyzing = true;
    try {
      dependencyStore.analyze($currentStory);
    } finally {
      analyzing = false;
    }
  }

  // Select variable
  function selectVar(varName: string) {
    dependencyStore.selectVariable(varName);
    const node = $dependencyGraph?.nodes.get(varName);
    if (node) {
      selectedNode = node;
      viewMode = 'details';
    }
  }

  // Get usage icon
  function getUsageIcon(type: string): string {
    switch (type) {
      case 'read': return '👁️';
      case 'write': return '✏️';
      case 'condition': return '🔀';
      case 'display': return '📺';
      default: return '📌';
    }
  }

  // Get variable color based on status
  function getVariableColor(node: VariableNode): string {
    if (node.isUnused) return 'text-gray-400 dark:text-gray-600';
    if (node.isOrphan) return 'text-yellow-600 dark:text-yellow-400';
    if (node.readCount > node.writeCount * 3) return 'text-blue-600 dark:text-blue-400';
    if (node.writeCount > node.readCount * 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }

  // Auto-analyze when story changes
  $effect(() => {
    if ($currentStory) {
      analyze();
    }
  });
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Variable Dependencies
      </h2>
      <button
        onclick={analyze}
        disabled={!$currentStory || analyzing}
        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
      >
        {analyzing ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>

    {#if $dependencyGraph}
      <div class="flex gap-2">
        <button
          onclick={() => viewMode = 'list'}
          class="px-2 py-1 text-xs rounded {viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}"
        >
          Variables
        </button>
        <button
          onclick={() => viewMode = 'issues'}
          class="px-2 py-1 text-xs rounded {viewMode === 'issues' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}"
        >
          Issues
        </button>
        {#if selectedNode}
          <button
            onclick={() => viewMode = 'details'}
            class="px-2 py-1 text-xs rounded {viewMode === 'details' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}"
          >
            Details
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if !$currentStory}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No story loaded</p>
      </div>
    {:else if !$dependencyGraph}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-sm">Click "Analyze" to build dependency graph</p>
      </div>
    {:else if viewMode === 'list'}
      <!-- Variables List -->
      <div>
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Variables ({$variableNodes.length})
        </div>
        <div class="space-y-2">
          {#each $variableNodes.sort((a, b) => a.name.localeCompare(b.name)) as node (node.name)}
            <button
              onclick={() => selectVar(node.name)}
              class="w-full p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium {getVariableColor(node)} truncate">
                    {node.name}
                    {#if node.isUnused}
                      <span class="text-xs text-gray-400">· unused</span>
                    {:else if node.isOrphan}
                      <span class="text-xs text-yellow-600 dark:text-yellow-400">· orphan</span>
                    {/if}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">
                    {node.type} · R:{node.readCount} W:{node.writeCount} · {node.passagesUsed.length} passage{node.passagesUsed.length !== 1 ? 's' : ''}
                  </div>
                  {#if node.dependencies.dependsOn.length > 0}
                    <div class="text-xs text-gray-500 dark:text-gray-500 truncate">
                      ← {node.dependencies.dependsOn.join(', ')}
                    </div>
                  {/if}
                </div>
                <div class="text-xs text-gray-400">→</div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if viewMode === 'issues'}
      <!-- Issues View -->
      <div class="space-y-4">
        <!-- Circular Dependencies -->
        {#if $circularDependencies.length > 0}
          <div>
            <div class="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              ⚠️ Circular Dependencies ({$circularDependencies.length})
            </div>
            <div class="space-y-2">
              {#each $circularDependencies as cycle}
                <div class="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div class="text-sm text-gray-900 dark:text-gray-100 mb-1 font-medium">
                    {cycle.chain.join(' → ')} → {cycle.chain[0]}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400">
                    Found in {cycle.passages.length} passage{cycle.passages.length !== 1 ? 's' : ''}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Unused Variables -->
        {#if $unusedVariables.length > 0}
          <div>
            <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Unused Variables ({$unusedVariables.length})
            </div>
            <div class="space-y-1">
              {#each $unusedVariables as varName}
                <button
                  onclick={() => selectVar(varName)}
                  class="w-full p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm text-gray-700 dark:text-gray-300"
                >
                  {varName}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Orphan Variables -->
        {#if $orphanVariables.length > 0}
          <div>
            <div class="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
              Orphan Variables ({$orphanVariables.length})
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Variables that are written but never read
            </div>
            <div class="space-y-1">
              {#each $orphanVariables as varName}
                <button
                  onclick={() => selectVar(varName)}
                  class="w-full p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-left text-sm text-gray-700 dark:text-gray-300"
                >
                  {varName}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if $circularDependencies.length === 0 && $unusedVariables.length === 0 && $orphanVariables.length === 0}
          <div class="p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div class="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ No dependency issues detected
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              All variables are properly used and have no circular dependencies
            </div>
          </div>
        {/if}
      </div>
    {:else if viewMode === 'details' && selectedNode}
      <!-- Variable Details -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <button
            onclick={() => { viewMode = 'list'; selectedNode = null; }}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to list
          </button>
        </div>

        <div class="p-3 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div class="text-lg font-medium {getVariableColor(selectedNode)} mb-2">
            {selectedNode.name}
          </div>
          <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div><strong>Type:</strong> {selectedNode.type}</div>
            <div><strong>Reads:</strong> {selectedNode.readCount}</div>
            <div><strong>Writes:</strong> {selectedNode.writeCount}</div>
            <div><strong>Passages:</strong> {selectedNode.passagesUsed.length}</div>
            {#if selectedNode.isUnused}
              <div class="text-gray-500">⚠️ Never used in story</div>
            {/if}
            {#if selectedNode.isOrphan}
              <div class="text-yellow-600 dark:text-yellow-400">⚠️ Written but never read</div>
            {/if}
          </div>
        </div>

        <!-- Dependencies -->
        {#if selectedNode.dependencies.dependsOn.length > 0}
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Depends On
            </div>
            <div class="space-y-1">
              {#each selectedNode.dependencies.dependsOn as depVar}
                <button
                  onclick={() => selectVar(depVar)}
                  class="w-full p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-left text-sm text-gray-700 dark:text-gray-300"
                >
                  ← {depVar}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedNode.dependencies.affects.length > 0}
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Affects
            </div>
            <div class="space-y-1">
              {#each selectedNode.dependencies.affects as affVar}
                <button
                  onclick={() => selectVar(affVar)}
                  class="w-full p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left text-sm text-gray-700 dark:text-gray-300"
                >
                  {affVar} →
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Usage Locations -->
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Usage Locations ({selectedNode.usages.length})
          </div>
          <div class="space-y-1 max-h-64 overflow-y-auto">
            {#each selectedNode.usages as usage}
              <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {getUsageIcon(usage.usageType)} {usage.passageTitle}
                    </div>
                    <div class="text-gray-600 dark:text-gray-400">
                      {usage.usageType}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
