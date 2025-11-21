<script lang="ts">
  interface Props { title?: string; icon?: string; }
  let { title = 'First Story!', icon = '⭐' }: Props = $props();
</script>
<div class="badge">
  <span class="icon">{icon}</span>
  <span class="title">{title}</span>
</div>
<style>
  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 16px; }
  .icon { font-size: 24px; }
</style>
