<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { hapticFeedback } from '../../utils/mobile';

  const dispatch = createEventDispatcher<{
    addPassage: void;
    fitView: void;
    zoomIn: void;
    zoomOut: void;
    toggleMiniMap: void;
    openMenu: void;
    newStory: void;
    openStory: void;
    saveStory: void;
    exportStory: void;
    importStory: void;
    openSettings: void;
  }>();

  export let currentZoom = 1;
  export let showMiniMap = true;

  let expanded = false;
  let showMenu = false;

  function handleAction(action: string, handler: () => void) {
    hapticFeedback(10); // Short vibration
    handler();
  }

  function toggleExpand() {
    hapticFeedback(15);
    expanded = !expanded;
  }

  function toggleMenu() {
    hapticFeedback(15);
    showMenu = !showMenu;
    if (showMenu) {
      expanded = false; // Close FAB menu when opening hamburger menu
    }
  }

  function handleMenuAction(action: 'newStory' | 'openStory' | 'saveStory' | 'exportStory' | 'importStory' | 'openSettings', label: string) {
    hapticFeedback(10);
    dispatch(action);
    showMenu = false;
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

      <button
        class="fab secondary"
        on:click={toggleMenu}
        aria-label="Open menu"
        title="Menu"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
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

<!-- Slide-in Menu -->
{#if showMenu}
  <!-- Overlay -->
  <div class="menu-overlay" on:click={toggleMenu}></div>

  <!-- Menu Drawer -->
  <div class="menu-drawer">
    <div class="menu-header">
      <h3>Menu</h3>
      <button class="close-button" on:click={toggleMenu} aria-label="Close menu">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="menu-items">
      <button class="menu-item" on:click={() => handleMenuAction('newStory', 'New Story')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>New Story</span>
      </button>

      <button class="menu-item" on:click={() => handleMenuAction('openStory', 'Open Story')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span>Open Story</span>
      </button>

      <button class="menu-item" on:click={() => handleMenuAction('saveStory', 'Save Story')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span>Save</span>
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item" on:click={() => handleMenuAction('exportStory', 'Export')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Export</span>
      </button>

      <button class="menu-item" on:click={() => handleMenuAction('importStory', 'Import')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>Import</span>
      </button>

      <div class="menu-divider"></div>

      <button class="menu-item" on:click={() => handleMenuAction('openSettings', 'Settings')}>
        <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Settings</span>
      </button>
    </div>
  </div>
{/if}

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

  :global(.dark) .fab.secondary {
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

  :global(.dark) .fab.secondary:hover {
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

  :global(.dark) .zoom-indicator {
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

  /* Menu Overlay */
  .menu-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1100;
    animation: fadeIn 0.3s ease;
  }

  /* Menu Drawer */
  .menu-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 280px;
    max-width: 80vw;
    background: white;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.2);
    z-index: 1200;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s ease;
  }

  :global(.dark) .menu-drawer {
    background: #1f2937;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  /* Support for iOS safe area */
  @supports (padding-top: env(safe-area-inset-top)) {
    .menu-drawer {
      padding-top: env(safe-area-inset-top);
      padding-right: env(safe-area-inset-right);
    }
  }

  /* Menu Header */
  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.dark) .menu-header {
    border-bottom-color: #374151;
  }

  .menu-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }

  :global(.dark) .menu-header h3 {
    color: #f9fafb;
  }

  .close-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #f3f4f6;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }

  :global(.dark) .close-button {
    background: #374151;
    color: #9ca3af;
  }

  .close-button:active {
    transform: scale(0.95);
  }

  .close-button .icon {
    width: 20px;
    height: 20px;
  }

  /* Menu Items */
  .menu-items {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border: none;
    background: transparent;
    color: #374151;
    font-size: 16px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    -webkit-tap-highlight-color: transparent;
    min-height: 56px;
  }

  :global(.dark) .menu-item {
    color: #d1d5db;
  }

  .menu-item:active {
    background: #f3f4f6;
  }

  :global(.dark) .menu-item:active {
    background: #374151;
  }

  .menu-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    color: #6b7280;
  }

  :global(.dark) .menu-icon {
    color: #9ca3af;
  }

  .menu-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 8px 20px;
  }

  :global(.dark) .menu-divider {
    background: #374151;
  }

  /* Hide on desktop */
  @media (min-width: 768px) {
    .menu-overlay,
    .menu-drawer {
      display: none;
    }
  }
</style>
