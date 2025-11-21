<script lang="ts">
  import type { ProgressInfo } from './types';

  interface Props {
    progress?: ProgressInfo;
  }

  let { progress }: Props = $props();
</script>

{#if progress}
  <div class="progress-container">
    {#if progress.message}
      <div class="progress-message">{progress.message}</div>
    {/if}
    <div class="progress-bar">
      <div
        class="progress-fill"
        style:width="{Math.min(100, Math.max(0, progress.percentage))}%"
      ></div>
    </div>
    <div class="progress-percentage">
      {Math.round(progress.percentage)}%
    </div>
  </div>
{/if}

<style>
  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    font-size: 12px;
  }

  .progress-message {
    color: #6b7280;
  }

  .progress-bar {
    flex: 1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    min-width: 100px;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .progress-percentage {
    color: #6b7280;
    font-weight: 500;
    min-width: 35px;
    text-align: right;
  }
</style>
