<script lang="ts">
  import { recentChanges, changeTrackingActions, isTrackingEnabled } from '../../stores/changeTrackingStore';
  import type { ChangeLog, ChangeType, EntityType } from '../../models/ChangeLog';

  // State
  let filterUser = $state('');
  let filterType = $state<ChangeType | 'all'>('all');
  let filterEntity = $state<EntityType | 'all'>('all');
  let showDetails = $state<Set<string>>(new Set());

  // Filtered changes
  const filteredChanges = $derived(() => {
    let changes = $recentChanges;

    if (filterUser) {
      changes = changes.filter((c) => c.user.toLowerCase().includes(filterUser.toLowerCase()));
    }

    if (filterType !== 'all') {
      changes = changes.filter((c) => c.changeType === filterType);
    }

    if (filterEntity !== 'all') {
      changes = changes.filter((c) => c.entityType === filterEntity);
    }

    return changes;
  });

  function toggleDetails(changeId: string) {
    const newSet = new Set(showDetails);
    if (newSet.has(changeId)) {
      newSet.delete(changeId);
    } else {
      newSet.add(changeId);
    }
    showDetails = newSet;
  }

  function getChangeIcon(type: ChangeType): string {
    switch (type) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '•';
    }
  }

  function getEntityIcon(type: EntityType): string {
    switch (type) {
      case 'passage':
        return '📄';
      case 'choice':
        return '🔀';
      case 'variable':
        return '🔢';
      case 'metadata':
        return 'ℹ️';
      case 'story':
        return '📖';
      default:
        return '•';
    }
  }

  function formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  function clearHistory() {
    if (confirm('Clear all change history? This cannot be undone.')) {
      changeTrackingActions.clearAll();
    }
  }

  function toggleTracking() {
    changeTrackingActions.setTracking(!$isTrackingEnabled);
  }
</script>

<div class="change-history">
  <div class="history-header">
    <h3>Change History</h3>
    <div class="header-actions">
      <label class="checkbox-label">
        <input type="checkbox" checked={$isTrackingEnabled} onchange={toggleTracking} />
        Track changes
      </label>
      <button class="btn btn-secondary" onclick={clearHistory}>Clear History</button>
    </div>
  </div>

  <div class="filters">
    <div class="filter-group">
      <label for="filter-user">User:</label>
      <input
        type="text"
        id="filter-user"
        bind:value={filterUser}
        placeholder="Filter by user..."
      />
    </div>

    <div class="filter-group">
      <label for="filter-type">Type:</label>
      <select id="filter-type" bind:value={filterType}>
        <option value="all">All</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="filter-entity">Entity:</label>
      <select id="filter-entity" bind:value={filterEntity}>
        <option value="all">All</option>
        <option value="passage">Passage</option>
        <option value="choice">Choice</option>
        <option value="variable">Variable</option>
        <option value="metadata">Metadata</option>
        <option value="story">Story</option>
      </select>
    </div>
  </div>

  <div class="changes-list">
    {#each filteredChanges() as change (change.id)}
      <div class="change-item">
        <div class="change-summary" onclick={() => toggleDetails(change.id)}>
          <div class="change-info">
            <span class="change-icon">
              {getChangeIcon(change.changeType)}
              {getEntityIcon(change.entityType)}
            </span>
            <div class="change-details">
              <div class="change-desc">{change.description}</div>
              <div class="change-meta">
                <span class="user">{change.user}</span>
                <span class="time">{change.getFormattedTime()}</span>
              </div>
            </div>
          </div>
          <button class="expand-btn">
            {showDetails.has(change.id) ? '▼' : '▶'}
          </button>
        </div>

        {#if showDetails.has(change.id)}
          <div class="change-expanded">
            <div class="detail-row">
              <strong>Type:</strong>
              <span class="badge badge-{change.changeType}">{change.changeType}</span>
            </div>
            <div class="detail-row">
              <strong>Entity:</strong>
              <span>{change.entityType}</span>
            </div>
            {#if change.entityName}
              <div class="detail-row">
                <strong>Name:</strong>
                <span>{change.entityName}</span>
              </div>
            {/if}
            {#if change.oldValue !== undefined}
              <div class="detail-row">
                <strong>Old Value:</strong>
                <pre class="value-display">{formatValue(change.oldValue)}</pre>
              </div>
            {/if}
            {#if change.newValue !== undefined}
              <div class="detail-row">
                <strong>New Value:</strong>
                <pre class="value-display">{formatValue(change.newValue)}</pre>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-state">
        <p>No changes found matching your filters.</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .change-history {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary, #f5f5f5);
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .history-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary, #666);
    cursor: pointer;
  }

  .filters {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .filter-group input,
  .filter-group select {
    padding: 4px 8px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 13px;
    background: var(--bg-primary, white);
  }

  .changes-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .change-item {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    margin-bottom: 8px;
    overflow: hidden;
  }

  .change-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .change-summary:hover {
    background: var(--bg-hover, #f5f5f5);
  }

  .change-info {
    display: flex;
    gap: 12px;
    flex: 1;
  }

  .change-icon {
    font-size: 18px;
    line-height: 1;
  }

  .change-details {
    flex: 1;
  }

  .change-desc {
    font-size: 14px;
    color: var(--text-primary, #333);
    margin-bottom: 4px;
  }

  .change-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary, #666);
  }

  .user {
    font-weight: 500;
  }

  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    color: var(--text-secondary, #666);
    font-size: 12px;
  }

  .change-expanded {
    padding: 12px;
    background: var(--bg-secondary, #f9f9f9);
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .detail-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 13px;
  }

  .detail-row strong {
    min-width: 80px;
    color: var(--text-secondary, #666);
  }

  .badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .badge-create {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge-update {
    background: #e3f2fd;
    color: #1565c0;
  }

  .badge-delete {
    background: #ffebee;
    color: #c62828;
  }

  .value-display {
    margin: 4px 0 0 0;
    padding: 8px;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary, #666);
  }

  .empty-state p {
    margin: 0;
  }

  .btn {
    padding: 6px 12px;
    border-radius: 4px;
    border: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e0e0e0);
  }
</style>
