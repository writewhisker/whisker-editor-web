<script lang="ts">
  import type { DiffChunk } from '../../types/conflict';
  import { ConflictDetector } from '../../services/conflictDetector';

  // Props
  interface Props {
    localContent: string;
    remoteContent: string;
    localLabel?: string;
    remoteLabel?: string;
    showLineNumbers?: boolean;
    contextLines?: number;
  }

  let {
    localContent,
    remoteContent,
    localLabel = 'Local',
    remoteLabel = 'Remote',
    showLineNumbers = true,
    contextLines = 3,
  }: Props = $props();

  // State
  let viewMode = $state<'split' | 'unified'>('split');
  let showOnlyDifferences = $state(false);

  // Generate diff
  const diff = $derived(ConflictDetector.generateDiff(localContent, remoteContent));

  // Filter diff based on context lines
  const filteredDiff = $derived(() => {
    if (!showOnlyDifferences) {
      return diff;
    }

    const filtered: DiffChunk[] = [];
    for (let i = 0; i < diff.length; i++) {
      const chunk = diff[i];

      if (chunk.type !== 'equal') {
        // Include changed chunk
        filtered.push(chunk);

        // Include context before
        const prevChunk = diff[i - 1];
        if (prevChunk?.type === 'equal' && !filtered.includes(prevChunk)) {
          const contextStart = Math.max(0, prevChunk.localLines!.length - contextLines);
          filtered.push({
            ...prevChunk,
            localLines: prevChunk.localLines!.slice(contextStart),
            remoteLines: prevChunk.remoteLines!.slice(contextStart),
          });
        }

        // Include context after
        const nextChunk = diff[i + 1];
        if (nextChunk?.type === 'equal') {
          filtered.push({
            ...nextChunk,
            localLines: nextChunk.localLines!.slice(0, contextLines),
            remoteLines: nextChunk.remoteLines!.slice(0, contextLines),
          });
        }
      }
    }

    return filtered;
  });

  function getLineClass(type: DiffChunk['type']): string {
    switch (type) {
      case 'insert':
        return 'diff-insert';
      case 'delete':
        return 'diff-delete';
      case 'replace':
        return 'diff-replace';
      default:
        return 'diff-equal';
    }
  }

  function getLineSymbol(type: DiffChunk['type']): string {
    switch (type) {
      case 'insert':
        return '+';
      case 'delete':
        return '-';
      case 'replace':
        return '~';
      default:
        return ' ';
    }
  }
</script>

<div class="diff-viewer">
  <div class="diff-header">
    <div class="diff-controls">
      <div class="view-mode-toggle">
        <button
          class="toggle-btn"
          class:active={viewMode === 'split'}
          onclick={() => (viewMode = 'split')}
        >
          Split View
        </button>
        <button
          class="toggle-btn"
          class:active={viewMode === 'unified'}
          onclick={() => (viewMode = 'unified')}
        >
          Unified View
        </button>
      </div>

      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showOnlyDifferences} />
        Show only differences
      </label>
    </div>
  </div>

  {#if viewMode === 'split'}
    <div class="diff-split">
      <div class="diff-pane diff-pane-local">
        <div class="pane-header">{localLabel}</div>
        <div class="pane-content">
          {#each filteredDiff() as chunk (chunk.startLine)}
            {#if chunk.localLines}
              {#each chunk.localLines as line, idx}
                <div class="diff-line {getLineClass(chunk.type)}">
                  {#if showLineNumbers}
                    <span class="line-number">{chunk.startLine + idx + 1}</span>
                  {/if}
                  <span class="line-symbol">{getLineSymbol(chunk.type)}</span>
                  <span class="line-content">{line}</span>
                </div>
              {/each}
            {:else if chunk.type === 'insert'}
              <!-- Empty placeholder for remote insertions -->
              {#each chunk.remoteLines || [] as _}
                <div class="diff-line diff-empty">
                  {#if showLineNumbers}
                    <span class="line-number">-</span>
                  {/if}
                  <span class="line-symbol"></span>
                  <span class="line-content"></span>
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>

      <div class="diff-pane diff-pane-remote">
        <div class="pane-header">{remoteLabel}</div>
        <div class="pane-content">
          {#each filteredDiff() as chunk (chunk.startLine)}
            {#if chunk.remoteLines}
              {#each chunk.remoteLines as line, idx}
                <div class="diff-line {getLineClass(chunk.type)}">
                  {#if showLineNumbers}
                    <span class="line-number">{chunk.startLine + idx + 1}</span>
                  {/if}
                  <span class="line-symbol">{getLineSymbol(chunk.type)}</span>
                  <span class="line-content">{line}</span>
                </div>
              {/each}
            {:else if chunk.type === 'delete'}
              <!-- Empty placeholder for local deletions -->
              {#each chunk.localLines || [] as _}
                <div class="diff-line diff-empty">
                  {#if showLineNumbers}
                    <span class="line-number">-</span>
                  {/if}
                  <span class="line-symbol"></span>
                  <span class="line-content"></span>
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="diff-unified">
      <div class="unified-content">
        {#each filteredDiff() as chunk (chunk.startLine)}
          {#if chunk.type === 'equal'}
            {#each chunk.localLines || [] as line, idx}
              <div class="diff-line diff-equal">
                {#if showLineNumbers}
                  <span class="line-number">{chunk.startLine + idx + 1}</span>
                {/if}
                <span class="line-symbol"> </span>
                <span class="line-content">{line}</span>
              </div>
            {/each}
          {:else if chunk.type === 'delete' || chunk.type === 'replace'}
            {#each chunk.localLines || [] as line, idx}
              <div class="diff-line diff-delete">
                {#if showLineNumbers}
                  <span class="line-number">{chunk.startLine + idx + 1}</span>
                {/if}
                <span class="line-symbol">-</span>
                <span class="line-content">{line}</span>
              </div>
            {/each}
          {/if}
          {#if chunk.type === 'insert' || chunk.type === 'replace'}
            {#each chunk.remoteLines || [] as line, idx}
              <div class="diff-line diff-insert">
                {#if showLineNumbers}
                  <span class="line-number">{chunk.startLine + idx + 1}</span>
                {/if}
                <span class="line-symbol">+</span>
                <span class="line-content">{line}</span>
              </div>
            {/each}
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .diff-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    overflow: hidden;
  }

  .diff-header {
    padding: 12px 16px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .diff-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .view-mode-toggle {
    display: flex;
    gap: 4px;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    padding: 2px;
  }

  .toggle-btn {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #666);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: var(--bg-hover, #f5f5f5);
  }

  .toggle-btn.active {
    background: var(--primary-color, #2196f3);
    color: white;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary, #666);
    cursor: pointer;
  }

  .diff-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    overflow: hidden;
  }

  .diff-pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .diff-pane-local {
    border-right: 1px solid var(--border-color, #e0e0e0);
  }

  .pane-header {
    padding: 8px 12px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .pane-content {
    flex: 1;
    overflow-y: auto;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.6;
  }

  .diff-unified {
    flex: 1;
    overflow: hidden;
  }

  .unified-content {
    height: 100%;
    overflow-y: auto;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.6;
  }

  .diff-line {
    display: flex;
    padding: 2px 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .diff-line:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.02));
  }

  .line-number {
    min-width: 50px;
    padding-right: 12px;
    text-align: right;
    color: var(--text-tertiary, #999);
    user-select: none;
    flex-shrink: 0;
  }

  .line-symbol {
    min-width: 20px;
    text-align: center;
    font-weight: bold;
    user-select: none;
    flex-shrink: 0;
  }

  .line-content {
    flex: 1;
    padding-left: 8px;
  }

  .diff-equal {
    background: transparent;
  }

  .diff-insert {
    background: #e6ffed;
  }

  .diff-insert .line-symbol {
    color: #28a745;
  }

  .diff-delete {
    background: #ffeef0;
  }

  .diff-delete .line-symbol {
    color: #d73a49;
  }

  .diff-replace {
    background: #fff3cd;
  }

  .diff-replace .line-symbol {
    color: #f0ad4e;
  }

  .diff-empty {
    background: var(--bg-secondary, #f5f5f5);
    opacity: 0.5;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .diff-insert {
      background: rgba(40, 167, 69, 0.15);
    }

    .diff-delete {
      background: rgba(215, 58, 73, 0.15);
    }

    .diff-replace {
      background: rgba(240, 173, 78, 0.15);
    }
  }
</style>
