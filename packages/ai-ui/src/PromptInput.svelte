<script lang="ts">
  interface Props { placeholder?: string; onSubmit?: (text: string) => void; }
  let { placeholder = 'Enter prompt...', onSubmit }: Props = $props();
  let value = $state('');
</script>
<input type="text" bind:value {placeholder} onkeydown={(e) => e.key === 'Enter' && onSubmit?.(value)} />
<style>
  input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
</style>
