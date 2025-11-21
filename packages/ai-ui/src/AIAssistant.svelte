<script lang="ts">
  interface Props { onPrompt?: (text: string) => void; }
  let { onPrompt }: Props = $props();
  let prompt = $state('');
</script>
<div class="ai-assistant">
  <h3>AI Assistant</h3>
  <textarea bind:value={prompt} placeholder="Ask for help..."></textarea>
  <button onclick={() => onPrompt?.(prompt)}>Generate</button>
</div>
<style>
  .ai-assistant { padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
  textarea { width: 100%; margin: 8px 0; padding: 8px; }
  button { padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 4px; }
</style>
