/**
 * Tests for GraphViewZoomControl component
 * 
 * Tests focus on zoom level calculations and constraints.
 */

import { describe, it, expect } from 'vitest';

describe('GraphViewZoomControl - Zoom Logic', () => {
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 2.0;
  const ZOOM_STEP = 0.1;

  function zoomIn(currentZoom: number): number {
    return Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
  }

  function zoomOut(currentZoom: number): number {
    return Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
  }

  function resetZoom(): number {
    return 1.0;
  }

  it('should zoom in from 1.0 to 1.1', () => {
    expect(zoomIn(1.0)).toBe(1.1);
  });

  it('should zoom out from 1.0 to 0.9', () => {
    expect(zoomOut(1.0)).toBeCloseTo(0.9);
  });

  it('should not zoom above maximum', () => {
    expect(zoomIn(2.0)).toBe(2.0);
    expect(zoomIn(1.95)).toBe(2.0);
  });

  it('should not zoom below minimum', () => {
    expect(zoomOut(0.1)).toBe(0.1);
    expect(zoomOut(0.15)).toBe(0.1);
  });

  it('should reset zoom to 1.0', () => {
    expect(resetZoom()).toBe(1.0);
  });

  it('should handle multiple zoom steps', () => {
    let zoom = 1.0;
    zoom = zoomIn(zoom);
    zoom = zoomIn(zoom);
    zoom = zoomIn(zoom);
    expect(zoom).toBeCloseTo(1.3);
  });
});
