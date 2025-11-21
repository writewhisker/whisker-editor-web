<script lang="ts">
  interface Conflict {
    path: string;
    local: string;
    remote: string;
    base: string;
  }

  interface Props {
    conflict?: Conflict;
    onResolve?: (resolution: 'local' | 'remote' | 'manual') => void;
  }

  let { conflict, onResolve }: Props = $props();
  let resolution = $state<'local' | 'remote' | 'manual'>('local');

  function handleResolve() {
    onResolve?.(resolution);
  }
</script>

{#if conflict}
  <div class="conflict-resolver">
    <h3>Conflict in: {conflict.path}</h3>

    <div class="options">
      <label>
        <input type="radio" bind:group={resolution} value="local" />
        Keep my changes
      </label>
      <label>
        <input type="radio" bind:group={resolution} value="remote" />
        Accept their changes
      </label>
    </div>

    <div class="preview">
      <div class="version">
        <h4>My version</h4>
        <pre>{conflict.local}</pre>
      </div>
      <div class="version">
        <h4>Their version</h4>
        <pre>{conflict.remote}</pre>
      </div>
    </div>

    <button onclick={handleResolve}>Resolve</button>
  </div>
{/if}

<style>
  .conflict-resolver {
    padding: 16px;
    border: 2px solid #f59e0b;
    border-radius: 8px;
    background: #fffbeb;
  }

  .options {
    display: flex;
    gap: 16px;
    margin: 12px 0;
  }

  .preview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 16px 0;
  }

  .version {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    background: white;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    font-size: 12px;
  }

  button {
    padding: 8px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
