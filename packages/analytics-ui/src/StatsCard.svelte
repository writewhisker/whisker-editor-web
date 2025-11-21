<script lang="ts">
  interface Props { label?: string; value?: number; }
  let { label = 'Metric', value = 0 }: Props = $props();
</script>
<div class="stats-card">
  <div class="label">{label}</div>
  <div class="value">{value}</div>
</div>
<style>
  .stats-card { padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px; }
  .label { font-size: 12px; color: #666; margin-bottom: 4px; }
  .value { font-size: 24px; font-weight: 600; }
</style>
