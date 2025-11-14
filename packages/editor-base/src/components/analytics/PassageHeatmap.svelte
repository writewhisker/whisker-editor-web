<script lang="ts">
  /**
   * PassageHeatmap - Visualize passage visit frequency
   *
   * Shows which passages are visited most/least in playthroughs
   */
  import type { Story, Passage } from '@whisker/core-ts';
  import type { PassageVisitData } from '../../analytics/types';

  let {
    story,
    visitData,
    width = 800,
    height = 600
  }: {
    story: Story;
    visitData: Map<string, number>;
    width?: number;
    height?: number;
  } = $props();

  // State
  let hoveredPassage = $state<string | null>(null);
  let selectedPassage = $state<string | null>(null);

  // Calculate layout
  let passageLayout = $derived(calculateLayout());
  let maxVisits = $derived(Math.max(...Array.from(visitData.values()), 1));

  function calculateLayout(): Map<string, { x: number; y: number; width: number; height: number }> {
    const layout = new Map();

    // Use passage positions if available, otherwise calculate grid layout
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const hasPositions = Array.from(story.passages.values()).some((p: Passage) => p.position.x !== 0 || p.position.y !== 0);

    if (hasPositions) {
      // Use existing positions
      for (const [id, passage] of story.passages) {
        minX = Math.min(minX, passage.position.x);
        minY = Math.min(minY, passage.position.y);
        maxX = Math.max(maxX, passage.position.x);
        maxY = Math.max(maxY, passage.position.y);
      }

      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;
      const nodeWidth = 120;
      const nodeHeight = 80;

      for (const [id, passage] of story.passages) {
        const x = ((passage.position.x - minX) / rangeX) * (width - nodeWidth);
        const y = ((passage.position.y - minY) / rangeY) * (height - nodeHeight);

        layout.set(id, { x, y, width: nodeWidth, height: nodeHeight });
      }
    } else {
      // Calculate grid layout
      const passages = Array.from(story.passages.entries());
      const cols = Math.ceil(Math.sqrt(passages.length));
      const rows = Math.ceil(passages.length / cols);

      const cellWidth = width / cols;
      const cellHeight = height / rows;
      const nodeWidth = Math.min(cellWidth * 0.8, 120);
      const nodeHeight = Math.min(cellHeight * 0.8, 80);

      passages.forEach(([id, passage], index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const x = col * cellWidth + (cellWidth - nodeWidth) / 2;
        const y = row * cellHeight + (cellHeight - nodeHeight) / 2;

        layout.set(id, { x, y, width: nodeWidth, height: nodeHeight });
      });
    }

    return layout;
  }

  function getHeatColor(visits: number): string {
    if (visits === 0) {
      return '#e0e0e0'; // Gray for unvisited
    }

    const intensity = Math.min(visits / maxVisits, 1);

    // Color gradient: blue (cold) -> yellow -> red (hot)
    if (intensity < 0.5) {
      // Blue to yellow
      const t = intensity * 2;
      const r = Math.floor(100 + t * 155);
      const g = Math.floor(150 + t * 105);
      const b = Math.floor(255 - t * 55);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to red
      const t = (intensity - 0.5) * 2;
      const r = 255;
      const g = Math.floor(255 - t * 100);
      const b = Math.floor(200 - t * 200);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  function getPassageName(id: string): string {
    return story.passages.get(id)?.title || 'Unknown';
  }

  function handlePassageClick(id: string) {
    selectedPassage = selectedPassage === id ? null : id;
  }
</script>

<div class="passage-heatmap">
  <div class="heatmap-header">
    <h3>Passage Visit Heatmap</h3>
    <div class="legend">
      <span class="legend-label">Visits:</span>
      <div class="legend-gradient">
        <span class="legend-min">0</span>
        <div class="gradient-bar"></div>
        <span class="legend-max">{maxVisits}</span>
      </div>
    </div>
  </div>

  <svg class="heatmap-canvas" {width} {height}>
    <!-- Draw connections (edges) -->
    <g class="edges">
      {#each (Array.from(story.passages.entries()) as [string, Passage][]) as [id, passage]}
        {#each passage.choices as choice}
          {@const sourceLayout = passageLayout.get(id)}
          {@const targetLayout = passageLayout.get(choice.targetPassageId)}
          {#if sourceLayout && targetLayout}
            <line
              x1={sourceLayout.x + sourceLayout.width / 2}
              y1={sourceLayout.y + sourceLayout.height}
              x2={targetLayout.x + targetLayout.width / 2}
              y2={targetLayout.y}
              class="edge"
            />
          {/if}
        {/each}
      {/each}
    </g>

    <!-- Draw passage nodes -->
    <g class="nodes">
      {#each (Array.from(story.passages.entries()) as [string, Passage][]) as [id, passage]}
        {@const layout = passageLayout.get(id)}
        {@const visits = visitData.get(id) || 0}
        {@const color = getHeatColor(visits)}
        {@const isHovered = hoveredPassage === id}
        {@const isSelected = selectedPassage === id}

        {#if layout}
          <g
            class="node"
            class:hovered={isHovered}
            class:selected={isSelected}
            transform="translate({layout.x}, {layout.y})"
            onmouseenter={() => hoveredPassage = id}
            onmouseleave={() => hoveredPassage = null}
            onclick={() => handlePassageClick(id)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') handlePassageClick(id); }}
          >
            <rect
              width={layout.width}
              height={layout.height}
              rx="8"
              fill={color}
              stroke={isSelected ? '#000' : '#666'}
              stroke-width={isSelected ? 3 : 1}
            />

            <text
              x={layout.width / 2}
              y={layout.height / 2 - 10}
              class="passage-title"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {passage.title.length > 15 ? passage.title.substring(0, 12) + '...' : passage.title}
            </text>

            <text
              x={layout.width / 2}
              y={layout.height / 2 + 10}
              class="visit-count"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {visits} visit{visits !== 1 ? 's' : ''}
            </text>
          </g>
        {/if}
      {/each}
    </g>
  </svg>

  {#if hoveredPassage || selectedPassage}
    {@const passageId = selectedPassage || hoveredPassage}
    {@const passage = passageId ? story.passages.get(passageId) : null}
    {@const visits = passageId ? (visitData.get(passageId) || 0) : 0}
    {#if passage}
      <div class="passage-tooltip">
        <div class="tooltip-header">
          <h4>{passage.title}</h4>
          <button
            class="btn-close"
            onclick={() => { selectedPassage = null; hoveredPassage = null; }}
          >
            ×
          </button>
        </div>
        <div class="tooltip-body">
          <div class="stat-row">
            <span class="stat-label">Visits:</span>
            <span class="stat-value">{visits}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Percentage:</span>
            <span class="stat-value">{((visits / maxVisits) * 100).toFixed(1)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Choices:</span>
            <span class="stat-value">{passage.choices.length}</span>
          </div>
          {#if passage.choices.length > 0}
            <div class="choices-list">
              <strong>Leads to:</strong>
              <ul>
                {#each passage.choices as choice}
                  {@const targetPassage = story.passages.get(choice.targetPassageId)}
                  <li>{targetPassage?.title || 'Unknown'}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .passage-heatmap {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background, #fff);
  }

  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border, #ddd);
  }

  .heatmap-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--color-text, #333);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .legend-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary, #666);
  }

  .legend-gradient {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-min,
  .legend-max {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #666);
    min-width: 30px;
  }

  .gradient-bar {
    width: 150px;
    height: 20px;
    background: linear-gradient(to right, #6496ff, #ffff64, #ff6464);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
  }

  .heatmap-canvas {
    flex: 1;
    background: var(--color-surface, #f9f9f9);
  }

  .edge {
    stroke: var(--color-border, #ccc);
    stroke-width: 2;
    stroke-opacity: 0.4;
    fill: none;
  }

  .node {
    cursor: pointer;
    transition: all 0.2s;
  }

  .node:hover rect {
    filter: brightness(1.1);
    stroke-width: 2;
  }

  .node.selected rect {
    filter: brightness(1.2);
  }

  .passage-title {
    font-size: 11px;
    font-weight: 600;
    fill: var(--color-text, #333);
    pointer-events: none;
  }

  .visit-count {
    font-size: 10px;
    fill: var(--color-text-secondary, #666);
    pointer-events: none;
  }

  .passage-tooltip {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    width: 280px;
    background: var(--color-surface, white);
    border: 2px solid var(--color-border, #ddd);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }

  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, #ddd);
    background: var(--color-background, #f5f5f5);
    border-radius: 6px 6px 0 0;
  }

  .tooltip-header h4 {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--color-text, #333);
  }

  .btn-close {
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-text-secondary, #666);
    font-size: 1.25rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-close:hover {
    color: var(--color-text, #333);
  }

  .tooltip-body {
    padding: 1rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 0.375rem 0;
    border-bottom: 1px solid var(--color-border-light, #eee);
  }

  .stat-label {
    font-size: 0.8125rem;
    color: var(--color-text-secondary, #666);
  }

  .stat-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text, #333);
  }

  .choices-list {
    margin-top: 0.75rem;
    font-size: 0.8125rem;
  }

  .choices-list strong {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text, #333);
  }

  .choices-list ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .choices-list li {
    padding: 0.125rem 0;
    color: var(--color-text-secondary, #666);
  }
</style>
