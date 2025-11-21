<script lang="ts">
  interface Props {
    text?: string;
    icon?: string;
    tooltip?: string;
    onclick?: () => void;
  }

  let { text, icon, tooltip, onclick }: Props = $props();
</script>

<button class="status-item" title={tooltip} {onclick}>
  {#if icon}
    <span class="icon">{icon}</span>
  {/if}
  {#if text}
    <span class="text">{text}</span>
  {/if}
</button>

<style>
  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
    color: #6b7280;
    transition: background 0.15s;
  }

  .status-item:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .icon {
    font-size: 14px;
  }
</style>
