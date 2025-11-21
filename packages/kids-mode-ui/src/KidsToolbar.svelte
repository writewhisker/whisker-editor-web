<script lang="ts">
  interface Props { tools?: string[]; }
  let { tools = ['Story Page', 'Decisions', 'Play'] }: Props = $props();
</script>
<div class="kids-toolbar">
  {#each tools as tool}
    <button class="tool-btn">{tool}</button>
  {/each}
</div>
<style>
  .kids-toolbar { display: flex; gap: 8px; padding: 12px; background: #fef3c7; border-radius: 8px; }
  .tool-btn { padding: 12px 24px; font-size: 16px; font-weight: 600; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; }
</style>
