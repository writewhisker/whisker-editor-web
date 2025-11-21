<script lang="ts">
  interface Props { metrics?: Record<string, number>; }
  let { metrics = {} }: Props = $props();
</script>
<div class="dashboard">
  <slot />
</div>
<style>
  .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
</style>
