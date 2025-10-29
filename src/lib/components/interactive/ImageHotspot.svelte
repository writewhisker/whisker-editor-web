<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  export interface Hotspot {
    id: string;
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
    width: number; // Percentage (0-100)
    height: number; // Percentage (0-100)
    label?: string;
    description?: string;
    action?: string;
  }

  // Props
  let {
    imageUrl,
    imageAlt = 'Interactive image',
    hotspots = [],
    showLabels = true,
    disabled = false,
    highlightOnHover = true,
  }: {
    imageUrl: string;
    imageAlt?: string;
    hotspots?: Hotspot[];
    showLabels?: boolean;
    disabled?: boolean;
    highlightOnHover?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let hoveredHotspot = $state<string | null>(null);
  let selectedHotspot = $state<string | null>(null);
  let imageLoaded = $state(false);
  let imageError = $state(false);

  function handleImageLoad() {
    imageLoaded = true;
    dispatch('imageLoad');
  }

  function handleImageError() {
    imageError = true;
    dispatch('imageError');
  }

  function handleHotspotClick(hotspot: Hotspot) {
    if (disabled) return;

    selectedHotspot = hotspot.id;
    dispatch('hotspotClick', {
      hotspot,
      id: hotspot.id,
      action: hotspot.action,
    });
  }

  function handleHotspotHover(hotspotId: string | null) {
    if (disabled || !highlightOnHover) return;
    hoveredHotspot = hotspotId;

    if (hotspotId) {
      const hotspot = hotspots.find((h) => h.id === hotspotId);
      if (hotspot) {
        dispatch('hotspotHover', { hotspot, id: hotspotId });
      }
    }
  }

  function isHotspotActive(hotspotId: string): boolean {
    return hoveredHotspot === hotspotId || selectedHotspot === hotspotId;
  }
</script>

<div class="image-hotspot-container">
  {#if imageError}
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <p>Failed to load image</p>
    </div>
  {:else}
    <div class="image-wrapper" class:loaded={imageLoaded}>
      <img
        src={imageUrl}
        alt={imageAlt}
        class="hotspot-image"
        onload={handleImageLoad}
        onerror={handleImageError}
      />

      {#if imageLoaded}
        <div class="hotspots-overlay">
          {#each hotspots as hotspot (hotspot.id)}
            <button
              class="hotspot"
              class:active={isHotspotActive(hotspot.id)}
              class:hovered={hoveredHotspot === hotspot.id}
              class:selected={selectedHotspot === hotspot.id}
              style="
                left: {hotspot.x}%;
                top: {hotspot.y}%;
                width: {hotspot.width}%;
                height: {hotspot.height}%;
              "
              onclick={() => handleHotspotClick(hotspot)}
              onmouseenter={() => handleHotspotHover(hotspot.id)}
              onmouseleave={() => handleHotspotHover(null)}
              disabled={disabled}
              aria-label={hotspot.label || `Hotspot ${hotspot.id}`}
            >
              {#if showLabels && hotspot.label}
                <span class="hotspot-label">{hotspot.label}</span>
              {/if}

              {#if hoveredHotspot === hotspot.id && hotspot.description}
                <div class="hotspot-tooltip">
                  {#if hotspot.label}
                    <div class="tooltip-title">{hotspot.label}</div>
                  {/if}
                  <div class="tooltip-description">{hotspot.description}</div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>Loading image...</p>
        </div>
      {/if}
    </div>

    {#if selectedHotspot}
      <div class="selected-info">
        {@const hotspot = hotspots.find((h) => h.id === selectedHotspot)}
        {#if hotspot}
          <div class="info-header">
            <span class="info-icon">📍</span>
            <h4>{hotspot.label || 'Selected Area'}</h4>
            <button
              class="close-btn"
              onclick={() => (selectedHotspot = null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {#if hotspot.description}
            <p class="info-description">{hotspot.description}</p>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .image-hotspot-container {
    width: 100%;
    max-width: 1000px;
  }

  .image-wrapper {
    position: relative;
    width: 100%;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color, #e0e0e0);
  }

  .image-wrapper.loaded {
    background: transparent;
  }

  .hotspot-image {
    width: 100%;
    height: auto;
    display: block;
  }

  .hotspots-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .hotspot {
    position: absolute;
    background: rgba(52, 152, 219, 0.2);
    border: 2px solid rgba(52, 152, 219, 0.6);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .hotspot:hover:not(:disabled) {
    background: rgba(52, 152, 219, 0.4);
    border-color: rgba(52, 152, 219, 1);
    transform: scale(1.05);
    z-index: 10;
  }

  .hotspot.selected {
    background: rgba(76, 175, 80, 0.3);
    border-color: #4caf50;
    border-width: 3px;
  }

  .hotspot:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .hotspot-label {
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
  }

  .hotspot-tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    border-radius: 6px;
    min-width: 200px;
    max-width: 300px;
    z-index: 100;
    pointer-events: none;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .tooltip-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .tooltip-description {
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--bg-secondary, #f5f5f5);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color, #e0e0e0);
    border-top-color: var(--accent-color, #3498db);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-overlay p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
  }

  .error-icon {
    font-size: 48px;
  }

  .error-state p {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #666);
  }

  .selected-info {
    margin-top: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
    border: 2px solid #4caf50;
    border-radius: 8px;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .info-icon {
    font-size: 24px;
  }

  .info-header h4 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border: none;
    border-radius: 50%;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary, #666);
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: white;
    color: var(--text-primary, #333);
    transform: scale(1.1);
  }

  .info-description {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #555);
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .hotspot-tooltip {
      min-width: 150px;
      max-width: 250px;
      padding: 8px 12px;
    }

    .tooltip-title {
      font-size: 13px;
    }

    .tooltip-description {
      font-size: 12px;
    }

    .hotspot-label {
      font-size: 11px;
      padding: 3px 6px;
    }
  }
</style>
