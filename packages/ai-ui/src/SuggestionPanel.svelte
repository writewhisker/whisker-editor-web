<script lang="ts">
  interface Props { suggestions?: string[]; }
  let { suggestions = [] }: Props = $props();
</script>
<div class="suggestions">
  {#each suggestions as suggestion}
    <div class="suggestion">{suggestion}</div>
  {/each}
</div>
<style>
  .suggestion { padding: 8px; margin: 4px 0; background: #f5f5f5; border-radius: 4px; cursor: pointer; }
  .suggestion:hover { background: #e5e5e5; }
</style>
