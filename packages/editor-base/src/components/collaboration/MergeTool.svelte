<script lang="ts">
  import type { MergeContext, MergeResult } from '../../types/conflict';
  import { ConflictDetector } from '../../services/conflictDetector';
  import ConflictResolutionDialog from './ConflictResolutionDialog.svelte';
  import { createEventDispatcher } from 'svelte';
  import { Story } from '@writewhisker/core-ts';

  // Props
  interface Props {
    context: MergeContext;
    open?: boolean;
  }

  let { context, open = false }: Props = $props();

  // Events
  const dispatch = createEventDispatcher<{
    merge: { result: MergeResult };
    cancel: void;
  }>();

  // State
  let mergeStep = $state<'detecting' | 'resolving' | 'applying' | 'complete'>('detecting');
  let conflicts = $state(ConflictDetector.detectConflicts(context));
  let autoMergeResult = $state<MergeResult | null>(null);
  let showConflictDialog = $state(false);

  // Auto-detect on mount
  $effect(() => {
    if (open) {
      detectConflicts();
    }
  });

  function detectConflicts() {
    mergeStep = 'detecting';
    conflicts = ConflictDetector.detectConflicts(context, {
      compareContent: true,
      compareMetadata: true,
      compareStructure: true,
    });

    // Try auto-merge
    autoMergeResult = ConflictDetector.autoMerge(context);

    if (autoMergeResult.success) {
      mergeStep = 'complete';
      dispatch('merge', { result: autoMergeResult });
    } else {
      mergeStep = 'resolving';
      showConflictDialog = true;
    }
  }

  function handleConflictsResolved(event: CustomEvent<{ conflicts: any[] }>) {
    mergeStep = 'applying';
    showConflictDialog = false;

    const resolvedConflicts = event.detail.conflicts;

    // Apply resolved conflicts to create merged story
    const mergedStory = applyResolvedConflicts(context.local, resolvedConflicts);

    const result: MergeResult = {
      success: true,
      conflicts: [],
      mergedStory,
    };

    mergeStep = 'complete';
    dispatch('merge', { result });
  }

  function handleCancel() {
    showConflictDialog = false;
    dispatch('cancel');
  }

  function applyResolvedConflicts(baseStory: Story, resolvedConflicts: any[]): Story {
    // Create a new Story instance from baseStory
    const merged = new Story({
      metadata: baseStory.metadata,
      startPassage: baseStory.startPassage,
      settings: baseStory.settings,
      stylesheets: baseStory.stylesheets,
      scripts: baseStory.scripts,
    });

    // Copy all passages from baseStory
    for (const [id, passage] of baseStory.passages) {
      merged.passages.set(id, passage);
    }

    // Copy other properties
    for (const [name, variable] of baseStory.variables) {
      merged.variables.set(name, variable);
    }
    for (const [id, asset] of baseStory.assets) {
      merged.assets.set(id, asset);
    }
    for (const [name, fn] of baseStory.luaFunctions) {
      merged.luaFunctions.set(name, fn);
    }

    for (const conflict of resolvedConflicts) {
      if (!conflict.resolution || !conflict.resolvedValue) continue;

      const pathParts = conflict.path.split('.');

      // Apply resolution based on path
      if (pathParts[0] === 'metadata') {
        // Metadata conflict
        const field = pathParts[1];
        (merged.metadata as any)[field] = conflict.resolvedValue;
      } else if (pathParts[0] === 'passages') {
        // Passage conflict
        const passageId = pathParts[1];
        const field = pathParts[2];

        const passage = merged.passages.get(passageId);

        if (passage) {
          if (field === 'content') {
            passage.content = conflict.resolvedValue;
          } else if (field === 'name') {
            passage.name = conflict.resolvedValue;
          } else if (field === 'position') {
            passage.position = conflict.resolvedValue;
          }
        }
      }
    }

    return merged;
  }

  function getStepIcon(step: typeof mergeStep): string {
    switch (step) {
      case 'detecting':
        return '🔍';
      case 'resolving':
        return '⚙️';
      case 'applying':
        return '✨';
      case 'complete':
        return '✅';
      default:
        return '•';
    }
  }

  function getStepLabel(step: typeof mergeStep): string {
    switch (step) {
      case 'detecting':
        return 'Detecting conflicts...';
      case 'resolving':
        return 'Resolving conflicts';
      case 'applying':
        return 'Applying changes...';
      case 'complete':
        return 'Merge complete';
      default:
        return '';
    }
  }
</script>

{#if open}
  <div class="merge-tool">
    <div class="merge-header">
      <h2>Merge Stories</h2>
      <p class="subtitle">
        Merging changes from {context.remoteUser || 'remote'} into your local copy
      </p>
    </div>

    <div class="merge-status">
      <div class="status-steps">
        <div class="status-step" class:active={mergeStep === 'detecting'} class:complete={mergeStep !== 'detecting'}>
          <div class="step-icon">{getStepIcon('detecting')}</div>
          <div class="step-label">Detect</div>
        </div>

        <div class="step-connector" class:complete={mergeStep !== 'detecting'}></div>

        <div
          class="status-step"
          class:active={mergeStep === 'resolving'}
          class:complete={mergeStep === 'applying' || mergeStep === 'complete'}
        >
          <div class="step-icon">{getStepIcon('resolving')}</div>
          <div class="step-label">Resolve</div>
        </div>

        <div class="step-connector" class:complete={mergeStep === 'applying' || mergeStep === 'complete'}></div>

        <div
          class="status-step"
          class:active={mergeStep === 'applying'}
          class:complete={mergeStep === 'complete'}
        >
          <div class="step-icon">{getStepIcon('applying')}</div>
          <div class="step-label">Apply</div>
        </div>

        <div class="step-connector" class:complete={mergeStep === 'complete'}></div>

        <div class="status-step" class:active={mergeStep === 'complete'}>
          <div class="step-icon">{getStepIcon('complete')}</div>
          <div class="step-label">Complete</div>
        </div>
      </div>

      <div class="status-message">
        <p>{getStepLabel(mergeStep)}</p>
        {#if conflicts.length > 0 && mergeStep === 'resolving'}
          <p class="conflict-count">
            Found {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} that need resolution
          </p>
        {/if}
      </div>
    </div>

    {#if mergeStep === 'complete' && autoMergeResult?.success}
      <div class="merge-success">
        <div class="success-icon">✅</div>
        <h3>Auto-merge Successful!</h3>
        <p>All changes were merged automatically without conflicts.</p>
        <div class="merge-summary">
          <div class="summary-item">
            <strong>Local passages:</strong>
            <span>{context.local.passages.length}</span>
          </div>
          <div class="summary-item">
            <strong>Remote passages:</strong>
            <span>{context.remote.passages.length}</span>
          </div>
          {#if autoMergeResult.mergedStory}
            <div class="summary-item">
              <strong>Merged passages:</strong>
              <span>{autoMergeResult.mergedStory.passages.length}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Conflict resolution dialog -->
  {#if showConflictDialog}
    <ConflictResolutionDialog
      {conflicts}
      open={showConflictDialog}
      on:resolve={handleConflictsResolved}
      on:cancel={handleCancel}
    />
  {/if}
{/if}

<style>
  .merge-tool {
    background: var(--bg-primary, white);
    border-radius: 8px;
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }

  .merge-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .merge-header h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: var(--text-primary, #333);
  }

  .subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .merge-status {
    margin-bottom: 32px;
  }

  .status-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .status-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .step-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #e0e0e0);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 0.3s;
  }

  .status-step.active .step-icon {
    background: var(--primary-color, #2196f3);
    border-color: var(--primary-color, #2196f3);
    color: white;
    animation: pulse 2s infinite;
  }

  .status-step.complete .step-icon {
    background: #28a745;
    border-color: #28a745;
    color: white;
  }

  .step-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #666);
  }

  .status-step.active .step-label {
    color: var(--primary-color, #2196f3);
    font-weight: 600;
  }

  .status-step.complete .step-label {
    color: #28a745;
  }

  .step-connector {
    width: 80px;
    height: 2px;
    background: var(--border-color, #e0e0e0);
    margin: 0 8px;
    transition: all 0.3s;
  }

  .step-connector.complete {
    background: #28a745;
  }

  .status-message {
    text-align: center;
  }

  .status-message p {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #333);
    font-weight: 500;
  }

  .conflict-count {
    margin-top: 8px !important;
    font-size: 14px !important;
    color: var(--text-secondary, #666) !important;
    font-weight: normal !important;
  }

  .merge-success {
    text-align: center;
    padding: 32px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .success-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .merge-success h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #28a745;
  }

  .merge-success p {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .merge-summary {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
    margin: 0 auto;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-primary, white);
    border-radius: 6px;
    font-size: 14px;
  }

  .summary-item strong {
    color: var(--text-secondary, #666);
  }

  .summary-item span {
    color: var(--text-primary, #333);
    font-weight: 600;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
</style>
