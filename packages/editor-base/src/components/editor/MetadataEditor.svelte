<script lang="ts">
  /**
   * MetadataEditor - Generic key-value metadata editor
   * Can be used for Passage or Choice metadata
   */

  export let metadata: Record<string, any> = {};
  export let onChange: (metadata: Record<string, any>) => void = () => {};
  export let label: string = 'Metadata';

  let entries: Array<{key: string, value: string, type: string}> = [];
  let editingKey: string | null = null;
  let editingValue: any = null;

  // Initialize entries from metadata
  $: {
    entries = Object.entries(metadata).map(([key, value]) => ({
      key,
      value: String(value),
      type: detectType(value)
    }));
  }

  function detectType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check if it's a valid number
      if (!isNaN(Number(value)) && value !== '') return 'number';
      // Check if it's a boolean string
      if (value === 'true' || value === 'false') return 'boolean';
    }
    return 'string';
  }

  function parseValue(value: string | boolean, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === true;
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      default:
        return String(value);
    }
  }

  function addEntry() {
    const key = `key${entries.length + 1}`;
    const newMetadata = { ...metadata, [key]: '' };
    onChange(newMetadata);
  }

  function updateKey(oldKey: string, newKey: string) {
    if (oldKey === newKey) return;

    // Check for duplicates
    if (newKey in metadata && newKey !== oldKey) {
      alert('Key already exists');
      return;
    }

    const newMetadata = { ...metadata };
    const value = newMetadata[oldKey];
    delete newMetadata[oldKey];
    newMetadata[newKey] = value;
    onChange(newMetadata);
  }

  function updateValue(key: string, value: string, type: string) {
    const parsedValue = parseValue(value, type);
    const newMetadata = { ...metadata, [key]: parsedValue };
    onChange(newMetadata);
  }

  function updateType(key: string, newType: string) {
    const currentValue = metadata[key];
    const newValue = parseValue(String(currentValue), newType);
    const newMetadata = { ...metadata, [key]: newValue };
    onChange(newMetadata);
  }

  function deleteEntry(key: string) {
    const newMetadata = { ...metadata };
    delete newMetadata[key];
    onChange(newMetadata);
  }

  function startEdit(key: string) {
    editingKey = key;
    editingValue = metadata[key];
  }

  function cancelEdit() {
    editingKey = null;
    editingValue = null;
  }

  function saveEdit() {
    editingKey = null;
    editingValue = null;
  }
</script>

<div class="metadata-editor">
  <div class="header">
    <h3>{label}</h3>
    <button class="btn-add" on:click={addEntry} title="Add metadata entry">
      + Add
    </button>
  </div>

  {#if entries.length === 0}
    <div class="empty-state">
      <p>No metadata entries</p>
      <button class="btn-primary" on:click={addEntry}>Add First Entry</button>
    </div>
  {:else}
    <div class="entries">
      {#each entries as entry (entry.key)}
        <div class="entry">
          <input
            type="text"
            class="key-input"
            value={entry.key}
            on:blur={(e) => updateKey(entry.key, e.currentTarget.value)}
            placeholder="key"
          />

          <select
            class="type-select"
            value={entry.type}
            on:change={(e) => updateType(entry.key, e.currentTarget.value)}
          >
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>

          {#if entry.type === 'boolean'}
            <select
              class="value-input"
              value={String(metadata[entry.key])}
              on:change={(e) => updateValue(entry.key, e.currentTarget.value, 'boolean')}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          {:else}
            <input
              type={entry.type === 'number' ? 'number' : 'text'}
              class="value-input"
              value={entry.value}
              on:input={(e) => updateValue(entry.key, e.currentTarget.value, entry.type)}
              placeholder="value"
            />
          {/if}

          <button
            class="btn-delete"
            on:click={() => deleteEntry(entry.key)}
            title="Delete entry"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .metadata-editor {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .btn-add {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-add:hover {
    background: var(--color-primary-dark);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
  }

  .empty-state p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark);
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .entry {
    display: grid;
    grid-template-columns: 1fr auto 1.5fr auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .key-input,
  .value-input {
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .key-input:focus,
  .value-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .type-select {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }

  .btn-delete {
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 1.25rem;
    line-height: 1;
    background: transparent;
    color: var(--color-error);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-delete:hover {
    background: var(--color-error);
    color: white;
  }
</style>
