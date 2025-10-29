<script lang="ts">
  import type { Playthrough } from '$lib/models/Playthrough';
  import { getPlaythroughRecorder } from '$lib/analytics/PlaythroughRecorder';
  import { currentStory } from '$lib/stores/projectStore';

  // State
  let playthroughs = $state<Playthrough[]>([]);
  let selectedPlaythrough = $state<Playthrough | null>(null);
  let showDetails = $state(false);

  // Load playthroughs on mount
  $effect(() => {
    loadPlaythroughs();
  });

  function loadPlaythroughs() {
    const recorder = getPlaythroughRecorder();
    const story = $currentStory;

    if (story && story.metadata.id) {
      playthroughs = recorder.getPlaythroughsByStory(story.metadata.id);
      // Sort by start time, most recent first
      playthroughs.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    }
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  function handleViewDetails(playthrough: Playthrough) {
    selectedPlaythrough = playthrough;
    showDetails = true;
  }

  function handleCloseDetails() {
    showDetails = false;
    selectedPlaythrough = null;
  }

  function handleDelete(playthrough: Playthrough) {
    if (confirm('Delete this playthrough? This cannot be undone.')) {
      const recorder = getPlaythroughRecorder();
      recorder.deletePlaythrough(playthrough.id);
      loadPlaythroughs();
      if (selectedPlaythrough?.id === playthrough.id) {
        handleCloseDetails();
      }
    }
  }

  function handleExport(playthrough: Playthrough) {
    const json = JSON.stringify(playthrough.serialize(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playthrough-${playthrough.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearAll() {
    if (confirm(`Delete all ${playthroughs.length} playthroughs? This cannot be undone.`)) {
      const recorder = getPlaythroughRecorder();
      const story = $currentStory;
      if (story && story.metadata.id) {
        recorder.clearPlaythroughsByStory(story.metadata.id);
        loadPlaythroughs();
        handleCloseDetails();
      }
    }
  }
</script>

<div class="playthrough-list">
  <div class="list-header">
    <h3>Playthrough History</h3>
    <div class="header-actions">
      <span class="count">{playthroughs.length} record{playthroughs.length !== 1 ? 's' : ''}</span>
      <button
        class="btn btn-danger btn-sm"
        onclick={handleClearAll}
        disabled={playthroughs.length === 0}
      >
        🗑️ Clear All
      </button>
    </div>
  </div>

  {#if playthroughs.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <p>No playthrough records yet</p>
      <p class="hint">Playthroughs will appear here as you test your story</p>
    </div>
  {:else}
    <div class="list-content">
      {#each playthroughs as playthrough}
        <div class="playthrough-item" class:selected={selectedPlaythrough?.id === playthrough.id}>
          <div class="playthrough-header">
            <div class="playthrough-info">
              <div class="playthrough-date">{formatDate(playthrough.startTime)}</div>
              <div class="playthrough-meta">
                <span class="meta-item">
                  {playthrough.steps.length} step{playthrough.steps.length !== 1 ? 's' : ''}
                </span>
                <span class="meta-separator">•</span>
                <span class="meta-item">
                  {formatDuration(playthrough.getDuration())}
                </span>
                <span class="meta-separator">•</span>
                <span class="status-badge" class:completed={playthrough.completed}>
                  {playthrough.completed ? '✓ Completed' : '○ Incomplete'}
                </span>
              </div>
            </div>
            <div class="playthrough-actions">
              <button
                class="btn-icon"
                onclick={() => handleViewDetails(playthrough)}
                title="View details"
              >
                👁️
              </button>
              <button
                class="btn-icon"
                onclick={() => handleExport(playthrough)}
                title="Export"
              >
                💾
              </button>
              <button
                class="btn-icon btn-danger"
                onclick={() => handleDelete(playthrough)}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>

          {#if playthrough.steps.length > 0}
            <div class="playthrough-path">
              {#each playthrough.getPath().slice(0, 5) as step, index}
                <span class="path-step">{step}</span>
                {#if index < Math.min(4, playthrough.steps.length - 1)}
                  <span class="path-arrow">→</span>
                {/if}
              {/each}
              {#if playthrough.steps.length > 5}
                <span class="path-more">... +{playthrough.steps.length - 5} more</span>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showDetails && selectedPlaythrough}
  <div class="modal-overlay" onclick={handleCloseDetails}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Playthrough Details</h2>
        <button class="btn-close" onclick={handleCloseDetails}>✕</button>
      </div>

      <div class="modal-body">
        <div class="details-section">
          <h3>Overview</h3>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Started:</span>
              <span class="detail-value">{formatDate(selectedPlaythrough.startTime)}</span>
            </div>
            {#if selectedPlaythrough.endTime}
              <div class="detail-item">
                <span class="detail-label">Completed:</span>
                <span class="detail-value">{formatDate(selectedPlaythrough.endTime)}</span>
              </div>
            {/if}
            <div class="detail-item">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">{formatDuration(selectedPlaythrough.getDuration())}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Steps:</span>
              <span class="detail-value">{selectedPlaythrough.steps.length}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value" class:completed={selectedPlaythrough.completed}>
                {selectedPlaythrough.completed ? 'Completed' : 'Incomplete'}
              </span>
            </div>
          </div>
        </div>

        <div class="details-section">
          <h3>Path Taken ({selectedPlaythrough.steps.length} steps)</h3>
          <div class="steps-list">
            {#each selectedPlaythrough.steps as step, index}
              <div class="step-item">
                <div class="step-number">{index + 1}</div>
                <div class="step-content">
                  <div class="step-passage">{step.passageTitle}</div>
                  {#if step.choiceText}
                    <div class="step-choice">
                      <span class="choice-icon">→</span>
                      {step.choiceText}
                    </div>
                  {/if}
                  {#if step.timeSpent}
                    <div class="step-time">{formatDuration(step.timeSpent)}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        {#if selectedPlaythrough.choices && selectedPlaythrough.getChoices().length > 0}
          <div class="details-section">
            <h3>Choices Made</h3>
            <div class="choices-list">
              {#each selectedPlaythrough.getChoices() as choice}
                <div class="choice-item">
                  <div class="choice-passage">{choice.passageTitle}</div>
                  <div class="choice-text">{choice.choiceText}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if Object.keys(selectedPlaythrough.finalVariables).length > 0}
          <div class="details-section">
            <h3>Final Variables</h3>
            <div class="variables-grid">
              {#each Object.entries(selectedPlaythrough.finalVariables) as [name, value]}
                <div class="variable-item">
                  <span class="variable-name">{name}:</span>
                  <span class="variable-value">{JSON.stringify(value)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => handleExport(selectedPlaythrough)}>
          💾 Export
        </button>
        <button class="btn btn-danger" onclick={() => handleDelete(selectedPlaythrough)}>
          🗑️ Delete
        </button>
        <button class="btn btn-primary" onclick={handleCloseDetails}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .playthrough-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .list-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .count {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    background: var(--bg-tertiary, #f0f0f0);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary, #666);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0.25rem 0;
  }

  .hint {
    font-size: 0.875rem;
    font-style: italic;
    color: var(--text-tertiary, #999);
  }

  .list-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .playthrough-item {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    transition: all 0.2s;
  }

  .playthrough-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color, #007bff);
  }

  .playthrough-item.selected {
    background: var(--bg-selected, #e3f2fd);
    border-color: var(--primary-color, #007bff);
  }

  .playthrough-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .playthrough-info {
    flex: 1;
  }

  .playthrough-date {
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 0.25rem;
  }

  .playthrough-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }

  .meta-separator {
    color: var(--text-tertiary, #ccc);
  }

  .status-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-secondary, #666);
  }

  .status-badge.completed {
    background: var(--success-color-light, #d4edda);
    color: var(--success-color, #28a745);
  }

  .playthrough-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    padding: 0.375rem;
    border: 1px solid var(--border-color, #e0e0e0);
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .btn-icon:hover {
    background: var(--bg-hover, #f8f8f8);
  }

  .btn-icon.btn-danger:hover {
    background: var(--danger-color-light, #f8d7da);
    border-color: var(--danger-color, #dc3545);
  }

  .playthrough-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
  }

  .path-step {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary, #f0f0f0);
    border-radius: 4px;
    color: var(--text-primary, #333);
  }

  .path-arrow {
    color: var(--text-tertiary, #999);
  }

  .path-more {
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .btn-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--text-secondary, #666);
  }

  .btn-close:hover {
    color: var(--text-primary, #333);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .details-section {
    margin-bottom: 2rem;
  }

  .details-section h3 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    color: var(--text-primary, #333);
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.75rem;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    font-weight: 600;
  }

  .detail-value {
    font-size: 0.9375rem;
    color: var(--text-primary, #333);
  }

  .detail-value.completed {
    color: var(--success-color, #28a745);
    font-weight: 600;
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .step-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--bg-secondary, #f8f8f8);
    border-radius: 4px;
  }

  .step-number {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-color, #007bff);
    color: white;
    border-radius: 50%;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .step-content {
    flex: 1;
  }

  .step-passage {
    font-weight: 600;
    color: var(--text-primary, #333);
    margin-bottom: 0.25rem;
  }

  .step-choice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    margin-bottom: 0.25rem;
  }

  .choice-icon {
    color: var(--primary-color, #007bff);
  }

  .step-time {
    font-size: 0.75rem;
    color: var(--text-tertiary, #999);
  }

  .choices-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .choice-item {
    padding: 0.75rem;
    background: var(--bg-secondary, #f8f8f8);
    border-radius: 4px;
  }

  .choice-passage {
    font-weight: 600;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .choice-text {
    color: var(--text-primary, #333);
  }

  .variables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
  }

  .variable-item {
    padding: 0.75rem;
    background: var(--bg-secondary, #f8f8f8);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .variable-name {
    font-weight: 600;
    color: var(--text-secondary, #666);
    margin-right: 0.5rem;
  }

  .variable-value {
    color: var(--text-primary, #333);
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .btn-primary {
    background: var(--primary-color, #007bff);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-color-dark, #0056b3);
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, #e0e0e0);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #e8e8e8);
  }

  .btn-danger {
    background: var(--danger-color, #dc3545);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--danger-color-dark, #c82333);
  }
</style>
