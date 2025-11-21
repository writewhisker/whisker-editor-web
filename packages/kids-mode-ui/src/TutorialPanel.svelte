<script lang="ts">
  interface Props { step?: number; title?: string; }
  let { step = 1, title = 'Welcome!' }: Props = $props();
</script>
<div class="tutorial">
  <h2>Step {step}: {title}</h2>
  <p><slot /></p>
</div>
<style>
  .tutorial { padding: 16px; background: #dbeafe; border-radius: 8px; }
</style>
