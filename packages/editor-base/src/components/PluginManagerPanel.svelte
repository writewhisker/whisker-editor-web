<script lang="ts">
  import { allPluginEntries, pluginStoreActions } from '../plugins';

  function handleTogglePlugin(pluginName: string, currentlyEnabled: boolean) {
    pluginStoreActions.setEnabled(pluginName, !currentlyEnabled);
  }
</script>

<div class="plugin-manager-panel">
  <div class="panel-header">
    <h3>Plugin Manager</h3>
    <p class="subtitle">Manage editor plugins and extensions</p>
  </div>

  <div class="plugins-list">
    {#if $allPluginEntries.length === 0}
      <div class="empty-state">
        <p>No plugins installed</p>
        <p class="hint">Plugins will be registered here when available</p>
      </div>
    {:else}
      {#each $allPluginEntries as entry (entry.plugin.name)}
        <div class="plugin-card" class:disabled={!entry.enabled}>
          <div class="plugin-info">
            <div class="plugin-header">
              <h4>{entry.plugin.name}</h4>
              <span class="version">v{entry.plugin.version}</span>
            </div>

            {#if entry.plugin.author}
              <p class="author">by {entry.plugin.author}</p>
            {/if}

            {#if entry.plugin.description}
              <p class="description">{entry.plugin.description}</p>
            {/if}

            <div class="plugin-features">
              {#if entry.plugin.nodeTypes?.length}
                <span class="feature-badge">
                  {entry.plugin.nodeTypes.length} passage types
                </span>
              {/if}
              {#if entry.plugin.actions?.length}
                <span class="feature-badge">
                  {entry.plugin.actions.length} actions
                </span>
              {/if}
              {#if entry.plugin.conditions?.length}
                <span class="feature-badge">
                  {entry.plugin.conditions.length} conditions
                </span>
              {/if}
              {#if entry.plugin.ui}
                <span class="feature-badge">UI extensions</span>
              {/if}
              {#if entry.plugin.runtime}
                <span class="feature-badge">Runtime hooks</span>
              {/if}
            </div>

            <div class="plugin-meta">
              <span class="registered-at">
                Registered: {new Date(entry.registeredAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div class="plugin-actions">
            <button
              class="toggle-button"
              class:enabled={entry.enabled}
              on:click={() => handleTogglePlugin(entry.plugin.name, entry.enabled)}
            >
              {entry.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .plugin-manager-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-secondary, #f5f5f5);
  }

  .panel-header {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border, #ddd);
    background: var(--color-bg-primary, #fff);
  }

  .panel-header h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary, #333);
  }

  .subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
  }

  .plugins-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary, #666);
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  .hint {
    font-size: 0.875rem;
  }

  .plugin-card {
    background: var(--color-bg-primary, #fff);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    transition: opacity 0.2s;
  }

  .plugin-card.disabled {
    opacity: 0.6;
  }

  .plugin-info {
    flex: 1;
  }

  .plugin-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .plugin-header h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text-primary, #333);
  }

  .version {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #666);
    font-family: monospace;
  }

  .author {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
    font-style: italic;
  }

  .description {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--color-text-primary, #333);
    line-height: 1.4;
  }

  .plugin-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .feature-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--color-accent-light, #e3f2fd);
    color: var(--color-accent-dark, #1976d2);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .plugin-meta {
    font-size: 0.75rem;
    color: var(--color-text-muted, #999);
  }

  .plugin-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toggle-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    background: var(--color-bg-primary, #fff);
    color: var(--color-text-primary, #333);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .toggle-button:hover {
    background: var(--color-bg-hover, #f5f5f5);
  }

  .toggle-button.enabled {
    background: var(--color-success, #4caf50);
    color: white;
    border-color: var(--color-success, #4caf50);
  }

  .toggle-button.enabled:hover {
    background: var(--color-success-dark, #388e3c);
    border-color: var(--color-success-dark, #388e3c);
  }
</style>
