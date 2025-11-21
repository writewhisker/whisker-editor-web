<script lang="ts">
  interface Props {
    before?: string;
    after?: string;
  }

  let { before = '', after = '' }: Props = $props();

  function computeDiff(oldText: string, newText: string) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const result = [];

    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        result.push({ type: 'unchanged', text: oldLine });
      } else if (oldLine && !newLine) {
        result.push({ type: 'removed', text: oldLine });
      } else if (!oldLine && newLine) {
        result.push({ type: 'added', text: newLine });
      } else {
        result.push({ type: 'removed', text: oldLine });
        result.push({ type: 'added', text: newLine });
      }
    }

    return result;
  }

  const diff = $derived(computeDiff(before, after));
</script>

<div class="diff-viewer">
  {#each diff as line, i (i)}
    <div class="line {line.type}">
      <span class="line-number">{i + 1}</span>
      <span class="line-text">{line.text}</span>
    </div>
  {/each}
</div>

<style>
  .diff-viewer {
    font-family: monospace;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: auto;
  }

  .line {
    display: flex;
    padding: 2px 8px;
  }

  .line.added {
    background: #d1fae5;
  }

  .line.removed {
    background: #fee2e2;
  }

  .line-number {
    width: 40px;
    color: #666;
    margin-right: 12px;
  }

  .line-text {
    white-space: pre;
  }
</style>
