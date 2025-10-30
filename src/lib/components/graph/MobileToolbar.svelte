<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { hapticFeedback } from '../../utils/mobile';

  const dispatch = createEventDispatcher<{
    addPassage: void;
    fitView: void;
    zoomIn: void;
    zoomOut: void;
    toggleMiniMap: void;
  }>();

  export let currentZoom = 1;
  export let showMiniMap = true;

  let expanded = false;

  function handleAction(action: string, handler: () => void) {
    hapticFeedback(10); // Short vibration
    handler();
  }

  function toggleExpand() {
    hapticFeedback(15);
    expanded = !expanded;
  }
</script>

<div class="mobile-toolbar" class:expanded>
  <!-- Main FAB button -->
  <button
    class="fab primary"
    on:click={toggleExpand}
    aria-label={expanded ? 'Close toolbar' : 'Open toolbar'}
    title={expanded ? 'Close' : 'More options'}
  >
    <svg
      class="icon"
      class:rotated={expanded}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {#if expanded}
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      {:else}
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      {/if}
    </svg>
  </button>

  <!-- Action buttons (shown when expanded) -->
  {#if expanded}
    <div class="action-buttons">
      <button
        class="fab secondary"
        on:click={() => handleAction('add', () => dispatch('addPassage'))}
        aria-label="Add passage"
        title="Add new passage"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <button
        class="fab secondary"
        on:click={() => handleAction('fit', () => dispatch('fitView'))}
        aria-label="Fit view"
        title="Fit all passages in view"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <button
        class="fab secondary"
        on:click={() => handleAction('zoomIn', () => dispatch('zoomIn'))}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>

      <button
        class="fab secondary"
        on:click={() => handleAction('zoomOut', () => dispatch('zoomOut'))}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>

      <button
        class="fab secondary"
        on:click={() => handleAction('minimap', () => dispatch('toggleMiniMap'))}
        aria-label={showMiniMap ? 'Hide minimap' : 'Show minimap'}
        title={showMiniMap ? 'Hide minimap' : 'Show minimap'}
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Zoom indicator -->
  {#if expanded}
    <div class="zoom-indicator">
      {Math.round(currentZoom * 100)}%
    </div>
  {/if}
</div>

<style>
  .mobile-toolbar {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 12px;
  }

  /* Support for iOS safe area */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .mobile-toolbar {
      bottom: calc(20px + env(safe-area-inset-bottom));
      right: calc(20px + env(safe-area-inset-right));
    }
  }

  .fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .fab:active {
    transform: scale(0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .fab.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    width: 64px;
    height: 64px;
  }

  .fab.secondary {
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    width: 48px;
    height: 48px;
  }

  .dark .fab.secondary {
    background: #1f2937;
    color: #818cf8;
    border-color: #818cf8;
  }

  .fab.primary:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
  }

  .fab.secondary:hover {
    background: #f3f4f6;
    transform: scale(1.05);
  }

  .dark .fab.secondary:hover {
    background: #374151;
  }

  .icon {
    width: 24px;
    height: 24px;
    transition: transform 0.3s ease;
  }

  .icon.rotated {
    transform: rotate(90deg);
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .zoom-indicator {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    animation: fadeIn 0.3s ease;
    min-width: 50px;
    text-align: center;
  }

  .dark .zoom-indicator {
    background: rgba(255, 255, 255, 0.15);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Hide on desktop */
  @media (min-width: 768px) {
    .mobile-toolbar {
      display: none;
    }
  }

  /* Adjust for landscape */
  @media (max-height: 500px) and (max-width: 900px) {
    .mobile-toolbar {
      right: 10px;
      bottom: 10px;
    }

    .fab.primary {
      width: 48px;
      height: 48px;
    }

    .fab.secondary {
      width: 40px;
      height: 40px;
    }

    .icon {
      width: 20px;
      height: 20px;
    }
  }
</style>
