<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="toolbar-group">
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .toolbar-group {
    display: flex;
    gap: 4px;
    padding: 0 4px;
  }
</style>
