<script lang="ts">
  import {
    playtestStore,
    sessions,
    currentSession,
    isRecording,
    analytics,
    sessionCount,
    type PlaytestSession,
  } from '../stores/playtestStore';
  import { currentStory } from '../stores/storyStateStore';

  let selectedSession: PlaytestSession | null = $state(null);
  let showSessionDetails = $state(false);
  let playerName = $state('');
  let sessionNotes = $state('');

  // Format duration
  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Format timestamp
  function formatTimestamp(isoString: string): string {
    return new Date(isoString).toLocaleString();
  }

  // Start recording
  function startRecording() {
    if (!$currentStory) return;

    const metadata = {
      playerName: playerName.trim() || undefined,
      notes: sessionNotes.trim() || undefined,
    };

    playtestStore.startSession($currentStory, metadata);
    playerName = '';
    sessionNotes = '';
  }

  // Stop recording
  function stopRecording(completed: boolean = false) {
    playtestStore.endSession(completed);
    playtestStore.analyze();
  }

  // View session details
  function viewSession(session: PlaytestSession) {
    selectedSession = session;
    showSessionDetails = true;
  }

  // Close session details
  function closeDetails() {
    showSessionDetails = false;
    selectedSession = null;
  }

  // Delete session
  function deleteSession(sessionId: string) {
    if (confirm('Are you sure you want to delete this session?')) {
      playtestStore.deleteSession(sessionId);
      if (selectedSession?.id === sessionId) {
        closeDetails();
      }
      playtestStore.analyze();
    }
  }

  // Clear all sessions
  function clearAll() {
    if (confirm('Are you sure you want to delete all sessions? This cannot be undone.')) {
      playtestStore.clearAllSessions();
      closeDetails();
    }
  }

  // Export sessions
  function exportSessions() {
    const data = playtestStore.exportSessions();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playtest-sessions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Analyze sessions on mount
  $effect(() => {
    if ($sessions.length > 0 && !$analytics) {
      playtestStore.analyze();
    }
  });
</script>

<div class="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-700">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
      Playtest Recording
    </h2>

    {#if $isRecording}
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span class="text-sm text-red-600 dark:text-red-400 font-medium">Recording...</span>
      </div>
    {/if}

    <div class="text-xs text-gray-500 dark:text-gray-400">
      {$sessionCount} session{$sessionCount !== 1 ? 's' : ''} recorded
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if !$currentStory}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No story loaded</p>
      </div>
    {:else if showSessionDetails && selectedSession}
      <!-- Session Details View -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <button
            onclick={closeDetails}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to list
          </button>
          <button
            onclick={() => deleteSession(selectedSession!.id)}
            class="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Delete
          </button>
        </div>

        <div class="p-3 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Session Details
          </div>
          <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div><strong>ID:</strong> {selectedSession.id}</div>
            <div><strong>Started:</strong> {formatTimestamp(selectedSession.startTime)}</div>
            {#if selectedSession.endTime}
              <div><strong>Ended:</strong> {formatTimestamp(selectedSession.endTime)}</div>
            {/if}
            {#if selectedSession.duration}
              <div><strong>Duration:</strong> {formatDuration(selectedSession.duration)}</div>
            {/if}
            <div><strong>Status:</strong> <span class="{selectedSession.completed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">{selectedSession.completed ? 'Completed' : 'Incomplete'}</span></div>
            <div><strong>Passages:</strong> {selectedSession.passagesVisited.length}</div>
            <div><strong>Choices:</strong> {selectedSession.choicesMade}</div>
            {#if selectedSession.metadata?.playerName}
              <div><strong>Player:</strong> {selectedSession.metadata.playerName}</div>
            {/if}
            {#if selectedSession.metadata?.notes}
              <div><strong>Notes:</strong> {selectedSession.metadata.notes}</div>
            {/if}
          </div>
        </div>

        <!-- Action Timeline -->
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Action Timeline ({selectedSession.actions.length})
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each selectedSession.actions as action, i (i)}
              <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs">
                <div class="flex justify-between items-start mb-1">
                  <span class="font-medium text-gray-700 dark:text-gray-300">
                    {action.type === 'passage_view' ? '📖 View' : action.type === 'choice_select' ? '👆 Choice' : action.type === 'variable_change' ? '🔧 Variable' : action.type === 'restart' ? '🔄 Restart' : '🏁 End'}
                  </span>
                  <span class="text-gray-500 dark:text-gray-400">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {#if action.type === 'passage_view'}
                  <div class="text-gray-600 dark:text-gray-400">
                    {action.passageTitle}
                    {#if action.timeSpentMs}
                      <span class="text-gray-500"> · {formatDuration(action.timeSpentMs)}</span>
                    {/if}
                  </div>
                {:else if action.type === 'choice_select'}
                  <div class="text-gray-600 dark:text-gray-400">
                    "{action.choiceText}"
                  </div>
                {:else if action.type === 'variable_change'}
                  <div class="text-gray-600 dark:text-gray-400">
                    {action.variableName}: {JSON.stringify(action.variableOldValue)} → {JSON.stringify(action.variableNewValue)}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- Recording Controls -->
      {#if !$isRecording}
        <div class="space-y-3">
          <div>
            <label for="playtest-player-name" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Player Name (optional)
            </label>
            <input
              id="playtest-player-name"
              type="text"
              bind:value={playerName}
              placeholder="Tester name"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label for="playtest-session-notes" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session Notes (optional)
            </label>
            <textarea
              id="playtest-session-notes"
              bind:value={sessionNotes}
              placeholder="Testing focus, observations..."
              rows="2"
              class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            ></textarea>
          </div>
          <button
            onclick={startRecording}
            class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors"
          >
            🔴 Start Recording
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          <button
            onclick={() => stopRecording(true)}
            class="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm transition-colors"
          >
            ✓ Complete Session
          </button>
          <button
            onclick={() => stopRecording(false)}
            class="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium text-sm transition-colors"
          >
            ■ Stop Recording
          </button>
          <button
            onclick={() => playtestStore.cancelSession()}
            class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm transition-colors"
          >
            ✕ Cancel Session
          </button>
        </div>
      {/if}

      <!-- Analytics Overview -->
      {#if $analytics && $analytics.totalSessions > 0}
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Analytics
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400">Completion</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {$analytics.completionRate.toFixed(0)}%
              </div>
            </div>
            <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400">Avg Duration</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDuration($analytics.avgSessionDuration)}
              </div>
            </div>
            <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400">Avg Choices</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {$analytics.avgChoicesPerSession.toFixed(1)}
              </div>
            </div>
            <div class="p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400">Avg Passages</div>
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {$analytics.avgPassagesPerSession.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <!-- Top Dropoff Points -->
        {#if $analytics.dropoffPoints.length > 0}
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Top Dropoff Points
            </div>
            <div class="space-y-1">
              {#each $analytics.dropoffPoints.slice(0, 3) as dropoff}
                <div class="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs">
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {dropoff.passageTitle}
                  </div>
                  <div class="text-gray-600 dark:text-gray-400">
                    {dropoff.dropoffs} player{dropoff.dropoffs !== 1 ? 's' : ''} stopped here
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Sessions List -->
      {#if $sessions.length > 0}
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sessions ({$sessions.length})
            </div>
            <div class="flex gap-2">
              <button
                onclick={exportSessions}
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Export
              </button>
              <button
                onclick={clearAll}
                class="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {#each $sessions.slice().reverse() as session (session.id)}
              <button
                onclick={() => viewSession(session)}
                class="w-full p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.metadata?.playerName || formatTimestamp(session.startTime)}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                      {session.passagesVisited.length} passages · {session.choicesMade} choices
                      {#if session.duration}
                        · {formatDuration(session.duration)}
                      {/if}
                    </div>
                  </div>
                  <div class="text-xs {session.completed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">
                    {session.completed ? '✓' : '○'}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
