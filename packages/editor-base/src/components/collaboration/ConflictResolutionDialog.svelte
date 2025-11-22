<script lang="ts">
  import type { Conflict, ConflictResolution } from '../../types/conflict';
  import DiffViewer from './DiffViewer.svelte';
  import { createEventDispatcher } from 'svelte';

  // Props
  interface Props {
    conflicts: Conflict[];
    open?: boolean;
    onresolve?: (event: CustomEvent<{ conflicts: Conflict[] }>) => void;
    oncancel?: (event: CustomEvent<void>) => void;
  }

  let { conflicts, open = true, onresolve, oncancel }: Props = $props();

  // Events
  const dispatch = createEventDispatcher<{
    resolve: { conflicts: Conflict[] };
    cancel: void;
  }>();

  // State
  let currentIndex = $state(0);
  let resolvedConflicts = $state<Map<string, Conflict>>(new Map());

  // Current conflict
  const currentConflict = $derived(conflicts[currentIndex]);
  const hasNext = $derived(currentIndex < conflicts.length - 1);
  const hasPrevious = $derived(currentIndex > 0);
  const progress = $derived({
    current: currentIndex + 1,
    total: conflicts.length,
    percentage: ((currentIndex + 1) / conflicts.length) * 100,
  });

  // Check if all conflicts are resolved
  const allResolved = $derived(() => {
    for (const conflict of conflicts) {
      const resolved = resolvedConflicts.get(conflict.id);
      if (!resolved || !resolved.resolution) {
        return false;
      }
    }
    return true;
  });

  function next() {
    if (hasNext) {
      currentIndex++;
    }
  }

  function previous() {
    if (hasPrevious) {
      currentIndex--;
    }
  }

  function resolveConflict(resolution: ConflictResolution, value?: any) {
    const resolved: Conflict = {
      ...currentConflict,
      resolution,
      resolvedValue: value !== undefined ? value :
        resolution === 'local' ? currentConflict.localValue :
        resolution === 'remote' ? currentConflict.remoteValue :
        undefined,
    };

    resolvedConflicts.set(currentConflict.id, resolved);
    resolvedConflicts = new Map(resolvedConflicts); // Trigger reactivity

    // Auto-advance to next conflict
    if (hasNext) {
      setTimeout(next, 300);
    }
  }

  function useLocal() {
    resolveConflict('local');
  }

  function useRemote() {
    resolveConflict('remote');
  }

  function handleMerge(mergedValue: any) {
    resolveConflict('manual', mergedValue);
  }

  function handleResolve() {
    const resolved = conflicts.map((c) => resolvedConflicts.get(c.id) || c);
    dispatch('resolve', { conflicts: resolved });
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function getConflictIcon(type: Conflict['type']): string {
    switch (type) {
      case 'content':
        return '📝';
      case 'metadata':
        return 'ℹ️';
      case 'structure':
        return '🏗️';
      case 'deletion':
        return '🗑️';
      default:
        return '⚠️';
    }
  }

  function getConflictTypeLabel(type: Conflict['type']): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getResolutionStatus(conflictId: string): 'resolved' | 'pending' {
    const resolved = resolvedConflicts.get(conflictId);
    return resolved?.resolution ? 'resolved' : 'pending';
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleCancel} onkeydown={(e) => (e.key === 'Escape' ? handleCancel() : null)} role="button" tabindex="0">
    <div class="dialog-container" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="button" tabindex="0">
      <div class="dialog-header">
        <div class="header-content">
          <h2>Resolve Conflicts</h2>
          <p class="subtitle">
            Resolve {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} before merging
          </p>
        </div>
        <button class="close-btn" onclick={handleCancel} aria-label="Close">×</button>
      </div>

      <div class="dialog-body">
        <!-- Progress bar -->
        <div class="progress-section">
          <div class="progress-info">
            <span class="progress-text">
              Conflict {progress.current} of {progress.total}
            </span>
            <span class="progress-percentage">{Math.round(progress.percentage)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progress.percentage}%"></div>
          </div>
        </div>

        <!-- Conflict list sidebar -->
        <div class="content-grid">
          <div class="conflict-list">
            <h3>Conflicts</h3>
            <div class="conflict-items">
              {#each conflicts as conflict, idx}
                <button
                  class="conflict-item"
                  class:active={idx === currentIndex}
                  class:resolved={getResolutionStatus(conflict.id) === 'resolved'}
                  onclick={() => (currentIndex = idx)}
                >
                  <span class="conflict-icon">{getConflictIcon(conflict.type)}</span>
                  <div class="conflict-info">
                    <div class="conflict-path">{conflict.path}</div>
                    <div class="conflict-type">
                      {getConflictTypeLabel(conflict.type)}
                    </div>
                  </div>
                  {#if getResolutionStatus(conflict.id) === 'resolved'}
                    <span class="resolved-badge">✓</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Current conflict details -->
          <div class="conflict-details">
            {#if currentConflict}
              <div class="conflict-header-info">
                <div class="conflict-title">
                  <span class="title-icon">{getConflictIcon(currentConflict.type)}</span>
                  <h3>{currentConflict.description}</h3>
                </div>
                <div class="conflict-meta">
                  <span class="meta-item">
                    <strong>Type:</strong>
                    <span class="badge badge-{currentConflict.type}">
                      {getConflictTypeLabel(currentConflict.type)}
                    </span>
                  </span>
                  <span class="meta-item">
                    <strong>Path:</strong>
                    <code>{currentConflict.path}</code>
                  </span>
                </div>
              </div>

              <!-- Resolution options -->
              <div class="resolution-options">
                <button class="resolution-btn resolution-local" onclick={useLocal}>
                  <div class="resolution-header">
                    <span class="resolution-icon">👈</span>
                    <span class="resolution-title">Use Local</span>
                  </div>
                  {#if currentConflict.localUser}
                    <div class="resolution-user">by {currentConflict.localUser}</div>
                  {/if}
                  <div class="resolution-time">
                    {formatTimestamp(currentConflict.localTimestamp)}
                  </div>
                </button>

                <button class="resolution-btn resolution-remote" onclick={useRemote}>
                  <div class="resolution-header">
                    <span class="resolution-icon">👉</span>
                    <span class="resolution-title">Use Remote</span>
                  </div>
                  {#if currentConflict.remoteUser}
                    <div class="resolution-user">by {currentConflict.remoteUser}</div>
                  {/if}
                  <div class="resolution-time">
                    {formatTimestamp(currentConflict.remoteTimestamp)}
                  </div>
                </button>
              </div>

              <!-- Diff viewer for content conflicts -->
              {#if currentConflict.type === 'content'}
                <div class="diff-section">
                  <h4>Content Comparison</h4>
                  <DiffViewer
                    localContent={currentConflict.localValue}
                    remoteContent={currentConflict.remoteValue}
                    localLabel="Local ({currentConflict.localUser || 'You'})"
                    remoteLabel="Remote ({currentConflict.remoteUser || 'Other'})"
                  />
                </div>
              {:else}
                <!-- Simple value display for non-content conflicts -->
                <div class="values-section">
                  <div class="value-box">
                    <h4>Local Value</h4>
                    <pre class="value-display">{JSON.stringify(
                      currentConflict.localValue,
                      null,
                      2
                    )}</pre>
                  </div>
                  <div class="value-box">
                    <h4>Remote Value</h4>
                    <pre class="value-display">{JSON.stringify(
                      currentConflict.remoteValue,
                      null,
                      2
                    )}</pre>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <div class="footer-left">
          <button class="btn btn-secondary" onclick={previous} disabled={!hasPrevious}>
            ← Previous
          </button>
          <button class="btn btn-secondary" onclick={next} disabled={!hasNext}>
            Next →
          </button>
        </div>
        <div class="footer-right">
          <button class="btn btn-secondary" onclick={handleCancel}>Cancel</button>
          <button
            class="btn btn-primary"
            onclick={handleResolve}
            disabled={!allResolved()}
          >
            Apply Resolution
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
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
    padding: 20px;
  }

  .dialog-container {
    background: var(--bg-primary, white);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .header-content h2 {
    margin: 0 0 4px 0;
    font-size: 24px;
    color: var(--text-primary, #333);
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 32px;
    color: var(--text-secondary, #666);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-hover, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .dialog-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 24px;
  }

  .progress-section {
    margin-bottom: 24px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .progress-bar {
    height: 8px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-color, #2196f3);
    transition: width 0.3s ease;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 24px;
    flex: 1;
    overflow: hidden;
  }

  .conflict-list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .conflict-list h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .conflict-items {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .conflict-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .conflict-item:hover {
    background: var(--bg-hover, #e8e8e8);
  }

  .conflict-item.active {
    border-color: var(--primary-color, #2196f3);
    background: var(--bg-primary, white);
  }

  .conflict-item.resolved {
    opacity: 0.7;
  }

  .conflict-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .conflict-info {
    flex: 1;
    min-width: 0;
  }

  .conflict-path {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .conflict-type {
    font-size: 11px;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
  }

  .resolved-badge {
    color: #28a745;
    font-size: 18px;
    flex-shrink: 0;
  }

  .conflict-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .conflict-header-info {
    margin-bottom: 20px;
  }

  .conflict-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .title-icon {
    font-size: 24px;
  }

  .conflict-title h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .conflict-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meta-item strong {
    min-width: 60px;
    color: var(--text-secondary, #666);
  }

  .meta-item code {
    font-family: monospace;
    font-size: 12px;
    background: var(--bg-secondary, #f5f5f5);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .badge-content {
    background: #e3f2fd;
    color: #1565c0;
  }

  .badge-metadata {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  .badge-structure {
    background: #fff3e0;
    color: #e65100;
  }

  .badge-deletion {
    background: #ffebee;
    color: #c62828;
  }

  .resolution-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .resolution-btn {
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .resolution-btn:hover {
    border-color: var(--primary-color, #2196f3);
    background: var(--bg-primary, white);
  }

  .resolution-local:hover {
    border-color: #28a745;
  }

  .resolution-remote:hover {
    border-color: #2196f3;
  }

  .resolution-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .resolution-icon {
    font-size: 20px;
  }

  .resolution-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .resolution-user {
    font-size: 12px;
    color: var(--text-secondary, #666);
    margin-bottom: 4px;
  }

  .resolution-time {
    font-size: 11px;
    color: var(--text-tertiary, #999);
  }

  .diff-section {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .diff-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .values-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .value-box h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .value-display {
    margin: 0;
    padding: 12px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color, #e0e0e0);
    background: var(--bg-secondary, #f9f9f9);
  }

  .footer-left,
  .footer-right {
    display: flex;
    gap: 12px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color, #2196f3);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #1976d2);
  }

  .btn-secondary {
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    border: 1px solid var(--border-color, #ddd);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #f5f5f5);
  }
</style>
