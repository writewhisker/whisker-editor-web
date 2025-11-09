<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AnalyticsIssue } from '../../analytics/types';

  // Props
  let {
    issues = [],
  }: {
    issues?: AnalyticsIssue[];
  } = $props();

  const dispatch = createEventDispatcher();

  // Group issues by severity
  const errors = $derived(issues.filter((i) => i.severity === 'error'));
  const warnings = $derived(issues.filter((i) => i.severity === 'warning'));
  const infos = $derived(issues.filter((i) => i.severity === 'info'));

  function getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  function getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  function goToPassage(passageId: string | undefined) {
    if (passageId) {
      dispatch('navigate', { passageId });
    }
  }
</script>

<div class="issue-list">
  {#if issues.length === 0}
    <div class="empty-state success">
      <div class="success-icon">✓</div>
      <h4>No Issues Found!</h4>
      <p>Your story looks great. Keep up the good work!</p>
    </div>
  {:else}
    <div class="issue-summary">
      <div class="summary-item">
        <span class="summary-icon">🔴</span>
        <span class="summary-count">{errors.length}</span> Errors
      </div>
      <div class="summary-item">
        <span class="summary-icon">⚠️</span>
        <span class="summary-count">{warnings.length}</span> Warnings
      </div>
      <div class="summary-item">
        <span class="summary-icon">ℹ️</span>
        <span class="summary-count">{infos.length}</span> Info
      </div>
    </div>

    <!-- Errors -->
    {#if errors.length > 0}
      <div class="issue-group">
        <h4 class="group-title">Errors ({errors.length})</h4>
        {#each errors as issue}
          <div class="issue-item {getSeverityClass(issue.severity)}">
            <div class="issue-header">
              <span class="issue-icon">{getSeverityIcon(issue.severity)}</span>
              <div class="issue-content">
                <div class="issue-message">{issue.message}</div>
                {#if issue.passageName}
                  <button
                    class="passage-link"
                    onclick={() => goToPassage(issue.passageId)}
                  >
                    → {issue.passageName}
                  </button>
                {/if}
              </div>
            </div>
            {#if issue.suggestion}
              <div class="issue-suggestion">
                <strong>💡 Suggestion:</strong> {issue.suggestion}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Warnings -->
    {#if warnings.length > 0}
      <div class="issue-group">
        <h4 class="group-title">Warnings ({warnings.length})</h4>
        {#each warnings as issue}
          <div class="issue-item {getSeverityClass(issue.severity)}">
            <div class="issue-header">
              <span class="issue-icon">{getSeverityIcon(issue.severity)}</span>
              <div class="issue-content">
                <div class="issue-message">{issue.message}</div>
                {#if issue.passageName}
                  <button
                    class="passage-link"
                    onclick={() => goToPassage(issue.passageId)}
                  >
                    → {issue.passageName}
                  </button>
                {/if}
              </div>
            </div>
            {#if issue.suggestion}
              <div class="issue-suggestion">
                <strong>💡 Suggestion:</strong> {issue.suggestion}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Info -->
    {#if infos.length > 0}
      <div class="issue-group">
        <h4 class="group-title">Information ({infos.length})</h4>
        {#each infos as issue}
          <div class="issue-item {getSeverityClass(issue.severity)}">
            <div class="issue-header">
              <span class="issue-icon">{getSeverityIcon(issue.severity)}</span>
              <div class="issue-content">
                <div class="issue-message">{issue.message}</div>
                {#if issue.passageName}
                  <button
                    class="passage-link"
                    onclick={() => goToPassage(issue.passageId)}
                  >
                    → {issue.passageName}
                  </button>
                {/if}
              </div>
            </div>
            {#if issue.suggestion}
              <div class="issue-suggestion">
                <strong>💡 Suggestion:</strong> {issue.suggestion}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .issue-list {
    padding: 20px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
  }

  .empty-state.success {
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    border-color: #4caf50;
  }

  .success-icon {
    font-size: 64px;
    color: #4caf50;
    margin-bottom: 16px;
  }

  .empty-state h4 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #2e7d32;
  }

  .empty-state p {
    margin: 0;
    color: #558b2f;
  }

  .issue-summary {
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    padding: 16px;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .summary-icon {
    font-size: 18px;
  }

  .summary-count {
    font-weight: 700;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .issue-group {
    margin-bottom: 24px;
  }

  .group-title {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
    font-weight: 600;
  }

  .issue-item {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-left-width: 4px;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
  }

  .issue-item.severity-error {
    border-left-color: #f44336;
    background: #ffebee;
  }

  .issue-item.severity-warning {
    border-left-color: #ff9800;
    background: #fff3e0;
  }

  .issue-item.severity-info {
    border-left-color: #2196f3;
    background: #e3f2fd;
  }

  .issue-header {
    display: flex;
    gap: 12px;
  }

  .issue-icon {
    font-size: 20px;
    line-height: 1;
  }

  .issue-content {
    flex: 1;
  }

  .issue-message {
    font-size: 14px;
    color: var(--text-primary, #333);
    margin-bottom: 6px;
  }

  .passage-link {
    background: none;
    border: none;
    color: var(--accent-color, #3498db);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    text-decoration: none;
  }

  .passage-link:hover {
    text-decoration: underline;
  }

  .issue-suggestion {
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 4px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .issue-suggestion strong {
    color: var(--text-primary, #333);
  }
</style>
