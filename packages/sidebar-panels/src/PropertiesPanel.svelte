<script lang="ts">
  interface Property {
    key: string;
    label: string;
    value: any;
    type?: 'text' | 'number' | 'boolean' | 'select';
    options?: Array<{ label: string; value: any }>;
  }

  interface Props {
    title?: string;
    properties?: Property[];
    onChange?: (key: string, value: any) => void;
  }

  let { title = 'Properties', properties = [], onChange }: Props = $props();

  function handleChange(key: string, value: any) {
    onChange?.(key, value);
  }
</script>

<div class="properties-panel">
  {#if title}
    <h3 class="panel-title">{title}</h3>
  {/if}
  <div class="properties">
    {#each properties as property (property.key)}
      <div class="property">
        <label class="property-label">{property.label}</label>
        {#if property.type === 'boolean'}
          <input
            type="checkbox"
            checked={property.value}
            onchange={(e) => handleChange(property.key, e.currentTarget.checked)}
          />
        {:else if property.type === 'number'}
          <input
            type="number"
            value={property.value}
            oninput={(e) => handleChange(property.key, parseFloat(e.currentTarget.value))}
          />
        {:else if property.type === 'select' && property.options}
          <select
            value={property.value}
            onchange={(e) => handleChange(property.key, e.currentTarget.value)}
          >
            {#each property.options as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <input
            type="text"
            value={property.value}
            oninput={(e) => handleChange(property.key, e.currentTarget.value)}
          />
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .properties-panel {
    padding: 12px 16px;
  }

  .panel-title {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #374151;
  }

  .properties {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .property {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .property-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
  }

  input[type="text"],
  input[type="number"],
  select {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }

  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
</style>
