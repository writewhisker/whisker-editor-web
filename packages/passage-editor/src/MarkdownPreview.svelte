<script lang="ts">
  interface Props {
    markdown?: string;
  }

  let { markdown = '' }: Props = $props();

  function parseMarkdown(md: string): string {
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');
  }

  const html = $derived(parseMarkdown(markdown));
</script>

<div class="markdown-preview">
  {@html html}
</div>

<style>
  .markdown-preview {
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #ddd;
    border-radius: 4px;
    line-height: 1.6;
  }

  .markdown-preview :global(h1) {
    font-size: 24px;
    margin: 16px 0 8px;
  }

  .markdown-preview :global(h2) {
    font-size: 20px;
    margin: 12px 0 6px;
  }

  .markdown-preview :global(h3) {
    font-size: 16px;
    margin: 8px 0 4px;
  }

  .markdown-preview :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }
</style>
