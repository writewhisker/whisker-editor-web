<script lang="ts">
  interface Props { data?: number[]; }
  let { data = [] }: Props = $props();
</script>
<div class="chart">
  {#each data as value, i}
    <div class="bar" style="height: {value}%"></div>
  {/each}
</div>
<style>
  .chart { display: flex; align-items: flex-end; gap: 4px; height: 100px; }
  .bar { flex: 1; background: #3b82f6; min-height: 2px; }
</style>
