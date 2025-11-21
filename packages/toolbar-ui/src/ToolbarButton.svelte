<script lang="ts">
  interface Props {
    label: string;
    icon?: string;
    disabled?: boolean;
    tooltip?: string;
    onclick?: () => void;
  }

  let { label, icon, disabled = false, tooltip, onclick }: Props = $props();
</script>

<button
  class="toolbar-button"
  {disabled}
  title={tooltip}
  onclick={onclick}
>
  {#if icon}
    <span class="icon">{icon}</span>
  {/if}
  <span class="label">{label}</span>
</button>

<style>
  .toolbar-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }

  .toolbar-button:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 16px;
  }
</style>
